// js/login.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements (Perhatikan ID baru 'idLoginInput')
const loginForm = document.getElementById('loginForm');
const idInput = document.getElementById('idLoginInput'); 
const passwordInput = document.getElementById('passwordInput');
const alertBox = document.getElementById('alertMessage');
const forgotCheck = document.getElementById('forgotPasswordCheck');

function showAlert(message, type) {
    alertBox.innerHTML = `<div class="alert alert-${type} text-center" role="alert">${message}</div>`;
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); 

    const idKaryawan = idInput.value.trim();
    const password = passwordInput.value;

    if (forgotCheck.checked) {
        showAlert("Fitur reset password belum tersedia.", "warning");
        return; 
    }

    // --- LOGIKA BARU: FORMAT ID KE EMAIL ---
    // Karena Firebase butuh email, kita ubah ID '12345' jadi '12345@amartha.id'
    const emailFormat = idKaryawan + "@amartha.id";

    showAlert("Memproses login...", "info");

    signInWithEmailAndPassword(auth, emailFormat, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("Login Berhasil, UID:", user.uid);

            // Simpan log aktivitas ke RTDB
            const userLoginsRef = ref(db, 'users/' + user.uid + '/logins');
            push(userLoginsRef, {
                timestamp: serverTimestamp(),
                device: 'web-app',
                method: 'id-login',
                status: 'success'
            });

            showAlert("Login Berhasil! Mengalihkan...", "success");
            
            // Pindah ke Home
            setTimeout(() => { 
                window.location.replace("home.html"); 
            }, 1000);
        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Login Gagal:", errorCode);

            let displayError = "ID Karyawan atau Password salah.";
            
            // Error handling khusus
            if(errorCode === 'auth/invalid-email') {
                displayError = "Format ID Karyawan tidak valid.";
            } else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
                displayError = "ID Karyawan atau Password salah.";
            } else if (errorCode === 'auth/too-many-requests') {
                 displayError = "Terlalu banyak percobaan gagal. Coba lagi nanti.";
            }
            
            showAlert(displayError, "danger");
        });
});
