import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const authBtn = document.getElementById("auth-btn");
const navUserName = document.getElementById("nav-user-name");

// Check Login State
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 1. Update Auth Button
    authBtn.innerHTML = `Log Out <i data-lucide="log-out" style="width:16px;"></i>`;
    authBtn.href = "#";
    authBtn.onclick = (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to log out?")) {
        signOut(auth).then(() => {
          window.location.reload();
        });
      }
    };

    // 2. Fetch User Name for Sidebar
    try {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Use fullName first, fallback to username
        navUserName.innerText = data.fullName || data.username || "My Profile";
      }
    } catch (e) {
      console.error("Error fetching user data:", e);
    }
  } else {
    // User IS NOT logged in
    authBtn.innerHTML = `Login / Signup <i data-lucide="arrow-right" style="width:16px;"></i>`;
    authBtn.href = "signup.html";
    authBtn.onclick = null;
    navUserName.innerText = "Guest";
  }
  lucide.createIcons(); // Refresh icons
});

// Initial Icon Create
lucide.createIcons();
