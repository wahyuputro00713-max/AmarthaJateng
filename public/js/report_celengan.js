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

// === FUNGSI UTAMA: MEMPERBESAR & MEMPERTAJAM GAMBAR (UPSCALING) ===
// Ini kunci agar teks kecil/pecah bisa terbaca jelas
function preprocessImage(imageFile) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = function(e) {
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 1. PERBESAR GAMBAR 3X LIPAT
                // Agar pixel huruf menjadi lebih tebal dan jelas bagi OCR
                const scale = 3; 
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                
                // Matikan smoothing agar garis huruf tetap tajam (pixelated is better for OCR)
                ctx.imageSmoothingEnabled = false; 
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imgData.data;

                // 2. UBAH JADI HITAM PUTIH (High Contrast)
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Rumus Luminance
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    // Thresholding: Abu-abu di atas 150 jadi Putih, di bawah jadi Hitam
                    // Ini membuat teks abu-abu di struk menjadi HITAM PEKAT
                    const val = (gray > 150) ? 255 : 0;

                    data[i] = data[i + 1] = data[i + 2] = val;
                }

                ctx.putImageData(imgData, 0, 0);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
            }
        };
        reader.readAsDataURL(imageFile);
    });
}

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

            loadingText.textContent = "⚙️ Memproses Gambar (Upscaling)...";
            loadingOverlay.style.display = 'flex';

            try {
                // Proses 1: Pertajam Gambar
                const processedFile = await preprocessImage(rawFile);
                
                loadingText.textContent = "🔍 Membaca Teks...";

                // Proses 2: Baca dengan Tesseract
                // Gunakan PSM 6 (Assume a single uniform block of text) agar baris terbaca urut
                const result = await Tesseract.recognize(processedFile, 'eng', {
                    tessedit_char_whitelist: '0123456789abcdefABCDEF-', // Batasi karakter hanya Hex & Strip
                    tessedit_pageseg_mode: '6',
                    logger: m => console.log(m)
                });

                const fullText = result.data.text;
                console.log("TEKS MENTAH:", fullText);

                // Proses 3: Cari Kode
                const kodeDitemukan = cariKodeTransaksi(fullText);

                if (kodeDitemukan) {
                    kodeField.value = kodeDitemukan;
                    alert(`✅ Kode Ditemukan!\n${kodeDitemukan}`);
                } else {
                    alert("⚠️ Kode tidak terdeteksi utuh.\nSistem membaca: \n" + fullText.substring(0, 50) + "...\n\nSilakan ketik manual atau foto lebih dekat.");
                }

            } catch (error) {
                console.error(error);
                alert("❌ Error: " + error.message);
            } finally {
                loadingOverlay.style.display = 'none';
                loadingText.textContent = "Memproses...";
                this.value = ""; 
            }
        });
    }
}

// === LOGIKA PENCARIAN KODE YANG LEBIH CERDAS ===
function cariKodeTransaksi(text) {
    if (!text) return null;

    // 1. Hapus semua spasi & enter (Gabung jadi 1 baris panjang)
    // Contoh: "1234-\n5678" -> "1234-5678"
    const cleanText = text.replace(/\s+/g, '').trim(); 

    // 2. Regex Longgar (Cari string Hex panjang dengan tanda strip)
    // Kita tidak pakai format kaku 8-4-4-4-12 karena kadang OCR salah baca 1 huruf.
    // Kita cari saja: "Kumpulan angka/huruf a-f minimal 20 karakter yang mengandung strip"
    
    // Penjelasan Regex:
    // [0-9a-fA-F\-]{20,} -> Cari karakter hex atau strip, minimal 20 digit berturut-turut
    const matches = cleanText.match(/[0-9a-fA-F\-]{20,}/g);

    if (matches && matches.length > 0) {
        // Ambil hasil terpanjang (asumsi kode transaksi adalah teks hex terpanjang di struk)
        let longest = matches.reduce((a, b) => a.length > b.length ? a : b);
        
        // Validasi tambahan: Harus ada minimal 2 strip "-" agar yakin itu UUID
        if ((longest.match(/-/g) || []).length >= 2) {
            return longest;
        }
    }

    return null;
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
    // ... Logic submit sama seperti sebelumnya ...
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
