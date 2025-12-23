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

const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

window.addEventListener('DOMContentLoaded', () => {
    // 1. Auto Tanggal
    const tgl = document.getElementById('tanggalInput');
    if(tgl) tgl.value = new Date().toISOString().split('T')[0];

    // 2. Cek Login
    onAuthStateChanged(auth, (user) => {
        if (user) { loadUserProfile(user.uid); } 
        else { window.location.replace("index.html"); }
    });

    // 3. Format Rupiah
    const rupiahEl = document.getElementById('nominalInput');
    if(rupiahEl) {
        rupiahEl.addEventListener('input', function() { this.value = formatRupiah(this.value, 'Rp. '); });
        rupiahEl.addEventListener('blur', function() { if(this.value === '') this.value = 'Rp. 0'; });
    }

    // 4. Submit Listener
    const formEl = document.getElementById('celenganForm');
    if(formEl) { formEl.addEventListener('submit', submitLaporan); }

    // 5. SCANNER INIT
    setupScanner();
});

// === STEP 1: PRE-PROCESSING (MEMPERTAJAM GAMBAR) ===
function preprocessImage(imageFile) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = function(e) {
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Perbesar 3x agar teks kecil tidak pecah
                const scale = 3; 
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.imageSmoothingEnabled = false; 
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                // Binarization (Hitam Putih Pekat)
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    const val = (gray > 145) ? 255 : 0; // Thresholding
                    data[i] = data[i + 1] = data[i + 2] = val;
                }

                ctx.putImageData(imgData, 0, 0);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
            }
        };
        reader.readAsDataURL(imageFile);
    });
}

// === STEP 2: SCANNING ===
function setupScanner() {
    const btnScan = document.getElementById('btnScan');
    const scanInput = document.getElementById('scanInput');
    const kodeField = document.getElementById('kodeTransaksi');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    if (btnScan && scanInput) {
        btnScan.addEventListener('click', () => scanInput.click());

        scanInput.addEventListener('change', async function() {
            const rawFile = this.files[0];
            if (!rawFile) return;

            loadingText.textContent = "⚙️ Memproses Gambar...";
            loadingOverlay.style.display = 'flex';

            try {
                const processedFile = await preprocessImage(rawFile);
                loadingText.textContent = "🔍 Membaca Teks...";

                // Hapus whitelist agar karakter 'typo' (seperti O menggantikan 0) tetap terbaca
                // Nanti kita perbaiki di step filtering
                const result = await Tesseract.recognize(processedFile, 'eng', {
                    tessedit_pageseg_mode: '6', // Assume single uniform block of text
                    logger: m => console.log(m)
                });

                const fullText = result.data.text;
                console.log("TEKS MENTAH:", fullText);

                // Jalankan filter super agresif
                const kodeDitemukan = cariKodeTransaksi(fullText);

                if (kodeDitemukan) {
                    kodeField.value = kodeDitemukan;
                    alert(`✅ Kode Ditemukan!\n${kodeDitemukan}`);
                } else {
                    alert("⚠️ Kode tidak terdeteksi utuh.\nHasil pembacaan:\n" + fullText.substring(0, 100));
                }

            } catch (error) {
                console.error(error);
                alert("❌ Error: " + error.message);
            } finally {
                loadingOverlay.style.display = 'none';
                this.value = ""; 
            }
        });
    }
}

// === STEP 3: LOGIKA PENCARIAN & PEMBERSIHAN (THE FIX) ===
function cariKodeTransaksi(text) {
    if (!text) return null;

    // 1. BUANG KARAKTER SAMPAH
    // Hapus semua yang BUKAN huruf, angka, atau strip (-).
    // Ini akan membuang spasi, enter, titik, koma, garis | dll.
    // Contoh: "94d2- \n a09c" -> "94d2-a09c"
    let cleanText = text.replace(/[^a-zA-Z0-9-]/g, '');

    // 2. PERBAIKI TYPO UMUM OCR (Penting!)
    // Kadang angka 0 dibaca huruf O, angka 1 dibaca huruf l/I.
    // Kita normalkan dulu sebelum regex.
    cleanText = cleanText.replace(/O/g, '0').replace(/o/g, '0'); // O/o jadi 0
    cleanText = cleanText.replace(/l/g, '1').replace(/I/g, '1'); // l/I jadi 1

    console.log("TEXT BERSIH:", cleanText);

    // 3. CARI POLA UUID LONGGAR
    // Kita cari deretan karakter Hex (0-9, a-f) dan strip (-) yang panjangnya > 30 karakter.
    // Regex ini lebih pemaaf daripada yang sebelumnya.
    const regexLonggar = /[a-fA-F0-9-]{30,}/g;
    
    const matches = cleanText.match(regexLonggar);

    if (matches && matches.length > 0) {
        // Ambil hasil yang paling panjang (kemungkinan besar itu kode transaksinya)
        const bestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
        
        // Cek validasi sederhana: minimal harus ada 2 tanda strip (-)
        if ((bestMatch.match(/-/g) || []).length >= 2) {
            return bestMatch;
        }
    }

    return null;
}

// ... (Sisa fungsi loadUserProfile, submitLaporan, formatRupiah SAMA SEPERTI SEBELUMNYA) ...
// Pastikan bagian bawah ini tetap ada di file Anda:

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

async function submitLaporan(e) {
    e.preventDefault();
    const elArea = document.getElementById('areaDisplay');
    const elKode = document.getElementById('kodeTransaksi');
    const elNamaMitra = document.getElementById('namaMitra');
    const elNominal = document.getElementById('nominalInput');
    const loadingOverlay = document.getElementById('loadingOverlay');

    if(!elArea.value || elArea.value === "-") { alert("Data Profil belum termuat."); return; }
    
    loadingOverlay.style.display = 'flex';
    document.getElementById('loadingText').textContent = "Mengirim Data...";

    try {
        const formData = {
            jenisLaporan: "Celengan",
            tanggal: document.getElementById('tanggalInput').value,
            idKaryawan: document.getElementById('idKaryawan').value,
            namaBP: document.getElementById('namaKaryawan').value,
            regional: document.getElementById('regionalInput').value,
            area: elArea.value,
            point: document.getElementById('pointDisplay').value,
            kodeTransaksi: elKode.value.trim(), 
            namaMitra: elNamaMitra.value,
            nominal: elNominal.value.replace(/[^0-9]/g, ''),
            foto: "", 
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        if (result.result === 'success') {
            alert("✅ Sukses!");
            window.location.href = "home.html";
        } else { throw new Error(result.error); }
    } catch (error) {
        alert("❌ Gagal: " + error.message);
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function formatRupiah(angka, prefix) {
    if (!angka) return "";
    let number_string = angka.replace(/[^,\d]/g, '').toString(),
        split = number_string.split(','),
        sisa = split[0].length % 3,
        rupiah = split[0].substr(0, sisa),
        ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    return prefix == undefined ? rupiah : (rupiah ? 'Rp. ' + rupiah : '');
}
