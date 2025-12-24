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

// ⚠️ PASTE URL APP SCRIPT / CLOUDFLARE TERBARU DI SINI ⚠️
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// ELEMEN HTML
const areaSelect = document.getElementById('areaSelect');
const pointSelect = document.getElementById('pointSelect');
const btnGetLoc = document.getElementById('btnGetLoc');
const statusLokasi = document.getElementById('statusLokasi');
const hpInput = document.getElementById('noHpInput');

// 1. AUTO TANGGAL
if(document.getElementById('tanggalInput')) {
    document.getElementById('tanggalInput').value = new Date().toISOString().split('T')[0];
}

// 2. AUTO LOAD GEOTAG SAAT MASUK
window.addEventListener('load', () => {
    getLokasiOtomatis();
});

function getLokasiOtomatis() {
    if (navigator.geolocation) {
        if(statusLokasi) {
            statusLokasi.textContent = "Mendeteksi Geotag...";
            statusLokasi.className = "text-warning text-center mt-1";
        }
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // ISI GEOTAG
            const geotagInput = document.getElementById('geotagInput');
            if(geotagInput) geotagInput.value = `${lat}, ${lng}`;
            
            // ISI ALAMAT (Reverse Geocoding)
            await getAddressFromCoordinates(lat, lng);

        }, (error) => {
            console.error(error);
            if(statusLokasi) {
                statusLokasi.textContent = "Gagal deteksi GPS. Pastikan Izin Lokasi aktif.";
                statusLokasi.className = "text-danger text-center mt-1";
            }
        });
    } else {
        alert("Browser tidak support GPS.");
    }
}

// Tombol Manual Geotag
if (btnGetLoc) {
    btnGetLoc.addEventListener('click', getLokasiOtomatis);
}

// 3. REVERSE GEOCODING (Ambil Nama Desa/Kec)
async function getAddressFromCoordinates(lat, lng) {
    try {
        if(statusLokasi) statusLokasi.textContent = "Mencari Nama Daerah...";
        
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        const addr = data.address;
        
        // Isi Input (Bisa diedit manual)
        const desaField = document.getElementById('desaInput');
        const kecField = document.getElementById('kecamatanInput');
        const kabField = document.getElementById('kabupatenInput');

        if(desaField) desaField.value = addr.village || addr.suburb || addr.hamlet || "";
        if(kecField) kecField.value = addr.county || addr.town || addr.municipality || "";
        if(kabField) kabField.value = addr.city || addr.regency || addr.state_district || "";
        
        if(statusLokasi) {
            statusLokasi.textContent = "Geotag Terkunci ✅";
            statusLokasi.className = "text-success text-center mt-1 fw-bold";
        }

    } catch (error) {
        if(statusLokasi) {
            statusLokasi.textContent = "Gagal ambil nama daerah. Silakan ketik manual.";
            statusLokasi.className = "text-warning text-center mt-1";
        }
    }
}

// 4. FORMAT VISUAL NO HP & CEK DOUBLE (PENTING!)
if (hpInput) {
    // Hanya angka saat mengetik
    hpInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Cek Double saat selesai mengetik (Blur)
    hpInput.addEventListener('blur', async function() {
        const rawHp = this.value;
        if (rawHp.length >= 10) {
            // Format dulu ke 62
            let finalHp = rawHp;
            if (finalHp.startsWith('0')) finalHp = '62' + finalHp.substring(1);
            else if (finalHp.startsWith('8')) finalHp = '62' + finalHp;

            // Panggil Server untuk Cek
            const isDouble = await cekNomorDiServer(finalHp);
            if (isDouble) {
                alert("❌ NOMOR TERDETEKSI GANDA!\n\nNomor HP ini sudah ada di database. Laporan ditolak.");
                this.value = ""; // Kosongkan input
                this.focus(); // Kembalikan kursor
            }
        }
    });
}

