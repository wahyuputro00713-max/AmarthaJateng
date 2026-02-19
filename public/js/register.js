import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirebaseApp } from "./firebase-init.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- KONFIGURASI FIREBASE ANDA ---


const app = getFirebaseApp();
const auth = getAuth(app);
const db = getDatabase(app);

// --- URL SPREADSHEET (GANTI DENGAN URL DEPLOY ANDA SENDIRI) ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzALH32bhvun0k5No-bVpjRymmUervxFj_CbNK3JHmTxuXtjCbfLuIb4jI--6PU2mwSaQ/exec"; 

const registerForm = document.getElementById('registerForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Ambil Data
        const nama = document.getElementById('nama').value.trim();
        const idKaryawan = document.getElementById('idKaryawan').value.trim();
        const emailPribadi = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const jabatan = document.getElementById('jabatan').value;
        const regional = document.getElementById('regional').value;
        
        // 2. Format HP (Tambahkan 62)
        const inputNoHp = document.getElementById('noHp').value.trim();
        const formattedHp = "62" + inputNoHp; 

        // 3. Ambil Area & Point
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

        // 4. Validasi Password
        if (password.length < 6) {
            alert("Password minimal 6 karakter!");
            return;
        }

        loadingOverlay.style.display = 'flex';

        // 5. Cek ID Karyawan di DB
        const dbRef = ref(db);
        get(child(dbRef, `data_karyawan/${idKaryawan}`)).then((snapshot) => {
            if (snapshot.exists()) {
                loadingOverlay.style.display = 'none';
                alert("❌ ID Karyawan " + idKaryawan + " sudah terdaftar!");
            } else {
                // Lanjut daftar
                prosesRegisterAuth(emailPribadi, password, nama, idKaryawan, formattedHp, jabatan, regional, area, point);
            }
        }).catch((err) => {
            loadingOverlay.style.display = 'none';
            console.error("Firebase Check Error:", err);
            alert("Terjadi kesalahan koneksi.");
        });
    });
}

function prosesRegisterAuth(email, password, nama, idKaryawan, hp, jabatan, regional, area, point) {
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Siapkan Object Data untuk disimpan
            const userData = {
                nama: nama,
                idKaryawan: idKaryawan,
                email: email,
                noHp: hp,       // Kunci ini (noHp) harus sama dengan yang dibaca di Apps Script
                jabatan: jabatan,
                regional: regional,
                area: area,
                point: point,
                uid: user.uid,
                createdAt: new Date().toISOString()
            };

            console.log("Mengirim data ke Spreadsheet:", userData); // Debugging

            // Simpan ke 3 Tempat:
            // 1. Database Users (Profil)
            const p1 = set(ref(db, 'users/' + user.uid), userData);
            // 2. Database Lookup (Agar bisa login pakai ID)
            const p2 = set(ref(db, 'data_karyawan/' + idKaryawan), { email: email, uid: user.uid });
            // 3. Google Spreadsheet
            const p3 = kirimKeSpreadsheet(userData);

            Promise.all([p1, p2, p3])
                .then(() => {
                    alert("✅ Registrasi Berhasil!");
                    window.location.href = "index.html"; 
                })
                .catch((error) => {
                    console.error("Error Sinkronisasi:", error);
                    // Tetap arahkan sukses karena akun sudah jadi
                    alert("Registrasi sukses (Sinkronisasi data mungkin tertunda).");
                    window.location.href = "index.html";
                });
        })
        .catch((error) => {
            loadingOverlay.style.display = 'none';
            if (error.code === 'auth/email-already-in-use') alert("❌ Email sudah terdaftar!");
            else if (error.code === 'auth/weak-password') alert("❌ Password lemah.");
            else alert("Error: " + error.message);
        });
}

function kirimKeSpreadsheet(data) {
    return fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Wajib no-cors agar tidak diblokir browser
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

// Fitur Toggle Password (Ikon Mata)
const togglePw = document.querySelector('#togglePassword');
const pwInput = document.querySelector('#password');
if (togglePw && pwInput) {
    togglePw.addEventListener('click', function () {
        const type = pwInput.getAttribute('type') === 'password' ? 'text' : 'password';
        pwInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
}
