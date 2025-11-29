import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// --- 1. CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDCOT7bvPnU4zhOAkOG_nFxSLP0f58itgo",
  authDomain: "veddit-a03a0.firebaseapp.com",
  projectId: "veddit-a03a0",
  storageBucket: "veddit-a03a0.firebasestorage.app",
  messagingSenderId: "841975514674",
  appId: "1:841975514674:web:3dcea2a6931cde3bfcde2b",
  measurementId: "G-73VBEQ32GT",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Global State ---
let currentUser = null;
let userRole = "student";
let allTimetables = [],
  allEvents = [],
  allSubjects = [];

const TIMETABLES_COLLECTION = "global_timetables";
const EVENTS_COLLECTION = "global_events";
const SUBJECTS_COLLECTION = "global_subjects";

let timeSlots = [
  "09:00 - 09:50",
  "10:00 - 10:50",
  "11:00 - 11:50",
  "12:00 - 12:50",
  "13:00 - 13:50",
  "14:00 - 14:50",
  "15:00 - 15:50",
  "16:00 - 16:50",
  "17:00 - 17:50",
];
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const subjectColors = [
  "bg-green-100 text-green-800",
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-red-100 text-red-800",
  "bg-yellow-100 text-yellow-800",
];

// --- 2. AUTH ---
function initializeAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) userRole = userDoc.data().role || "student";
      } catch (e) {
        console.error(e);
      }

      document.getElementById("user-role-display").textContent = userRole;

      if (userRole === "operator") {
        document.getElementById("nav-editor").classList.remove("hidden");
        document.getElementById("nav-events").classList.remove("hidden");
      }

      startFirestoreListeners();
      populateTimeSelectors();
      document.getElementById("loading-overlay").classList.add("hidden");
      switchView("dashboard");
    } else {
      window.location.href = "sign-up.html";
    }
  });
}