// FUNGSI CEK KE SERVER (APPS SCRIPT)
async function cekNomorDiServer(nomor) {
    // Tampilkan indikator loading kecil jika perlu (opsional)
    const originalPlaceholder = hpInput.placeholder;
    hpInput.placeholder = "Mengecek database...";
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            // Kita kirim action khusus "check_double"
            body: JSON.stringify({
                action: "check_double", 
                noHp: nomor
            })
        });
        
        const result = await response.json();
        
        // Kembalikan placeholder
        hpInput.placeholder = originalPlaceholder;

        // Asumsi: Server membalas { status: 'exist' } jika nomor ada
        if (result.status === 'exist' || result.result === 'duplicate') {
            return true; 
        }
        return false;

    } catch (error) {
        console.warn("Gagal cek nomor:", error);
        hpInput.placeholder = originalPlaceholder;
        return false; // Jika error jaringan, kita loloskan dulu (fail open) atau bisa diblokir
    }
}

// 5. AREA & POINT
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

// 6. LOAD PROFIL
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                document.getElementById('namaKaryawan').value = data.nama || "-";
                document.getElementById('idKaryawan').value = data.idKaryawan || "-";
                if(document.getElementById('regionalInput')) document.getElementById('regionalInput').value = data.regional || "Jawa Tengah 1";

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

// 7. PREVIEW FOTO
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

// 8. SUBMIT FORM (VALIDASI SUPER KETAT)
document.getElementById('sosialisasiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // --- STEP VALIDASI NO HP ---
    let rawHp = document.getElementById('noHpInput').value.replace(/[^0-9]/g, '');

    // A. Cek Panjang Digit
    if (rawHp.length < 10 || rawHp.length > 13) {
        alert(`❌ Nomor HP Tidak Valid!\n\nPanjang nomor: ${rawHp.length} digit.\nHarus antara 10 - 13 digit.`);
        return;
    }

    // B. Cek Awalan (Prefix) Wajib Indonesia
    let isValidPrefix = false;
    if (rawHp.startsWith('08')) isValidPrefix = true;
    else if (rawHp.startsWith('628')) isValidPrefix = true;
    else if (rawHp.startsWith('8')) isValidPrefix = true;

    if (!isValidPrefix) {
        alert("❌ Nomor HP Tidak Valid!\n\nNomor HP Indonesia harus diawali dengan:\n- 08xx\n- 628xx\n- atau 8xx");
        return;
    }

    // C. Cek Angka Kembar (Anti Spam)
    if (/(\d)\1{7,}/.test(rawHp)) {
        alert("❌ Nomor HP Tidak Valid!\n\nTerdeteksi angka kembar berulang yang tidak wajar.");
        return;
    }

    // D. Format ke 62
    let finalHp = rawHp;
    if (finalHp.startsWith('0')) {
        finalHp = '62' + finalHp.substring(1);
    } else if (finalHp.startsWith('8')) {
        finalHp = '62' + finalHp;
    }

    // --- E. CEK DOUBLE TERAKHIR (SAFETY) ---
    // Cek lagi sebelum submit beneran, untuk jaga-jaga
    const isDouble = await cekNomorDiServer(finalHp);
    if (isDouble) {
        alert("❌ GAGAL KIRIM: Nomor HP sudah terdaftar di sistem!");
        return; // Batalkan kirim
    }

    // --- VALIDASI FORM LAINNYA ---
    if (!areaSelect.value) { alert("❌ Area belum terpilih!"); return; }
    if (!pointSelect.value) { alert("❌ Point belum terpilih!"); return; }
    if (fileInput.files.length === 0) { alert("❌ Wajib upload foto!"); return; }
    if (!document.getElementById('geotagInput').value) { alert("❌ Geotag belum muncul. Pastikan GPS aktif!"); return; }

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
            
            namaMitra: document.getElementById('namaMitra').value,
            noHp: finalHp, // Kirim Nomor yg sudah diformat 62
            
            desa: document.getElementById('desaInput').value,
            kecamatan: document.getElementById('kecamatanInput').value,
            kabupaten: document.getElementById('kabupatenInput').value,
            geotag: document.getElementById('geotagInput').value,
            
            foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
            namaFoto: "Sos_" + file.name,
            mimeType: file.type
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow', 
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        // Handle error dari server juga (double check)
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
