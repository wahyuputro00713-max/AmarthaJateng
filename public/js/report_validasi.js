// js/report_validasi.js

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

// 1. Cek Login (Security)
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("index.html");
    }
});

// 2. Set Tanggal Hari Ini Otomatis
const dateInput = document.getElementById('tanggalInput');
const today = new Date().toISOString().split('T')[0];
if(dateInput) dateInput.value = today;

// 3. Data Dropdown Point (Cascading)
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucul"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": [] // Tidak ada data di prompt
};

const areaSelect = document.getElementById('areaSelect');
const pointSelect = document.getElementById('pointSelect');

if (areaSelect && pointSelect) {
    areaSelect.addEventListener('change', function() {
        const selectedArea = this.value;
        const points = dataPoints[selectedArea] || [];

        // Reset dropdown point
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
            pointSelect.innerHTML = '<option value="" disabled>Tidak ada point tersedia</option>';
        }
    });
}

// 4. Format Rupiah
const rupiahInputs = document.querySelectorAll('.rupiah-input');

rupiahInputs.forEach(input => {
    input.addEventListener('keyup', function(e) {
        // Format tampilan ke user (Rp 1.000.000)
        input.value = formatRupiah(this.value, 'Rp. ');
        
        // Simpan angka murni ke input hidden untuk dikirim ke Google Form (1000000)
        // ID input hidden harus sesuai pattern: idDisplay -> idReal
        const realInputId = this.id.replace('Display', 'Real');
        const realInput = document.getElementById(realInputId);
        if(realInput) {
            // Hapus karakter non-digit
            realInput.value = this.value.replace(/[^0-9]/g, '');
        }
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
