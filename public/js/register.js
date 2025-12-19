// js/register.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const db = getDatabase(app);

// DOM Elements
const registerForm = document.getElementById('registerForm');
const idKaryawanInput = document.getElementById('idKaryawan');
const namaInput = document.getElementById('namaInput');
const emailInput = document.getElementById('emailInput'); // Email ini hanya disimpan di Database sebagai kontak
const passwordInput = document.getElementById('passwordInput');
const captchaInput = document.getElementById('captchaInput');
const captchaPreview = document.getElementById('captchaPreview');
const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
const alertBox = document.getElementById('alertMessage');

// --- CAPTCHA ---
let generatedCaptcha = "";
function generateCaptcha() {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generatedCaptcha = result;
    captchaPreview.innerText = result;
}
generateCaptcha();
refreshCaptchaBtn.addEventListener('click', () => {
    generateCaptcha();
    captchaInput.value = "";
});

function showAlert(message, type) {
    alertBox.innerHTML = `<div class="alert alert-${type} text-center" role="alert">${message}</div>`;
}

// --- LOGIKA REGISTER (ID KARYAWAN BASED) ---
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const idKaryawan = idKaryawanInput.value.trim(); // INI YANG JADI USERNAME
    const nama = namaInput.value.trim();
    const contactEmail = emailInput.value.trim(); // Email asli user (untuk kontak)
    const password = passwordInput.value;
    const userCaptcha = captchaInput.value.trim().toUpperCase();

    if (userCaptcha !== generatedCaptcha) {
        showAlert("Captcha salah!", "danger");
        generateCaptcha();
        return;
    }

    if (password.length < 6) {
        showAlert("Password minimal 6 karakter.", "warning");
        return;
    }

    // MEMBUAT EMAIL FORMAT KHUSUS LOGIN
    // Contoh: ID '123' -> Login pakai '123@amartha.id'
    const loginEmail = idKaryawan + "@amartha.id";

    showAlert("Mendaftar...", "info");

    // Create User menggunakan Login Email (ID Karyawan)
    createUserWithEmailAndPassword(auth, loginEmail, password)
        .then((userCredential) => {
            const user = userCredential.user;

            updateProfile(user, { displayName: nama })
            .then(() => {
                // Simpan data lengkap ke Database
                set(ref(db, 'users/' + user.uid), {
                    idKaryawan: idKaryawan,
                    nama: nama,
                    contactEmail: contactEmail, // Email asli disimpan di sini
                    role: 'user',
                    createdAt: serverTimestamp()
                })
                .then(() => {
                    showAlert("Pendaftaran Berhasil! Silakan Login dengan ID Karyawan.", "success");
                    setTimeout(() => { window.location.href = "index.html"; }, 2000);
                });
            });
        })
        .catch((error) => {
            console.error("Register Error:", error.code);
            let msg = "Gagal mendaftar.";
            if (error.code === 'auth/email-already-in-use') {
                msg = "ID Karyawan ini sudah terdaftar.";
            }
            showAlert(msg, "danger");
        });
});
