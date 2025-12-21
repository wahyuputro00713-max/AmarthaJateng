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

const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

// 1. DAFTAR POINT PER AREA (Untuk Dropdown)
const DATA_POINTS = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucul"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// 2. DATABASE KOORDINAT (WAJIB DIISI LAT/LNG ASLI)
const DATABASE_KOORDINAT_POINT = {
    "01 Wedi":       { lat: -7.755432, lng: 110.567890 }, 
    "Karangnongko":  { lat: -7.712345, lng: 110.123456 }, 
    "Mojosongo":     { lat: -7.555111, lng: 110.888999 },
    // ... Masukkan semua koordinat point disini ...
};

const MAX_JARAK_METER = 25;
const MAX_JAM_ABSEN = "08:15";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const ui = {
    nama: document.getElementById('namaKaryawan'),
    id: document.getElementById('idKaryawan'),
    area: document.getElementById('areaKaryawan'),
    pointSelect: document.getElementById('pointKaryawan'), // Selector Baru
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

let userPointData = null; // Koordinat Tujuan Absen
let isValidTime = false;
let isValidLocation = false;

// EVENT LISTENER: SAAT GANTI POINT
ui.pointSelect.addEventListener('change', function() {
    const selectedPoint = this.value;
    
    // Update Koordinat Tujuan
    if (DATABASE_KOORDINAT_POINT[selectedPoint]) {
        userPointData = DATABASE_KOORDINAT_POINT[selectedPoint];
        // Reset Status Lokasi agar dihitung ulang
        ui.statusLokasi.className = "status-box status-loading";
        ui.statusLokasi.innerHTML = `<span><i class="fa-solid fa-sync fa-spin me-2"></i>Menghitung Ulang...</span>`;
    } else {
        userPointData = null;
        showErrorLokasi("Koordinat Point ini belum ada di Database.");
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserData(user.uid);
        mulaiJam();
        cekLokasiUser(); // Start GPS
    } else {
        window.location.replace("index.html");
    }
});

function loadUserData(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            ui.nama.value = data.nama || "-";
            ui.id.value = data.idKaryawan || "-";
            ui.area.value = data.area || "-";
            
            // 1. POPULASI DROPDOWN POINT BERDASARKAN AREA
            if (data.area && DATA_POINTS[data.area]) {
                ui.pointSelect.innerHTML = '<option value="" disabled selected>Pilih Point...</option>';
                DATA_POINTS[data.area].forEach(pt => {
                    const option = document.createElement('option');
                    option.value = pt;
                    option.textContent = pt;
                    ui.pointSelect.appendChild(option);
                });
                ui.pointSelect.disabled = false;
            } else {
                ui.pointSelect.innerHTML = '<option disabled selected>Area tidak valid</option>';
            }

            // 2. SET DEFAULT POINT DARI PROFIL
            if (data.point && DATABASE_KOORDINAT_POINT[data.point]) {
                ui.pointSelect.value = data.point;
                userPointData = DATABASE_KOORDINAT_POINT[data.point]; // Set Koordinat Awal
            }
        }
    });
}

// ... (FUNGSI JAM, LOKASI, dan SUBMIT TETAP SAMA SEPERTI SEBELUMNYA) ...

function mulaiJam() {
    setInterval(() => {
        const now = new Date();
        const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
        ui.jam.textContent = jamStr;
        ui.tanggal.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

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

function cekLokasiUser() {
    if (!navigator.geolocation) {
        showErrorLokasi("GPS tidak didukung.");
        return;
    }

    navigator.geolocation.watchPosition((pos) => {
        // Jika User belum pilih point, jangan hitung jarak
        if (!userPointData) return;

        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        document.getElementById('geotagInput').value = `${userLat},${userLng}`;

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
        showErrorLokasi("GPS Error/Mati.");
    }, { enableHighAccuracy: true });
}

function showErrorLokasi(msg) {
    ui.statusLokasi.className = "status-box status-error";
    ui.statusLokasi.innerHTML = `<span><i class="fa-solid fa-triangle-exclamation me-2"></i>${msg}</span>`;
    isValidLocation = false;
    updateTombol();
}

function hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function updateTombol() {
    if (isValidTime && isValidLocation) {
        ui.btnAbsen.disabled = false;
        ui.btnAbsen.innerHTML = `<i class="fa-solid fa-fingerprint me-2"></i> MASUK SEKARANG`;
        ui.errorMsg.textContent = "";
    } else {
        ui.btnAbsen.disabled = true;
        ui.btnAbsen.innerHTML = `<i class="fa-solid fa-ban me-2"></i> ABSEN TERKUNCI`;
        
        if (!isValidTime) ui.errorMsg.textContent = "Absen ditutup lewat 08:15.";
        else if (!isValidLocation) ui.errorMsg.textContent = "Di luar radius kantor (Maks 25m).";
    }
}

// Submit Logic
ui.fotoInput.addEventListener('change', function() {
    const file = this.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            ui.preview.innerHTML = `<img src="${e.target.result}" style="width:100px; border-radius:10px;">`;
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('absensiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ui.fotoInput.files[0]) { alert("Wajib Foto Selfie!"); return; }

    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const file = ui.fotoInput.files[0];
        const base64 = await toBase64(file);

        const formData = {
            jenisLaporan: "Absensi",
            idKaryawan: ui.id.value,
            namaBP: ui.nama.value,
            area: ui.area.value,
            point: ui.pointSelect.value, // Ambil Value dari Select
            tanggal: new Date().toISOString().split('T')[0],
            jamAbsen: ui.jam.textContent,
            geotag: document.getElementById('geotagInput').value,
            foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
            namaFoto: `Absen_${ui.nama.value}.jpg`,
            mimeType: file.type
        };

        const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(formData) });
        const result = await response.json();
        
        if (result.result === 'success') {
            alert("✅ Absen Berhasil!");
            window.location.href = "home.html";
        } else { throw new Error(result.error); }

    } catch (error) { alert("Gagal: " + error.message); } 
    finally { loadingOverlay.style.display = 'none'; }
});

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
