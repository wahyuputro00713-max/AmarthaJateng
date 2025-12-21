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

// 1. DATA POINT & AREA
const DATA_POINTS = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucul"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// Ambil list Area dari keys DATA_POINTS
const LIST_AREA = Object.keys(DATA_POINTS);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Elemen DOM
const el = {
    tanggal: document.getElementById('tanggalInput'),
    nama: document.getElementById('namaKaryawan'),
    id: document.getElementById('idKaryawan'),
    areaInput: document.getElementById('areaInput'),   // Textbox Readonly
    areaSelect: document.getElementById('areaSelect'), // Dropdown Manual
    pointSelect: document.getElementById('pointKaryawan'),
    loading: document.getElementById('loadingOverlay')
};

// Set Tanggal Hari Ini
const today = new Date().toISOString().split('T')[0];
if(el.tanggal) el.tanggal.value = today;

// CEK LOGIN
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
            
            // Isi Data Dasar
            el.nama.value = data.nama || "";
            el.id.value = data.idKaryawan || "";

            // LOGIKA AREA (HYBRID)
            if (data.area && data.area !== "") {
                // KASUS A: PROFIL SUDAH ADA AREA
                // Tampilkan Textbox, Sembunyikan Select
                el.areaInput.style.display = "block";
                el.areaSelect.style.display = "none";
                
                el.areaInput.value = data.area; // Isi otomatis
                
                // Langsung update point berdasarkan area profil
                updatePointDropdown(data.area, data.point);
            } else {
                // KASUS B: PROFIL BELUM ADA AREA
                // Sembunyikan Textbox, Tampilkan Select
                el.areaInput.style.display = "none";
                el.areaSelect.style.display = "block";
                
                // Isi Opsi Area ke Dropdown
                el.areaSelect.innerHTML = '<option value="" disabled selected>Pilih Area Manual...</option>';
                LIST_AREA.forEach(areaName => {
                    const option = document.createElement('option');
                    option.value = areaName;
                    option.textContent = areaName;
                    el.areaSelect.appendChild(option);
                });

                // Tambah Event Listener jika User pilih Area Manual
                el.areaSelect.addEventListener('change', function() {
                    updatePointDropdown(this.value, null);
                });
            }
        }
    });
}

// FUNGSI ISI DROPDOWN POINT
function updatePointDropdown(areaName, defaultPoint) {
    el.pointSelect.innerHTML = '<option value="" disabled selected>Pilih Point...</option>';
    
    if (areaName && DATA_POINTS[areaName]) {
        el.pointSelect.disabled = false;
        
        DATA_POINTS[areaName].forEach(pt => {
            const option = document.createElement('option');
            option.value = pt;
            option.textContent = pt;
            
            // Jika ada default point (dari profil), pilih otomatis
            if (defaultPoint && pt === defaultPoint) {
                option.selected = true;
            }
            el.pointSelect.appendChild(option);
        });
    } else {
        el.pointSelect.innerHTML = '<option value="" disabled selected>Area tidak valid</option>';
        el.pointSelect.disabled = true;
    }
}

// FUNGSI FORMAT RUPIAH
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

// PREVIEW FOTO
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
    el.loading.style.display = 'flex';

    try {
        // Tentukan Area mana yang dipakai (Input Otomatis atau Select Manual)
        let finalArea = "";
        if (el.areaInput.style.display !== "none") {
            finalArea = el.areaInput.value;
        } else {
            finalArea = el.areaSelect.value;
        }

        if (!finalArea) {
            throw new Error("Area belum terisi/dipilih!");
        }

        const file = document.getElementById('fotoInput').files[0];
        let base64 = "";
        if (file) base64 = await toBase64(file);

        const formData = {
            jenisLaporan: "Validasi",
            idKaryawan: el.id.value,
            namaBP: el.nama.value,
            area: finalArea, // Pakai Area yang sudah ditentukan di atas
            point: el.pointSelect.value,
            
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
        el.loading.style.display = 'none';
    }
});

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
