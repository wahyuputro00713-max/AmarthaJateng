import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const registerForm = document.getElementById('registerForm');
const loadingOverlay = document.getElementById('loadingOverlay');

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const nama = document.getElementById('nama').value;
    const idKaryawan = document.getElementById('idKaryawan').value.trim();
    const password = document.getElementById('password').value;
    const jabatan = document.getElementById('jabatan').value;
    const regional = document.getElementById('regional').value;

    if (password.length < 6) {
        alert("Password minimal 6 karakter!");
        return;
    }

    // MANIPULASI: Buat email palsu dari ID
    const fakeEmail = idKaryawan + "@amartha.id";

    loadingOverlay.style.display = 'flex';

    createUserWithEmailAndPassword(auth, fakeEmail, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Simpan data lengkap ke Database (termasuk ID Karyawan asli)
            set(ref(db, 'users/' + user.uid), {
                nama: nama,
                idKaryawan: idKaryawan, // Simpan ID murni
                email: fakeEmail,       // Email sistem
                jabatan: jabatan,
                regional: regional,
                area: "", // Kosong dulu
                point: "" // Kosong dulu
            })
            .then(() => {
                alert("✅ Pendaftaran Berhasil! Silakan Login.");
                window.location.href = "index.html";
            })
            .catch((error) => {
                console.error("DB Error:", error);
                alert("Gagal menyimpan data user.");
                loadingOverlay.style.display = 'none';
            });
        })
        .catch((error) => {
            loadingOverlay.style.display = 'none';
            const errorCode = error.code;
            
            if (errorCode === 'auth/email-already-in-use') {
                alert("❌ ID Karyawan ini sudah terdaftar!");
            } else if (errorCode === 'auth/invalid-email') {
                alert("❌ Format ID Karyawan tidak valid (Gunakan angka/huruf tanpa spasi).");
            } else {
                alert("Gagal Daftar: " + error.message);
            }
        });
});
