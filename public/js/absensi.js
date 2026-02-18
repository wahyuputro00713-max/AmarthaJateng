import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirebaseApp } from "./firebase-init.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";



const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwu59gsQNwmRuvJxbFYmGRP9CN3EYntK2wMjiX1mcotQ9Ny7IftBCOf-TayhHQN9OIlwg/exec"; 

// --- DATA POINT & KOORDINAT ---
const DATA_POINTS = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pangasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

const DATABASE_KOORDINAT_POINT = {
    "01 Wedi":       { lat: -7.7166853, lng: 110.586997 }, 
    "Karangnongko":  { lat: -7.673078, lng: 110.56044 }, 
    "Mojosongo":     { lat: -7.5403421, lng: 110.6208683 },
    "Polanharjo":    { lat: -7.620437, lng: 110.696366 },
    "Trucuk":        { lat: -7.688590, lng: 110.695219 },
    "Grabag":        { lat: -7.369339, lng: 110.308800 },
    "Mungkid":       { lat: -7.5389326, lng: 110.2280005 },
    "Pakis":         { lat: -7.4706756, lng: 110.242976 },
    "Salam":         { lat: -7.5955596, lng: 110.291043 },
    "Banjarsari":    { lat: -7.5334328, lng: 110.822223 },
    "Gemolong":      { lat: -7.3953056, lng: 110.817814 },
    "Masaran":       { lat: -7.4426716, lng: 110.9972224 },
    "Tangen":        { lat: -7.33208, lng: 111.059155 },
    "Gatak":         { lat: -7.572387, lng: 110.742497 },
    "Karanganyar":   { lat: -7.5930712, lng: 110.9244555 },
    "Jumantono":     { lat: -7.6597196, lng: 111.0073048 },
    "Nguter":        { lat: -7.671181, lng: 110.8458981 },
    "Pasar Kliwon":  { lat: -7.5752547, lng: 110.8351221 },
    "Jatisrono":     { lat: -7.8244875, lng: 111.1820156 },
    "Ngadirojo":     { lat: -7.812753, lng: 110.992722 },
    "Ngawen 2":      { lat: -7.8339547, lng: 110.693915 },
    "Pracimantoro":  { lat: -8.031819, lng: 110.819615 },
    "Wonosari":      { lat: -7.956726, lng: 110.603569 },
    "01 Sleman":     { lat: -7.7826631, lng: 110.3176677 },
    "Kalasan":       { lat: -7.7461157, lng: 110.4479074 },
    "Ngaglik":       { lat: -7.7448999, lng: 110.3953837 },
    "Umbulharjo":    { lat: -7.8221304, lng: 110.3877378 },
    "01 Pandak":     { lat: -7.898319, lng: 110.3041433 },
    "01 Pangasih":   { lat: -7.8499644, lng: 110.1694607 },
    "01 Pleret":     { lat: -7.856949, lng: 110.4097071 },
    "Kutoarjo":      { lat: -7.724611, lng: 109.915361 },
    "Purworejo":     { lat: -7.7150278, lng: 110.00125 },
    "Saptosari":     { lat: -8.0493889, lng: 110.5098611 },
};

const MAX_JARAK_METER = 300;
const MAX_JAM_ABSEN = "08:15";

// --- DAFTAR STATUS YANG TIDAK PERLU VALIDASI JARAK ---
// Tambahkan WFH dan WFC di sini
const STATUS_BEBAS_LOKASI = ["Sakit", "Izin", "WFH", "WFC"];

const app = getFirebaseApp();
const auth = getAuth(app);
const db = getDatabase(app);

