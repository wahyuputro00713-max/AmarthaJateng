// js/home.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- PASTE FIREBASE CONFIG DI SINI (SAMA SEPERTI DI LOGIN.JS) ---
const firebaseConfig = {
    apiKey: "PASTE_API_KEY_ANDA_DISINI",
    authDomain: "PASTE_PROJECT_ID_ANDA.firebaseapp.com",
    databaseURL: "https://PASTE_PROJECT_ID_ANDA-default-rtdb.firebaseio.com",
    projectId: "PASTE_PROJECT_ID_ANDA",
    storageBucket: "PASTE_PROJECT_ID_ANDA.appspot.com",
    messagingSenderId: "PASTE_SENDER_ID_ANDA",
    appId: "PASTE_APP_ID_ANDA"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Elemen DOM
const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// 1. Cek Status Login (Security Check)
// Jika user belum login, tendang kembali ke index.html
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User sedang login
        console.log("User terdeteksi:", user.email);
        
        // Tampilkan nama (atau email jika nama belum di-set)
        // Split email untuk mengambil nama depan sebelum @ jika displayName kosong
        const displayName = user.displayName ? user.displayName : user.email.split('@')[0];
        userNameSpan.textContent = displayName;
        
    } else {
        // User tidak login / sesi habis
        console.log("User tidak login, redirecting...");
        window.location.replace("index.html");
    }
});

// 2. Fungsi Logout
logoutBtn.addEventListener('click', () => {
    // Tampilkan konfirmasi (opsional)
    if(confirm("Apakah Anda yakin ingin logout?")) {
        signOut(auth).then(() => {
            // Sign-out successful.
            window.location.replace("index.html");
        }).catch((error) => {
            // An error happened.
            console.error("Logout Error:", error);
            alert("Gagal logout. Coba lagi.");
        });
    }
});
