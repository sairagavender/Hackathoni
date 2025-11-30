// --- FIREBASE CONFIG (For User Profile Name in Nav) ---
const firebaseConfig = {
  apiKey: "AIzaSyDCOT7bvPnU4zhOAkOG_nFxSLP0f58itgo",
  authDomain: "veddit-a03a0.firebaseapp.com",
  projectId: "veddit-a03a0",
  storageBucket: "veddit-a03a0.firebasestorage.app",
  messagingSenderId: "841975514674",
  appId: "1:841975514674:web:3dcea2a6931cde3bfcde2b",
  measurementId: "G-73VBEQ32GT",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Navbar User Name Logic
auth.onAuthStateChanged(async (user) => {
  const nameEl = document.getElementById("nav-user-name");
  if (user) {
    try {
      const docSnap = await db.collection("users").doc(user.uid).get();
      if (docSnap.exists) {
        nameEl.innerText =
          docSnap.data().fullName || docSnap.data().username || "My Profile";
      }
    } catch (e) {
      console.error("Error fetching user", e);
    }
  } else {
    nameEl.innerText = "Guest";
  }
});

// --- DATA & CONTENT LOGIC ---
const GLOBAL_PULSE_DATA = [
  {
    id: 1,
    title: "AI Revolution in EdTech",
    source: "USD Online",
    time: "2h ago",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdXMvR5qmp6UJXtX2xx3ZLXOVk_emUBoHtwCNyzp53L8H1st_PNC_ktjMYkCdWjLcV3XI&usqp=CAU",
    summary: "AI models are changing education delivery.",
    link: "#",
  },
  {
    id: 2,
    title: "New Python Version Released",
    source: "RealPython",
    time: "5h ago",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=300",
    summary: "Python 3.12 brings improvements.",
    link: "#",
  },
  {
    id: 3,
    title: "SpaceX Starship",
    source: "Teslarati",
    time: "8h ago",
    image:
      "https://images.newscientist.com/wp-content/uploads/2025/08/27135853/SEI_263490562.jpg",
    summary: "SpaceX pushes forward with V3 vehicle.",
    link: "#",
  },
  {
    id: 4,
    title: "Cybersecurity 2026",
    source: "Simplilearn",
    time: "1d ago",
    image: "https://www.hostnoc.com/wp-content/uploads/2025/09/thumbnail.jpg",
    summary: "Experts predict rise in AI social engineering.",
    link: "#",
  },
];

const CAMPUS_CHRONICLES_DATA = [
  {
    id: 5,
    title: "Top 5 Coding Hacks",
    summary: "Boost productivity with VS Code tips.",
    source: "Tech Club",
    time: "2 days ago",
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9KZ8tcFmJvZE_DarG8OnLBQ_UGNYZ7gEEcxi9ZT7xxdBs4RcbU4H5VJEWQO8uYhOlEN4&usqp=CAU",
    link: "#",
  },
  {
    id: 6,
    title: "Campus Fest Highlights",
    summary: "Music night was a blast! Check photos.",
    source: "Media Team",
    time: "1 week ago",
    image:
      "https://res.cloudinary.com/purnesh/image/upload/f_auto/v1486462211/hansraj-college%2Cjpg00.jpg",
    link: "#",
  },
  {
    id: 7,
    title: "Scholarship Deadline",
    summary: "Application closes next Friday.",
    source: "Admissions",
    time: "3 days ago",
    image: "https://placehold.co/600x400/805ad5/ffffff?text=Scholarship",
    link: "#",
  },
  {
    id: 8,
    title: "Library Expansion",
    summary: "500 new eBooks added.",
    source: "Library",
    time: "4 days ago",
    image: "https://placehold.co/600x400/4299e1/ffffff?text=Library",
    link: "#",
  },
];

function createSlideHTML(item) {
  return `
            <div onclick="openModal(${item.id})" class="flex-shrink-0 w-[304px] bg-white rounded-xl shadow-md overflow-hidden cursor-pointer mr-6 border border-gray-100">
                <div class="relative h-32 bg-gray-200" style="background-image: url('${item.image}'); background-size: cover; background-position: center;">
                    <div class="absolute inset-0 bg-black/20"></div>
                </div>
                <div class="p-3">
                    <h3 class="font-bold text-gray-900 line-clamp-2">${item.title}</h3>
                    <div class="flex justify-between text-xs text-gray-500 mt-1"><span>${item.source}</span><span>${item.time}</span></div>
                </div>
            </div>`;
}

function renderGlobalPulse() {
  const container = document.getElementById("global-pulse-container");
  const items = GLOBAL_PULSE_DATA.map(createSlideHTML).join("");
  container.innerHTML = `<div class="marquee-track py-2">${items}${items}</div>`;
}

function renderCampusChronicles() {
  const container = document.getElementById("campus-chronicles-container");
  container.innerHTML = CAMPUS_CHRONICLES_DATA.map(
    (item) => `
            <div onclick="openModal(${item.id})" class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-lg flex flex-col cursor-pointer">
                <div class="w-full h-32 mb-3 rounded-md overflow-hidden bg-gray-100">
                    <img src="${item.image}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
                </div>
                <div class="flex flex-col flex-grow">
                    <h3 class="text-lg font-extrabold text-gray-900 mb-1 leading-snug">${item.title}</h3>
                    <p class="text-xs text-gray-700 mb-3 line-clamp-3">${item.summary}</p>
                </div>
                <div class="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <span class="font-medium text-indigo-600">${item.source}</span>
                    <span>${item.time}</span>
                </div>
            </div>
        `
  ).join("");
}

function openModal(id) {
  const item = [...GLOBAL_PULSE_DATA, ...CAMPUS_CHRONICLES_DATA].find(
    (i) => i.id === id
  );
  if (!item) return;
  document.getElementById("modal-title").textContent = item.title;
  document.getElementById("modal-image").src = item.image;
  document.getElementById("modal-source").textContent = item.source;
  document.getElementById("modal-time").textContent = item.time;
  document.getElementById("modal-content").textContent = item.summary;
  document.getElementById("modal-read-more").href = item.link;
  document.getElementById("news-modal").classList.remove("hidden");
  lucide.createIcons();
}

function closeModal() {
  document.getElementById("news-modal").classList.add("hidden");
}
document.getElementById("news-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("news-modal")) closeModal();
});

document.addEventListener("DOMContentLoaded", () => {
  renderGlobalPulse();
  renderCampusChronicles();
  lucide.createIcons();
});
