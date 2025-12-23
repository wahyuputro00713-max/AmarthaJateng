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

const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// --- TUNGGU HALAMAN SIAP DULU ---
window.addEventListener('DOMContentLoaded', () => {
    console.log("Script Validasi Berjalan...");

    // 1. SET TANGGAL OTOMATIS (Langsung isi, tidak perlu login dulu)
    const tglInput = document.getElementById('tanggalInput');
    if (tglInput) {
        tglInput.value = new Date().toISOString().split('T')[0];
    } else {
        console.error("❌ Element 'tanggalInput' tidak ditemukan di HTML!");
    }

    // 2. CEK LOGIN & AMBIL DATA PROFIL
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User Login:", user.uid);
            loadUserProfile(user.uid);
        } else {
            console.warn("User belum login, redirecting...");
            window.location.replace("index.html");
        }
    });

    // 3. EVENT LISTENER LAINNYA
    setupFormListeners();
});

// --- FUNGSI LOAD PROFIL ---
function loadUserProfile(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log("Data Profil Ditemukan:", data);

            // Ambil Elemen (Pasti ada karena sudah DOMContentLoaded)
            const elNama = document.getElementById('namaKaryawan');
            const elId = document.getElementById('idKaryawan');
            const elReg = document.getElementById('regionalInput');
            const elArea = document.getElementById('areaSelect');
            const elPoint = document.getElementById('pointSelect');

            // Isi Data Dasar
            if(elNama) elNama.value = data.nama || "-";
            if(elId) elId.value = data.idKaryawan || "-";
            if(elReg) elReg.value = data.regional || "Jawa Tengah 1";

            // Isi Area & Point
            if (data.area && elArea) {
                elArea.value = data.area;
                // Trigger update point manual
                updatePointsDropdown(data.area);
                
                // Cek Jabatan untuk Kunci Area
                if (data.jabatan === 'BM' || data.jabatan === 'BP') {
                    elArea.disabled = true; // Kunci Area
                    if(elPoint && data.point) {
                        elPoint.value = data.point;
                        elPoint.disabled = true; // Kunci Point
                    }
                } else {
                    // Jika bukan BM/BP, hanya auto-select point tapi tidak dikunci
                    if(elPoint && data.point) {
                        elPoint.value = data.point;
                    }
                }
            }
        } else {
            console.warn("Data profil kosong di database.");
            alert("Profil Anda belum lengkap. Silakan ke menu Profil untuk melengkapi.");
        }
    }).catch((err) => {
        console.error("Gagal ambil data:", err);
    });
}

// --- HELPERS ---
function updatePointsDropdown(selectedArea) {
    const elPoint = document.getElementById('pointSelect');
    if (!elPoint) return;
    
    const points = dataPoints[selectedArea] || [];
    elPoint.innerHTML = '<option value="" selected disabled>Pilih Point...</option>';
    
    if (points.length > 0) {
        elPoint.disabled = false;
        points.forEach(point => {
            const option = document.createElement('option');
            option.value = point;
            option.textContent = point;
            elPoint.appendChild(option);
        });
    } else {
        elPoint.disabled = true;
    }
}

function setupFormListeners() {
    // A. Listener Area Change
    const elArea = document.getElementById('areaSelect');
    if (elArea) {
        elArea.addEventListener('change', function() {
            updatePointsDropdown(this.value);
        });
    }

    // B. Listener Rupiah (Support 0)
    document.querySelectorAll('.rupiah-input').forEach(input => {
        input.addEventListener('input', function() {
            this.value = formatRupiah(this.value, 'Rp. ');
        });
        input.addEventListener('blur', function() {
            if(this.value === '') this.value = 'Rp. 0';
        });
    });

    // C. Listener Preview Foto
    const elFoto = document.getElementById('fotoInput');
    const elPreview = document.getElementById('previewContainer');
    if(elFoto) {
        elFoto.addEventListener('change', function() {
            if(elPreview) elPreview.innerHTML = ''; 
            const files = Array.from(this.files);
            if (files.length > 5) { alert("Maks 5 foto!"); this.value=""; return; }
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-img';
                    img.style.width = '80px'; img.style.height = '80px';
                    img.style.objectFit = 'cover'; img.style.margin = '5px';
                    img.style.borderRadius = '5px'; img.style.border = '1px solid #ccc';
                    if(elPreview) elPreview.appendChild(img);
                }
                reader.readAsDataURL(file);
            });
        });
    }

    // D. Listener Submit
    const elForm = document.getElementById('validasiForm');
    const elLoading = document.getElementById('loadingOverlay');

    if (elForm) {
        elForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // AMBIL VALUE
            const elNomVal = document.getElementById('amountValDisplay');
            const elNomModal = document.getElementById('amountModalDisplay');
            
            const rawVal = elNomVal ? elNomVal.value : "0";
            const rawModal = elNomModal ? elNomModal.value : "0";
            const cleanVal = rawVal.replace(/[^0-9]/g, '');
            const cleanModal = rawModal.replace(/[^0-9]/g, '');

            if (cleanVal === "") { alert("❌ Nominal Validasi Kosong!"); return; }
            if (!document.getElementById('fotoInput').files[0]) { alert("❌ Wajib upload foto!"); return; }
            if (!document.getElementById('areaSelect').value) { alert("❌ Area belum terpilih!"); return; }

            if(elLoading) elLoading.style.display = 'flex';

            try {
                const file = document.getElementById('fotoInput').files[0];
                const base64 = await toBase64(file);

                const formData = {
                    jenisLaporan: "Validasi",
                    tanggal: document.getElementById('tanggalInput').value,
                    idKaryawan: document.getElementById('idKaryawan').value,
                    namaBP: document.getElementById('namaKaryawan').value,
                    area: document.getElementById('areaSelect').value,
                    point: document.getElementById('pointSelect').value,
                    regional: document.getElementById('regionalInput') ? document.getElementById('regionalInput').value : "Jawa Tengah 1",
                    jmlMitraVal: document.getElementById('jmlMitraVal').value,
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
                if(elLoading) elLoading.style.display = 'none';
            }
        });
    }
}

function formatRupiah(angka, prefix) {
    if (!angka) return "";
    let number_string = angka.replace(/[^,\d]/g, '').toString();
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

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
