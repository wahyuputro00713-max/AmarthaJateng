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

// 🔴 PASTE URL CLOUDFLARE/APPS SCRIPT ANDA DI SINI 🔴
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKSLFYjD2Z8CSW2uT59rTjGMGpaPULVKvAsHKznItHlA8WIYGOveTJEcXcPbVESStN/exec"; 

// Data Point per Area
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucul"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// Elemen DOM
const areaSelect = document.getElementById('areaSelect');
const pointSelect = document.getElementById('pointSelect');
const btnGetLoc = document.getElementById('btnGetLoc');
const statusLokasi = document.getElementById('statusLokasi');

// --- 1. SET TANGGAL OTOMATIS ---
const dateInput = document.getElementById('tanggalInput');
if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];

// --- 2. LOGIKA AREA & POINT ---
function populateAreaDropdown(selectedArea = null) {
    areaSelect.innerHTML = '<option value="" selected disabled>Pilih Area...</option>';
    // Isi opsi area dari kunci dataPoints
    Object.keys(dataPoints).forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        if (selectedArea && area === selectedArea) {
            option.selected = true;
        }
        areaSelect.appendChild(option);
    });

    // Jika area sudah terpilih, load point
    if (selectedArea) {
        updatePointsDropdown(selectedArea);
    }
}

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

// Event Listener jika Area diganti manual
areaSelect.addEventListener('change', function() {
    updatePointsDropdown(this.value);
});

// --- 3. LOAD PROFIL USER (AUTO FILL) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Isi Nama & ID
                document.getElementById('namaKaryawan').value = data.nama || "-";
                document.getElementById('idKaryawan').value = data.idKaryawan || "-";
                if(document.getElementById('regionalInput')) document.getElementById('regionalInput').value = data.regional || "Jawa Tengah 1";

                // Isi Area
                if (data.area) {
                    // Jika user punya area, kunci dropdown dan isi otomatis
                    populateAreaDropdown(data.area);
                    
                    // Cek Jabatan (Optional: kunci area jika BM/BP)
                    const jabatan = data.jabatan;
                    if (jabatan === 'BM' || jabatan === 'BP') {
                        areaSelect.disabled = true;
                        if(data.point) {
                            pointSelect.value = data.point;
                            pointSelect.disabled = true;
                        }
                    }
                } else {
                    // Jika tidak punya area, biarkan user memilih
                    populateAreaDropdown();
                    areaSelect.disabled = false;
                }
            }
        });
    } else {
        window.location.replace("index.html");
    }
});

// --- 4. GEOTAG & ALAMAT OTOMATIS (REVERSE GEOCODING) ---
btnGetLoc.addEventListener('click', () => {
    if (navigator.geolocation) {
        statusLokasi.textContent = "Sedang mencari lokasi...";
        statusLokasi.className = "text-warning text-center mt-1";
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Panggil Fungsi Cari Alamat
            await getAddressFromCoordinates(lat, lng);

        }, (error) => {
            statusLokasi.textContent = "Gagal mengambil lokasi. Pastikan GPS aktif.";
            statusLokasi.className = "text-danger text-center mt-1";
            console.error(error);
        });
    } else {
        alert("Browser tidak support Geolocation.");
    }
});

async function getAddressFromCoordinates(lat, lng) {
    try {
        statusLokasi.textContent = "Mengambil data alamat...";
        
        // Gunakan API OpenStreetMap (Nominatim) - GRATIS
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        
        const addr = data.address;
        
        // Mapping Alamat (Logika Indo)
        // Desa bisa bernama: village, suburb, atau hamlet
        const desa = addr.village || addr.suburb || addr.hamlet || "";
        
        // Kecamatan biasanya: county, town, atau municipality
        const kec = addr.county || addr.town || addr.municipality || "";
        
        // Kabupaten biasanya: city, state_district, atau region
        const kab = addr.city || addr.regency || addr.state_district || "";

        // Isi ke Input Form
        document.getElementById('desaInput').value = desa;
        document.getElementById('kecamatanInput').value = kec;
        document.getElementById('kabupatenInput').value = kab;
        
        statusLokasi.textContent = "Lokasi berhasil ditemukan!";
        statusLokasi.className = "text-success text-center mt-1 fw-bold";

    } catch (error) {
        console.error("Gagal reverse geocode:", error);
        statusLokasi.textContent = "Gagal konversi koordinat ke alamat.";
        statusLokasi.className = "text-danger text-center mt-1";
    }
}

// --- 5. PREVIEW FOTO ---
const fileInput = document.getElementById('fotoInput');
const previewContainer = document.getElementById('previewContainer');

fileInput.addEventListener('change', function() {
    previewContainer.innerHTML = '';
    const files = Array.from(this.files);
    
    if (files.length > 5) {
        alert("Maksimal 5 foto!");
        this.value = ""; return;
    }

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-img';
            previewContainer.appendChild(img);
        }
        reader.readAsDataURL(file);
    });
});

// --- 6. SUBMIT FORM ---
document.getElementById('sosialisasiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!areaSelect.value) { alert("❌ Area belum terpilih!"); return; }
    if (!pointSelect.value) { alert("❌ Point belum terpilih!"); return; }
    if (fileInput.files.length === 0) { alert("❌ Wajib upload foto!"); return; }

    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const files = Array.from(fileInput.files);
        const file = files[0]; // Kirim foto pertama
        const base64 = await toBase64(file);

        const formData = {
            jenisLaporan: "Sosialisasi",
            
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaKaryawan').value,
            area: areaSelect.value,
            point: pointSelect.value,
            
            // Data Lokasi Otomatis
            desa: document.getElementById('desaInput').value,
            kecamatan: document.getElementById('kecamatanInput').value,
            kabupaten: document.getElementById('kabupatenInput').value,

            jmlPeserta: document.getElementById('jmlPeserta').value,
            keterangan: document.getElementById('keterangan').value,
            
            foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
            namaFoto: "Sos_" + file.name,
            mimeType: file.type
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.result === 'success') {
            alert("✅ Laporan Sosialisasi Terkirim!");
            window.location.href = "home.html";
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error("Error:", error);
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
