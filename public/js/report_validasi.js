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
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
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

// 3. FORMAT RUPIAH
document.querySelectorAll('.rupiah-input').forEach(input => {
    input.addEventListener('input', function(e) {
        this.value = formatRupiah(this.value, 'Rp. ');
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
                img.className = 'preview-img'; // Pastikan ada CSS ini
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.margin = '5px';
                if(previewContainer) previewContainer.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    });
}

// 5. SUBMIT FORM (REVISI AMAN)
const form = document.getElementById('validasiForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // AMBIL & BERSIHKAN DATA (Error Handling)
        const displayVal = document.getElementById('amountValDisplay');
        const displayModal = document.getElementById('amountModalDisplay');
        
        // Ambil value hanya jika elemennya ada
        const rawVal = displayVal ? displayVal.value : "0";
        const rawModal = displayModal ? displayModal.value : "0";

        const cleanVal = rawVal.replace(/[^0-9]/g, '');
        const cleanModal = rawModal.replace(/[^0-9]/g, '');

        if (!cleanVal || cleanVal == "0") { alert("❌ Nominal Validasi Kosong!"); return; }
        if (!fileInput || fileInput.files.length === 0) { alert("❌ Wajib upload foto!"); return; }
        if (!areaSelect.value) { alert("❌ Area belum terpilih!"); return; }
        if (!pointSelect.value) { alert("❌ Point belum terpilih!"); return; }

        if(loadingOverlay) loadingOverlay.style.display = 'flex';

        try {
            const files = Array.from(fileInput.files);
            const file = files[0];
            const base64 = await toBase64(file);

            // DATA FORM
            const formData = {
                jenisLaporan: "Validasi",
                
                tanggal: document.getElementById('tanggalInput').value,
                idKaryawan: document.getElementById('idKaryawan').value,
                namaBP: document.getElementById('namaKaryawan').value,
                area: areaSelect.value,
                point: pointSelect.value,
                regional: document.getElementById('regionalInput') ? document.getElementById('regionalInput').value : "Jawa Tengah 1",

                jmlMitraVal: document.getElementById('jmlMitraVal').value,
                
                // DATA BERSIH
                nominalVal: cleanVal,     
                jmlMitraModal: document.getElementById('jmlMitraModal').value,
                nominalModal: cleanModal, 
                
                tenor: document.getElementById('tenorSelect').value,
                foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
                namaFoto: "Val_" + file.name,
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
            if(loadingOverlay) loadingOverlay.style.display = 'none';
        }
    });
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
