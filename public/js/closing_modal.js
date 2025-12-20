import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// ⚠️ PASTE URL APPS SCRIPT YANG BARU DI SINI ⚠️
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwib7Lx6EU36EK2GZcYA_tu3sgbref92fpRCQPKlrtIdFa1HWGCKrXFkNe36fH8zIHa/exec"; 

// 1. Cek Login & Isi Data User
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const dataUser = snapshot.val();
                document.getElementById('idKaryawan').value = dataUser.idKaryawan || "-";
                document.getElementById('namaBP').value = dataUser.nama || "-";
            }
        });
    } else {
        window.location.replace("index.html");
    }
});

// 2. Set Tanggal Hari Ini
document.getElementById('tanggalInput').value = new Date().toISOString().split('T')[0];

// 3. Submit Logic
const form = document.getElementById('closingForm');
const loadingOverlay = document.getElementById('loadingOverlay');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validasi HTML 'required' sudah menangani kekosongan, 
    // tapi kita bisa tambah double check di sini jika mau.
    const custNum = document.getElementById('customerNumber').value;
    const jenisBayar = document.getElementById('jenisPembayaran').value;

    if (!custNum || !jenisBayar) {
        alert("Harap lengkapi semua kolom!");
        return;
    }

    loadingOverlay.style.display = 'flex';

    try {
        const formData = {
            jenisLaporan: "ClosingModal", // Penanda untuk Apps Script
            
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaBP').value,
            
            customerNumber: custNum,
            jenisPembayaran: jenisBayar
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.result === 'success') {
            alert("✅ Data Closing Berhasil Disimpan!");
            window.location.href = "home.html";
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error(error);
        alert("❌ Gagal: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
});
