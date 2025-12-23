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

// --- FUNGSI SCANNER PINTAR (UPDATED UNTUK UUID) ---
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
            const file = this.files[0];
            if (!file) return;

            loadingText.textContent = "🔍 Membaca Struk...";
            loadingOverlay.style.display = 'flex';

            try {
                // 1. Proses Gambar (OCR)
                // Menggunakan whitelist karakter agar lebih akurat membaca UUID (huruf a-f, angka 0-9, dan strip)
                const result = await Tesseract.recognize(file, 'eng', {
                    logger: m => console.log(m),
                    tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ' // Hanya izinkan karakter ini
                });

                const fullText = result.data.text;
                console.log("Teks Terbaca:", fullText); 

                // 2. Filter Mencari UUID
                const kodeDitemukan = saringKodeTransaksi(fullText);

                if (kodeDitemukan) {
                    kodeField.value = kodeDitemukan;
                    alert(`✅ Kode Ditemukan!\n${kodeDitemukan}`);
                } else {
                    alert("⚠️ Kode Transaksi tidak ditemukan.\n\nPastikan foto jelas dan memuat kode format: xxxxxxxx-xxxx-xxxx...");
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

// --- LOGIKA FILTER KODE KHUSUS UUID (Sesuai Gambar) ---
function saringKodeTransaksi(text) {
    if (!text) return null;

    // Bersihkan teks dari spasi berlebih
    const cleanText = text.replace(/\s+/g, ' ');

    // REGEX UUID
    // Format: 8char - 4char - 4char - 4char - 12char
    // Contoh: 100658c0-3b87-46d2-aec5-6d7a244c049c
    const regexUUID = /\b[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}\b/i;

    const match = cleanText.match(regexUUID);

    if (match) {
        return match[0]; // Kembalikan kode yang cocok persis
    }

    // FALLBACK (Cadangan):
    // Jika OCR salah baca sedikit (misal kurang 1 digit), kita cari string panjang yg mengandung minimal 3 strip (-)
    const words = cleanText.split(' ');
    for (let word of words) {
        // Cari kata yang panjangnya > 20 dan punya minimal 3 tanda strip
        if (word.length > 30 && (word.match(/-/g) || []).length >= 4) {
            return word; // Kembalikan kemungkinan kode
        }
    }

    return null; // Tidak ketemu
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
            foto: "", // Celengan di script ini tidak kirim foto bukti, hanya OCR
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
