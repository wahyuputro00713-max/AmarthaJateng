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

    // 5. FITUR SCANNER OCR (BARU)
    setupScanner();
});

function setupScanner() {
    const btnScan = document.getElementById('btnScan');
    const scanInput = document.getElementById('scanInput');
    const kodeField = document.getElementById('kodeTransaksi');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    if (btnScan && scanInput) {
        // Klik Tombol -> Buka Kamera/File
        btnScan.addEventListener('click', () => {
            scanInput.click();
        });

        // Saat File Dipilih -> Proses OCR
        scanInput.addEventListener('change', async function() {
            const file = this.files[0];
            if (!file) return;

            // Tampilkan Loading
            loadingText.textContent = "🔍 Membaca Teks dari Gambar...";
            loadingOverlay.style.display = 'flex';

            try {
                // Proses dengan Tesseract.js
                // 'eng' biasanya cukup bagus untuk angka/kode. Bisa ganti 'ind' jika perlu bahasa indonesia.
                const result = await Tesseract.recognize(
                    file,
                    'eng', 
                    { 
                        logger: m => console.log(m) // Cek progress di console
                    }
                );

                const textDitemukan = result.data.text;
                console.log("Hasil OCR:", textDitemukan);

                // Bersihkan hasil (Hapus spasi berlebih/baris baru)
                // Kita ambil teks yang terlihat seperti kode (Misal huruf+angka)
                // Atau cukup masukkan semua teks ke input biar user edit
                const cleanText = textDitemukan.replace(/\n/g, " ").trim();
                
                if (cleanText) {
                    kodeField.value = cleanText;
                    alert("✅ Teks berhasil dibaca! Silakan koreksi jika ada yang salah.");
                } else {
                    alert("⚠️ Tidak ada teks yang terbaca. Pastikan foto jelas.");
                }

            } catch (error) {
                console.error(error);
                alert("❌ Gagal membaca gambar: " + error.message);
            } finally {
                loadingOverlay.style.display = 'none';
                loadingText.textContent = "Memproses..."; // Reset text
                this.value = ""; // Reset input file agar bisa scan ulang
            }
        });
    }
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
    const loadingText = document.getElementById('loadingText');
    
    if(loadingOverlay) {
        loadingText.textContent = "Mengirim Data...";
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
            foto: "", // Kosongkan
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
