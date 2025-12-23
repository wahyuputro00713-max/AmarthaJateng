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

    // 2. KUNCI KOLOM KODE TRANSAKSI (Read-Only)
    const kodeInput = document.getElementById('kodeTransaksi');
    if(kodeInput) {
        kodeInput.readOnly = true; 
        kodeInput.placeholder = "Klik Scan untuk isi otomatis...";
        kodeInput.style.backgroundColor = "#e9ecef"; 
        kodeInput.style.cursor = "not-allowed"; 
    }

    // 3. Cek Login
    onAuthStateChanged(auth, (user) => {
        if (user) { loadUserProfile(user.uid); } 
        else { window.location.replace("index.html"); }
    });

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
                
                // ZOOM EKSTREM 4x
                const scale = 4; 
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                ctx.imageSmoothingEnabled = false; 
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                // HIGH SENSITIVITY THRESHOLDING (190)
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
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

            loadingText.textContent = "⚙️ Memproses Gambar...";
            loadingOverlay.style.display = 'flex';

            try {
                // Proses Gambar
                const processedFile = await preprocessImage(rawFile);
                loadingText.textContent = "🔍 Analisis Teks...";

                const result = await Tesseract.recognize(processedFile, 'eng', {
                    tessedit_pageseg_mode: '6',
                    logger: m => console.log(m)
                });

                const fullText = result.data.text;
                console.log("RAW TEKS:", fullText);

                // Filter & Koreksi
                const kodeDitemukan = cariKodeTransaksi(fullText);

                if (kodeDitemukan) {
                    kodeField.value = kodeDitemukan;
                    // Beri efek visual sukses
                    kodeField.style.backgroundColor = "#d4edda";
                    kodeField.style.borderColor = "#28a745";
                    alert(`✅ Kode Berhasil Discan!\n${kodeDitemukan}`);
                    
                    setTimeout(() => {
                        kodeField.style.backgroundColor = "#e9ecef";
                        kodeField.style.borderColor = ""; 
                    }, 2000);

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

    let cleanText = text.replace(/[^a-zA-Z0-9-]/g, '');
    cleanText = perbaikiTypoOCR(cleanText);

    console.log("FIXED TEXT:", cleanText);

    const regex = /[a-fA-F0-9-]{25,}/g;
    const matches = cleanText.match(regex);

    if (matches && matches.length > 0) {
        const bestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
        if ((bestMatch.match(/-/g) || []).length >= 2) {
            return bestMatch;
        }
    }
    return null;
}

// === STEP 4: KAMUS PERBAIKAN TYPO ===
function perbaikiTypoOCR(str) {
    return str
        .replace(/O/g, '0').replace(/o/g, '0').replace(/D/g, '0')
        .replace(/I/g, '1').replace(/l/g, '1').replace(/i/g, '1')
        .replace(/Z/g, '2').replace(/z/g, '2')
        .replace(/S/g, '5').replace(/s/g, '5')
        .replace(/G/g, '6') 
        .replace(/B/g, '8')
        .replace(/g/g, '9').replace(/q/g, '9');
}

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
    
    // Hapus variabel elNamaMitra dan elNominal

    const loadingOverlay = document.getElementById('loadingOverlay');

    if(!elArea.value || elArea.value === "-") { alert("Data Profil belum termuat."); return; }
    
    // Validasi Kode Transaksi
    if(!elKode.value) { alert("❌ Kode Transaksi Kosong! Silakan Scan Foto Struk."); return; }

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
            // Hapus namaMitra dan nominal dari pengiriman data
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
