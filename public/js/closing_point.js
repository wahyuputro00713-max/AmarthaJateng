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

// ID Admin & URL Script
const ADMIN_ID = "17246";
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; // Ganti dengan URL API/Spreadsheet Anda

// --- INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Cek Hak Akses (RM, AM, BM Only)
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
            const allowed = ["RM", "AM", "BM", "ADMIN"]; // Admin dev

            if (allowed.includes(jabatan) || String(data.idKaryawan).trim() === ADMIN_ID) {
                // Akses Diterima
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

    // 2. Load Data (Simulasi Fetch dari Spreadsheet)
    fetchClosingData();
}

// --- LOGIKA DATA ---

function fetchClosingData() {
    // SAYA MENGGUNAKAN DATA DUMMY UNTUK STRUKTUR INI
    // Nanti Anda bisa mengganti bagian ini dengan `fetch(SCRIPT_URL)` yang mengembalikan JSON serupa.
    
    console.log("Fetching Data...");
    
    setTimeout(() => {
        // Mock Response Data
        const data = {
            area: "Jawa Tengah 1",
            point: "Klaten 01",
            stats: {
                // Mitra Modal (Harian)
                mm_total: 120, mm_bayar: 110, mm_kirim: 115,
                // Non-Current
                nc_total: 15, nc_bayar: 5, nc_kirim: 5
            },
            bps: [
                {
                    id: "bp01", name: "Budi Santoso",
                    majelis: [
                        {
                            nama: "Mawar Melati",
                            mitra: [
                                { id: "101", nama: "Siti Aminah", status_bayar: "Lunas", status_kirim: "Terkirim", alasan_petugas: "" },
                                { id: "102", nama: "Rina Wati", status_bayar: "Telat", status_kirim: "Terkirim", alasan_petugas: "Uang dititipkan tetangga, baru diambil sore" }, // KASUS KHUSUS
                                { id: "103", nama: "Dewi Sartika", status_bayar: "Telat", status_kirim: "Belum", alasan_petugas: "" }
                            ]
                        }
                    ]
                },
                {
                    id: "bp02", name: "Sari Indah",
                    majelis: [
                        {
                            nama: "Anggrek Bulan",
                            mitra: [
                                { id: "201", nama: "Lestari", status_bayar: "Lunas", status_kirim: "Terkirim", alasan_petugas: "" },
                                { id: "202", nama: "Wulandari", status_bayar: "Lunas", status_kirim: "Terkirim", alasan_petugas: "" }
                            ]
                        },
                        {
                            nama: "Kenanga",
                            mitra: [
                                { id: "203", nama: "Puji Astuti", status_bayar: "Telat", status_kirim: "Terkirim", alasan_petugas: "Lupa setor pagi" } // KASUS KHUSUS
                            ]
                        }
                    ]
                }
            ]
        };

        renderPage(data);

    }, 1000); // Simulasi delay loading
}

function renderPage(data) {
    // Render Header Info
    document.getElementById('areaName').textContent = data.area;
    document.getElementById('pointName').textContent = data.point;

    // Render Stats
    document.getElementById('mmTotal').textContent = data.stats.mm_total;
    document.getElementById('mmBayar').textContent = data.stats.mm_bayar;
    document.getElementById('mmKirim').textContent = data.stats.mm_kirim;

    document.getElementById('ncTotal').textContent = data.stats.nc_total;
    document.getElementById('ncBayar').textContent = data.stats.nc_paid || data.stats.nc_bayar;
    document.getElementById('ncKirim').textContent = data.stats.nc_sent || data.stats.nc_kirim;

    // Render Accordion (BP -> Majelis -> Mitra)
    const container = document.getElementById('accordionBP');
    container.innerHTML = ""; // Clear loading

    data.bps.forEach((bp, index) => {
        const bpHTML = buildBPAccordion(bp, index);
        container.insertAdjacentHTML('beforeend', bpHTML);
    });
}

// --- HTML BUILDERS ---

