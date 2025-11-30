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
const storage = firebase.storage();

let currentUser = null;
const PROFILE_COLLECTION = "users";

const displayFullName = document.getElementById("displayFullName");
const displayRollNumber = document.getElementById("displayRollNumber");
const navUserName = document.getElementById("nav-user-name");
const profilePhotoElement = document.getElementById("profilePhoto");
const profileBannerElement = document.getElementById("profileBanner");
const mainContent = document.querySelector(".main-content");
const photoInput = document.getElementById("photoInput");
const bannerInput = document.getElementById("bannerInput");

function showContent() {
  mainContent.classList.add("loaded");
}

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    loadProfile(user.uid);
  } else {
    window.location.href = "index.html";
  }
});

function loadProfile(uid) {
  db.collection(PROFILE_COLLECTION)
    .doc(uid)
    .get()
    .then((doc) => {
      if (doc.exists) {
        const data = doc.data();
        for (const key in data) {
          const element = document.getElementById(key);
          if (element) element.value = data[key];
        }
        const name = data.fullName || data.username || "Student";
        displayFullName.textContent = name;
        navUserName.textContent = name;
        displayRollNumber.textContent = data.rollNumber
          ? `Roll No: ${data.rollNumber}`
          : "Roll No: --";

        if (data.photoURL)
          profilePhotoElement.innerHTML = `<img src="${data.photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        if (data.bannerURL)
          profileBannerElement.style.backgroundImage = `url('${data.bannerURL}')`;
      } else {
        displayFullName.textContent = "New Student";
        navUserName.textContent = "New Student";
      }
    })
    .catch((e) => console.error(e))
    .finally(() => {
      showContent();
      lucide.createIcons();
    });
}

let isEditMode = false;
let originalValues = {};

function toggleEditMode() {
  isEditMode = true;
  originalValues = {
    fullName: document.getElementById("fullName").value,
    rollNumber: document.getElementById("rollNumber").value,
    branch: document.getElementById("branch").value,
    year: document.getElementById("year").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    dob: document.getElementById("dob").value,
    bloodGroup: document.getElementById("bloodGroup").value,
    address: document.getElementById("address").value,
  };
  document
    .querySelectorAll(".info-value input, .info-value select")
    .forEach((el) => (el.disabled = false));
  document.getElementById("editBtn").style.display = "none";
  document.getElementById("editModeButtons").classList.add("active");
}

async function saveProfile() {
  if (!currentUser) return;
  const saveBtn = document.querySelector(".save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  const updatedData = {
    fullName: document.getElementById("fullName").value,
    rollNumber: document.getElementById("rollNumber").value,
    branch: document.getElementById("branch").value,
    year: document.getElementById("year").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    dob: document.getElementById("dob").value,
    bloodGroup: document.getElementById("bloodGroup").value,
    address: document.getElementById("address").value,
    username: document.getElementById("fullName").value,
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await db
      .collection(PROFILE_COLLECTION)
      .doc(currentUser.uid)
      .set(updatedData, { merge: true });
    displayFullName.textContent = updatedData.fullName;
    navUserName.textContent = updatedData.fullName;
    displayRollNumber.textContent = `Roll No: ${updatedData.rollNumber}`;
    document
      .querySelectorAll(".info-value input, .info-value select")
      .forEach((el) => (el.disabled = true));
    document.getElementById("editBtn").style.display = "block";
    document.getElementById("editModeButtons").classList.remove("active");
    isEditMode = false;
    alert("✅ Profile updated!");
  } catch (e) {
    alert("Error: " + e.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Changes";
  }
}

function cancelEdit() {
  if (originalValues.fullName !== undefined) {
    for (const key in originalValues) {
      const el = document.getElementById(key);
      if (el) el.value = originalValues[key];
    }
  }
  document
    .querySelectorAll(".info-value input, .info-value select")
    .forEach((el) => (el.disabled = true));
  document.getElementById("editBtn").style.display = "block";
  document.getElementById("editModeButtons").classList.remove("active");
  isEditMode = false;
}

function uploadPhoto() {
  photoInput.click();
}
function uploadBanner() {
  bannerInput.click();
}

async function handlePhotoFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  uploadImageAndGetURL(file, "profile_photos").then((url) => {
    if (url) {
      profilePhotoElement.innerHTML = `<img src="${url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
      db.collection(PROFILE_COLLECTION)
        .doc(currentUser.uid)
        .set({ photoURL: url }, { merge: true });
    }
  });
}

async function handleBannerFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  uploadImageAndGetURL(file, "banners").then((url) => {
    if (url) {
      profileBannerElement.style.backgroundImage = `url('${url}')`;
      db.collection(PROFILE_COLLECTION)
        .doc(currentUser.uid)
        .set({ bannerURL: url }, { merge: true });
    }
  });
}

async function uploadImageAndGetURL(file, folder) {
  try {
    const ref = storage
      .ref()
      .child(`${folder}/${currentUser.uid}/${Date.now()}_${file.name}`);
    const snapshot = await ref.put(file);
    return await snapshot.ref.getDownloadURL();
  } catch (e) {
    console.error(e);
    alert("Upload failed: " + e.message);
    return null;
  }
}

lucide.createIcons();
