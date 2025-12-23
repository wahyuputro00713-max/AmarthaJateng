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

// ⚠️ PASTE URL APP SCRIPT ANDA DI SINI ⚠️
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

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

// ELEMEN HTML (Dengan Pengecekan Aman)
const areaSelect = document.getElementById('areaSelect');
const pointSelect = document.getElementById('pointSelect');

// FUNGSI ISI DROPDOWN
function updatePointsDropdown(selectedArea) {
    if (!pointSelect) return;
    
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

// 1. CEK LOGIN
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Isi Form Aman
                if(document.getElementById('namaKaryawan')) document.getElementById('namaKaryawan').value = data.nama || "-";
                if(document.getElementById('idKaryawan')) document.getElementById('idKaryawan').value = data.idKaryawan || "-";
                if(document.getElementById('regionalInput')) document.getElementById('regionalInput').value = data.regional || "Jawa Tengah 1";

                // Auto Fill Area
                if (data.area && areaSelect) {
                    areaSelect.value = data.area;
                    updatePointsDropdown(data.area);
                }

                // Logika Jabatan
                const jabatan = data.jabatan;
                if ((jabatan === 'BM' || jabatan === 'BP') && areaSelect && pointSelect) {
                    if (data.area) areaSelect.disabled = true;
                    if (data.point) {
                        pointSelect.value = data.point;
                        pointSelect.disabled = true;
                    }
                } 
            }
        });
    } else {
        window.location.replace("index.html");
    }
});

// 2. SET TANGGAL
const dateInput = document.getElementById('tanggalInput');
if(dateInput) dateInput.value = new Date().toISOString().split('T')[0];

// 3. FORMAT RUPIAH (FIX: BISA INPUT 0)
document.querySelectorAll('.rupiah-input').forEach(input => {
    // Saat user mengetik
    input.addEventListener('input', function(e) {
        this.value = formatRupiah(this.value, 'Rp. ');
    });

    // Saat user klik keluar (blur), jika kosong set jadi Rp. 0
    input.addEventListener('blur', function(e) {
        if(this.value === '') this.value = 'Rp. 0';
    });
});

function formatRupiah(angka, prefix) {
    // Jika angka kosong, kembalikan kosong
    if (!angka) return "";

    // Bersihkan karakter selain angka
    let number_string = angka.replace(/[^,\d]/g, '').toString();
    
    // LOGIKA PENTING: Handle Angka 0
    // Jika panjang > 1 dan depannya 0 (contoh: 05), hapus 0 di depan (jadi 5)
    // Tapi jika cuma "0", biarkan tetap "0"
    if (number_string.length > 1 && number_string.startsWith('0')) {
        number_string = number_string.substring(1);
    }

    let split = number_string.split(','),
        sisa = split[0].length % 3,
        rupiah = split[0].substr(0, sisa),
        ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    
    // Return dengan prefix, tapi izinkan jika hasilnya "0" (jadi "Rp. 0")
    return prefix == undefined ? rupiah : (rupiah ? 'Rp. ' + rupiah : '');
}

// 4. PREVIEW FOTO
const fileInput = document.getElementById('fotoInput');
const previewContainer = document.getElementById('previewContainer');

if(fileInput) {
    fileInput.addEventListener('change', function() {
        if(previewContainer) previewContainer.innerHTML = ''; 
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
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover'; // Tambahan agar rapi
                img.style.margin = '5px';
                img.style.borderRadius = '5px'; // Tambahan agar rapi
                img.style.border = '1px solid #ccc'; // Tambahan agar rapi
                if(previewContainer) previewContainer.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    });
}

// 5. SUBMIT FORM (REVISI: IZINKAN NOMINAL 0)
const form = document.getElementById('validasiForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // AMBIL & BERSIHKAN DATA
        const displayVal = document.getElementById('amountValDisplay');
        const displayModal = document.getElementById('amountModalDisplay');
        
        // Default ke "0" jika elemen tidak ada
        const rawVal = displayVal ? displayVal.value : "0";
        const rawModal = displayModal ? displayModal.value : "0";

        // Bersihkan Rp dan titik
        const cleanVal = rawVal.replace(/[^0-9]/g, '');
        const cleanModal = rawModal.replace(/[^0-9]/g, '');

        // VALIDASI:
        // Izinkan jika 0, hanya tolak jika benar-benar kosong stringnya
        if (cleanVal === "") { alert("❌ Nominal Validasi Kosong!"); return; }
        
        if (!fileInput || fileInput.files.length === 0) { alert("❌ Wajib upload foto!"); return; }
        if (!areaSelect.value) { alert("❌ Area belum terpilih!"); return;
