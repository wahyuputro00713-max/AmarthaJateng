import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIG FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyC8wOUkyZTa4W2hHHGZq_YKnGFqYEGOuH8",
    authDomain: "amarthajatengwebapp.firebaseapp.com",
    databaseURL: "https://amarthajatengwebapp-default-rtdb.firebaseio.com",
    projectId: "amarthajatengwebapp",
    storageBucket: "amarthajatengwebapp.firebasestorage.app",
    messagingSenderId: "22431520744",
    appId: "1:22431520744:web:711af76a5335d97179765d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Cek Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("home.html");
    }
});

const loginForm = document.getElementById('loginForm');
const loadingOverlay = document.getElementById('loadingOverlay');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const idKaryawan = document.getElementById('idKaryawan').value.trim();
    const password = document.getElementById('password').value;

    if (!idKaryawan || !password) {
        alert("Mohon isi ID Karyawan dan Password");
        return;
    }

    // MANIPULASI: Ubah ID jadi Email Fake
    // Contoh: "12345" menjadi "12345@amartha.id"
    const fakeEmail = idKaryawan + "@amartha.id";

    loadingOverlay.style.display = 'flex';

    signInWithEmailAndPassword(auth, fakeEmail, password)
        .then((userCredential) => {
            // Sukses
            window.location.replace("home.html");
        })
        .catch((error) => {
            loadingOverlay.style.display = 'none';
            const errorCode = error.code;
            console.error(errorCode);

            if (errorCode === 'auth/invalid-email' || errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
                alert("❌ ID Karyawan atau Password salah!");
            } else if (errorCode === 'auth/too-many-requests') {
                alert("⚠️ Terlalu banyak percobaan. Tunggu sebentar.");
            } else {
                alert("Gagal Login: " + error.message);
            }
        });
});