function buildBPAccordion(bp, index) {
    const headingID = `heading${index}`;
    const collapseID = `collapse${index}`;
    
    // Build Majelis Content
    let majelisContent = "";
    bp.majelis.forEach(maj => {
        majelisContent += buildMajelisBlock(maj);
    });

    return `
        <div class="accordion-item border shadow-sm mb-2" style="border-radius: 8px; overflow:hidden;">
            <h2 class="accordion-header" id="${headingID}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseID}">
                    <div class="d-flex align-items-center">
                        <div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-3" style="width:30px; height:30px; font-size:12px;">BP</div>
                        <div>
                            <div class="fw-bold">${bp.name}</div>
                            <div class="small text-muted">ID: ${bp.id}</div>
                        </div>
                    </div>
                </button>
            </h2>
            <div id="${collapseID}" class="accordion-collapse collapse" data-bs-parent="#accordionBP">
                <div class="accordion-body bg-light p-3">
                    ${majelisContent}
                </div>
            </div>
        </div>
    `;
}

function buildMajelisBlock(majelis) {
    let mitraList = "";
    majelis.mitra.forEach(m => {
        mitraList += buildMitraRow(m);
    });

    return `
        <div class="majelis-container">
            <div class="majelis-header text-secondary">
                <i class="fa-solid fa-users-rectangle me-2"></i> Majelis: ${majelis.nama}
            </div>
            <div class="mitra-list">
                ${mitraList}
            </div>
        </div>
    `;
}

function buildMitraRow(mitra) {
    // Logic Badge Status
    const badgeBayar = mitra.status_bayar === 'Lunas' ? 'status-lunas' : 'status-telat';
    const badgeKirim = mitra.status_kirim === 'Terkirim' ? 'status-kirim' : 'status-belum';

    // Logic Khusus: Telat TAPI Terkirim
    let specialUI = "";
    if (mitra.status_bayar === 'Telat' && mitra.status_kirim === 'Terkirim') {
        specialUI = `
            <div class="alert-reason">
                <div class="fw-bold text-danger mb-1"><i class="fa-solid fa-circle-exclamation"></i> Perhatian: Telat tapi Terkirim</div>
                <div class="mb-1"><strong>Alasan Petugas:</strong> "${mitra.alasan_petugas || '-'}"</div>
                <input type="text" class="reason-input" placeholder="Masukkan alasan validasi RM/AM..." id="validasi-${mitra.id}">
            </div>
        `;
    }

    return `
        <div class="mitra-row">
            <div class="mitra-info">
                <span class="mitra-name">${mitra.nama}</span>
                <span class="mitra-id">ID: ${mitra.id}</span>
                <div class="mt-1">
                    <span class="status-badge ${badgeBayar}">${mitra.status_bayar}</span>
                    <span class="status-badge ${badgeKirim}">${mitra.status_kirim}</span>
                </div>
                ${specialUI}
            </div>
            <div class="action-area">
                <div class="btn-check-custom" onclick="toggleValidation(this, '${mitra.id}')">
                    <i class="fa-solid fa-check"></i>
                </div>
            </div>
        </div>
    `;
}

// --- GLOBAL EVENT EXPORT ---
// Agar bisa dipanggil dari onclick di HTML
window.toggleValidation = function(element, id) {
    element.classList.toggle('checked');
    console.log(`Mitra ${id} validasi: ${element.classList.contains('checked')}`);
    
    // Jika ada input alasan (kasus khusus), pastikan diisi jika diceklis
    const inputReason = document.getElementById(`validasi-${id}`);
    if (inputReason && element.classList.contains('checked') && inputReason.value.trim() === "") {
        alert("Mohon isi alasan validasi karena status mitra Telat namun Terkirim.");
        inputReason.focus();
        // Optional: batalkan ceklis jika wajib diisi dulu
        // element.classList.remove('checked');
    }
};

// Event Listener Tombol Header
document.addEventListener("DOMContentLoaded", () => {
    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        btnValAll.addEventListener('click', () => {
            alert("Fitur Validasi Massal (Simulasi): Semua data hari ini ditandai valid.");
        });
    }
});
