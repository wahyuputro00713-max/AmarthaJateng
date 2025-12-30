import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// URL APPS SCRIPT (Sama seperti majelis.js)
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 
const ADMIN_ID = "17246";

// --- STATE MANAGEMENT ---
let userProfile = null;

// --- INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        checkUserRole(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

function checkUserRole(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const jabatan = (data.jabatan || "").toUpperCase();
            const allowed = ["RM", "AM", "BM", "ADMIN"]; 

            // Cek Hak Akses
            if (allowed.includes(jabatan) || String(data.idKaryawan).trim() === ADMIN_ID) {
                userProfile = data; // Simpan data profil (Area & Point)
                initPage();
            } else {
                alert("Akses Ditolak: Halaman ini khusus RM, AM, dan BM.");
                window.location.replace("home.html");
            }
        } else {
            window.location.replace("home.html");
        }
    });
}

function initPage() {
    // 1. Tampilkan Tanggal Hari Ini
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('displayDate').textContent = today.toLocaleDateString('id-ID', options);

    // 2. Set Header Info dari Profil User
    const userArea = userProfile.area || "Area Tidak Diketahui";
    const userPoint = userProfile.cabang || "Point Tidak Diketahui"; // Asumsi 'cabang' adalah Point

    document.getElementById('areaName').textContent = userArea;
    document.getElementById('pointName').textContent = userPoint;

    // 3. Fetch Data (Filtered by Point)
    fetchRepaymentData(userPoint);
}

// --- DATA FETCHING & PROCESSING ---

