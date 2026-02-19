import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirebaseApp } from "./firebase-init.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const app = getFirebaseApp();
const auth = getAuth(app);
const db = getDatabase(app);

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzALH32bhvun0k5No-bVpjRymmUervxFj_CbNK3JHmTxuXtjCbfLuIb4jI--6PU2mwSaQ/exec";

const registerForm = document.getElementById('registerForm');

function setLoading(isVisible) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = isVisible ? 'flex' : 'none';
    }
}

function formatNoHp(rawNoHp) {
    const digitsOnly = String(rawNoHp || '').replace(/\D/g, '');
    if (!digitsOnly) return '';
    if (digitsOnly.startsWith('62')) return digitsOnly;
    if (digitsOnly.startsWith('0')) return `62${digitsOnly.slice(1)}`;
    return `62${digitsOnly}`;
}

async function cekIdKaryawanTerdaftar(idKaryawan) {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `data_karyawan/${idKaryawan}`));
    return snapshot.exists();
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nama = document.getElementById('nama').value.trim();
        const idKaryawan = document.getElementById('idKaryawan').value.trim();
        const emailPribadi = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const jabatan = document.getElementById('jabatan').value;
        const regional = document.getElementById('regional').value;

        const inputNoHp = document.getElementById('noHp').value.trim();
        const formattedHp = formatNoHp(inputNoHp);

        let area = "";
        let point = "";
        const areaSelect = document.getElementById('areaSelect');
        const pointSelect = document.getElementById('pointSelect');

        if (jabatan === "AM") {
            area = areaSelect?.value || "";
        } else if (jabatan === "BM" || jabatan === "BP") {
            area = areaSelect?.value || "";
            point = pointSelect?.value || "";
        }

        if (!nama || !idKaryawan || !emailPribadi || !password || !jabatan || !regional || !formattedHp) {
            alert("Mohon lengkapi semua data registrasi.");
            return;
        }

        if (password.length < 6) {
            alert("Password minimal 6 karakter!");
            return;
        }

        setLoading(true);

        try {
            const sudahTerdaftar = await cekIdKaryawanTerdaftar(idKaryawan);
            if (sudahTerdaftar) {
                alert(`❌ ID Karyawan ${idKaryawan} sudah terdaftar!`);
                return;
            }

            await prosesRegisterAuth(emailPribadi, password, nama, idKaryawan, formattedHp, jabatan, regional, area, point);
        } catch (err) {
            console.error("Register Error:", err);
            if (err?.code === "auth/email-already-in-use") alert("❌ Email sudah terdaftar!");
            else if (err?.code === "auth/weak-password") alert("❌ Password lemah.");
            else alert("Terjadi kesalahan koneksi.");
        } finally {
            setLoading(false);
        }
    });
}

async function prosesRegisterAuth(email, password, nama, idKaryawan, hp, jabatan, regional, area, point) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userData = {
        nama,
        idKaryawan,
        email,
        noHp: hp,
        jabatan,
        regional,
        area,
        point,
        uid: user.uid,
        createdAt: new Date().toISOString()
    };

    const p1 = set(ref(db, `users/${user.uid}`), userData);
    const p2 = set(ref(db, `data_karyawan/${idKaryawan}`), { email, uid: user.uid });
    const p3 = kirimKeSpreadsheet(userData);

    try {
        await Promise.all([p1, p2, p3]);
        alert("✅ Registrasi Berhasil!");
    } catch (error) {
        console.error("Error Sinkronisasi:", error);
        alert("Registrasi sukses (Sinkronisasi data mungkin tertunda).");
    }

    window.location.href = "index.html";
}

function kirimKeSpreadsheet(data) {
    return fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

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
