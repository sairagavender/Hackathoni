

  const firebaseConfig = {
    apiKey: "AIzaSyDCOT7bvPnU4zhOAkOG_nFxSLP0f58itgo",
    authDomain: "veddit-a03a0.firebaseapp.com",
    projectId: "veddit-a03a0",
    storageBucket: "veddit-a03a0.firebasestorage.app",
    messagingSenderId: "841975514674",
    appId: "1:841975514674:web:3dcea2a6931cde3bfcde2b",
    measurementId: "G-73VBEQ32GT"
  };
  firebase.initializeApp(firebaseConfig);
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.storage = firebase.storage();
