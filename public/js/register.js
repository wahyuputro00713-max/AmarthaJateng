import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

        // 1. Ambil Data Input
        const nama = document.getElementById('nama').value.trim();
        const idKaryawan = document.getElementById('idKaryawan').value.trim();
        const emailPribadi = document.getElementById('email').value.trim(); // Gunakan Email Asli!
        const password = document.getElementById('password').value;
        const jabatan = document.getElementById('jabatan').value;
        const regional = document.getElementById('regional').value;
        const inputNoHp = document.getElementById('noHp').value.trim();
        const formattedHp = "62" + inputNoHp; 

        // 2. Ambil Area & Point
        let area = "";
        let point = "";
        const areaSelect = document.getElementById('areaSelect');
        const pointSelect = document.getElementById('pointSelect');

        if (jabatan === "AM") {
            area = areaSelect.value;
        } else if (jabatan === "BM" || jabatan === "BP") {
            area = areaSelect.value;
            point = pointSelect.value;
        }

        // --- VALIDASI ---
        if (password.length < 6) {
            alert("Password minimal 6 karakter!");
            return;
        }

        // Tampilkan Loading
        loadingOverlay.style.display = 'flex';

        // 3. CEK DULU: Apakah ID Karyawan sudah dipakai?
        const dbRef = ref(db);
        get(child(dbRef, `data_karyawan/${idKaryawan}`)).then((snapshot) => {
            if (snapshot.exists()) {
                loadingOverlay.style.display = 'none';
                alert("❌ ID Karyawan " + idKaryawan + " sudah terdaftar!");
                return;
            } else {
                // Jika ID belum ada, Lanjut Buat Akun dengan EMAIL ASLI
                prosesRegisterAuth(emailPribadi, password, nama, idKaryawan, formattedHp, jabatan, regional, area, point);
            }
        }).catch((error) => {
            loadingOverlay.style.display = 'none';
            console.error(error);
            alert("Terjadi kesalahan koneksi database.");
        });
    });
}

function prosesRegisterAuth(email, password, nama, idKaryawan, hp, jabatan, regional, area, point) {
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Siapkan Data User
            const userData = {
                nama: nama,
                idKaryawan: idKaryawan,
                email: email,       // Email Asli
                noHp: hp,
                jabatan: jabatan,
                regional: regional,
                area: area,
                point: point,
                createdAt: new Date().toISOString()
            };

            // SIMPAN KE DB (2 LOKASI)
            
            // Lokasi 1: Profil User (users/UID) - Untuk data profil
            const p1 = set(ref(db, 'users/' + user.uid), userData);

            // Lokasi 2: Lookup ID (data_karyawan/ID) - Agar bisa Login pakai ID
            // Kita simpan emailnya di sini agar nanti pas login bisa dicari
            const p2 = set(ref(db, 'data_karyawan/' + idKaryawan), {
                email: email,
                uid: user.uid
            });

            Promise.all([p1, p2])
                .then(() => {
                    alert("✅ Registrasi Berhasil! Silakan Cek Email Anda jika ada verifikasi.");
                    window.location.href = "index.html"; 
                })
                .catch((error) => {
                    console.error("Gagal simpan DB:", error);
                    alert("Akun dibuat tapi gagal menyimpan data.");
                });

        })
        .catch((error) => {
            loadingOverlay.style.display = 'none';
            if (error.code === 'auth/email-already-in-use') {
                alert("❌ Email ini sudah terdaftar!");
            } else if (error.code === 'auth/weak-password') {
                alert("❌ Password terlalu lemah.");
            } else {
                alert("Gagal: " + error.message);
            }
        });
}

// --- LOGIKA TOGGLE PASSWORD ---
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