// --- 3. LISTENERS ---
function startFirestoreListeners() {
  onSnapshot(
    query(
      collection(db, TIMETABLES_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(10)
    ),
    (snapshot) => {
      allTimetables = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      updateTimetableUI();
      updateLoadDropdown();
    }
  );

  const today = new Date().toISOString().substring(0, 10);
  onSnapshot(
    query(
      collection(db, EVENTS_COLLECTION),
      where("date", ">=", today),
      orderBy("date", "asc"),
      limit(20)
    ),
    (snapshot) => {
      allEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderUpcomingEvents(allEvents);
      renderMonthlyCalendar();
    }
  );

  onSnapshot(
    query(collection(db, SUBJECTS_COLLECTION), orderBy("name", "asc")),
    (snapshot) => {
      allSubjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderSubjectList();
      if (
        document
          .getElementById("timetable-editor-view")
          .classList.contains("active")
      ) {
        const datalist = document.getElementById("sub-list");
        if (datalist)
          datalist.innerHTML = allSubjects
            .map((s) => `<option value="${s.name}">`)
            .join("");
      }
    }
  );
}

// --- 4. SUBJECTS ---
function renderSubjectList() {
  const container = document.getElementById("subject-list");
  container.innerHTML = allSubjects.length
    ? ""
    : '<span class="text-gray-500 italic text-sm">No subjects added.</span>';
  allSubjects.forEach((sub) => {
    container.innerHTML += `
                    <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      sub.color || "bg-gray-100"
                    } border border-gray-200">
                        ${sub.name}
                        <button onclick="deleteSubject('${
                          sub.id
                        }')" class="ml-2 text-red-600 hover:text-red-900 font-bold">×</button>
                    </span>`;
  });
}

window.addSubject = async function (event) {
  event.preventDefault();
  if (userRole !== "operator") return alert("Access Denied");
  const input = document.getElementById("new-subject-name");
  const name = input.value.trim();
  if (!name) return;
  if (allSubjects.some((s) => s.name.toLowerCase() === name.toLowerCase()))
    return alert("Subject already exists!");
  const color = subjectColors[allSubjects.length % subjectColors.length];
  await addDoc(collection(db, SUBJECTS_COLLECTION), {
    name,
    color,
    createdAt: serverTimestamp(),
  });
  input.value = "";
};

window.deleteSubject = async function (id) {
  if (userRole === "operator" && confirm("Delete subject?")) {
    await deleteDoc(doc(db, SUBJECTS_COLLECTION, id));
  }
};

// --- 5. TIMETABLE EDITOR ---

function updateLoadDropdown() {
  const select = document.getElementById("load-timetable");
  select.innerHTML = '<option value="">-- New Timetable --</option>';
  allTimetables.forEach((tt) => {
    select.innerHTML += `<option value="${tt.id}">${tt.name}</option>`;
  });
}

window.loadTimetableForEditing = function (id) {
  const form = document.getElementById("timetable-form");
  if (!id) {
    delete form.dataset.docId;
    form.reset();
    renderEditorGrid(getEmptySchedule());
    return;
  }
  const tt = allTimetables.find((t) => t.id === id);
  if (tt) {
    form.dataset.docId = id;
    document.getElementById("timetable-name").value = tt.name;
    timeSlots = tt.timeSlots || timeSlots;
    renderTimeSlotEditor();
    renderEditorGrid(tt.schedule);
  }
};

// *** UPDATED: Renders slots with DELETE buttons ***
function renderTimeSlotEditor() {
  document.getElementById("time-slot-editor").innerHTML = timeSlots
    .map(
      (t) =>
        `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded border border-indigo-200 mr-1 mb-1">
                    ${t}
                    <button type="button" onclick="removeTimeSlot('${t}')" class="text-red-400 hover:text-red-600 font-bold ml-1 text-sm leading-none">&times;</button>
                </span>`
    )
    .join("");
}

// *** NEW: Handles removing a time slot ***
window.removeTimeSlot = function (slotToRemove) {
  if (
    !confirm(
      `Remove the time slot "${slotToRemove}"? Any classes in this column will be cleared.`
    )
  )
    return;

  // 1. Capture current data so we don't lose other columns
  const currentData = getScheduleDataFromEditor();

  // 2. Remove the slot
  timeSlots = timeSlots.filter((t) => t !== slotToRemove);

  // 3. Re-render
  renderTimeSlotEditor();
  renderEditorGrid(currentData);
};

window.addTimeSlot = function () {
  const s = `${document.getElementById("start-hour").value}:${
    document.getElementById("start-minute").value
  } ${document.getElementById("start-ampm").value}`;
  const e = `${document.getElementById("end-hour").value}:${
    document.getElementById("end-minute").value
  } ${document.getElementById("end-ampm").value}`;
  const newSlot = `${s} - ${e}`;

  // Avoid duplicates
  if (timeSlots.includes(newSlot)) return alert("Time slot already exists");

  // 1. Capture current data
  const currentData = getScheduleDataFromEditor();

  // 2. Add slot and Sort (Optional: keeps it tidy)
  timeSlots.push(newSlot);
  timeSlots.sort();

  // 3. Re-render
  renderTimeSlotEditor();
  renderEditorGrid(currentData);
};

function renderEditorGrid(schedule) {
  const container = document.getElementById("editor-grid-container");
  const suggestions = allSubjects
    .map((s) => `<option value="${s.name}">`)
    .join("");

  let html = `<datalist id="sub-list">${suggestions}</datalist>
                        <table class="min-w-full divide-y divide-gray-200 border">
                        <thead class="bg-gray-50"><tr><th class="p-2 text-xs border">Day</th>`;

  timeSlots.forEach(
    (t) =>
      (html += `<th class="p-2 text-xs whitespace-nowrap border">${t}</th>`)
  );
  html += `</tr></thead><tbody class="bg-white">`;

  DAYS_OF_WEEK.forEach((day) => {
    html += `<tr><td class="p-2 font-bold bg-gray-50 text-sm border">${day.substring(
      0,
      3
    )}</td>`;
    timeSlots.forEach((time) => {
      html += `<td class="p-1 border">
                                <input type="text" list="sub-list" data-day="${day}" data-time="${time}" 
                                       class="editor-input w-full p-2 text-sm rounded border-0 hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 text-center">
                             </td>`;
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;

  // Fill values safely
  const inputs = container.querySelectorAll(".editor-input");
  inputs.forEach((input) => {
    const day = input.dataset.day;
    const time = input.dataset.time;
    const dayData = schedule.find((d) => d.day === day);
    if (dayData && dayData.intervals) {
      const interval = dayData.intervals.find((i) => i.time === time);
      if (interval && interval.subject) input.value = interval.subject;
    }
  });
}

window.handleTimetableSubmit = async function (event) {
  event.preventDefault();
  if (userRole !== "operator") return alert("Access Denied");
  const form = event.target;
  const name = form["timetable-name"].value.trim();
  if (!name) return alert("Enter a name");
  const schedule = getScheduleDataFromEditor();

  await addDoc(collection(db, TIMETABLES_COLLECTION), {
    name,
    schedule,
    timeSlots,
    createdAt: serverTimestamp(),
  });
  form.reset();
  delete form.dataset.docId;
  switchView("dashboard");
};

function getScheduleDataFromEditor() {
  const currentSchedule = DAYS_OF_WEEK.map((day) => ({
    day: day,
    intervals: [],
  }));
  document.querySelectorAll(".editor-input").forEach((input) => {
    // Ensure we only save data for currently active time slots
    if (timeSlots.includes(input.dataset.time)) {
      const entry = currentSchedule.find((d) => d.day === input.dataset.day);
      entry.intervals.push({
        time: input.dataset.time,
        subject: input.value.trim(),
      });
    }
  });
  return currentSchedule;
}

// --- 6. DASHBOARD & EVENTS ---
function updateTimetableUI() {
  const latest = allTimetables[0];
  const container = document.getElementById("current-timetable");

  if (latest) {
    document.getElementById("current-timetable-name").textContent = latest.name;
    const displaySlots = latest.timeSlots || timeSlots;

    let html = `<table class="min-w-full divide-y divide-gray-200 text-center text-sm border">
                            <thead class="bg-indigo-50"><tr><th class="p-2 font-bold text-gray-600">Day</th>`;
    displaySlots.forEach(
      (t) =>
        (html += `<th class="p-2 font-bold text-gray-600 text-xs">${t}</th>`)
    );
    html += `</tr></thead><tbody class="bg-white divide-y divide-gray-200">`;

    DAYS_OF_WEEK.forEach((day) => {
      html += `<tr><td class="p-2 font-bold bg-indigo-50 text-xs">${day.substring(
        0,
        3
      )}</td>`;
      const dayData = latest.schedule.find((d) => d.day === day);
      displaySlots.forEach((time) => {
        const sub =
          dayData?.intervals.find((i) => i.time === time)?.subject || "";
        const subObj = allSubjects.find((s) => s.name === sub);
        const style = sub
          ? subObj
            ? subObj.color
            : "bg-gray-100 text-gray-800"
          : "text-gray-300";
        html += `<td class="p-1"><div class="${style} rounded p-1 text-xs truncate font-medium">${
          sub || "-"
        }</div></td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
  } else {
    document.getElementById("current-timetable-name").textContent = "None";
    container.innerHTML = `<p class="text-gray-500 p-4">No active timetable.</p>`;
  }
}

window.handleEventSubmit = async function (e) {
  e.preventDefault();
  if (userRole !== "operator") return;
  const f = e.target;
  await addDoc(collection(db, EVENTS_COLLECTION), {
    eventType: f["event-type"].value,
    name: f["event-name"].value,
    date: f["event-date"].value,
    time: f["event-time"].value,
    posterUrl: f["event-poster-url"].value,
    description: f["event-description"].value,
    showCountdown: f["show-countdown"].checked,
    createdAt: serverTimestamp(),
  });
  f.reset();
  switchView("dashboard");
};

function renderUpcomingEvents(events) {
  const container = document.getElementById("upcoming-events");
  container.innerHTML = events.length
    ? ""
    : '<p class="text-gray-500 italic">No events.</p>';
  events.forEach((e) => {
    const d = new Date(e.date);
    const diff = Math.ceil((d - new Date()) / 86400000);
    const cd =
      e.showCountdown && diff >= 0
        ? `<span class="text-xs bg-pink-100 text-pink-600 px-2 rounded">${diff} days left</span>`
        : "";
    container.innerHTML += `
                    <div class="bg-white p-3 rounded-lg border border-pink-100 shadow-sm mb-2 flex items-center space-x-3">
                        <div class="bg-pink-50 text-pink-600 rounded p-2 text-center w-12">
                            <div class="text-xl font-bold">${d.getDate()}</div>
                        </div>
                        <div class="flex-grow">
                            <h4 class="font-bold text-sm text-gray-800">${
                              e.name
                            }</h4>
                            <div class="flex justify-between items-center mt-1">
                                <span class="text-xs text-gray-500">${
                                  e.eventType
                                }</span>
                                ${cd}
                            </div>
                        </div>
                    </div>`;
  });
}

function renderMonthlyCalendar() {
  const container = document.getElementById("calendar-view");
  const now = new Date();
  document.getElementById("current-month-display").textContent =
    now.toLocaleDateString("en-US", { month: "long" });

  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); // 0=Sun
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const eventDates = allEvents.map((e) => e.date);

  let html = `<div class="grid grid-cols-7 gap-1 text-center mb-1 text-xs font-bold text-gray-400">
                <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div></div>
                <div class="grid grid-cols-7 gap-1">`;

  for (let i = 0; i < offset; i++) html += `<div></div>`;
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(i).padStart(2, "0")}`;
    const hasEvent = eventDates.includes(dateStr);
    const isToday = i === now.getDate();
    let cls = isToday
      ? "bg-indigo-600 text-white"
      : hasEvent
      ? "bg-pink-200 text-pink-800 font-bold"
      : "bg-gray-50 hover:bg-gray-100";
    html += `<div class="${cls} h-8 w-8 flex items-center justify-center rounded-full text-xs mx-auto">${i}</div>`;
  }
  container.innerHTML = html + `</div>`;
}

// --- 7. HELPERS ---
window.switchView = function (viewId) {
  document
    .querySelectorAll(".view-content")
    .forEach((el) => el.classList.add("hidden", "active"));
  document.getElementById(viewId + "-view").classList.remove("hidden");
  document.getElementById(viewId + "-view").classList.add("active");

  if (viewId === "timetable-editor") {
    renderSubjectList();
    populateTimeSelectors();
    renderTimeSlotEditor();
    if (!document.getElementById("timetable-form").dataset.docId)
      renderEditorGrid(getEmptySchedule());
  }
};

window.toggleEventFormFields = function (val) {
  const pl = document.getElementById("event-poster-url");
  pl.placeholder = val === "Exam" ? "Syllabus PDF Link..." : "Image URL...";
};

function populateTimeSelectors() {
  if (document.getElementById("start-hour").children.length) return;
  for (let i = 1; i <= 12; i++) {
    ["start", "end"].forEach((x) => {
      document.getElementById(
        x + "-hour"
      ).innerHTML += `<option value="${String(i).padStart(
        2,
        "0"
      )}">${i}</option>`;
      document.getElementById(
        x + "-minute"
      ).innerHTML += `<option value="00">00</option><option value="30">30</option>`;
    });
  }
  document.getElementById("start-hour").value = "09";
  document.getElementById("end-hour").value = "10";
}

function getEmptySchedule() {
  return DAYS_OF_WEEK.map((d) => ({
    day: d,
    intervals: timeSlots.map((t) => ({ time: t, subject: "" })),
  }));
}

initializeAuth();