const ui = {
    nama: document.getElementById('namaKaryawan'),
    id: document.getElementById('idKaryawan'),
    area: document.getElementById('areaKaryawan'),
    status: document.getElementById('statusKehadiran'),
    pointSelect: document.getElementById('pointKaryawan'),
    jam: document.getElementById('jamRealtime'),
    tanggal: document.getElementById('tanggalHariIni'),
    statusWaktu: document.getElementById('statusWaktu'),
    statusLokasi: document.getElementById('statusLokasi'),
    jarakInfo: document.getElementById('jarakInfo'),
    jarakMeter: document.getElementById('jarakMeter'),
    btnAbsen: document.getElementById('btnAbsen'),
    errorMsg: document.getElementById('errorMsg'),
    fotoInput: document.getElementById('fotoSelfie'),
    labelFoto: document.getElementById('labelFoto'),
    preview: document.getElementById('previewContainer')
};

let userPointData = null; 
let isValidTime = false;
let isValidLocation = false;
let userJabatan = ""; // Variabel untuk menyimpan jabatan

// --- FUNGSI HELPER ---
function getLocalTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; 
}

function compressImage(file, maxWidth = 800, quality = 0.6) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// --- EVENT LISTENER ---
if (ui.pointSelect) {
    ui.pointSelect.addEventListener('change', function() {
        const selectedPoint = this.value;
        if (DATABASE_KOORDINAT_POINT[selectedPoint]) {
            userPointData = DATABASE_KOORDINAT_POINT[selectedPoint];
            ui.statusLokasi.className = "status-box status-loading";
            ui.statusLokasi.innerHTML = `<span><i class="fa-solid fa-sync fa-spin me-2"></i>Menghitung Ulang...</span>`;
        } else {
            userPointData = null;
            showErrorLokasi("Koordinat Point ini belum ada di Database.");
        }
    });
}

// Update tombol & Tampilan saat Status Kehadiran berubah
if (ui.status) {
    ui.status.addEventListener('change', function() {
        const val = this.value;
        
        // Cek apakah status yang dipilih termasuk kategori Bebas Lokasi
        if (STATUS_BEBAS_LOKASI.includes(val)) {
            // Logic khusus untuk WFH/WFC/Sakit/Izin
            if (val === "Sakit") {
                ui.labelFoto.textContent = "Foto Surat Dokter / Obat";
            } else if (val === "WFH") {
                ui.labelFoto.textContent = "Foto Selfie (Di Rumah)";
            } else if (val === "WFC") {
                ui.labelFoto.textContent = "Foto Selfie (Di Lokasi Kerja)";
            } else {
                ui.labelFoto.textContent = "Foto Bukti";
            }
            
            ui.statusLokasi.className = "status-box status-success";
            ui.statusLokasi.innerHTML = `<span><i class="fa-solid fa-check me-2"></i>Lokasi Valid (${val})</span>`;
        } else {
            // Kembali ke mode Hadir (WFO)
            ui.labelFoto.textContent = "Foto Selfie";
            if (userPointData) {
                ui.statusLokasi.innerHTML = `<span><i class="fa-solid fa-sync fa-spin me-2"></i>Cek Ulang GPS...</span>`;
            }
        }
        updateTombol();
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        checkIfAlreadyAbsent(user.uid);
        loadUserData(user.uid);
        mulaiJam();
        cekLokasiUser(); 
    } else {
        window.location.replace("index.html");
    }
});

async function checkIfAlreadyAbsent(uid) {
    const today = getLocalTodayDate(); 
    const absensiRef = ref(db, `absensi/${today}/${uid}`);
    try {
        const snapshot = await get(absensiRef);
        if (snapshot.exists()) {
            alert("Anda sudah melakukan absensi hari ini!");
            window.location.replace("home.html");
        }
    } catch (e) {
        console.error("Gagal cek status absen:", e);
    }
}

