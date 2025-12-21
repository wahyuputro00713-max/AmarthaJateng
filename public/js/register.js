import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// --- LOGIKA REGISTER ---
const registerForm = document.getElementById('registerForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Ambil Data Input
        const nama = document.getElementById('nama').value.trim();
        const idKaryawan = document.getElementById('idKaryawan').value.trim();
        const password = document.getElementById('password').value;
        const jabatan = document.getElementById('jabatan').value;
        const regional = document.getElementById('regional').value; // Mengambil value "Jawa Tengah 1"

        if (password.length < 6) {
            alert("Password minimal 6 karakter!");
            return;
        }

        // Tampilkan Loading
        loadingOverlay.style.display = 'flex';

        // Buat Email Palsu untuk Firebase Auth
        const fakeEmail = idKaryawan + "@amartha.id";

        createUserWithEmailAndPassword(auth, fakeEmail, password)
            .then((userCredential) => {
                const user = userCredential.user;
                
                // Simpan Data Lengkap ke Database Realtime
                set(ref(db, 'users/' + user.uid), {
                    nama: nama,
                    idKaryawan: idKaryawan,
                    email: fakeEmail,
                    jabatan: jabatan,
                    regional: regional,
                    area: "", // Kosongkan dulu
                    point: "" // Kosongkan dulu
                })
                .then(() => {
                    alert("✅ Registrasi Berhasil! Silakan Login.");
                    window.location.href = "index.html";
                })
                .catch((error) => {
                    console.error("Gagal simpan DB:", error);
                    alert("Akun dibuat, tapi gagal simpan data profil. Hubungi IT.");
                    loadingOverlay.style.display = 'none';
                });
            })
            .catch((error) => {
                loadingOverlay.style.display = 'none';
                const errorCode = error.code;
                
                if (errorCode === 'auth/email-already-in-use') {
                    alert("❌ ID Karyawan ini sudah terdaftar!");
                } else if (errorCode === 'auth/weak-password') {
                    alert("❌ Password terlalu lemah.");
                } else {
                    alert("Gagal Daftar: " + error.message);
                }
            });
    });
}

// --- LOGIKA TOGGLE PASSWORD (IKON MATA) ---
const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}
