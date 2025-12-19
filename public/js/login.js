// js/login.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const alertBox = document.getElementById('alertMessage');
const forgotCheck = document.getElementById('forgotPasswordCheck');

function showAlert(message, type) {
    alertBox.innerHTML = `<div class="alert alert-${type} text-center" role="alert">${message}</div>`;
    setTimeout(() => { alertBox.innerHTML = ''; }, 5000); 
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); 

    const email = emailInput.value;
    const password = passwordInput.value;
    const isForgotChecked = forgotCheck.checked;

    if (isForgotChecked) {
        showAlert("Fitur reset password belum diimplementasikan.", "warning");
        return; 
    }

    showAlert("Memproses login...", "info");

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("Login Auth Berhasil, UID:", user.uid);

            const userLoginsRef = ref(db, 'users/' + user.uid + '/logins');
            const newLoginRef = push(userLoginsRef);

            set(newLoginRef, {
                timestamp: serverTimestamp(),
                device: 'web-app',
                status: 'success'
            })
            .then(() => {
                console.log("Data login berhasil dicatat di RTDB");
                showAlert("Login Berhasil! Mengalihkan...", "success");
                
                // --- PERBAIKAN DI SINI (REDIRECT AKTIF) ---
                // Mengalihkan ke 'home.html' setelah 1.5 detik
                setTimeout(() => { 
                    window.location.href = "home.html"; 
                }, 1500);
            })
            .catch((error) => {
                 console.error("Error menulis ke RTDB:", error);
                 showAlert("Login berhasil, namun gagal mencatat data aktivitas.", "warning");
                 
                 // Tetap alihkan meskipun gagal catat log (opsional)
                 setTimeout(() => { window.location.href = "home.html"; }, 1500);
            });

        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Login Gagal:", errorCode);

            let displayError = "Login Gagal. Periksa kembali email dan password.";
            if(errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-email') {
                displayError = "Email atau password salah.";
            } else if (errorCode === 'auth/too-many-requests') {
                 displayError = "Terlalu banyak percobaan gagal. Coba lagi nanti.";
            } else if (errorCode === 'auth/network-request-failed') {
                displayError = "Masalah koneksi internet.";
            }
            
            showAlert(displayError, "danger");
        });
});
