// js/register.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const db = getDatabase(app);

// DOM Elements
const registerForm = document.getElementById('registerForm');
const idKaryawanInput = document.getElementById('idKaryawan');
const namaInput = document.getElementById('namaInput');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const captchaInput = document.getElementById('captchaInput');
const captchaPreview = document.getElementById('captchaPreview');
const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
const alertBox = document.getElementById('alertMessage');

// --- LOGIKA CAPTCHA SEDERHANA ---
let generatedCaptcha = "";

function generateCaptcha() {
    // Membuat string acak 5 karakter (angka & huruf besar)
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    generatedCaptcha = result;
    captchaPreview.innerText = result; // Tampilkan di layar
}

// Generate captcha saat halaman dimuat
generateCaptcha();

// Tombol refresh captcha
refreshCaptchaBtn.addEventListener('click', () => {
    generateCaptcha();
    captchaInput.value = ""; // Kosongkan input user
});

// Helper Alert
function showAlert(message, type) {
    alertBox.innerHTML = `<div class="alert alert-${type} text-center" role="alert">${message}</div>`;
}

// --- LOGIKA REGISTER ---
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const idKaryawan = idKaryawanInput.value.trim();
    const nama = namaInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const userCaptcha = captchaInput.value.trim().toUpperCase(); // Ubah ke huruf besar

    // 1. Validasi Captcha
    if (userCaptcha !== generatedCaptcha) {
        showAlert("Kode Captcha salah! Silakan coba lagi.", "danger");
        generateCaptcha(); // Ganti kode biar aman
        captchaInput.value = "";
        return;
    }

    // 2. Validasi Password
    if (password.length < 6) {
        showAlert("Password minimal 6 karakter.", "warning");
        return;
    }

    showAlert("Sedang mendaftarkan akun...", "info");

    // 3. Buat Akun di Firebase Auth
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            console.log("Akun dibuat:", user.uid);

            // 4. Update Profile (Menyimpan Nama Display di Auth)
            updateProfile(user, {
                displayName: nama
            }).then(() => {
                
                // 5. Simpan Data Lengkap ke Realtime Database
                // Path: users/[UID]
                set(ref(db, 'users/' + user.uid), {
                    idKaryawan: idKaryawan,
                    nama: nama,
                    email: email,
                    role: 'user', // Default role
                    createdAt: serverTimestamp()
                })
                .then(() => {
                    showAlert("Pendaftaran Berhasil! Mengalihkan...", "success");
                    // Redirect ke halaman Home setelah 1.5 detik
                    setTimeout(() => {
                        window.location.href = "home.html";
                    }, 1500);
                })
                .catch((error) => {
                    console.error("Gagal simpan database:", error);
                    showAlert("Akun dibuat tapi gagal simpan biodata.", "warning");
                });

            }).catch((error) => {
                console.error("Gagal update profile:", error);
            });

        })
        .catch((error) => {
            const errorCode = error.code;
            console.error("Register Error:", errorCode);
            
            let msg = "Gagal mendaftar.";
            if (errorCode === 'auth/email-already-in-use') {
                msg = "Email sudah terdaftar. Silakan login.";
            } else if (errorCode === 'auth/invalid-email') {
                msg = "Format email tidak valid.";
            } else if (errorCode === 'auth/weak-password') {
                msg = "Password terlalu lemah.";
            }

            showAlert(msg, "danger");
            generateCaptcha(); // Refresh captcha jika gagal
        });
});
