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

// ⚠️ URL APP SCRIPT ⚠️
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

// GLOBAL VARIABLE: Untuk menampung file foto sementara
let filesArray = []; 

const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    console.log("Script Validasi Modern (Single Request) Berjalan...");
    setTanggalOtomatis();

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadUserProfile(user.uid);
        } else {
            window.location.replace("index.html");
        }
    });

    setupFormListeners();
    setupPhotoManager(); // Init fitur foto
});

function setTanggalOtomatis() {
    const tglInput = document.getElementById('tanggalInput');
    if (tglInput) tglInput.value = new Date().toISOString().split('T')[0];
}

// --- LOAD PROFIL ---
function loadUserProfile(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Set values
            const elements = {
                nama: document.getElementById('namaKaryawan'),
                id: document.getElementById('idKaryawan'),
                reg: document.getElementById('regionalInput'),
                area: document.getElementById('areaSelect'),
                point: document.getElementById('pointSelect')
            };

            if(elements.nama) elements.nama.value = data.nama || "-";
            if(elements.id) elements.id.value = data.idKaryawan || "-";
            if(elements.reg) elements.reg.value = data.regional || "Jawa Tengah 1";

            if (data.area && elements.area) {
                elements.area.value = data.area;
                updatePointsDropdown(data.area);
                
                // Logic Kunci Area berdasarkan Jabatan
                if (data.jabatan === 'BM' || data.jabatan === 'BP') {
                    elements.area.disabled = true;
                    if(elements.point && data.point) {
                        elements.point.value = data.point;
                        elements.point.disabled = true;
                    }
                } else {
                    if(elements.point && data.point) elements.point.value = data.point;
                }
            }
        } else {
            alert("Profil belum lengkap.");
        }
    }).catch((err) => console.error(err));
}

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

// --- MANAGEMEN FOTO (ADD & REMOVE) ---
function setupPhotoManager() {
    const triggerBtn = document.getElementById('triggerUpload');
    const hiddenInput = document.getElementById('fotoInput');
    
    // 1. Klik area box -> Klik input file asli
    triggerBtn.addEventListener('click', () => hiddenInput.click());

    // 2. Saat file dipilih
    hiddenInput.addEventListener('change', function() {
        const newFiles = Array.from(this.files);
        
        // Cek Maksimal
        if (filesArray.length + newFiles.length > 5) {
            alert("Maksimal 5 foto.");
            return;
        }

        // Tambahkan ke array global (hindari duplikat nama & size)
        newFiles.forEach(file => {
            const exists = filesArray.some(f => f.name === file.name && f.size === file.size);
            if (!exists) filesArray.push(file);
        });

        this.value = ''; // Reset input agar bisa pilih file yg sama jika perlu
        renderPreviews();
    });
}

// Render Ulang Preview
function renderPreviews() {
    const container = document.getElementById('previewContainer');
    container.innerHTML = ''; 

    filesArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Foto">
                <button type="button" class="btn-remove" data-index="${index}">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            container.appendChild(div);

            // Event Hapus per Item
            div.querySelector('.btn-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFile(index);
            });
        }
        reader.readAsDataURL(file);
    });
}

function removeFile(index) {
    filesArray.splice(index, 1);
    renderPreviews();
}

