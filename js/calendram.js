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
  updateDoc, // Added updateDoc
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
let countdownInterval = null;

const TIMETABLES_COLLECTION = "global_timetables";
const EVENTS_COLLECTION = "global_events";
const SUBJECTS_COLLECTION = "global_subjects";

let timeSlots = [
  "09:00 - 09:50", "10:00 - 10:50", "11:00 - 11:50",
  "12:00 - 12:50", "13:00 - 13:50", "14:00 - 14:50",
  "15:00 - 15:50", "16:00 - 16:50", "17:00 - 17:50",
];
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const subjectColors = [
  "bg-green-100 text-green-800", "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800", "bg-red-100 text-red-800",
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
      } catch (e) { console.error(e); }

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
  onSnapshot(query(collection(db, TIMETABLES_COLLECTION), orderBy("createdAt", "desc"), limit(10)), (snapshot) => {
    allTimetables = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    updateTimetableUI();
    updateLoadDropdown();
  });

  const today = new Date().toISOString().substring(0, 10);
  onSnapshot(query(collection(db, EVENTS_COLLECTION), where("date", ">=", today), orderBy("date", "asc"), limit(30)), (snapshot) => {
    allEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderUpcomingEvents(allEvents);
    renderMonthlyCalendar();
  });

  onSnapshot(query(collection(db, SUBJECTS_COLLECTION), orderBy("name", "asc")), (snapshot) => {
    allSubjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderSubjectList();
    if (document.getElementById("timetable-editor-view").classList.contains("active")) {
      const datalist = document.getElementById("sub-list");
      if (datalist) datalist.innerHTML = allSubjects.map((s) => `<option value="${s.name}">`).join("");
    }
  });
}

// --- 4. SUBJECTS & EDITOR LOGIC ---
function renderSubjectList() {
  const container = document.getElementById("subject-list");
  container.innerHTML = allSubjects.length ? "" : '<span class="text-gray-500 italic text-sm">No subjects added.</span>';
  allSubjects.forEach((sub) => {
    container.innerHTML += `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${sub.color || "bg-gray-100"} border border-gray-200">${sub.name}<button onclick="deleteSubject('${sub.id}')" class="ml-2 text-red-600 hover:text-red-900 font-bold">×</button></span>`;
  });
}

window.addSubject = async function (event) {
  event.preventDefault();
  if (userRole !== "operator") return alert("Access Denied");
  const name = document.getElementById("new-subject-name").value.trim();
  if (!name) return;
  if (allSubjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) return alert("Subject already exists!");
  await addDoc(collection(db, SUBJECTS_COLLECTION), { name, color: subjectColors[allSubjects.length % subjectColors.length], createdAt: serverTimestamp() });
  document.getElementById("new-subject-name").value = "";
};

window.deleteSubject = async function (id) {
  if (userRole === "operator" && confirm("Delete subject?")) await deleteDoc(doc(db, SUBJECTS_COLLECTION, id));
};

function updateLoadDropdown() {
  const select = document.getElementById("load-timetable");
  select.innerHTML = '<option value="">-- New Timetable --</option>';
  allTimetables.forEach((tt) => select.innerHTML += `<option value="${tt.id}">${tt.name}</option>`);
}

window.loadTimetableForEditing = function (id) {
  const form = document.getElementById("timetable-form");
  if (!id) { delete form.dataset.docId; form.reset(); renderEditorGrid(getEmptySchedule()); return; }
  const tt = allTimetables.find((t) => t.id === id);
  if (tt) {
    form.dataset.docId = id;
    document.getElementById("timetable-name").value = tt.name;
    timeSlots = tt.timeSlots || timeSlots;
    renderTimeSlotEditor();
    renderEditorGrid(tt.schedule);
  }
};

function renderTimeSlotEditor() {
  document.getElementById("time-slot-editor").innerHTML = timeSlots.map((t) => `<span class="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded border border-indigo-200 mr-1 mb-1">${t}<button type="button" onclick="removeTimeSlot('${t}')" class="text-red-400 hover:text-red-600 font-bold ml-1 text-sm leading-none">&times;</button></span>`).join("");
}

window.removeTimeSlot = function (slotToRemove) {
  if (!confirm(`Remove slot "${slotToRemove}"?`)) return;
  const currentData = getScheduleDataFromEditor();
  timeSlots = timeSlots.filter((t) => t !== slotToRemove);
  renderTimeSlotEditor();
  renderEditorGrid(currentData);
};