function loadUserData(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            ui.nama.value = data.nama || "-";
            ui.id.value = data.idKaryawan || "-";
            ui.area.value = data.area || "-";
            
            // Simpan jabatan ke variabel global
            userJabatan = data.jabatan || ""; 

            // LOGIKA TAMBAHAN KHUSUS JABATAN RM
            if (userJabatan === "RM") {
                // Tambahkan Opsi WFH
                const optWFH = document.createElement("option");
                optWFH.value = "WFH";
                optWFH.text = "WFH (Work From Home)";
                ui.status.add(optWFH);

                // Tambahkan Opsi WFC
                const optWFC = document.createElement("option");
                optWFC.value = "WFC";
                optWFC.text = "WFC (Work From Cafe/Anywhere)";
                ui.status.add(optWFC);
            }

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

            if (data.point && DATABASE_KOORDINAT_POINT[data.point]) {
                ui.pointSelect.value = data.point;
                userPointData = DATABASE_KOORDINAT_POINT[data.point]; 
            }
        }
    });
}

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
        const statusHadir = ui.status.value;
        
        // BYPASS LOKASI JIKA STATUS ADA DI DAFTAR (SAKIT, IZIN, WFH, WFC)
        if (STATUS_BEBAS_LOKASI.includes(statusHadir)) {
            return; 
        }

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
    if (STATUS_BEBAS_LOKASI.includes(ui.status.value)) return;
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
    const statusVal = ui.status.value;
    
    // Logika: Jika Status ada di daftar BEBAS LOKASI, maka lokasi dianggap OK (true)
    let lokasiOk = isValidLocation;
    
    if (STATUS_BEBAS_LOKASI.includes(statusVal)) {
        lokasiOk = true; // Bypass lokasi
    }

    if (isValidTime && lokasiOk) {
        ui.btnAbsen.disabled = false;
        ui.btnAbsen.innerHTML = `<i class="fa-solid fa-fingerprint me-2"></i> KIRIM ${statusVal.toUpperCase()}`;
        ui.btnAbsen.className = "btn btn-primary w-100 py-3 fw-bold rounded-3 shadow-sm";
        ui.errorMsg.textContent = "";
    } else {
        ui.btnAbsen.disabled = true;
        ui.btnAbsen.innerHTML = `<i class="fa-solid fa-ban me-2"></i> ABSEN TERKUNCI`;
        ui.btnAbsen.className = "btn btn-secondary w-100 py-3 fw-bold rounded-3 shadow-sm";

        if (!isValidTime) ui.errorMsg.textContent = "Absen ditutup lewat 08:20.";
        else if (!lokasiOk) ui.errorMsg.textContent = `Di luar radius kantor (Maks ${MAX_JARAK_METER}m).`;
    }
}

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
    if (!ui.fotoInput.files[0]) { alert("Wajib lampirkan Foto!"); return; }

    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const file = ui.fotoInput.files[0];
        const base64 = await compressImage(file); 
        const today = getLocalTodayDate(); 

        const formData = {
            jenisLaporan: "Absensi",
            idKaryawan: ui.id.value,
            namaBP: ui.nama.value,
            area: ui.area.value,
            point: ui.pointSelect.value, 
            tanggal: today,
            jamAbsen: ui.jam.textContent,
            geotag: document.getElementById('geotagInput').value || "-", // Geotag mungkin kosong
            foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
            namaFoto: `Absen_${ui.nama.value}.jpg`,
            mimeType: "image/jpeg",
            status: ui.status.value 
        };

        const response = await fetch(SCRIPT_URL, { 
            method: 'POST', 
            body: JSON.stringify(formData),
            redirect: "follow", 
            headers: { "Content-Type": "text/plain;charset=utf-8" } 
        });

        const result = await response.json();

        if (result.result === 'success') {
            const user = auth.currentUser;
            if (user) {
                await set(ref(db, `absensi/${today}/${user.uid}`), {
                    timestamp: new Date().toISOString(),
                    nama: ui.nama.value,
                    point: ui.pointSelect.value,
                    status: ui.status.value 
                });
            }

            alert(`✅ Absen ${ui.status.value} Berhasil!`);
            window.location.href = "home.html";
        } else { throw new Error(result.error); }

    } catch (error) { 
        alert("Gagal: " + error.message); 
    } finally { 
        loadingOverlay.style.display = 'none'; 
    }
});
