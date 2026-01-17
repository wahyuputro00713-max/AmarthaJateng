import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, child, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// --- 1. CEK SESSION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.replace("home.html");
    }
});

// --- 2. LOGIKA LOGIN (REVISI TOTAL) ---
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const idInput = document.getElementById('idKaryawan');
        const passInput = document.getElementById('password');
        const loadingOverlay = document.getElementById('loadingOverlay');

        const idKaryawan = idInput.value.trim();
        const password = passInput.value;

        if (!idKaryawan || !password) {
            alert("Mohon isi ID Karyawan dan Password");
            return;
        }

        // Tampilkan Loading
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            // LANGKAH A: Cari Email Asli berdasarkan ID di Database
            // Kita tidak lagi menggunakan fake email, tapi mencari email real user
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, `data_karyawan/${idKaryawan}`));

            if (!snapshot.exists()) {
                throw new Error("ID Karyawan tidak ditemukan di database.");
            }

            const userData = snapshot.val();
            const realEmail = userData.email;

            if (!realEmail) {
                throw new Error("Data karyawan ditemukan, tapi Email Asli belum disetting.");
            }

            // LANGKAH B: Login menggunakan Email Asli yang ditemukan
            await signInWithEmailAndPassword(auth, realEmail, password);
            
            // Jika sukses, onAuthStateChanged akan mengurus redirect
            // Tapi kita bisa force redirect juga disini
            window.location.replace("home.html");

        } catch (error) {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            console.error("Login Error:", error);

            const errorCode = error.code;

            // Handle Error
            if (error.message.includes("ID Karyawan tidak ditemukan")) {
                alert("❌ ID Karyawan tidak terdaftar.");
            } else if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
                alert("❌ Password salah! (Pastikan ID benar)");
            } else if (errorCode === 'auth/too-many-requests') {
                alert("⚠️ Terlalu banyak percobaan gagal. Tunggu sebentar.");
            } else {
                alert("Gagal Login: " + error.message);
            }
        }
    });
}

// --- 3. LOGIKA LUPA PASSWORD (SAMA SEPERTI SEBELUMNYA) ---
// Logika ini sudah benar karena mereset Email Asli.
// Dan karena Login di atas sekarang juga pakai Email Asli, maka password baru akan bekerja.

const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        let idVal = document.getElementById('idKaryawan').value.trim();
        
        if (!idVal) {
            idVal = prompt("Masukkan ID Karyawan Anda untuk reset password:");
        }

        if (!idVal) return;

        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, `data_karyawan/${idVal}`));

            if (snapshot.exists()) {
                const userData = snapshot.val();
                const realEmail = userData.email;

                if (!realEmail) throw new Error("Email tidak ditemukan untuk ID ini.");

                // Konfirmasi Masking
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                const maskedEmail = realEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3");
                
                const confirmReset = confirm(`Kirim link reset password ke email: ${maskedEmail}?`);
                if (!confirmReset) return;

                if (loadingOverlay) loadingOverlay.style.display = 'flex';

                // Kirim Reset ke Email Asli
                await sendPasswordResetEmail(auth, realEmail);
                
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                alert(`✅ Link reset terkirim ke: ${realEmail}. Silakan cek email lalu login dengan password baru.`);
                
            } else {
                throw new Error("ID tidak ditemukan.");
            }

        } catch (error) {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            alert("Gagal: " + error.message);
        }
    });
}

// --- 4. TOGGLE PASSWORD ---
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
