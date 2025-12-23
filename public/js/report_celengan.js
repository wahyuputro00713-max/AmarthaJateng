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

// ⚠️ PASTE URL APPS SCRIPT ANDA DI SINI ⚠️
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

// --- INIT ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Auto Tanggal
    const tgl = document.getElementById('tanggalInput');
    if(tgl) tgl.value = new Date().toISOString().split('T')[0];

    // 2. Cek Login & Load Data
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadUserProfile(user.uid);
        } else {
            window.location.replace("index.html");
        }
    });

    // 3. Listener Rupiah
    const rupiahEl = document.getElementById('nominalInput');
    if(rupiahEl) {
        rupiahEl.addEventListener('input', function() {
            this.value = formatRupiah(this.value, 'Rp. ');
        });
        rupiahEl.addEventListener('blur', function() {
            if(this.value === '') this.value = 'Rp. 0';
        });
    }

    // 4. Listener Submit
    const formEl = document.getElementById('celenganForm');
    if(formEl) {
        formEl.addEventListener('submit', submitLaporan);
    }

    // 5. SETUP SCANNER OCR
    setupScanner();
});

// --- FUNGSI PRE-PROCESSING IMAGE (MEMPERTAJAM GAMBAR) ---
function preprocessImage(imageFile) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = function(e) {
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                // Ubah jadi Grayscale & High Contrast
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                    const val = (gray > 130) ? 255 : 0; // Thresholding
                    data[i] = data[i + 1] = data[i + 2] = val;
                }

                ctx.putImageData(imgData, 0, 0);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
            }
        };
        reader.readAsDataURL(imageFile);
    });
}

// --- FUNGSI SCANNER PINTAR ---
function setupScanner() {
    const btnScan = document.getElementById('btnScan');
    const scanInput = document.getElementById('scanInput');
    const kodeField = document.getElementById('kodeTransaksi');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    if (btnScan && scanInput) {
        btnScan.addEventListener('click', () => {
            scanInput.click();
        });

        scanInput.addEventListener('change', async function() {
            const rawFile = this.files[0];
            if (!rawFile) return;

            loadingText.textContent = "⚙️ Memproses Gambar...";
            loadingOverlay.style.display = 'flex';

            try {
                // 1. Pre-process Image
                const processedFile = await preprocessImage(rawFile);
                
                loadingText.textContent = "🔍 Membaca Teks...";

                // 2. OCR Tesseract
                const result = await Tesseract.recognize(processedFile, 'eng', {
                    logger: m => console.log(m)
                });

                const fullText = result.data.text;
                console.log("=== RAW OCR ===");
                console.log(fullText);

                // 3. Filter Mencari Kode
                const kodeDitemukan = saringKodeTransaksi(fullText);

                if (kodeDitemukan) {
                    kodeField.value = kodeDitemukan;
                    alert(`✅ Kode Ditemukan!\n${kodeDitemukan}`);
                } else {
                    alert("⚠️ Kode tidak ditemukan.\nPastikan foto memuat kode UUID lengkap (xxxxx-xxxx-xxxx...).");
                }

            } catch (error) {
                console.error(error);
                alert("❌ Gagal scan: " + error.message);
            } finally {
                loadingOverlay.style.display = 'none';
                loadingText.textContent = "Memproses...";
                this.value = ""; 
            }
        });
    }
}

// --- LOGIKA FILTER BARU (SUPER AGRESIF) ---
function saringKodeTransaksi(text) {
    if (!text) return null;

    // 1. HAPUS SEMUA SPASI DAN BARIS BARU (Gabung jadi satu string panjang)
    // Ini kunci agar kode yang terpotong baris bisa terbaca nyambung.
    // Contoh: "1234-\n5678" menjadi "1234-5678"
    const cleanText = text.replace(/\s+/g, '').trim(); 
    
    console.log("=== CLEAN TEXT ===");
    console.log(cleanText);

    // 2. REGEX UUID (Format sesuai screenshot Anda)
    // Pola: 8char - 4char - 4char - 4char - 12char
    // Total sekitar 32-36 karakter Hexadesimal (0-9, a-f) dengan tanda '-'
    const regexUUID = /[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}/i;

    const match = cleanText.match(regexUUID);

    if (match) {
        return match[0]; // Kembalikan kode yang cocok
    }

    return null; // Gagal
}

// --- FUNGSI LOAD PROFIL (AUTO FILL) ---
function loadUserProfile(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            if(document.getElementById('namaKaryawan')) document.getElementById('namaKaryawan').value = data.nama || "-";
            if(document.getElementById('idKaryawan')) document.getElementById('idKaryawan').value = data.idKaryawan || "-";
            if(document.getElementById('regionalInput')) document.getElementById('regionalInput').value = data.regional || "Jawa Tengah 1";
            if(document.getElementById('areaDisplay')) document.getElementById('areaDisplay').value = data.area || "-";
            if(document.getElementById('pointDisplay')) document.getElementById('pointDisplay').value = data.point || "-";
        }
    });
}

// --- FUNGSI SUBMIT ---
async function submitLaporan(e) {
    e.preventDefault();
    
    const elArea = document.getElementById('areaDisplay');
    const elKode = document.getElementById('kodeTransaksi');
    const elNamaMitra = document.getElementById('namaMitra');
    const elNominal = document.getElementById('nominalInput');

    if (!elArea || !elKode || !elNamaMitra || !elNominal) {
        alert("❌ Error Script: Elemen HTML tidak ditemukan.");
        return;
    }

    const area = elArea.value;
    const kode = elKode.value.trim();
    const namaMitra = elNamaMitra.value;
    const rawNominal = elNominal.value;
    const cleanNominal = rawNominal.replace(/[^0-9]/g, ''); 

    if(!area || area === "-") { alert("❌ Data Area/Profil belum termuat."); return; }
    if(!kode) { alert("❌ Kode Transaksi wajib diisi!"); return; }
    if(!namaMitra) { alert("❌ Nama Mitra wajib diisi!"); return; }
    if(!cleanNominal) { alert("❌ Nominal wajib diisi!"); return; }

    const loadingOverlay = document.getElementById('loadingOverlay');
    if(loadingOverlay) {
        document.getElementById('loadingText').textContent = "Mengirim Data...";
        loadingOverlay.style.display = 'flex';
    }

    try {
        const formData = {
            jenisLaporan: "Celengan",
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaKaryawan').value,
            regional: document.getElementById('regionalInput').value,
            area: area,
            point: document.getElementById('pointDisplay').value,
            kodeTransaksi: kode, 
            namaMitra: namaMitra,
            nominal: cleanNominal,
            foto: "", 
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.result === 'success') {
            alert("✅ Laporan Celengan Berhasil Disimpan!");
            window.location.href = "home.html";
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error("Error:", error);
        alert("❌ Gagal Kirim: " + error.message);
    } finally {
        if(loadingOverlay) loadingOverlay.style.display = 'none';
    }
}

// --- HELPER FUNCTIONS ---
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
