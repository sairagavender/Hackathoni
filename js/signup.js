const formTitle = document.getElementById("formTitle");
const signupFields = document.getElementById("signupFields");
const displayNameEl = document.getElementById("displayName");
const roleEl = document.getElementById("role");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const mainBtn = document.getElementById("mainBtn");
const toggleBtn = document.getElementById("toggleBtn");
const toggleLabel = document.getElementById("toggleLabel");
const statusEl = document.getElementById("status");

// State: Default is Login
let isLoginMode = true;

// 1. Toggle Function
toggleBtn.onclick = () => {
  isLoginMode = !isLoginMode; // Switch state

  if (isLoginMode) {
    // Switch to Login UI
    formTitle.innerText = "Welcome Back";
    signupFields.classList.add("hidden"); // Hide Name/Role
    mainBtn.innerText = "Log In";
    toggleLabel.innerText = "New here?";
    toggleBtn.innerText = "Create an account";
  } else {
    // Switch to Sign Up UI
    formTitle.innerText = "Create Account";
    signupFields.classList.remove("hidden"); // Show Name/Role
    mainBtn.innerText = "Sign Up";
    toggleLabel.innerText = "Already have an account?";
    toggleBtn.innerText = "Log in instead";
  }
  statusEl.innerText = ""; // Clear errors
};

// 2. Main Submit Logic
mainBtn.onclick = async () => {
  const email = emailEl.value.trim();
  const password = passwordEl.value;
  statusEl.className = "status"; // Reset color
  statusEl.innerText = "Processing...";

  if (!email || !password) {
    setStatus("Please enter email and password.", true);
    return;
  }

  try {
    if (isLoginMode) {
      // --- LOGIN LOGIC ---
      await auth.signInWithEmailAndPassword(email, password);
      setStatus("Login successful! Redirecting...", false);
      setTimeout(() => (location.href = "index.html"), 800);
    } else {
      // --- SIGN UP LOGIC ---
      const name = displayNameEl.value.trim();
      const role = roleEl.value;

      if (!name) {
        setStatus("Display name is required for signup.", true);
        return;
      }

      // Create Auth User
      const res = await auth.createUserWithEmailAndPassword(email, password);

      // Save extra data to Firestore
      await db.collection("users").doc(res.user.uid).set({
        email: email,
        username: name,
        role: role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      setStatus("Account created! Redirecting...", false);
      setTimeout(() => (location.href = "index.html"), 800);
    }
  } catch (e) {
    setStatus(e.message, true);
  }
};

// Helper for status messages
function setStatus(msg, isError) {
  statusEl.innerText = msg;
  statusEl.className = isError ? "status error" : "status success";
}