// --- SUBMIT LOGIC (SINGLE REQUEST) ---
function setupFormListeners() {
    // Area Listener
    const elArea = document.getElementById('areaSelect');
    if (elArea) elArea.addEventListener('change', function() { updatePointsDropdown(this.value); });

    // Rupiah Listener
    document.querySelectorAll('.rupiah-input').forEach(input => {
        input.addEventListener('input', function() { this.value = formatRupiah(this.value, 'Rp. '); });
        input.addEventListener('blur', function() { if(this.value === '') this.value = 'Rp. 0'; });
    });

    // Form Submit
    const elForm = document.getElementById('validasiForm');
    const elLoading = document.getElementById('loadingOverlay');

    if (elForm) {
        elForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validasi Input
            const cleanVal = document.getElementById('amountValDisplay').value.replace(/[^0-9]/g, '');
            const cleanModal = document.getElementById('amountModalDisplay').value.replace(/[^0-9]/g, '');

            if (cleanVal === "") { alert("❌ Nominal Validasi Kosong!"); return; }
            if (filesArray.length === 0) { alert("❌ Wajib upload minimal 1 foto!"); return; }
            if (!document.getElementById('areaSelect').value) { alert("❌ Area belum terpilih!"); return; }

            elLoading.style.display = 'flex';
            
            try {
                // 1. Proses Semua Foto ke Base64 secara paralel
                const photoPromises = filesArray.map(async (file) => {
                    const b64 = await toBase64(file);
                    return {
                        namaFoto: "Val_" + file.name,
                        mimeType: file.type,
                        data: b64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
                    };
                });

                const processedPhotos = await Promise.all(photoPromises);

                // 2. Susun Payload (1 JSON Objek berisi list foto)
                const formData = {
                    jenisLaporan: "Validasi",
                    tanggal: document.getElementById('tanggalInput').value,
                    idKaryawan: document.getElementById('idKaryawan').value,
                    namaBP: document.getElementById('namaKaryawan').value,
                    area: document.getElementById('areaSelect').value,
                    point: document.getElementById('pointSelect').value,
                    regional: document.getElementById('regionalInput').value,
                    jmlMitraVal: document.getElementById('jmlMitraVal').value,
                    nominalVal: cleanVal,       
                    jmlMitraModal: document.getElementById('jmlMitraModal').value,
                    nominalModal: cleanModal, 
                    tenor: document.getElementById('tenorSelect').value,
                    
                    // KITA KIRIM ARRAY FOTO DISINI (SINGLE REQUEST)
                    listFoto: processedPhotos 
                };

                // 3. Kirim Sekali Saja
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    redirect: 'follow',
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.result === 'success') {
                    alert("✅ Laporan Berhasil Terkirim!");
                    resetFormKeepUser(elForm);
                } else {
                    throw new Error(result.error || "Gagal menyimpan data");
                }

            } catch (error) {
                console.error("Error:", error);
                alert("❌ Terjadi kesalahan: " + error.message);
            } finally {
                elLoading.style.display = 'none';
            }
        });
    }
}

// Reset Form tapi User Data Tetap
function resetFormKeepUser(form) {
    const saved = {
        nama: document.getElementById('namaKaryawan').value,
        id: document.getElementById('idKaryawan').value,
        reg: document.getElementById('regionalInput').value,
        area: document.getElementById('areaSelect').value,
        point: document.getElementById('pointSelect').value,
        areaLocked: document.getElementById('areaSelect').disabled,
        pointLocked: document.getElementById('pointSelect').disabled
    };

    form.reset();
    filesArray = [];
    renderPreviews();

    // Restore
    setTanggalOtomatis();
    document.getElementById('namaKaryawan').value = saved.nama;
    document.getElementById('idKaryawan').value = saved.id;
    document.getElementById('regionalInput').value = saved.reg;
    
    if (saved.area) {
        document.getElementById('areaSelect').value = saved.area;
        updatePointsDropdown(saved.area);
        document.getElementById('pointSelect').value = saved.point;
    }

    document.getElementById('areaSelect').disabled = saved.areaLocked;
    document.getElementById('pointSelect').disabled = saved.pointLocked;
    
    window.scrollTo(0, 0);
}

// Helpers
function formatRupiah(angka, prefix) {
    if (!angka) return "";
    let number_string = angka.replace(/[^,\d]/g, '').toString();
    if (number_string.length > 1 && number_string.startsWith('0')) number_string = number_string.substring(1);
    
    let split = number_string.split(','),
        sisa = split[0].length % 3,
        rupiah = split[0].substr(0, sisa),
        ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) rupiah += (sisa ? '.' : '') + ribuan.join('.');
    rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah;
    return prefix == undefined ? rupiah : (rupiah ? 'Rp. ' + rupiah : '');
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});
