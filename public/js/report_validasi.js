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

// GLOBAL VARIABLE UNTUK MENAMPUNG FOTO
let filesArray = []; 

const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pangasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    console.log("Script Validasi Modern Berjalan...");
    setTanggalOtomatis();

    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadUserProfile(user.uid);
        } else {
            window.location.replace("index.html");
        }
    });

    setupFormListeners();
    setupPhotoManager(); // Init fungsi foto baru
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
            const elNama = document.getElementById('namaKaryawan');
            const elId = document.getElementById('idKaryawan');
            const elReg = document.getElementById('regionalInput');
            const elArea = document.getElementById('areaSelect');
            const elPoint = document.getElementById('pointSelect');

            if(elNama) elNama.value = data.nama || "-";
            if(elId) elId.value = data.idKaryawan || "-";
            if(elReg) elReg.value = data.regional || "Jawa Tengah 1";

            if (data.area && elArea) {
                elArea.value = data.area;
                updatePointsDropdown(data.area);
                
                if (data.jabatan === 'BM' || data.jabatan === 'BP') {
                    elArea.disabled = true;
                    if(elPoint && data.point) {
                        elPoint.value = data.point;
                        elPoint.disabled = true;
                    }
                } else {
                    if(elPoint && data.point) elPoint.value = data.point;
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
    elPoint.innerHTML = '<option value="" selected disabled>Pilih Point</option>';
    
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

// --- LOGIKA MANAJEMEN FOTO BARU ---
function setupPhotoManager() {
    const triggerBtn = document.getElementById('triggerUpload');
    const hiddenInput = document.getElementById('fotoInput');
    const previewContainer = document.getElementById('previewContainer');

    // 1. Klik area box -> Klik input file asli
    triggerBtn.addEventListener('click', () => hiddenInput.click());

    // 2. Saat file dipilih dari galeri
    hiddenInput.addEventListener('change', function() {
        const newFiles = Array.from(this.files);
        
        // Gabungkan dengan file yg sudah ada
        if (filesArray.length + newFiles.length > 5) {
            alert("Maksimal 5 foto sekaligus.");
            return;
        }

        newFiles.forEach(file => {
            // Cek duplikasi sederhana berdasarkan nama dan ukuran
            const exists = filesArray.some(f => f.name === file.name && f.size === file.size);
            if (!exists) {
                filesArray.push(file);
            }
        });

        // Reset input agar bisa pilih file yang sama jika dihapus lalu dipilih lagi
        this.value = ''; 
        
        renderPreviews();
    });
}

// Render Ulang Preview berdasarkan filesArray
function renderPreviews() {
    const container = document.getElementById('previewContainer');
    container.innerHTML = ''; // Bersihkan

    filesArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Buat Element HTML untuk Preview
            const div = document.createElement('div');
            div.className = 'photo-item';
            
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="delete-btn" data-index="${index}">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            container.appendChild(div);

            // Tambah event listener delete khusus untuk tombol ini
            div.querySelector('.delete-btn').addEventListener('click', function(e) {
                e.stopPropagation(); // Biar gak bubble
                removeFile(index);
            });
        }
        reader.readAsDataURL(file);
    });
}

// Hapus File dari Array
function removeFile(index) {
    filesArray.splice(index, 1); // Hapus dari array
    renderPreviews(); // Gambar ulang
}

// --- LOGIKA UTAMA (SUBMIT & RUPIAH) ---
function setupFormListeners() {
    // Area Listener
    const elArea = document.getElementById('areaSelect');
    if (elArea) {
        elArea.addEventListener('change', function() {
            updatePointsDropdown(this.value);
        });
    }

    // Rupiah Formatter
    document.querySelectorAll('.rupiah-input').forEach(input => {
        input.addEventListener('input', function() {
            this.value = formatRupiah(this.value, 'Rp. ');
        });
        input.addEventListener('blur', function() {
            if(this.value === '') this.value = 'Rp. 0';
        });
    });

    // Submit Form
    const elForm = document.getElementById('validasiForm');
    const elLoading = document.getElementById('loadingOverlay');
    const elLoadingText = document.getElementById('loadingText');

    if (elForm) {
        elForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validasi
            const rawVal = document.getElementById('amountValDisplay').value;
            const rawModal = document.getElementById('amountModalDisplay').value;
            const cleanVal = rawVal.replace(/[^0-9]/g, '');
            const cleanModal = rawModal.replace(/[^0-9]/g, '');

            if (cleanVal === "") { alert("❌ Nominal Validasi Kosong!"); return; }
            if (filesArray.length === 0) { alert("❌ Wajib upload minimal 1 foto!"); return; }
            if (!document.getElementById('areaSelect').value) { alert("❌ Area belum terpilih!"); return; }

            // Tampilkan Loading
            elLoading.style.display = 'flex';
            
            try {
                // Loop upload untuk setiap foto yang ada di array
                // Karena backend mungkin hanya terima 1 row per request, kita kirim multiple request
                let successCount = 0;

                for (let i = 0; i < filesArray.length; i++) {
                    const file = filesArray[i];
                    
                    // Update teks loading
                    elLoadingText.innerText = `Mengupload Foto ${i + 1} dari ${filesArray.length}...`;

                    const base64 = await toBase64(file);
                    
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
                        foto: base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, ""),
                        namaFoto: "Val_" + file.name,
                        mimeType: file.type,
                        indexFoto: (i + 1) // Opsional: penanda urutan
                    };

                    // Kirim Data
                    await fetch(SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                    
                    successCount++;
                }

                // Selesai
                alert(`✅ Berhasil! ${successCount} data validasi terkirim.`);
                
                // Reset Form tapi simpan data user
                resetFormKeepUser(elForm);

            } catch (error) {
                console.error("Error:", error);
                alert("❌ Terjadi kesalahan: " + error.message);
            } finally {
                elLoading.style.display = 'none';
            }
        });
    }
}

function resetFormKeepUser(form) {
    // Simpan data user
    const savedNama = document.getElementById('namaKaryawan').value;
    const savedId = document.getElementById('idKaryawan').value;
    const savedReg = document.getElementById('regionalInput').value;
    const savedArea = document.getElementById('areaSelect').value;
    const savedPoint = document.getElementById('pointSelect').value;
    const isAreaLocked = document.getElementById('areaSelect').disabled;
    const isPointLocked = document.getElementById('pointSelect').disabled;

    form.reset();
    filesArray = []; // Kosongkan array foto
    renderPreviews(); // Bersihkan preview UI

    // Restore data user
    setTanggalOtomatis();
    document.getElementById('namaKaryawan').value = savedNama;
    document.getElementById('idKaryawan').value = savedId;
    document.getElementById('regionalInput').value = savedReg;

    if (savedArea) {
        document.getElementById('areaSelect').value = savedArea;
        updatePointsDropdown(savedArea);
        document.getElementById('pointSelect').value = savedPoint;
    }

    document.getElementById('areaSelect').disabled = isAreaLocked;
    document.getElementById('pointSelect').disabled = isPointLocked;
    
    window.scrollTo(0, 0);
}

function formatRupiah(angka, prefix) {
    if (!angka) return "";
    let number_string = angka.replace(/[^,\d]/g, '').toString();
    if (number_string.length > 1 && number_string.startsWith('0')) number_string = number_string.substring(1);
    
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
