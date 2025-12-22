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

// ⚠️ PASTE URL SCRIPT ANDA DISINI ⚠️
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKSLFYjD2Z8CSW2uT59rTjGMGpaPULVKvAsHKznItHlA8WIYGOveTJEcXcPbVESStN/exec"; 

// Data Dropdown Point
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

// --- FUNGSI UPDATE DROPDOWN ---
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

// 1. CEK LOGIN & AUTO FILL DATA
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const dataUser = snapshot.val();
                
                document.getElementById('namaKaryawan').value = dataUser.nama || "-";
                document.getElementById('idKaryawan').value = dataUser.idKaryawan || "-";
                if(document.getElementById('regionalInput')) {
                    document.getElementById('regionalInput').value = dataUser.regional || "Jawa Tengah 1";
                }

                if (dataUser.area) {
                    areaSelect.value = dataUser.area;
                    updatePointsDropdown(dataUser.area);
                }

                // Logika Jabatan
                const jabatan = dataUser.jabatan;
                if (jabatan === 'BM' || jabatan === 'BP') {
                    if (dataUser.area) areaSelect.disabled = true;
                    if (dataUser.point) {
                        pointSelect.value = dataUser.point;
                        pointSelect.disabled = true;
                    }
                } else if (jabatan === 'RM' || jabatan === 'AM') {
                    pointSelect.disabled = false;
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

// 3. FORMAT RUPIAH & SIMPAN REAL VALUE (PERBAIKAN UTAMA)
const rupiahInputs = document.querySelectorAll('.rupiah-input');
rupiahInputs.forEach(input => {
    input.addEventListener('input', function(e) {
        // Ambil ID Input Hidden pasangannya
        // Contoh: amountValDisplay -> amountValReal
        const realInputId = this.id.replace('Display', 'Real');
        const realInput = document.getElementById(realInputId);

        // 1. Bersihkan karakter selain angka (simpan ke Hidden Input)
        let cleanValue = this.value.replace(/[^0-9]/g, '');
        if(realInput) {
            realInput.value = cleanValue;
        }

        // 2. Format Tampilan (tambah Rp dan Titik)
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

// 4. PREVIEW BANYAK FOTO
const fileInput = document.getElementById('fotoInput');
const previewContainer = document.getElementById('previewContainer');

if (fileInput) {
    fileInput.addEventListener('change', function() {
        previewContainer.innerHTML = ''; 
        const files = Array.from(this.files);
        if (files.length > 5) {
            alert("Maksimal 5 foto sekaligus.");
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
                img.style.margin = '5px'; 
                img.style.borderRadius = '5px';
                img.style.border = '1px solid #ccc';
                previewContainer.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    });
}

// 5. SUBMIT FORM
const form = document.getElementById('validasiForm');
const loadingOverlay = document.getElementById('loadingOverlay');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // AMBIL ANGKA MURNI DARI INPUT HIDDEN
        let amtVal = document.getElementById('amountValReal').value;
        let amtModal = document.getElementById('amountModalReal').value;
        
        // Backup: Jika Hidden Kosong, coba bersihkan manual dari Display
        if(!amtVal) amtVal = document.getElementById('amountValDisplay').value.replace(/[^0-9]/g, '');
        if(!amtModal) amtModal = document.getElementById('amountModalDisplay').value.replace(/[^0-9]/g, '');

        if (!amtVal || amtVal == "0") { alert("❌ Nominal Validasi Kosong/Nol!"); return; }
        if (fileInput.files.length === 0) { alert("❌ Wajib upload foto!"); return; }
        if (!areaSelect.value) { alert("❌ Area belum terpilih!"); return; }
        if (!pointSelect.value) { alert("❌ Point belum terpilih!"); return; }

        loadingOverlay.style.display = 'flex';

        try {
            const files = Array.from(fileInput.files);
            const file = files[0];
            const base64 = await toBase64(file);

            const formData = {
                jenisLaporan: "Validasi",
                
                tanggal: document.getElementById('tanggalInput').value,
                idKaryawan: document.getElementById('idKaryawan').value,
                namaBP: document.getElementById('namaKaryawan').value,
                area: areaSelect.value,
                point: pointSelect.value,
                regional: document.getElementById('regionalInput') ? document.getElementById('regionalInput').value : "Jawa Tengah 1",

                jmlMitraVal: document.getElementById('jmlMitraVal').value,
                nominalVal: amtVal,       // Kirim Angka Murni
                jmlMitraModal: document.getElementById('jmlMitraModal').value,
                nominalModal: amtModal,   // Kirim Angka Murni
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
