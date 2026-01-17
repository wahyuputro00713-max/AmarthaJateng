import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, child, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIG FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyC8wOUkyZTa4W2hHHGZq_YKnGFqYEGOuH8",
    authDomain: "amarthajatengwebapp.firebaseapp.com",
    databaseURL: "https://amarthajatengwebapp-default-rtdb.firebaseio.com",
    projectId: "amarthajatengwebapp",
    storageBucket: "amarthajatengwebapp.firebasestorage.app",
    messagingSenderId: "22431520744",
    appId: "1:22431520744:web:711af76a5335d97179765d"
};

// Inisialisasi App, Auth, dan Database
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- 1. CEK STATUS LOGIN ---
// Jika user mengakses halaman ini tapi sudah login, lempar ke home
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("home.html");
    }
});

// --- 2. LOGIKA LOGIN ---
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const idInput = document.getElementById('idKaryawan');
        const passInput = document.getElementById('password');

        if (!idInput || !passInput) {
            alert("Error: Elemen input tidak ditemukan. Coba refresh halaman.");
            return;
        }

        const idKaryawan = idInput.value.trim();
        const password = passInput.value;

        if (!idKaryawan || !password) {
            alert("Mohon isi ID Karyawan dan Password");
            return;
        }

        // Ubah ID jadi Email Sistem (Fake Email) untuk Login
        const fakeEmail = idKaryawan + "@amartha.id";

        // Tampilkan Loading
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        signInWithEmailAndPassword(auth, fakeEmail, password)
            .then((userCredential) => {
                // Sukses login
                window.location.replace("home.html");
            })
            .catch((error) => {
                // Sembunyikan loading
                if (loadingOverlay) loadingOverlay.style.display = 'none';

                const errorCode = error.code;
                console.error("Login Error:", errorCode);

                if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                    alert("❌ ID Karyawan atau Password salah!");
                } else if (errorCode === 'auth/too-many-requests') {
                    alert("⚠️ Terlalu banyak percobaan gagal. Tunggu sebentar.");
                } else {
                    alert("Gagal Login: " + error.message);
                }
            });
    });
}

// --- 3. LOGIKA LUPA PASSWORD (PERBAIKAN) ---
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        // A. Ambil ID dari input
        let idVal = document.getElementById('idKaryawan').value.trim();
        
        // B. Jika kosong, minta input manual
        if (!idVal) {
            idVal = prompt("Masukkan ID Karyawan Anda untuk reset password:");
        }

        // Jika user menekan Cancel atau tidak mengisi ID
        if (!idVal) return;

        // C. Tampilkan Loading
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            // D. CARI EMAIL ASLI DI DATABASE
            // Kita mencari di node: data_karyawan / {idKaryawan} / email
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, `data_karyawan/${idVal}`));

            if (snapshot.exists()) {
                const userData = snapshot.val();
                const realEmail = userData.email; // Pastikan field di database bernama 'email'

                if (!realEmail) {
                    throw new Error("ID ditemukan, tapi data email belum terdaftar di database.");
                }

                // E. Konfirmasi ke user (Masking email agar aman, misal b***@gmail.com)
                // Hapus overlay sebentar untuk menampilkan confirm dialog
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                
                const maskedEmail = realEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");
                const confirmReset = confirm(`Kirim link reset password ke email terdaftar: ${maskedEmail}?`);
                
                if (!confirmReset) return; 

                // Tampilkan loading lagi
                if (loadingOverlay) loadingOverlay.style.display = 'flex';

                // F. KIRIM LINK RESET KE EMAIL ASLI
                await sendPasswordResetEmail(auth, realEmail);
                
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                alert(`✅ Link reset password berhasil dikirim ke: ${realEmail}\n\nSilakan cek Inbox atau folder Spam email Anda.`);
                
            } else {
                throw new Error("ID Karyawan tidak ditemukan di database.");
            }

        } catch (error) {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            console.error("Reset Error:", error);

            if (error.message.includes("ID Karyawan tidak ditemukan")) {
                alert("❌ ID Karyawan tidak terdaftar di sistem database.");
            } else if (error.code === 'auth/user-not-found') {
                alert("❌ Akun Authentication tidak ditemukan.");
            } else {
                alert("Gagal: " + error.message);
            }
        }
    });
}

// --- 4. LOGIKA TOGGLE PASSWORD (Show/Hide) ---
const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        // Cek tipe saat ini
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Ganti ikon
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}
