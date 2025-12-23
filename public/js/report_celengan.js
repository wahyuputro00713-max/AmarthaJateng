import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// ⚠️ PASTE URL APPS SCRIPT ANDA DI SINI ⚠️
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Auto Tanggal
    const tgl = document.getElementById('tanggalInput');
    if(tgl) tgl.value = new Date().toISOString().split('T')[0];

    // 2. Cek Login & Load Data
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadUserProfile(user.uid);
        } else {
            window.location.replace("index.html");
        }
    });

    // 3. Listener Submit
    const formEl = document.getElementById('celenganForm');
    if(formEl) {
        formEl.addEventListener('submit', submitLaporan);
    }
});

// --- FUNGSI LOAD PROFIL (AUTO FILL) ---
function loadUserProfile(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            if(document.getElementById('namaKaryawan')) document.getElementById('namaKaryawan').value = data.nama || "-";
            if(document.getElementById('idKaryawan')) document.getElementById('idKaryawan').value = data.idKaryawan || "-";
            if(document.getElementById('regionalInput')) document.getElementById('regionalInput').value = data.regional || "Jawa Tengah 1";
            if(document.getElementById('areaDisplay')) document.getElementById('areaDisplay').value = data.area || "-";
            if(document.getElementById('pointDisplay')) document.getElementById('pointDisplay').value = data.point || "-";
        }
    });
}

// --- FUNGSI SUBMIT (HANYA PROFIL + KODE TRANSAKSI) ---
async function submitLaporan(e) {
    e.preventDefault();
    
    // Ambil Elemen
    const elArea = document.getElementById('areaDisplay');
    const elKode = document.getElementById('kodeTransaksi');

    // Cek Kelengkapan Elemen HTML
    if (!elArea || !elKode) {
        alert("❌ Error Script: Elemen HTML tidak ditemukan. Hubungi IT.");
        return;
    }

    // Ambil Value
    const area = elArea.value;
    const kode = elKode.value.trim();

    // Validasi Data
    if(!area || area === "-") { alert("❌ Data Area/Profil belum termuat."); return; }
    if(!kode) { alert("❌ Kode Transaksi wajib diisi!"); return; }

    const loadingOverlay = document.getElementById('loadingOverlay');
    if(loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        // Susun Data Sederhana
        const formData = {
            jenisLaporan: "Celengan",
            
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaKaryawan').value,
            regional: document.getElementById('regionalInput').value,
            area: area,
            point: document.getElementById('pointDisplay').value,
            
            kodeTransaksi: kode // Data Utama
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.result === 'success') {
            alert("✅ Laporan Celengan Berhasil Disimpan!");
            window.location.href = "home.html";
        } else {
            // TANGKAP ERROR (MISAL KODE DUPLIKAT)
            throw new Error(result.error);
        }

    } catch (error) {
        console.error("Error:", error);
        alert("❌ Gagal Kirim: " + error.message);
    } finally {
        if(loadingOverlay) loadingOverlay.style.display = 'none';
    }
}
