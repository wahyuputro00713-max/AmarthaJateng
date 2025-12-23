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

// ELEMEN HTML AMAN
const el = {
    tanggal: document.getElementById('tanggalInput'),
    nama: document.getElementById('namaKaryawan'),
    id: document.getElementById('idKaryawan'),
    regional: document.getElementById('regionalInput'),
    area: document.getElementById('areaSelect'),
    point: document.getElementById('pointSelect'),
    
    jmlVal: document.getElementById('jmlMitraVal'),
    nomValDisp: document.getElementById('amountValDisplay'),
    jmlModal: document.getElementById('jmlMitraModal'),
    nomModalDisp: document.getElementById('amountModalDisplay'),
    
    tenor: document.getElementById('tenorSelect'),
    foto: document.getElementById('fotoInput'),
    preview: document.getElementById('previewContainer'),
    
    form: document.getElementById('validasiForm'),
    loading: document.getElementById('loadingOverlay')
};

// 1. AUTO TANGGAL (Jalankan Langsung)
if(el.tanggal) {
    el.tanggal.value = new Date().toISOString().split('T')[0];
}

// 2. FUNGSI UPDATE DROPDOWN POINT
function updatePointsDropdown(selectedArea) {
    if (!el.point) return;
    
    const points = dataPoints[selectedArea] || [];
    el.point.innerHTML = '<option value="" selected disabled>Pilih Point...</option>';
    
    if (points.length > 0) {
        el.point.disabled = false;
        points.forEach(point => {
            const option = document.createElement('option');
            option.value = point;
            option.textContent = point;
            el.point.appendChild(option);
        });
    } else {
        el.point.disabled = true;
    }
}

// Event Listener Area
if (el.area) {
    el.area.addEventListener('change', function() {
        updatePointsDropdown(this.value);
    });
}

// 3. CEK LOGIN & LOAD DATA (BAGIAN PERBAIKAN UTAMA)
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // ISI FORM PROFIL OTOMATIS
                if(el.nama) el.nama.value = data.nama || "-";
                if(el.id) el.id.value = data.idKaryawan || "-";
                if(el.regional) el.regional.value = data.regional || "Jawa Tengah 1"; // Default jika kosong

                // AUTO FILL AREA & POINT (Jika ada di database)
                if (data.area && el.area) {
                    el.area.value = data.area;
                    updatePointsDropdown(data.area);
                    
                    // Kunci Area Jika Jabatan BM/BP (Optional)
                    const jabatan = data.jabatan;
                    if (jabatan === 'BM' || jabatan === 'BP') {
                        el.area.disabled = true; // User tidak bisa ganti area
                        
                        // Auto Fill Point & Kunci
                        if (data.point && el.point) {
                            el.point.value = data.point;
                            el.point.disabled = true;
                        }
                    } else {
                        // Jika bukan BM/BP (misal admin), biarkan bisa ganti area
                        // Tapi tetap auto-select point jika ada
                         if (data.point && el.point) {
                            el.point.value = data.point;
                        }
                    }
                }
            }
        }).catch((err) => {
            console.error("Gagal ambil data user:", err);
        });
    } else {
        window.location.replace("index.html");
    }
});

// 4. FORMAT RUPIAH (BISA INPUT 0)
const rupiahInputs = document.querySelectorAll('.rupiah-input');
rupiahInputs.forEach(input => {
    input.addEventListener('input', function(e) {
        this.value = formatRupiah(this.value, 'Rp. ');
    });
    input.addEventListener('blur', function(e) {
        if(this.value === '') this.value = 'Rp. 0';
    });
});

function formatRupiah(angka, prefix) {
    if (!angka) return "";
    let number_string = angka.replace(/[^,\d]/g, '').toString();
    
    // Logika agar 0 bisa diketik tapi 05 jadi 5
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
    return prefix == undefined ? rupiah : (rupiah ? 'Rp. ' + rupiah : '');
}

// 5. PREVIEW FOTO
if(el.foto) {
    el.foto.addEventListener('change', function() {
        if(el.preview) el.preview.innerHTML = ''; 
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
                img.style.width = '80px'; img.style.height = '80px';
                img.style.objectFit = 'cover'; img.style.margin = '5px';
                img.style.borderRadius = '5px'; img.style.border = '1px solid #ccc';
                if(el.preview) el.preview.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    });
}

// 6. SUBMIT FORM
if (el.form) {
    el.form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // AMBIL DATA & BERSIHKAN RP
        const rawVal = el.nomValDisp ? el.nomValDisp.value : "0";
        const rawModal = el.nomModalDisp ? el.nomModalDisp.value : "0";
        const cleanVal = rawVal.replace(/[^0-9]/g, '');
        const cleanModal = rawModal.replace(/[^0-9]/g, '');

        if (cleanVal === "") { alert("❌ Nominal Validasi Kosong!"); return; }
        if (!el.foto || el.foto.files.length === 0) { alert("❌ Wajib upload foto!"); return; }
        if (!el.area.value) { alert("❌ Area belum terpilih!"); return; }
        if (!el.point.value) { alert("❌ Point belum terpilih!"); return; }

        if(el.loading) el.loading.style.display = 'flex';

        try {
            const files = Array.from(el.foto.files);
            const file = files[0];
            const base64 = await toBase64(file);

            const formData = {
                jenisLaporan: "Validasi",
                
                tanggal: el.tanggal.value,
                idKaryawan: el.id.value,
                namaBP: el.nama.value,
                area: el.area.value,
                point: el.point.value,
                regional: el.regional ? el.regional.value : "Jawa Tengah 1",

                jmlMitraVal: el.jmlVal.value,
                nominalVal: cleanVal,      
                jmlMitraModal: el.jmlModal.value,
                nominalModal: cleanModal, 
                
                tenor: el.tenor.value,
                foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
                namaFoto: "Val_" + file.name,
                mimeType: file.type
            };

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                redirect: 'follow', 
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
            if(el.loading) el.loading.style.display = 'none';
        }
    });
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
