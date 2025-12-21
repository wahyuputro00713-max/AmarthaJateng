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

// Pastikan ini URL Web App Script Anda yang terbaru
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKSLFYjD2Z8CSW2uT59rTjGMGpaPULVKvAsHKznItHlA8WIYGOveTJEcXcPbVESStN/exec"; 

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// --- 1. SET TANGGAL OTOMATIS (PERBAIKAN DISINI) ---
const today = new Date().toISOString().split('T')[0];
if(document.getElementById('tanggalInput')) {
    document.getElementById('tanggalInput').value = today;
}

// --- 2. CEK LOGIN & LOAD DATA ---
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
            document.getElementById('namaKaryawan').value = data.nama || "";
            document.getElementById('idKaryawan').value = data.idKaryawan || "";
            document.getElementById('areaKaryawan').value = data.area || "";
            document.getElementById('pointKaryawan').value = data.point || "";
        }
    });
}

// --- 3. FORMAT RUPIAH (Agar input nominal ada titiknya) ---
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// Fungsi Helper untuk Input Rupiah
function setupRupiahInput(displayId, realId) {
    const display = document.getElementById(displayId);
    const real = document.getElementById(realId);
    
    if (display && real) {
        display.addEventListener('keyup', function(e) {
            // Hapus karakter selain angka
            let value = this.value.replace(/[^0-9]/g, '');
            real.value = value; // Simpan angka murni ke input hidden
            
            // Tampilkan format rupiah
            if(value) {
                this.value = formatRupiah(value).replace('Rp', '').trim();
            } else {
                this.value = '';
            }
        });
    }
}

// Pasang formatter untuk input Validasi & Modal
setupRupiahInput('amountValDisplay', 'amountValReal');
setupRupiahInput('amountModalDisplay', 'amountModalReal');


// --- 4. PREVIEW FOTO ---
const fotoInput = document.getElementById('fotoInput');
const previewContainer = document.getElementById('previewContainer');

if (fotoInput) {
    fotoInput.addEventListener('change', function() {
        previewContainer.innerHTML = '';
        const files = this.files;
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.style.width = '80px';
                    img.style.height = '80px';
                    img.style.objectFit = 'cover';
                    img.style.borderRadius = '8px';
                    img.style.border = '1px solid #ddd';
                    previewContainer.appendChild(img);
                }
                reader.readAsDataURL(file);
            }
        }
    });
}

// --- 5. SUBMIT FORM KE SPREADSHEET ---
document.getElementById('validasiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const file = document.getElementById('fotoInput').files[0];
        let base64 = "";
        
        if (file) {
            base64 = await toBase64(file);
        }

        const formData = {
            jenisLaporan: "Validasi",
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaKaryawan').value,
            area: document.getElementById('areaKaryawan').value,
            point: document.getElementById('pointKaryawan').value,
            
            // Data Input Validasi
            jmlMitraVal: document.getElementById('jmlMitraVal').value,
            nominalVal: document.getElementById('amountValReal').value, // Ambil angka murni
            jmlMitraModal: document.getElementById('jmlMitraModal').value,
            nominalModal: document.getElementById('amountModalReal').value, // Ambil angka murni
            tenor: document.getElementById('tenorSelect').value,
            
            // Foto
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
            alert("✅ Laporan Validasi Berhasil Dikirim!");
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
