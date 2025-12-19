// js/home.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- KONFIGURASI FIREBASE ANDA ---
const firebaseConfig = {
    apiKey: "AIzaSyC8wOUkyZTa4W2hHHGZq_YKnGFqYEGOuH8",
    authDomain: "amarthajatengwebapp.firebaseapp.com",
    databaseURL: "https://amarthajatengwebapp-default-rtdb.firebaseio.com",
    projectId: "amarthajatengwebapp",
    storageBucket: "amarthajatengwebapp.firebasestorage.app",
    messagingSenderId: "22431520744",
    appId: "1:22431520744:web:711af76a5335d97179765d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elemen DOM
const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// 1. Cek Status Login (Security Check)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User sedang login
        console.log("User terdeteksi:", user.email);
        
        // Tampilkan nama user (atau email jika nama tidak ada)
        const displayName = user.displayName ? user.displayName : user.email.split('@')[0];
        if (userNameSpan) {
            userNameSpan.textContent = displayName;
        }
        
    } else {
        // User tidak login -> Tendang ke halaman login
        console.log("User tidak login, redirecting...");
        window.location.replace("index.html");
    }
});

// 2. Fungsi Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // Konfirmasi sebelum logout
        if(confirm("Apakah Anda yakin ingin keluar?")) {
            signOut(auth).then(() => {
                // Logout berhasil
                console.log("Logout Berhasil");
                window.location.replace("index.html");
            }).catch((error) => {
                // Error saat logout
                console.error("Logout Error:", error);
                alert("Gagal logout. Coba lagi.");
            });
        }
    });
} else {
    console.error("Tombol Logout tidak ditemukan! Cek ID 'logoutBtn' di HTML.");
}
