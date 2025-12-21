import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyC8wOUkyZTa4W2hHHGZq_YKnGFqYEGOuH8",
    authDomain: "amarthajatengwebapp.firebaseapp.com",
    databaseURL: "https://amarthajatengwebapp-default-rtdb.firebaseio.com",
    projectId: "amarthajatengwebapp",
    storageBucket: "amarthajatengwebapp.firebasestorage.app",
    messagingSenderId: "22431520744",
    appId: "1:22431520744:web:711af76a5335d97179765d"
};

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKSLFYjD2Z8CSW2uT59rTjGMGpaPULVKvAsHKznItHlA8WIYGOveTJEcXcPbVESStN/exec"; 

// 1. DATA POINT (WAJIB ADA AGAR DROPDOWN MUNCUL)
const DATA_POINTS = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucul"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Set Tanggal Hari Ini
const today = new Date().toISOString().split('T')[0];
if(document.getElementById('tanggalInput')) {
    document.getElementById('tanggalInput').value = today;
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserData(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

function loadUserData(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Isi Form Readonly
            document.getElementById('namaKaryawan').value = data.nama || "";
            document.getElementById('idKaryawan').value = data.idKaryawan || "";
            document.getElementById('areaKaryawan').value = data.area || "";

            // 2. ISI DROPDOWN POINT
            const pointSelect = document.getElementById('pointKaryawan');
            const userArea = data.area;

            if (userArea && DATA_POINTS[userArea]) {
                pointSelect.innerHTML = '<option value="" disabled>Pilih Point...</option>';
                
                DATA_POINTS[userArea].forEach(pt => {
                    const option = document.createElement('option');
                    option.value = pt;
                    option.textContent = pt;
                    
                    // Auto Select jika sama dengan Profil
                    if (data.point && pt === data.point) {
                        option.selected = true;
                    }
                    pointSelect.appendChild(option);
                });
            } else {
                pointSelect.innerHTML = '<option value="" disabled selected>Area tidak valid/kosong</option>';
            }
        }
    });
}

// Fungsi Format Rupiah & Foto (Biarkan kode sebelumnya)
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

function setupRupiahInput(displayId, realId) {
    const display = document.getElementById(displayId);
    const real = document.getElementById(realId);
    if (display && real) {
        display.addEventListener('keyup', function(e) {
            let value = this.value.replace(/[^0-9]/g, '');
            real.value = value;
            if(value) this.value = formatRupiah(value).replace('Rp', '').trim();
            else this.value = '';
        });
    }
}

setupRupiahInput('amountValDisplay', 'amountValReal');
setupRupiahInput('amountModalDisplay', 'amountModalReal');

// Preview Foto
const fotoInput = document.getElementById('fotoInput');
const previewContainer = document.getElementById('previewContainer');
if (fotoInput) {
    fotoInput.addEventListener('change', function() {
        previewContainer.innerHTML = '';
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '100px'; img.style.borderRadius = '8px';
                previewContainer.appendChild(img);
            }
            reader.readAsDataURL(file);
        }
    });
}

// SUBMIT FORM
document.getElementById('validasiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const file = document.getElementById('fotoInput').files[0];
        let base64 = "";
        if (file) base64 = await toBase64(file);

        const formData = {
            jenisLaporan: "Validasi",
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaKaryawan').value,
            area: document.getElementById('areaKaryawan').value,
            
            // PENTING: Ambil value dari SELECT
            point: document.getElementById('pointKaryawan').value,
            
            jmlMitraVal: document.getElementById('jmlMitraVal').value,
            nominalVal: document.getElementById('amountValReal').value,
            jmlMitraModal: document.getElementById('jmlMitraModal').value,
            nominalModal: document.getElementById('amountModalReal').value,
            tenor: document.getElementById('tenorSelect').value,
            foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
            namaFoto: `Validasi_${Date.now()}.jpg`,
            mimeType: file ? file.type : "image/jpeg"
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (result.result === 'success') {
            alert("✅ Laporan Berhasil!");
            window.location.href = "home.html";
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        alert("Gagal: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
});

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
