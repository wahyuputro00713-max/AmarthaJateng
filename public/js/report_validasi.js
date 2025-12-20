import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// ⚠️ GANTI DENGAN URL DEPLOYMENT TERBARU ANDA ⚠️
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxmtteV3LF5FiBgWOSgFvJlGv-S3Sks1sBrZIl-aks6NPzPM7DgNQhUrKtJFw2hRkQT/exec"; 

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.replace("index.html");
});

const dateInput = document.getElementById('tanggalInput');
if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];

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

if (areaSelect && pointSelect) {
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
}

const rupiahInputs = document.querySelectorAll('.rupiah-input');
rupiahInputs.forEach(input => {
    input.addEventListener('keyup', function(e) {
        input.value = formatRupiah(this.value, 'Rp. ');
        const realInputId = this.id.replace('Display', 'Real');
        const realInput = document.getElementById(realInputId);
        if(realInput) realInput.value = this.value.replace(/[^0-9]/g, '');
    });
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

// SUBMIT LOGIC (VALIDASI KETAT)
const form = document.getElementById('validasiForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const amtVal = document.getElementById('amountValReal').value;
        const amtModal = document.getElementById('amountModalReal').value;
        const fileInput = document.getElementById('fotoInput');

        if (!amtVal || amtVal === "") { alert("❌ Amount Val wajib diisi!"); return; }
        if (!amtModal || amtModal === "") { alert("❌ Amount Modal wajib diisi!"); return; }
        if (fileInput.files.length === 0) { alert("❌ Wajib upload foto validasi!"); return; }

        loadingOverlay.style.display = 'flex';

        try {
            const file = fileInput.files[0];
            const base64File = await toBase64(file); 
            const cleanBase64 = base64File.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

            const formData = {
                jenisLaporan: "Validasi", 
                tanggal: document.getElementById('tanggalInput').value,
                regional: document.getElementById('regionalInput').value,
                area: document.getElementById('areaSelect').value,
                point: document.getElementById('pointSelect').value,
                jmlMitraVal: document.getElementById('jmlMitraVal').value,
                amtVal: amtVal,       
                jmlMitraModal: document.getElementById('jmlMitraModal').value,
                amtModal: amtModal,   
                tenor: document.getElementById('tenorSelect').value,
                foto: cleanBase64,
                namaFoto: file.name,
                mimeType: file.type
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.result === 'success') {
                alert("✅ Data Validasi Terkirim!");
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
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
