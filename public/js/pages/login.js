// login.js

// Import fungsi yang dibutuhkan dari SDK Firebase secara modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, push, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- KONFIGURASI FIREBASE ---
// GANTI SELURUH OBJEK DI BAWAH INI DENGAN CONFIG DARI FIREBASE CONSOLE ANDA
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
// Initialize services
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements (Mengambil elemen HTML berdasarkan ID)
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const alertBox = document.getElementById('alertMessage');
const forgotCheck = document.getElementById('forgotPasswordCheck');

// Helper function untuk menampilkan pesan alert menggunakan style Bootstrap
function showAlert(message, type) {
    alertBox.innerHTML = `<div class="alert alert-${type} text-center" role="alert">${message}</div>`;
    // Hilangkan alert otomatis setelah 5 detik
    setTimeout(() => { alertBox.innerHTML = ''; }, 5000); 
}

// Event Listener untuk Submit Form
loginForm.addEventListener('submit', (e) => {
    // Mencegah halaman melakukan reload (behavior default form)
    e.preventDefault(); 

    const email = emailInput.value;
    const password = passwordInput.value;
    const isForgotChecked = forgotCheck.checked;

    // Logika sederhana jika checkbox lupa password dicentang
    if (isForgotChecked) {
        showAlert("Fitur reset password belum diimplementasikan, namun Anda mencentang kotaknya.", "warning");
        // Di sini Anda bisa menambahkan logika redirect ke halaman reset password jika diperlukan nanti.
        return; // Hentikan proses login jika ini dicentang (sesuai interpretasi permintaan)
    }

    showAlert("Memproses login...", "info");

    // --- Proses Login Firebase Auth ---
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Login Berhasil
            const user = userCredential.user;
            console.log("Login Auth Berhasil, UID:", user.uid);

            // --- Integrasi RTDB ---
            // Mencatat waktu login di Realtime Database
            // Path: users/[UID_PENGGUNA]/logins/
            const userLoginsRef = ref(db, 'users/' + user.uid + '/logins');
            const newLoginRef = push(userLoginsRef); // Membuat key unik baru

            set(newLoginRef, {
                timestamp: serverTimestamp(), // Menggunakan waktu server Firebase
                device: 'web-app',
                status: 'success'
            })
            .then(() => {
                console.log("Data login berhasil dicatat di RTDB");
                showAlert("Login Berhasil! Mengalihkan...", "success");
                
                // --- Redirect ---
                // Hapus komentar di bawah ini untuk mengalihkan ke halaman lain setelah sukses
                // setTimeout(() => { window.location.href = "dashboard.html"; }, 2000);
            })
            .catch((error) => {
                 console.error("Error menulis ke RTDB:", error);
                 // Login Auth berhasil, tapi gagal nulis ke RTDB (mungkin masalah koneksi atau rules)
                 showAlert("Login berhasil, namun gagal mencatat data aktivitas.", "warning");
            });

        })
        .catch((error) => {
            // Login Gagal
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error("Login Gagal:", errorCode, errorMessage);

            // Menampilkan pesan error yang lebih ramah pengguna berdasarkan kode error Firebase
            let displayError = "Login Gagal. Periksa kembali email dan password.";
            if(errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-email') {
                displayError = "Email atau password salah / tidak valid.";
            } else if (errorCode === 'auth/too-many-requests') {
                 displayError = "Terlalu banyak percobaan gagal. Akun dibekukan sementara. Coba lagi nanti.";
            } else if (errorCode === 'auth/network-request-failed') {
                displayError = "Gagal terhubung ke jaringan. Periksa koneksi internet Anda.";
            }
            
            showAlert(displayError, "danger");
        });
});
