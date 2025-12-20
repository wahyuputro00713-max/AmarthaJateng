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

// ⚠️ PASTE URL APPS SCRIPT ANDA DI SINI ⚠️
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwxm6fjcK06G4pM5m2MOMc3_OReSlUg1Gzs8fVoW-a28tO-nlLD8-c8bOW0-NLhlshV/exec"; 

// Data Points
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucul"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

const areaSelect = document.getElementById('areaSelect');
const pointSelect = document.getElementById('pointSelect');

// --- 1. AUTO FILL PROFIL ---
function updatePointsDropdown(selectedArea) {
    const points = dataPoints[selectedArea] || [];
    pointSelect.innerHTML = '<option value="" selected disabled>Pilih Point...</option>';
    if (points.length > 0) {
        pointSelect.disabled = false;
        points.forEach(point => {
            const option = document.createElement('option');
            option.value = point;
            option.textContent = point;
            pointSelect.appendChild(option);
        });
    } else {
        pointSelect.disabled = true;
    }
}

if (areaSelect) {
    areaSelect.addEventListener('change', function() {
        updatePointsDropdown(this.value);
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const dataUser = snapshot.val();
                document.getElementById('idKaryawan').value = dataUser.idKaryawan || "-";
                document.getElementById('namaBP').value = dataUser.nama || "-";

                // Auto Fill Area/Point sesuai jabatan
                if (dataUser.area) {
                    areaSelect.value = dataUser.area;
                    updatePointsDropdown(dataUser.area);
                }
                if (dataUser.jabatan === 'BM' || dataUser.jabatan === 'BP') {
                    if(dataUser.area) areaSelect.disabled = true;
                    if(dataUser.point) {
                        pointSelect.value = dataUser.point;
                        pointSelect.disabled = true;
                    }
                }
            }
        });
        ambilLokasiDanAlamat(); // Jalankan GPS
    } else {
        window.location.replace("index.html");
    }
});

// Set Tanggal
document.getElementById('tanggalInput').value = new Date().toISOString().split('T')[0];

// --- 2. LOGIKA GPS & ALAMAT OTOMATIS (DIPERBAIKI) ---
const geoInput = document.getElementById('geotagInput');
const geoStatus = document.getElementById('geoStatus');
const btnRefreshLoc = document.getElementById('btnRefreshLoc');

// Input Alamat
const desaInput = document.getElementById('desaInput');
const kecInput = document.getElementById('kecInput');
const kabInput = document.getElementById('kabInput');

function ambilLokasiDanAlamat() {
    geoInput.value = "Mencari...";
    desaInput.value = "Mengambil data...";
    desaInput.readOnly = true; 
    kecInput.readOnly = true;
    kabInput.readOnly = true;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const long = position.coords.longitude;
            const akurasi = Math.round(position.coords.accuracy);

            // 1. Set Geotag Google Maps
            geoInput.value = `https://www.google.com/maps?q=${lat},${long}`;
            geoStatus.innerHTML = `✅ Terkunci (Akurasi: ${akurasi}m)`;
            geoStatus.className = "form-text small text-success fw-bold";

            // 2. Ambil Nama Alamat dari API OpenStreetMap
            try {
                // Menggunakan zoom=18 untuk detail maksimal
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}&zoom=18&addressdetails=1`, {
                    headers: { 'User-Agent': 'AmarthaJatengApp/1.0' }
                });
                
                if (!response.ok) throw new Error("Gagal fetch alamat");
                
                const data = await response.json();
                const addr = data.address;

                // --- LOGIKA CERDAS PEMETAAN ALAMAT ---
                
                // 1. DESA / KELURAHAN
                // Prioritas: village (desa) -> suburb (kelurahan) -> hamlet -> neighbourhood
                let desa = addr.village || addr.suburb || addr.hamlet || addr.neighbourhood || "";

                // 2. KECAMATAN
                // Prioritas: city_district -> district -> county (hati-hati, county kadang kecamatan di data OSM Indo)
                let kec = addr.city_district || addr.district || addr.county || "";

                // 3. KABUPATEN / KOTA (PERBAIKAN UTAMA DISINI)
                // Prioritas: regency (kabupaten) -> city (kota) -> municipality -> state_district
                let kab = addr.regency || addr.city || addr.municipality || addr.state_district || "";

                // PEMBERSIHAN DATA (Opsional: Hapus kata "Kecamatan" dst jika dobel, tapi dibiarkan dulu agar jelas)
                
                // ISI KE FORM
                desaInput.value = desa;
                kecInput.value = kec;
                kabInput.value = kab;

                // JIKA MASIH KOSONG, BUKA KUNCI AGAR BISA DIISI MANUAL
                if(!desa) desaInput.readOnly = false;
                if(!kec) kecInput.readOnly = false;
                if(!kab) kabInput.readOnly = false;

            } catch (error) {
                console.error("Gagal Reverse Geocode:", error);
                // Jika error (sinyal hancur), reset jadi kosong dan buka kunci
                desaInput.value = ""; 
                kecInput.value = "";
                kabInput.value = "";
                
                desaInput.placeholder = "Ketik Manual";
                kecInput.placeholder = "Ketik Manual";
                kabInput.placeholder = "Ketik Manual";

                desaInput.readOnly = false;
                kecInput.readOnly = false;
                kabInput.readOnly = false;
            }

        }, (error) => {
            console.error("GPS Error:", error);
            geoInput.value = "Lokasi Gagal";
            geoStatus.innerText = "❌ Pastikan GPS aktif.";
            
            // Buka input manual jika GPS gagal total
            desaInput.readOnly = false;
            kecInput.readOnly = false;
            kabInput.readOnly = false;
        }, { enableHighAccuracy: true, timeout: 20000 });
    } else {
        geoInput.value = "Tidak Support";
    }
}

btnRefreshLoc.addEventListener('click', ambilLokasiDanAlamat);

// --- 3. PREVIEW FOTO ---
const fileInput = document.getElementById('fotoInput');
const previewFoto = document.getElementById('previewFoto');

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewFoto.src = e.target.result;
            previewFoto.style.display = 'block';
        }
        reader.readAsDataURL(file);
    }
});

// --- 4. SUBMIT LOGIC ---
const form = document.getElementById('sosialisasiForm');
const loadingOverlay = document.getElementById('loadingOverlay');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validasi
    const file = fileInput.files[0];
    const geotag = geoInput.value;
    const noHp = document.getElementById('noHpInput').value;

    if (!file) { alert("❌ Foto wajib diupload!"); return; }
    if (!geotag || geotag.includes("Menunggu")) { alert("❌ Lokasi belum terkunci! Klik refresh."); return; }
    if (!noHp) { alert("❌ Nomor HP wajib diisi!"); return; }

    loadingOverlay.style.display = 'flex';

    try {
        const base64File = await toBase64(file);
        const cleanBase64 = base64File.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

        const formData = {
            jenisLaporan: "Sosialisasi",
            
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaBP').value,
            area: areaSelect.value, 
            point: pointSelect.value, 
            
            desa: desaInput.value,
            kecamatan: kecInput.value,
            kabupaten: kabInput.value,
            dusun: document.getElementById('dusunInput').value,
            calonMitra: document.getElementById('calonMitraInput').value,
            noHp: "+62" + noHp, 
            
            geotag: geotag,
            foto: cleanBase64,
            namaFoto: "Sos_" + file.name,
            mimeType: file.type
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.result === 'success') {
            alert("✅ Laporan Sosialisasi Berhasil!");
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

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
