import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIG FIREBASE (Pastikan Config Anda benar) ---
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

// Cek jika sudah login, langsung lempar ke home
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("home.html");
    }
});

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Perhatikan ID ini harus sama dengan di HTML
        const idInput = document.getElementById('idKaryawan');
        const passInput = document.getElementById('password');

        if (!idInput || !passInput) {
            alert("Error: Kolom input tidak ditemukan. Coba Clear Cache.");
            return;
        }

        const idKaryawan = idInput.value.trim();
        const password = passInput.value;

        if (!idKaryawan || !password) {
            alert("Mohon isi ID Karyawan dan Password");
            return;
        }

        // Ubah ID jadi Email Sistem
        const fakeEmail = idKaryawan + "@amartha.id";

        // Tampilkan Loading (Opsional jika ada elemen loading)
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        signInWithEmailAndPassword(auth, fakeEmail, password)
            .then((userCredential) => {
                // Sukses - redirect ditangani juga oleh onAuthStateChanged, tapi ini fallback
                window.location.replace("home.html");
            })
            .catch((error) => {
                // Sembunyikan loading jika error
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

// --- LOGIKA LUPA PASSWORD (BARU) ---
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', (e) => {
        e.preventDefault();

        // 1. Cek apakah ID sudah diisi di kolom input
        let idVal = document.getElementById('idKaryawan').value.trim();
        
        // 2. Jika kosong, minta user input manual lewat prompt
        if (!idVal) {
            idVal = prompt("Masukkan ID Karyawan Anda untuk reset password:");
        } else {
            // Jika sudah terisi, konfirmasi ulang ke user
            const confirmReset = confirm(`Kirim link reset password untuk ID Karyawan: ${idVal}?`);
            if (!confirmReset) return; // Batal jika user klik Cancel
        }

        // 3. Proses Reset Password
        if (idVal) {
            const emailReset = idVal + "@amartha.id"; // Format email sistem

            // Tampilkan loading sebentar (opsional)
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.style.display = 'flex';

            sendPasswordResetEmail(auth, emailReset)
                .then(() => {
                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                    alert(`✅ Link reset password telah dikirim ke email sistem untuk ID: ${idVal}.\n\nSilakan cek inbox email Anda (atau hubungi Admin/IT jika Anda tidak memiliki akses ke email tersebut).`);
                })
                .catch((error) => {
                    if (loadingOverlay) loadingOverlay.style.display = 'none';
                    
                    const errorCode = error.code;
                    console.error("Reset Password Error:", errorCode);
                    
                    if (errorCode === 'auth/user-not-found') {
                        alert("❌ ID Karyawan tidak ditemukan di sistem.");
                    } else if (errorCode === 'auth/invalid-email') {
                        alert("❌ Format ID tidak valid.");
                    } else {
                        alert("Gagal memproses reset password: " + error.message);
                    }
                });
        }
    });
}

// --- LOGIKA TOGGLE PASSWORD (Show/Hide) ---
const togglePassword = document.querySelector('#togglePassword');
const passwordInput = document.querySelector('#password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        // 1. Cek tipe saat ini (password atau text)
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        
        // 2. Ubah tipe inputnya
        passwordInput.setAttribute('type', type);
        
        // 3. Ganti ikon (Mata Terbuka <-> Mata Dicoret)
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}
