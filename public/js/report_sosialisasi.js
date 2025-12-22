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

// 🔴 PASTE URL CLOUDFLARE ANDA DI SINI 🔴
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKSLFYjD2Z8CSW2uT59rTjGMGpaPULVKvAsHKznItHlA8WIYGOveTJEcXcPbVESStN/exec"; 

// Data Point
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
const btnGetLoc = document.getElementById('btnGetLoc');
const statusLokasi = document.getElementById('statusLokasi');

// --- 1. SET TANGGAL OTOMATIS ---
if(document.getElementById('tanggalInput')) {
    document.getElementById('tanggalInput').value = new Date().toISOString().split('T')[0];
}

// --- 2. LOGIKA FORMAT NO HP (AUTO 62) ---
const hpInput = document.getElementById('noHpInput');
const hpClean = document.getElementById('noHpClean');

if (hpInput) {
    hpInput.addEventListener('input', function() {
        // Ambil angka saja
        let raw = this.value.replace(/[^0-9]/g, '');
        
        // Logika konversi ke 62
        if (raw.startsWith('0')) {
            raw = '62' + raw.substring(1); // Ganti 0 depan jadi 62
        } else if (raw.startsWith('8')) {
            raw = '62' + raw; // Tambah 62 jika langsung angka 8
        }
        // Jika sudah 62, biarkan
        
        hpClean.value = raw; // Simpan di input hidden untuk dikirim
    });
}

// --- 3. LOGIKA AREA ---
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

// --- 4. LOAD PROFIL ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                document.getElementById('namaKaryawan').value = data.nama || "-";
                document.getElementById('idKaryawan').value = data.idKaryawan || "-";
                if(document.getElementById('regionalInput')) document.getElementById('regionalInput').value = data.regional || "Jawa Tengah 1";

                // Isi Dropdown Area
                areaSelect.innerHTML = '<option value="" selected disabled>Pilih Area...</option>';
                Object.keys(dataPoints).forEach(area => {
                    const option = document.createElement('option');
                    option.value = area;
                    option.textContent = area;
                    if (data.area && area === data.area) option.selected = true;
                    areaSelect.appendChild(option);
                });

                if (data.area) {
                    updatePointsDropdown(data.area);
                    const jabatan = data.jabatan;
                    if (jabatan === 'BM' || jabatan === 'BP') {
                        areaSelect.disabled = true;
                        if(data.point) {
                            pointSelect.value = data.point;
                            pointSelect.disabled = true;
                        }
                    }
                }
            }
        });
    } else {
        window.location.replace("index.html");
    }
});

// --- 5. LOKASI OTOMATIS (REVERSE GEOCODING) ---
if (btnGetLoc) {
    btnGetLoc.addEventListener('click', () => {
        if (navigator.geolocation) {
            statusLokasi.textContent = "Mencari titik GPS...";
            statusLokasi.className = "text-warning text-center mt-1";
            
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                await getAddressFromCoordinates(lat, lng);
            }, (error) => {
                statusLokasi.textContent = "Gagal. Aktifkan GPS Anda.";
                statusLokasi.className = "text-danger text-center mt-1";
            });
        } else {
            alert("Browser tidak support GPS.");
        }
    });
}

async function getAddressFromCoordinates(lat, lng) {
    try {
        statusLokasi.textContent = "Mengambil data Desa/Kecamatan...";
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        const addr = data.address;
        
        const desa = addr.village || addr.suburb || addr.hamlet || "";
        const kec = addr.county || addr.town || addr.municipality || "";
        const kab = addr.city || addr.regency || addr.state_district || "";

        document.getElementById('desaInput').value = desa;
        document.getElementById('kecamatanInput').value = kec;
        document.getElementById('kabupatenInput').value = kab;
        
        statusLokasi.textContent = "Lokasi ditemukan: " + desa;
        statusLokasi.className = "text-success text-center mt-1 fw-bold";
    } catch (error) {
        statusLokasi.textContent = "Gagal mengambil nama daerah.";
        statusLokasi.className = "text-danger text-center mt-1";
    }
}

// --- 6. PREVIEW FOTO ---
const fileInput = document.getElementById('fotoInput');
const previewContainer = document.getElementById('previewContainer');

if (fileInput) {
    fileInput.addEventListener('change', function() {
        previewContainer.innerHTML = '';
        const files = Array.from(this.files);
        if (files.length > 5) { alert("Maks 5 foto"); this.value=""; return; }
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-img';
                img.style.width = '80px'; img.style.height = '80px'; img.style.margin = '5px';
                previewContainer.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    });
}

// --- 7. SUBMIT FORM ---
document.getElementById('sosialisasiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Ambil No HP Bersih
    let finalHp = document.getElementById('noHpClean').value;
    // Backup: jika hidden kosong, ambil manual dari input
    if (!finalHp) {
        let raw = document.getElementById('noHpInput').value.replace(/[^0-9]/g, '');
        if (raw.startsWith('0')) finalHp = '62' + raw.substring(1);
        else if (raw.startsWith('8')) finalHp = '62' + raw;
        else finalHp = raw;
    }

    if (!areaSelect.value) { alert("❌ Area belum terpilih!"); return; }
    if (!pointSelect.value) { alert("❌ Point belum terpilih!"); return; }
    if (fileInput.files.length === 0) { alert("❌ Wajib upload foto!"); return; }

    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const files = Array.from(fileInput.files);
        const file = files[0];
        const base64 = await toBase64(file);

        const formData = {
            jenisLaporan: "Sosialisasi",
            
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaKaryawan').value,
            area: areaSelect.value,
            point: pointSelect.value,
            
            // DATA BARU
            namaMitra: document.getElementById('namaMitra').value,
            noHp: finalHp, // Kirim No HP format 62...
            
            desa: document.getElementById('desaInput').value,
            kecamatan: document.getElementById('kecamatanInput').value,
            kabupaten: document.getElementById('kabupatenInput').value,
            
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
            alert("✅ Data Mitra Berhasil Disimpan!");
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
