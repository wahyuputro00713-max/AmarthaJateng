// js/home.js - VERSI DEBUGGING (Agar tidak terpental)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- KONFIGURASI FIREBASE ---
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

// Pesan Status di Layar (Untuk Debugging)
function showDebugStatus(msg, color) {
    const statusDiv = document.createElement('div');
    statusDiv.style.position = 'fixed';
    statusDiv.style.top = '0';
    statusDiv.style.left = '0';
    statusDiv.style.width = '100%';
    statusDiv.style.padding = '20px';
    statusDiv.style.backgroundColor = 'white';
    statusDiv.style.color = color;
    statusDiv.style.fontWeight = 'bold';
    statusDiv.style.zIndex = '9999';
    statusDiv.style.borderBottom = `5px solid ${color}`;
    statusDiv.innerText = msg;
    document.body.prepend(statusDiv);
}

// 1. Cek Status Login
console.log("Memulai pengecekan auth...");

onAuthStateChanged(auth, (user) => {
    if (user) {
        // --- JIKA SUKSES ---
        console.log("User ditemukan:", user.email);
        showDebugStatus(`SUKSES: User terdeteksi sebagai ${user.email}`, 'green');
        
        // Tampilkan nama di halaman
        const displayName = user.displayName ? user.displayName : user.email.split('@')[0];
        if (userNameSpan) userNameSpan.textContent = displayName;
        
    } else {
        // --- JIKA GAGAL ---
        console.log("User tidak ditemukan (null)");
        showDebugStatus("GAGAL: Firebase tidak menemukan data login. (Jangan panik, lihat console)", 'red');
        
        // SAYA MEMATIKAN REDIRECT DI BAWAH INI AGAR ANDA BISA BACA PESANNYA
        // window.location.replace("index.html"); 
    }
});

// 2. Fungsi Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.replace("index.html");
        });
    });
}
