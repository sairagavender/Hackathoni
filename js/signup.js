  const displayNameEl = document.getElementById('displayName');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const roleEl = document.getElementById('role');
  const signupBtn = document.getElementById('signupBtn');
  const loginBtn = document.getElementById('loginBtn');
  const googleBtn = document.getElementById('googleBtn');
  const statusEl = document.getElementById('status');

  // Signup
  signupBtn.onclick = async () => {
    const email = emailEl.value.trim();
    const pass = passwordEl.value;
    const role = roleEl.value;
    let username = displayNameEl.value.trim() || (email ? email.split('@')[0] : '');

    if(!email || !pass) { statusEl.innerText='Enter email & password'; return; }

    try {
      const res = await auth.createUserWithEmailAndPassword(email, pass);
      await db.collection('users').doc(res.user.uid).set({
        email,
        username,
        role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      statusEl.innerText='Signed up! Redirecting...';
      setTimeout(()=>location.href='index.html',800);
    } catch(e) {
      statusEl.innerText='Error: ' + e.message;
    }
  };

  // Login
  loginBtn.onclick = async () => {
    const email = emailEl.value.trim();
    const pass = passwordEl.value;

    if(!email || !pass) { statusEl.innerText='Enter email & password'; return; }

    try {
      await auth.signInWithEmailAndPassword(email, pass);
      statusEl.innerText='Logged in! Redirecting...';
      setTimeout(()=>location.href='index.html',500);
    } catch(e) {
      statusEl.innerText='Error: ' + e.message;
    }
  };

  // Google sign-in (defaults to student unless edited manually later)
  googleBtn.onclick = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const res = await auth.signInWithPopup(provider);
      const uid = res.user.uid;
      const doc = await db.collection('users').doc(uid).get();

      if(!doc.exists){
        const username = res.user.displayName || (res.user.email ? res.user.email.split('@')[0] : 'user');
        await db.collection('users').doc(uid).set({
          email: res.user.email,
          username,
          role: 'student', // google accounts default role
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      statusEl.innerText='Signed in. Redirecting...';
      setTimeout(()=>location.href='index.html',500);
    } catch(e){
      statusEl.innerText='Error: ' + e.message;
    }
  };
