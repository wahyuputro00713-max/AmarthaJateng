// js/home.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- KONFIGURASI FIREBASE (Sudah disesuaikan dengan milik Anda) ---
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

// Elemen DOM
const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// 1. Cek Status Login (Security Check)
// Fungsi ini yang menjaga agar halaman tidak bisa dibuka kalau belum login
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User DITEMUKAN (Sedang login)
        console.log("User terdeteksi di Home:", user.email);
        
        // Tampilkan nama (mengambil nama depan dari email)
        const displayName = user.displayName ? user.displayName : user.email.split('@')[0];
        if (userNameSpan) {
            userNameSpan.textContent = displayName;
        }
        
    } else {
        // User TIDAK DITEMUKAN (Belum login)
        console.log("User tidak login, mengembalikan ke halaman login...");
        // Redirect paksa ke halaman login
        window.location.replace("index.html");
    }
});

// 2. Fungsi Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if(confirm("Apakah Anda yakin ingin logout?")) {
            signOut(auth).then(() => {
                // Sign-out berhasil
                window.location.replace("index.html");
            }).catch((error) => {
                console.error("Logout Error:", error);
                alert("Gagal logout. Coba lagi.");
            });
        }
    });
}
