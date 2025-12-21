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

// =================================================================
// ⚠️ DATABASE KOORDINAT POINT (WAJIB DIISI KOORDINAT ASLI) ⚠️
// Buka Google Maps -> Klik Kanan di Kantor Point -> Copy Lat/Lng
// =================================================================
const DATABASE_KOORDINAT_POINT = {
    "01 Wedi":       { lat: -7.755432, lng: 110.567890 }, // CONTOH
    "Karangnongko":  { lat: -7.712345, lng: 110.123456 }, 
    "Mojosongo":     { lat: -7.555111, lng: 110.888999 },
    // ... Tambahkan semua point lain di sini sesuai profil.js ...
    // Jika user punya point tapi tidak ada disini, absen akan error.
};

const MAX_JARAK_METER = 25; // Radius Maksimal
const MAX_JAM_ABSEN = "08:15"; // Batas Waktu

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// DOM Elements
const ui = {
    nama: document.getElementById('namaKaryawan'),
    id: document.getElementById('idKaryawan'),
    area: document.getElementById('areaKaryawan'),
    point: document.getElementById('pointKaryawan'),
    jam: document.getElementById('jamRealtime'),
    tanggal: document.getElementById('tanggalHariIni'),
    statusWaktu: document.getElementById('statusWaktu'),
    statusLokasi: document.getElementById('statusLokasi'),
    jarakInfo: document.getElementById('jarakInfo'),
    jarakMeter: document.getElementById('jarakMeter'),
    btnAbsen: document.getElementById('btnAbsen'),
    errorMsg: document.getElementById('errorMsg'),
    fotoInput: document.getElementById('fotoSelfie'),
    preview: document.getElementById('previewContainer')
};

let userPointData = null; // Menyimpan data point user
let isValidTime = false;
let isValidLocation = false;

// 1. CEK LOGIN & LOAD DATA
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserData(user.uid);
        mulaiJam();
    } else {
        window.location.replace("index.html");
    }
});

function loadUserData(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Auto-Fill Form
            ui.nama.value = data.nama || "-";
            ui.id.value = data.idKaryawan || "-";
            ui.area.value = data.area || "-";
            
            // Cek Point
            if (!data.point) {
                alert("⚠️ Anda belum memilih Point di menu Profil! Silakan setting dulu.");
                window.location.href = "profil.html";
                return;
            }
            ui.point.value = data.point;
            
            // Cek Koordinat Point di Database Kita
            if (DATABASE_KOORDINAT_POINT[data.point]) {
                userPointData = DATABASE_KOORDINAT_POINT[data.point];
                cekLokasiUser(); // Mulai Cek GPS
            } else {
                ui.point.value += " (Koordinat Belum Disetting Admin)";
                showErrorLokasi("Hubungi IT: Koordinat Point ini belum ada.");
            }
        }
    });
}

// 2. JAM & VALIDASI WAKTU
function mulaiJam() {
    setInterval(() => {
        const now = new Date();
        const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
        ui.jam.textContent = jamStr;
        ui.tanggal.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        // Cek Batas Waktu
        if (jamStr <= MAX_JAM_ABSEN) {
            ui.statusWaktu.className = "status-box status-success";
            ui.statusWaktu.innerHTML = `<span><i class="fa-solid fa-check me-2"></i>Waktu Aman</span>`;
            isValidTime = true;
        } else {
            ui.statusWaktu.className = "status-box status-error";
            ui.statusWaktu.innerHTML = `<span><i class="fa-solid fa-xmark me-2"></i>Terlambat (> ${MAX_JAM_ABSEN})</span>`;
            isValidTime = false;
        }
        updateTombol();
    }, 1000);
}

// 3. CEK LOKASI (GPS)
function cekLokasiUser() {
    if (!navigator.geolocation) {
        showErrorLokasi("GPS tidak didukung browser ini.");
        return;
    }

    navigator.geolocation.watchPosition((pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        
        // Simpan Geotag untuk dikirim
        document.getElementById('geotagInput').value = `${userLat},${userLng}`;

        // Hitung Jarak
        const jarak = hitungJarak(userLat, userLng, userPointData.lat, userPointData.lng);
        const jarakBulat = Math.round(jarak);

        ui.jarakInfo.style.display = 'block';
        ui.jarakMeter.textContent = jarakBulat;

        if (jarak <= MAX_JARAK_METER) {
            ui.statusLokasi.className = "status-box status-success";
            ui.statusLokasi.innerHTML = `<span><i class="fa-solid fa-map-pin me-2"></i>Dalam Area (${jarakBulat}m)</span>`;
            isValidLocation = true;
        } else {
            ui.statusLokasi.className = "status-box status-error";
            ui.statusLokasi.innerHTML = `<span><i class="fa-solid fa-person-walking-arrow-right me-2"></i>Kejauhan (${jarakBulat}m)</span>`;
            isValidLocation = false;
        }
        updateTombol();

    }, (err) => {
        showErrorLokasi("Gagal ambil lokasi. Pastikan GPS Aktif!");
    }, { enableHighAccuracy: true });
}

function showErrorLokasi(msg) {
    ui.statusLokasi.className = "status-box status-error";
    ui.statusLokasi.innerHTML = `<span><i class="fa-solid fa-triangle-exclamation me-2"></i>${msg}</span>`;
    isValidLocation = false;
    updateTombol();
}

// Rumus Haversine (Hitung Jarak Meter)
function hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius Bumi (meter)
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Hasil dalam meter
}

// 4. UPDATE STATUS TOMBOL
function updateTombol() {
    if (isValidTime && isValidLocation) {
        ui.btnAbsen.disabled = false;
        ui.btnAbsen.innerHTML = `<i class="fa-solid fa-fingerprint me-2"></i> MASUK SEKARANG`;
        ui.errorMsg.textContent = "";
    } else {
        ui.btnAbsen.disabled = true;
        ui.btnAbsen.innerHTML = `<i class="fa-solid fa-ban me-2"></i> ABSEN TERKUNCI`;
        
        if (!isValidTime) ui.errorMsg.textContent = "Absen ditutup karena sudah lewat jam 08:15.";
        else if (!isValidLocation) ui.errorMsg.textContent = "Anda berada di luar radius kantor (Maks 25m).";
    }
}

// 5. SUBMIT ABSEN
ui.fotoInput.addEventListener('change', function() {
    const file = this.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            ui.preview.innerHTML = `<img src="${e.target.result}" style="width:100px; border-radius:10px; border:2px solid #ddd;">`;
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('absensiForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!ui.fotoInput.files[0]) {
        alert("⚠️ Wajib ambil foto selfie!");
        return;
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const file = ui.fotoInput.files[0];
        const base64 = await toBase64(file);

        const formData = {
            jenisLaporan: "Absensi", // Pastikan Backend Support ini
            idKaryawan: ui.id.value,
            namaBP: ui.nama.value,
            area: ui.area.value,
            point: ui.point.value,
            tanggal: new Date().toISOString().split('T')[0],
            jamAbsen: ui.jam.textContent,
            geotag: document.getElementById('geotagInput').value,
            status: "Tepat Waktu",
            foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
            namaFoto: `Absen_${ui.nama.value}_${Date.now()}.jpg`,
            mimeType: file.type
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (result.result === 'success') {
            alert("✅ Absensi Berhasil!");
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
