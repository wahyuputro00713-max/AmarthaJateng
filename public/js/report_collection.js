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

// URL APPS SCRIPT (Dari file yang Anda upload sebelumnya)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxmtteV3LF5FiBgWOSgFvJlGv-S3Sks1sBrZIl-aks6NPzPM7DgNQhUrKtJFw2hRkQT/exec"; 

// 1. Cek Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const dataUser = snapshot.val();
                document.getElementById('idKaryawan').value = dataUser.idKaryawan || "-";
                document.getElementById('namaBP').value = dataUser.nama || "-";
            }
        });
        ambilLokasi(); 
    } else {
        window.location.replace("index.html");
    }
});

// 2. Set Tanggal
document.getElementById('tanggalInput').value = new Date().toISOString().split('T')[0];

// 3. Logic Geotag (HIGH ACCURACY)
const geoInput = document.getElementById('geotagInput');
const geoStatus = document.getElementById('geoStatus');
const btnRefreshLoc = document.getElementById('btnRefreshLoc');

function ambilLokasi() {
    geoInput.value = "Sedang mencari...";
    geoStatus.innerText = "⏳ Mengaktifkan GPS Akurasi Tinggi...";
    geoStatus.className = "form-text small text-warning fw-bold";

    if (navigator.geolocation) {
        const options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 };

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
                if (error.code === 3) msg = "❌ Sinyal GPS lemah.";
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

// 4. PREVIEW FOTO (LOGIK BARU)
const fileInput = document.getElementById('fotoInput');
const previewFoto = document.getElementById('previewFoto');

fileInput.addEventListener('change', function(e) {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewFoto.src = e.target.result;
            previewFoto.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else {
        previewFoto.style.display = 'none';
    }
});

// 5. Dropdown Area & Rupiah
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

areaSelect.addEventListener('change', function() {
    const selectedArea = this.value;
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
});

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

// 6. Submit Logic (VALIDASI KETAT)
const form = document.getElementById('collectionForm');
const loadingOverlay = document.getElementById('loadingOverlay');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amtReal = document.getElementById('amountCollectReal').value;
    const geotag = document.getElementById('geotagInput').value;

    if (!amtReal || amtReal === "0") { alert("❌ Amount Collect wajib diisi!"); return; }
    if (!geotag || geotag.includes("Menunggu") || geotag.includes("Gagal") || geotag.includes("mencari")) {
        alert("❌ Lokasi wajib terkunci! Tunggu akurasi muncul."); return;
    }
    if (fileInput.files.length === 0) { alert("❌ Wajib upload foto!"); return; }

    loadingOverlay.style.display = 'flex';

    try {
        const file = fileInput.files[0];
        const base64File = await toBase64(file);
        const cleanBase64 = base64File.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

        const formData = {
            jenisLaporan: "Collection",
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaBP').value,
            area: document.getElementById('areaSelect').value,
            point: document.getElementById('pointSelect').value,
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
        loadingOverlay.style.display = 'none';
    }
});

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
