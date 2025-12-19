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

// ⚠️ GANTI URL INI DENGAN URL APPS SCRIPT ANDA (AKHIRAN /exec) ⚠️
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwlkTxFE-0GHzxkri2wsjdVvqkXTcDE69SyIoV2puLFylIxWc2IkfDRxd58tYvilA3J/exec"; 

// 1. Cek Login & Ambil Data User
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
        
        // Mulai ambil lokasi saat login terdeteksi
        ambilLokasi();
    } else {
        window.location.replace("index.html");
    }
});

// 2. Set Tanggal Otomatis (Readonly)
document.getElementById('tanggalInput').value = new Date().toISOString().split('T')[0];

// 3. Fungsi Ambil Lokasi (Geotag)
function ambilLokasi() {
    const geoInput = document.getElementById('geotagInput');
    const geoStatus = document.getElementById('geoStatus');

    if (navigator.geolocation) {
        geoStatus.innerText = "Sedang mengambil lokasi...";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const long = position.coords.longitude;
                // Format Google Maps Link
                geoInput.value = `https://www.google.com/maps?q=${lat},${long}`;
                geoStatus.innerText = "✅ Lokasi terkunci.";
                geoStatus.classList.replace("text-muted", "text-success");
            },
            (error) => {
                console.error("Error Lokasi:", error);
                geoInput.value = "Lokasi Gagal";
                geoStatus.innerText = "❌ Gagal ambil lokasi. Pastikan GPS aktif.";
                geoStatus.classList.replace("text-muted", "text-danger");
            }
        );
    } else {
        geoInput.value = "Tidak Support";
    }
}

// 4. Dropdown Area -> Point
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
const loadingOverlay = document.getElementById('loadingOverlay');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validasi Foto & Geotag
    const fileInput = document.getElementById('fotoInput');
    const geotag = document.getElementById('geotagInput').value;

    if (fileInput.files.length === 0) {
        alert("Wajib upload foto!"); return;
    }
    if (!geotag || geotag === "Lokasi Gagal" || geotag.includes("Menunggu")) {
        alert("Wajib ada lokasi! Coba refresh halaman atau hidupkan GPS."); return;
    }

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
            amountCollect: document.getElementById('amountCollectReal').value,
            dpd: document.getElementById('dpdSelect').value,
            keterangan: document.getElementById('ketSelect').value,
            geotag: geotag, // Kirim link Google Maps
            
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