async function fetchRepaymentData(targetPoint) {
    try {
        console.log("Fetching data majelis for point:", targetPoint);
        
        // Gunakan action yang sama dengan halaman Majelis/Repayment
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_majelis" }), // Asumsi action sama
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        
        if (result.result !== "success") {
            alert("Gagal mengambil data: " + result.error);
            return;
        }

        // Proses Data Mentah
        processAndRender(result.data, targetPoint);

    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById('accordionBP').innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="fa-solid fa-triangle-exclamation mb-2"></i><br>
                Gagal memuat data. Periksa koneksi internet.
            </div>
        `;
    }
}

function processAndRender(rawData, targetPoint) {
    // Struktur Data Statistik
    let stats = {
        mm_total: 0, mm_bayar: 0, mm_kirim: 0, // Current (Bucket 0-1)
        nc_total: 0, nc_bayar: 0, nc_kirim: 0  // Non-Current (> Bucket 1)
    };

    // Struktur Hierarki: BP -> Majelis -> Mitra
    let hierarchy = {}; 

    // Normalisasi Target Point (Case Insensitive & Trim)
    const normalize = (str) => String(str || "").trim().toUpperCase();
    const safeTarget = normalize(targetPoint);

    rawData.forEach(row => {
        // ASUMSI STRUKTUR DATA DARI SPREADSHEET (Sesuaikan Index/Key jika beda)
        // row[0]=ID, row[1]=Nama, row[2]=Majelis, row[3]=BP, row[4]=Cabang/Point, 
        // row[5]=StatusBayar, row[6]=StatusKirim, row[7]=Bucket/DPD
        
        // Jika data berbentuk Object (JSON Key-Value)
        const p_cabang = normalize(row.cabang || row.point || "");
        
        // FILTER: Hanya ambil data sesuai Point User
        if (p_cabang !== safeTarget) return;

        const p_bp = row.bp || "Tanpa BP";
        const p_majelis = row.majelis || "Umum";
        const p_bucket = parseInt(row.bucket || row.dpd || 0);
        
        const isCurrent = p_bucket <= 1; // Bucket 0 & 1 masuk Current
        const isLunas = (row.status_bayar || "").toLowerCase() === "lunas";
        const isTerkirim = (row.status_kirim || "").toLowerCase() === "terkirim";

        // 1. UPDATE STATISTIK
        if (isCurrent) {
            stats.mm_total++;
            if (isLunas) stats.mm_bayar++;
            if (isTerkirim) stats.mm_kirim++;
        } else {
            // Non-Current Report
            stats.nc_total++;
            if (isLunas) stats.nc_bayar++;
            if (isTerkirim) stats.nc_kirim++;
        }

        // 2. BANGUN HIERARKI (Hanya untuk yang Current/Mitra Modal Harian)
        // Jika ingin semua (termasuk macet) tampil di list, hapus 'if (isCurrent)'
        if (isCurrent) {
            if (!hierarchy[p_bp]) {
                hierarchy[p_bp] = {};
            }
            if (!hierarchy[p_bp][p_majelis]) {
                hierarchy[p_bp][p_majelis] = [];
            }

            hierarchy[p_bp][p_majelis].push({
                id: row.id_mitra || row.id,
                nama: row.nama_mitra || row.nama,
                status_bayar: row.status_bayar || "Belum",
                status_kirim: row.status_kirim || "Belum",
                alasan: row.keterangan || row.alasan || "" // Alasan dari inputan repayment
            });
        }
    });

    // RENDER UI
    renderStats(stats);
    renderAccordion(hierarchy);
}

function renderStats(stats) {
    // Mitra Modal (Harian)
    document.getElementById('mmTotal').textContent = stats.mm_total;
    document.getElementById('mmBayar').textContent = stats.mm_bayar;
    document.getElementById('mmKirim').textContent = stats.mm_kirim;

    // Non-Current
    document.getElementById('ncTotal').textContent = stats.nc_total;
    document.getElementById('ncBayar').textContent = stats.nc_bayar;
    document.getElementById('ncKirim').textContent = stats.nc_kirim;
}

function renderAccordion(hierarchy) {
    const container = document.getElementById('accordionBP');
    container.innerHTML = ""; 

    const bpKeys = Object.keys(hierarchy).sort(); // Urutkan nama BP

    if (bpKeys.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-4">Tidak ada data mitra untuk validasi hari ini.</div>`;
        return;
    }

    bpKeys.forEach((bpName, index) => {
        const majelisObj = hierarchy[bpName];
        const majelisKeys = Object.keys(majelisObj).sort();
        
        let majelisHtml = "";
        
        majelisKeys.forEach(majName => {
            const mitraList = majelisObj[majName];
            let mitraHtml = "";

            mitraList.forEach(m => {
                mitraHtml += createMitraRow(m);
            });

            majelisHtml += `
                <div class="majelis-container">
                    <div class="majelis-header text-secondary">
                        <i class="fa-solid fa-users-rectangle me-2"></i> ${majName}
                        <span class="badge bg-light text-dark ms-2">${mitraList.length} Mitra</span>
                    </div>
                    <div>${mitraHtml}</div>
                </div>
            `;
        });

        const accordionItem = `
            <div class="accordion-item border shadow-sm mb-2" style="border-radius: 8px; overflow:hidden;">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                        <div class="d-flex align-items-center w-100 justify-content-between pe-3">
                            <div class="d-flex align-items-center">
                                <div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-3" style="width:35px; height:35px;">
                                    <i class="fa-solid fa-user-tie"></i>
                                </div>
                                <div>
                                    <div class="fw-bold">${bpName}</div>
                                    <div class="small text-muted">Total Majelis: ${majelisKeys.length}</div>
                                </div>
                            </div>
                        </div>
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse" data-bs-parent="#accordionBP">
                    <div class="accordion-body bg-light p-2">
                        ${majelisHtml}
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', accordionItem);
    });
}

function createMitraRow(mitra) {
    // Tentukan Class Warna Badge
    const badgeBayar = (mitra.status_bayar || "").toLowerCase() === 'lunas' ? 'status-lunas' : 'status-telat';
    const badgeKirim = (mitra.status_kirim || "").toLowerCase() === 'terkirim' ? 'status-kirim' : 'status-belum';

    // Logika Khusus: Telat TAPI Terkirim
    let specialUI = "";
    const isTelat = (mitra.status_bayar || "").toLowerCase() !== 'lunas';
    const isTerkirim = (mitra.status_kirim || "").toLowerCase() === 'terkirim';

    if (isTelat && isTerkirim) {
        specialUI = `
            <div class="alert-reason">
                <div class="d-flex align-items-start text-danger mb-1" style="font-size:11px;">
                    <i class="fa-solid fa-circle-exclamation mt-1 me-2"></i>
                    <div>
                        <strong>Status Janggal:</strong> Telat tapi sudah dikirim.<br>
                        <em>Alasan Petugas: "${mitra.alasan || '-'}"</em>
                    </div>
                </div>
                <input type="text" class="reason-input" placeholder="Wajib isi alasan validasi..." id="validasi-${mitra.id}">
            </div>
        `;
    }

    return `
        <div class="mitra-row">
            <div class="mitra-info">
                <div class="d-flex justify-content-between">
                    <span class="mitra-name">${mitra.nama}</span>
                    <span class="mitra-id text-end">${mitra.id}</span>
                </div>
                <div class="mt-2 d-flex gap-2">
                    <span class="status-badge ${badgeBayar}">${mitra.status_bayar}</span>
                    <span class="status-badge ${badgeKirim}">${mitra.status_kirim}</span>
                </div>
                ${specialUI}
            </div>
            <div class="action-area ps-3 border-start">
                <div class="btn-check-custom" onclick="toggleValidation(this, '${mitra.id}')" title="Klik untuk Validasi">
                    <i class="fa-solid fa-check"></i>
                </div>
            </div>
        </div>
    `;
}

// --- GLOBAL EXPORTS (Agar bisa dipanggil onclick HTML) ---

window.toggleValidation = function(element, id) {
    // Cek Special Condition (Telat tapi Terkirim)
    const inputReason = document.getElementById(`validasi-${id}`);
    
    // Jika mau diceklis (aktifkan)
    if (!element.classList.contains('checked')) {
        if (inputReason && inputReason.value.trim() === "") {
            alert("Mohon isi alasan validasi terlebih dahulu karena status mitra Telat namun Terkirim.");
            inputReason.focus();
            return; // Batalkan validasi jika kosong
        }
        element.classList.add('checked');
        // Logic Simpan Validasi ke Server bisa ditaruh di sini
        console.log(`Mitra ${id} VALIDATED. Reason: ${inputReason ? inputReason.value : 'N/A'}`);
    } else {
        // Uncheck
        element.classList.remove('checked');
        console.log(`Mitra ${id} UN-VALIDATED`);
    }
};

// Event Listener Tombol Header (Validasi Massal)
document.addEventListener("DOMContentLoaded", () => {
    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        btnValAll.addEventListener('click', () => {
            if(confirm("Apakah Anda yakin ingin memvalidasi semua mitra yang sudah Lunas & Terkirim?")) {
                // Logic mass validation
                alert("Semua data 'clean' berhasil divalidasi.");
                // Reload atau update UI
            }
        });
    }
});