window.addTimeSlot = function () {
  const newSlot = `${document.getElementById("start-hour").value}:${document.getElementById("start-minute").value} ${document.getElementById("start-ampm").value} - ${document.getElementById("end-hour").value}:${document.getElementById("end-minute").value} ${document.getElementById("end-ampm").value}`;
  if (timeSlots.includes(newSlot)) return alert("Slot exists");
  const currentData = getScheduleDataFromEditor();
  timeSlots.push(newSlot);
  timeSlots.sort();
  renderTimeSlotEditor();
  renderEditorGrid(currentData);
};

function renderEditorGrid(schedule) {
  const container = document.getElementById("editor-grid-container");
  let html = `<datalist id="sub-list">${allSubjects.map((s) => `<option value="${s.name}">`).join("")}</datalist><table class="min-w-full divide-y divide-gray-200 border"><thead class="bg-gray-50"><tr><th class="p-2 text-xs border">Day</th>`;
  timeSlots.forEach((t) => html += `<th class="p-2 text-xs whitespace-nowrap border">${t}</th>`);
  html += `</tr></thead><tbody class="bg-white">`;
  DAYS_OF_WEEK.forEach((day) => {
    html += `<tr><td class="p-2 font-bold bg-gray-50 text-sm border">${day.substring(0, 3)}</td>`;
    timeSlots.forEach((time) => html += `<td class="p-1 border"><input type="text" list="sub-list" data-day="${day}" data-time="${time}" class="editor-input w-full p-2 text-sm rounded border-0 hover:bg-gray-50 text-center"></td>`);
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  container.innerHTML = html;
  const inputs = container.querySelectorAll(".editor-input");
  inputs.forEach((input) => {
    const entry = schedule.find((d) => d.day === input.dataset.day)?.intervals.find((i) => i.time === input.dataset.time);
    if (entry) input.value = entry.subject;
  });
}

window.handleTimetableSubmit = async function (event) {
  event.preventDefault();
  if (userRole !== "operator") return alert("Access Denied");
  const name = event.target["timetable-name"].value.trim();
  if (!name) return alert("Enter a name");
  await addDoc(collection(db, TIMETABLES_COLLECTION), { name, schedule: getScheduleDataFromEditor(), timeSlots, createdAt: serverTimestamp() });
  event.target.reset();
  delete event.target.dataset.docId;
  switchView("dashboard");
};

function getScheduleDataFromEditor() {
  const currentSchedule = DAYS_OF_WEEK.map((day) => ({ day, intervals: [] }));
  document.querySelectorAll(".editor-input").forEach((input) => {
    if (timeSlots.includes(input.dataset.time)) {
      currentSchedule.find((d) => d.day === input.dataset.day).intervals.push({ time: input.dataset.time, subject: input.value.trim() });
    }
  });
  return currentSchedule;
}

// --- 5. EVENTS & TASKS LOGIC ---

window.handleEventSubmit = async function (e) {
  e.preventDefault();
  if (userRole !== "operator") return;
  const f = e.target;
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true; btn.innerText = "Saving...";
  
  const type = f["event-type"].value;
  // Tasks MUST have countdown enabled
  const isTask = type === "Task";
  const showCountdown = isTask ? true : f["show-countdown"].checked;

  try {
    await addDoc(collection(db, EVENTS_COLLECTION), {
      eventType: type,
      name: f["event-name"].value,
      date: f["event-date"].value,
      time: f["event-time"].value,
      registrationLink: f["event-link"].value,
      description: f["event-description"].value,
      showCountdown: showCountdown,
      isCompleted: false, // New field for Tasks
      createdAt: serverTimestamp(),
    });
    f.reset();
    f.querySelector('#show-countdown').checked = true;
    switchView("dashboard");
  } catch (err) { alert(err.message); } 
  finally { btn.disabled = false; btn.innerText = "Create Event"; }
};

// Toggle Task Completion
window.toggleTask = async function(eventId, currentStatus) {
    if (userRole !== "operator") return;
    try {
        await updateDoc(doc(db, EVENTS_COLLECTION, eventId), {
            isCompleted: currentStatus
        });
    } catch(e) {
        console.error("Error toggling task:", e);
    }
}

function renderUpcomingEvents(events) {
  const container = document.getElementById("upcoming-events");
  if (countdownInterval) clearInterval(countdownInterval);

  if (events.length === 0) {
    container.innerHTML = '<p class="text-gray-500 italic text-sm p-2">No upcoming events found.</p>';
    return;
  }

  // Sorting: Tasks/Priority first, then Date
  events.sort((a, b) => {
    if (a.showCountdown === true && b.showCountdown !== true) return -1;
    if (a.showCountdown !== true && b.showCountdown === true) return 1;
    const dateA = new Date(a.date + 'T' + (a.time || '00:00'));
    const dateB = new Date(b.date + 'T' + (b.time || '00:00'));
    return dateA - dateB;
  });

  container.innerHTML = "";

  events.forEach((e) => {
    const dateObj = new Date(e.date + 'T' + (e.time || '00:00'));
    const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const day = dateObj.getDate();
    const isTask = e.eventType === "Task";

    // STYLES based on Completed status
    let cardClass = "bg-white border-gray-200 shadow-sm"; // Default
    let textClass = "text-gray-800";
    
    if (e.showCountdown) cardClass = "bg-white border-pink-300 shadow-md ring-1 ring-pink-50";

    if (isTask && e.isCompleted) {
        // Green Background & Strikethrough for completed tasks
        cardClass = "bg-green-50 border-green-200 shadow-none opacity-80";
        textClass = "text-green-800 line-through decoration-green-600";
    }

    // COUNTDOWN HTML
    let countdownHtml = "";
    if (e.showCountdown) {
      countdownHtml = `<span id="timer-${e.id}" class="text-[11px] bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded font-mono font-medium ml-auto">Loading...</span>`;
    }

    // ACTION BUTTONS (Register vs Complete)
    let actionBtn = "";
    if (isTask) {
        // Task Checkbox Button
        const icon = e.isCompleted ? "check-circle-2" : "circle";
        const iconColor = e.isCompleted ? "text-green-600 fill-green-100" : "text-gray-300 hover:text-green-500";
        actionBtn = `<button onclick="toggleTask('${e.id}', ${!e.isCompleted})" class="absolute top-3 right-3 ${iconColor} transition-colors">
                        <i data-lucide="${icon}" class="w-6 h-6"></i>
                     </button>`;
    } else if (e.registrationLink) {
        actionBtn = `<a href="${e.registrationLink}" target="_blank" class="block text-center mt-3 bg-indigo-50 text-indigo-600 text-xs font-bold py-2 rounded hover:bg-indigo-100 transition">Register Now ↗</a>`;
    }

    container.innerHTML += `
      <div id="card-${e.id}" class="relative p-3 rounded-xl border ${cardClass} mb-3 hover:shadow-lg transition-all">
          ${isTask ? actionBtn : ''}
          <div class="flex items-start space-x-3">
              <div class="bg-pink-50 text-pink-600 rounded-lg p-2 text-center min-w-[50px] shrink-0">
                  <div class="text-[10px] font-bold uppercase tracking-wider">${month}</div>
                  <div class="text-xl font-black leading-none">${day}</div>
              </div>
              
              <div class="flex-grow min-w-0 pr-6">
                  <div class="flex justify-between items-start">
                      <h4 class="font-bold text-sm ${textClass} truncate pr-2">${e.name}</h4>
                      ${!isTask ? `<span class="text-[10px] bg-gray-50 border border-gray-200 text-gray-500 px-1.5 rounded shrink-0">${e.eventType}</span>` : ''}
                  </div>
                  
                  <div class="flex items-center gap-2 mt-1 flex-wrap">
                      <span class="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <i data-lucide="clock" class="w-3 h-3"></i> ${e.time || 'All Day'}
                      </span>
                      ${countdownHtml}
                  </div>
                  
                  <p class="text-xs text-gray-400 mt-1 line-clamp-1">${e.description || ''}</p>
              </div>
          </div>
          ${!isTask ? actionBtn : ''}
      </div>`;
  });

  if(window.lucide) window.lucide.createIcons();
  startCountdownTimer(events);
}

function startCountdownTimer(events) {
  const updateTimer = () => {
    const now = new Date().getTime();

    events.forEach(e => {
      if (!e.showCountdown) return;

      const targetDate = new Date(e.date + 'T' + (e.time || '00:00')).getTime();
      const distance = targetDate - now;
      const el = document.getElementById(`timer-${e.id}`);
      const card = document.getElementById(`card-${e.id}`);

      // TASK LOGIC: Remove card if time is up
      if (e.eventType === "Task" && distance < 0) {
          if (card) card.remove();
          return;
      }

      if (el) {
        if (distance < 0) {
          el.innerHTML = "Ended";
          el.className = "text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded ml-auto";
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          const dStr = days > 0 ? `${days}d ` : '';
          el.innerHTML = `⏳ ${dStr}${hours.toString().padStart(2,'0')}h ${minutes.toString().padStart(2,'0')}m ${seconds.toString().padStart(2,'0')}s`;
          
          if (days === 0) {
            el.className = "text-[11px] bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded font-mono font-bold ml-auto animate-pulse";
          } else {
            el.className = "text-[11px] bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded font-mono font-medium ml-auto";
          }
        }
      }
    });
  };

  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
}

// --- 6. HELPERS ---
function updateTimetableUI() {
  const latest = allTimetables[0];
  const container = document.getElementById("current-timetable");
  if (latest) {
    document.getElementById("current-timetable-name").textContent = latest.name;
    let html = `<table class="min-w-full divide-y divide-gray-200 text-center text-sm border"><thead class="bg-indigo-50"><tr><th class="p-2 font-bold text-gray-600">Day</th>`;
    (latest.timeSlots || timeSlots).forEach((t) => html += `<th class="p-2 font-bold text-gray-600 text-xs">${t}</th>`);
    html += `</tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
    DAYS_OF_WEEK.forEach((day) => {
      html += `<tr><td class="p-2 font-bold bg-indigo-50 text-xs">${day.substring(0, 3)}</td>`;
      const dayData = latest.schedule.find((d) => d.day === day);
      (latest.timeSlots || timeSlots).forEach((time) => {
        const sub = dayData?.intervals.find((i) => i.time === time)?.subject || "";
        const subObj = allSubjects.find((s) => s.name === sub);
        html += `<td class="p-1"><div class="${sub ? (subObj?.color || "bg-gray-100 text-gray-800") : "text-gray-300"} rounded p-1 text-xs truncate font-medium">${sub || "-"}</div></td>`;
      });
      html += `</tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
  } else {
    document.getElementById("current-timetable-name").textContent = "None";
    container.innerHTML = `<p class="text-gray-500 p-4">No active timetable.</p>`;
  }
}

function renderMonthlyCalendar() {
  const container = document.getElementById("calendar-view");
  const now = new Date();
  document.getElementById("current-month-display").textContent = now.toLocaleDateString("en-US", { month: "long" });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = new Date(now.getFullYear(), now.getMonth(), 1).getDay() === 0 ? 6 : new Date(now.getFullYear(), now.getMonth(), 1).getDay() - 1;
  const eventDates = allEvents.map((e) => e.date);
  let html = `<div class="grid grid-cols-7 gap-1 text-center mb-1 text-xs font-bold text-gray-400"><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div></div><div class="grid grid-cols-7 gap-1">`;
  for (let i = 0; i < offset; i++) html += `<div></div>`;
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    const cls = i === now.getDate() ? "bg-indigo-600 text-white" : eventDates.includes(dStr) ? "bg-pink-200 text-pink-800 font-bold" : "bg-gray-50 hover:bg-gray-100";
    html += `<div class="${cls} h-8 w-8 flex items-center justify-center rounded-full text-xs mx-auto">${i}</div>`;
  }
  container.innerHTML = html + `</div>`;
}

window.switchView = function (viewId) {
  document.querySelectorAll(".view-content").forEach((el) => el.classList.add("hidden", "active"));
  document.getElementById(viewId + "-view").classList.remove("hidden");
  document.getElementById(viewId + "-view").classList.add("active");
  if (viewId === "timetable-editor") { renderSubjectList(); populateTimeSelectors(); renderTimeSlotEditor(); if (!document.getElementById("timetable-form").dataset.docId) renderEditorGrid(getEmptySchedule()); }
};

window.toggleEventFormFields = function (val) {
  const pl = document.getElementById("event-link");
  if (pl) pl.placeholder = val === "Exam" ? "Syllabus PDF Link..." : "Registration/Info URL...";
};

function populateTimeSelectors() {
  if (document.getElementById("start-hour").children.length) return;
  for (let i = 1; i <= 12; i++) { ["start", "end"].forEach((x) => { document.getElementById(x + "-hour").innerHTML += `<option value="${String(i).padStart(2, "0")}">${i}</option>`; document.getElementById(x + "-minute").innerHTML += `<option value="00">00</option><option value="30">30</option>`; }); }
  document.getElementById("start-hour").value = "09"; document.getElementById("end-hour").value = "10";
}

function getEmptySchedule() { return DAYS_OF_WEEK.map((d) => ({ day: d, intervals: timeSlots.map((t) => ({ time: t, subject: "" })) })); }

initializeAuth();