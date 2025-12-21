import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIG FIREBASE (Pastikan Config Anda benar) ---
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

// Cek jika sudah login, langsung lempar ke home
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("home.html");
    }
});

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Perhatikan ID ini harus sama dengan di HTML
    const idInput = document.getElementById('idKaryawan');
    const passInput = document.getElementById('password');

    if (!idInput || !passInput) {
        alert("Error: Kolom input tidak ditemukan. Coba Clear Cache.");
        return;
    }

    const idKaryawan = idInput.value.trim();
    const password = passInput.value;

    if (!idKaryawan || !password) {
        alert("Mohon isi ID Karyawan dan Password");
        return;
    }

    // Ubah ID jadi Email Sistem
    const fakeEmail = idKaryawan + "@amartha.id";

    // Tampilkan Loading (Opsional jika ada elemen loading)
    // document.getElementById('loadingOverlay').style.display = 'flex';

    signInWithEmailAndPassword(auth, fakeEmail, password)
        .then((userCredential) => {
            // Sukses
            window.location.replace("home.html");
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Login Error:", errorCode);

            if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                alert("❌ ID Karyawan atau Password salah!");
            } else if (errorCode === 'auth/too-many-requests') {
                alert("⚠️ Terlalu banyak percobaan gagal. Tunggu sebentar.");
            } else {
                alert("Gagal Login: " + error.message);
            }
        });
});
