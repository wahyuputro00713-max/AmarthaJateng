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

// === STEP 1: PRE-PROCESSING SUPER TAJAM ===
function preprocessImage(imageFile) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = function(e) {
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 1. ZOOM EKSTREM 4x
                // Agar detail kecil (ekor 9, lengkungan 0) terlihat jelas
                const scale = 4; 
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                // Matikan smoothing agar pixel tajam
                ctx.imageSmoothingEnabled = false; 
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                // 2. HIGH SENSITIVITY THRESHOLDING
                // Kita naikkan ambang batas ke 190.
                // Artinya: Abu-abu muda sekalipun akan dipaksa jadi HITAM.
                // Ini akan menyelamatkan ekor angka 9 yang pudar.
                for (let i = 0; i < data.length; i += 4) {
                    // Rumus Luminance standar
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    
                    // Threshold 190 (Sangat sensitif terhadap tinta tipis)
                    // Jika warna lebih terang dari 190 -> Putih (Background)
                    // Jika warna lebih gelap dari 190 -> Hitam (Teks)
                    const val = (gray > 190) ? 255 : 0; 

                    data[i] = data[i + 1] = data[i + 2] = val;
                }

                ctx.putImageData(imgData, 0, 0);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.90);
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

            loadingText.textContent = "⚙️ Mempertajam Gambar...";
            loadingOverlay.style.display = 'flex';

            try {
                // Proses Gambar
                const processedFile = await preprocessImage(rawFile);
                loadingText.textContent = "🔍 Analisis Teks...";

                // Tesseract Config
                const result = await Tesseract.recognize(processedFile, 'eng', {
                    tessedit_pageseg_mode: '6', // Mode blok teks tunggal
                    logger: m => console.log(m)
                });

                const fullText = result.data.text;
                console.log("RAW TEKS:", fullText);

                // Filter & Koreksi
                const kodeDitemukan = cariKodeTransaksi(fullText);

                if (kodeDitemukan) {
                    kodeField.value = kodeDitemukan;
                    alert(`✅ Kode Ditemukan!\n${kodeDitemukan}`);
                } else {
                    alert("⚠️ Kode terbaca sebagian.\nSistem membaca: " + fullText.substring(0, 40) + "...\nMohon cek pencahayaan foto.");
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

// === STEP 3: SEARCH & FIX ===
function cariKodeTransaksi(text) {
    if (!text) return null;

    // 1. Bersihkan Karakter Sampah
    // Hanya sisakan Huruf, Angka, dan Strip. Hapus spasi/enter.
    let cleanText = text.replace(/[^a-zA-Z0-9-]/g, '');

    // 2. AUTO-CORRECT TYPO VISUAL
    // Memperbaiki kesalahan umum OCR pada font struk
    cleanText = perbaikiTypoOCR(cleanText);

    console.log("FIXED TEXT:", cleanText);

    // 3. Regex UUID (Longgar)
    // Mencari deretan karakter hex (termasuk strip) minimal 25 karakter
    const regex = /[a-fA-F0-9-]{25,}/g;
    
    const matches = cleanText.match(regex);

    if (matches && matches.length > 0) {
        const bestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
        
        // Validasi: Minimal ada 2 strip (-)
        if ((bestMatch.match(/-/g) || []).length >= 2) {
            return bestMatch;
        }
    }

    return null;
}

// === STEP 4: KAMUS PERBAIKAN TYPO ===
function perbaikiTypoOCR(str) {
    return str
        // Fix 0 dan O
        .replace(/O/g, '0').replace(/o/g, '0').replace(/D/g, '0')
        // Fix 1 dan l/I
        .replace(/I/g, '1').replace(/l/g, '1').replace(/i/g, '1')
        // Fix 2 dan Z
        .replace(/Z/g, '2').replace(/z/g, '2')
        // Fix 5 dan S
        .replace(/S/g, '5').replace(/s/g, '5')
        // Fix 6 dan G
        .replace(/G/g, '6') 
        // Fix 8 dan B
        .replace(/B/g, '8')
        // Fix 9 dan g/q
        .replace(/g/g, '9').replace(/q/g, '9');
        // Note: Kita tidak bisa auto-replace '0' jadi '9' atau 'a' jadi '0' secara global 
        // karena '0' dan 'a' adalah karakter valid di Hexadesimal.
        // Perbaikan '0' vs '9' dan 'a' vs '0' SANGAT bergantung pada ketajaman gambar (Step 1).
}

// ... (Load Profil & Submit Logic - Tidak Berubah) ...
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
