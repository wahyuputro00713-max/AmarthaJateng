// ... (Bagian import dan config sama) ...
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// URL APPS SCRIPT (Tetap)
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

// Data Points (Tetap)
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pangasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

const areaSelect = document.getElementById('areaSelect');
const pointSelect = document.getElementById('pointSelect');

// LOGIKA UPDATE DROPDOWN
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

areaSelect.addEventListener('change', function() {
    updatePointsDropdown(this.value);
});

// 1. CEK LOGIN & AUTO FILL
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const dataUser = snapshot.val();
                
                // Isi ID & Nama
                document.getElementById('idKaryawan').value = dataUser.idKaryawan || "-";
                document.getElementById('namaBP').value = dataUser.nama || "-";

                // LOGIKA KHUSUS JABATAN
                const jabatan = dataUser.jabatan;
                
                // Jika user punya area di profil, isi area otomatis
                if (dataUser.area) {
                    areaSelect.value = dataUser.area;
                    updatePointsDropdown(dataUser.area); // Trigger update point list
                }

                // JIKA BM ATAU BP -> KUNCI AREA & POINT
                if (jabatan === 'BM' || jabatan === 'BP') {
                    if (dataUser.area) {
                        areaSelect.disabled = true; // Kunci Area
                    }
                    if (dataUser.point) {
                        pointSelect.value = dataUser.point; // Pilih Point
                        pointSelect.disabled = true; // Kunci Point
                    }
                } 
                // JIKA RM ATAU AM -> BIARKAN POINT TERBUKA (Bisa pilih manual)
                else if (jabatan === 'RM' || jabatan === 'AM') {
                    // Area mungkin terisi otomatis, tapi Point tetap bisa dipilih manual
                    pointSelect.disabled = false;
                }
            }
        });
        ambilLokasi();
    } else {
        window.location.replace("index.html");
    }
});

// 2. Set Tanggal
document.getElementById('tanggalInput').value = new Date().toISOString().split('T')[0];

// 3. Logic Geotag (HIGH ACCURACY / GPS)
const geoInput = document.getElementById('geotagInput');
const geoStatus = document.getElementById('geoStatus');
const btnRefreshLoc = document.getElementById('btnRefreshLoc');

function ambilLokasi() {
    geoInput.value = "Sedang mencari...";
    geoStatus.innerText = "⏳ Mengaktifkan GPS Akurasi Tinggi...";
    geoStatus.className = "form-text small text-warning fw-bold";

    if (navigator.geolocation) {
        const options = {
            enableHighAccuracy: true, 
            timeout: 20000,           
            maximumAge: 0             
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const long = position.coords.longitude;
                const akurasi = position.coords.accuracy;

                geoInput.value = `https://www.google.com/maps?q=${lat},${long}`;
                geoStatus.innerHTML = `✅ Terkunci (Akurasi: <b>${Math.round(akurasi)} meter</b>)`;
                geoStatus.className = "form-text small text-success fw-bold";
            },
            (error) => {
                console.error("Error Lokasi:", error);
                geoInput.value = "Lokasi Gagal";
                let msg = "Gagal. Pastikan GPS aktif.";
                if (error.code === 1) msg = "❌ Izin lokasi ditolak.";
                
                geoStatus.innerText = msg;
                geoStatus.className = "form-text small text-danger fw-bold";
            },
            options
        );
    } else {
        geoInput.value = "Tidak Support";
    }
}
btnRefreshLoc.addEventListener('click', ambilLokasi);

// 5. Format Rupiah
const rupiahInput = document.getElementById('amountCollectDisplay');
rupiahInput.addEventListener('keyup', function(e) {
    this.value = formatRupiah(this.value, 'Rp. ');
    document.getElementById('amountCollectReal').value = this.value.replace(/[^0-9]/g, '');
});

function formatRupiah(angka, prefix) {
    let number_string = angka.replace(/[^,\d]/g, '').toString(),
        split = number_string.split(','),
        sisa = split[0].length % 3,
        rupiah = split[0].substr(0, sisa),
        ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    return prefix == undefined ? rupiah : (rupiah ? 'Rp. ' + rupiah : '');
}

// 6. Submit Logic
const form = document.getElementById('collectionForm');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amtReal = document.getElementById('amountCollectReal').value;
    const geotag = document.getElementById('geotagInput').value;
    const fileInput = document.getElementById('fotoInput');

    // === VALIDASI NOMINAL (PERBAIKAN) ===
    // Pastikan nominal minimal 1000
    const nominal = parseInt(amtReal, 10);
    
    if (!nominal || nominal < 1000) { 
        alert("❌ Amount Collect tidak boleh 0!");
        // Fokuskan kembali ke input agar user memperbaiki
        document.getElementById('amountCollectDisplay').focus(); 
        return; 
    }

    if (!geotag || geotag.includes("Menunggu") || geotag.includes("Gagal")) {
        alert("❌ Lokasi wajib terkunci! Tunggu akurasi muncul."); return;
    }
    if (fileInput.files.length === 0) { alert("❌ Wajib upload foto!"); return; }

    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex';

    try {
        const file = fileInput.files[0];
        const base64File = await toBase64(file);
        const cleanBase64 = base64File.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

        // PENTING: Jika Area/Point disabled, value-nya tidak terkirim otomatis oleh form HTML standar.
        // Kita ambil value manual dari element.
        const formData = {
            jenisLaporan: "Collection",
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaBP').value,
            area: areaSelect.value, // Ambil value meski disabled
            point: pointSelect.value, // Ambil value meski disabled
            idLoan: document.getElementById('idLoan').value,
            namaMitra: document.getElementById('namaMitra').value,
            amountCollect: amtReal,
            dpd: document.getElementById('dpdSelect').value,
            keterangan: document.getElementById('ketSelect').value,
            geotag: geotag,
            foto: cleanBase64,
            namaFoto: "Coll_" + file.name,
            mimeType: file.type
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.result === 'success') {
            alert("✅ Report Collection Berhasil!");
            window.location.href = "home.html";
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error(error);
        alert("❌ Gagal: " + error.message);
    } finally {
        const loadingOverlay = document.getElementById('loadingOverlay');
        loadingOverlay.style.display = 'none';
    }
});

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
