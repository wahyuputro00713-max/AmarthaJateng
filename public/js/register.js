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

// --- KONFIGURASI SPREADSHEET (GOOGLE APPS SCRIPT) ---
// GANTI URL DI BAWAH INI DENGAN URL DEPLOYMENT ANDA SENDIRI
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzALH32bhvun0k5No-bVpjRymmUervxFj_CbNK3JHmTxuXtjCbfLuIb4jI--6PU2mwSaQ/exec"; 

// --- LOGIKA REGISTER ---
const registerForm = document.getElementById('registerForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Ambil Data Input
        const nama = document.getElementById('nama').value.trim();
        const idKaryawan = document.getElementById('idKaryawan').value.trim();
        const emailPribadi = document.getElementById('email').value.trim();
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

        loadingOverlay.style.display = 'flex';

        // 3. CEK DATA
        const dbRef = ref(db);
        get(child(dbRef, `data_karyawan/${idKaryawan}`)).then((snapshot) => {
            if (snapshot.exists()) {
                loadingOverlay.style.display = 'none';
                alert("❌ ID Karyawan " + idKaryawan + " sudah terdaftar!");
                return;
            } else {
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
            
            // Siapkan Object Data
            const userData = {
                nama: nama,
                idKaryawan: idKaryawan,
                email: email,
                noHp: hp,
                jabatan: jabatan,
                regional: regional,
                area: area,
                point: point,
                uid: user.uid,
                createdAt: new Date().toISOString()
            };

            // SIMPAN KE FIREBASE (2 LOKASI)
            const p1 = set(ref(db, 'users/' + user.uid), userData);
            const p2 = set(ref(db, 'data_karyawan/' + idKaryawan), { email: email, uid: user.uid });

            // SIMPAN KE SPREADSHEET (Parallel)
            const p3 = kirimKeSpreadsheet(userData);

            Promise.all([p1, p2, p3])
                .then(() => {
                    alert("✅ Registrasi Berhasil! Data tersimpan di System & Spreadsheet.");
                    window.location.href = "index.html"; 
                })
                .catch((error) => {
                    console.error("Salah satu penyimpanan gagal:", error);
                    // Tetap arahkan sukses karena akun Auth sudah jadi
                    alert("Registrasi berhasil, namun ada kendala sinkronisasi data.");
                    window.location.href = "index.html";
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

// --- FUNGSI KIRIM KE SPREADSHEET ---
function kirimKeSpreadsheet(data) {
    // Gunakan mode 'no-cors' karena Google Script Web App berada di domain berbeda
    // Catatan: 'no-cors' berarti kita tidak bisa membaca respons JSON 'success' dari Google, 
    // tapi data tetap terkirim.
    
    return fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(data)
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
