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

// URL APPS SCRIPT (Pastikan URL ini benar)
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 
const ADMIN_ID = "17246";

let userProfile = null;
let currentDayName = ""; // Variabel global untuk menyimpan nama hari ini

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

            if (allowed.includes(jabatan) || String(data.idKaryawan).trim() === ADMIN_ID) {
                userProfile = data; 
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
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    
    // 1. Simpan Nama Hari Ini (misal: "Selasa")
    currentDayName = today.toLocaleDateString('id-ID', { weekday: 'long' });
    
    // Tampilkan Tanggal di Header
    document.getElementById('displayDate').textContent = today.toLocaleDateString('id-ID', options);

    const userArea = userProfile.area || userProfile.Area || "Area -";
    const userPoint = userProfile.cabang || userProfile.Cabang || userProfile.point || userProfile.Point || "Point -";

    document.getElementById('areaName').textContent = userArea;
    document.getElementById('pointName').textContent = userPoint;

    fetchRepaymentData(userPoint);
}

// --- DATA FETCHING ---

async function fetchRepaymentData(targetPoint) {
    try {
        console.log("Fetching data for point:", targetPoint);
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_majelis" }), 
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result !== "success") {
            alert("Gagal mengambil data: " + result.error);
            return;
        }

        processAndRender(result.data, targetPoint);

    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById('accordionBP').innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="fa-solid fa-wifi mb-2"></i><br>
                Gagal koneksi. Coba refresh halaman.
            </div>
        `;
    }
}

function getValue(row, keys) {
    const rowKeys = Object.keys(row);
    for (let k of keys) {
        const found = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
        if (found) return row[found];
    }
    return "";
}

function processAndRender(rawData, targetPoint) {
    let stats = {
        mm_total: 0, mm_bayar: 0, mm_kirim: 0, 
        nc_total: 0, nc_bayar: 0, nc_kirim: 0  
    };

    let hierarchy = {}; 
    const normalize = (str) => String(str || "").trim().toUpperCase();
    const safeTarget = normalize(targetPoint);

    if (!rawData || rawData.length === 0) {
        document.getElementById('accordionBP').innerHTML = `<div class="text-center py-4">Data Kosong dari Server.</div>`;
        return;
    }

    rawData.forEach(row => {
        // Ambil Data dari Row
        const p_cabang  = normalize(getValue(row, ["cabang", "point", "unit"]));
        const p_bp      = getValue(row, ["bp", "petugas", "ao"]) || "Tanpa BP";
        const p_majelis = getValue(row, ["majelis", "group", "kelompok"]) || "Umum";
        const p_hari    = getValue(row, ["hari", "day"]) || ""; // Ambil Data Hari
        
        // Filter Bucket & Status
        let rawBucket = getValue(row, ["bucket", "dpd", "kolek"]);
        const p_bucket  = parseInt(rawBucket || 0);

        const st_bayar  = getValue(row, ["status_bayar", "bayar"]) || "Belum";
        const st_kirim  = getValue(row, ["status_kirim", "kirim"]) || "Belum";
        const alasan_db = getValue(row, ["keterangan", "alasan"]) || "";

        const isLunas = st_bayar.toLowerCase() === "lunas";
        const isTerkirim = st_kirim.toLowerCase() === "terkirim";

        // --- FILTER 1: POINT ---
        if (safeTarget !== "ALL" && p_cabang !== safeTarget) {
            return; 
        }

        // --- FILTER 2: HARI (BARU DITAMBAHKAN) ---
        // Jika hari di data tidak sama dengan hari ini, lewati.
        if (p_hari.toLowerCase() !== currentDayName.toLowerCase()) {
            return;
        }

        const isCurrent = p_bucket <= 1; 

        // HITUNG STATISTIK (Hanya untuk data hari ini)
        if (isCurrent) {
            stats.mm_total++;
            if (isLunas) stats.mm_bayar++;
            if (isTerkirim) stats.mm_kirim++;
        } else {
            stats.nc_total++;
            if (isLunas) stats.nc_bayar++;
            if (isTerkirim) stats.nc_kirim++;
        }

        // MASUKKAN KE LIST (Hanya yang Current & Hari Ini)
        if (isCurrent) {
            if (!hierarchy[p_bp]) hierarchy[p_bp] = {};
            if (!hierarchy[p_bp][p_majelis]) hierarchy[p_bp][p_majelis] = [];

            hierarchy[p_bp][p_majelis].push({
                id: getValue(row, ["id_mitra", "id", "account_id"]),
                nama: getValue(row, ["nama_mitra", "nama", "client_name"]),
                status_bayar: st_bayar,
                status_kirim: st_kirim,
                alasan: alasan_db
            });
        }
    });

    renderStats(stats);
    renderAccordion(hierarchy);
}

function renderStats(stats) {
    document.getElementById('mmTotal').textContent = stats.mm_total;
    document.getElementById('mmBayar').textContent = stats.mm_bayar;
    document.getElementById('mmKirim').textContent = stats.mm_kirim;

    document.getElementById('ncTotal').textContent = stats.nc_total;
    document.getElementById('ncBayar').textContent = stats.nc_bayar;
    document.getElementById('ncKirim').textContent = stats.nc_kirim;
}

function renderAccordion(hierarchy) {
    const container = document.getElementById('accordionBP');
    container.innerHTML = ""; 

    const bpKeys = Object.keys(hierarchy).sort(); 

    if (bpKeys.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486754.png" width="60" class="mb-3 opacity-50">
                <p>Tidak ada jadwal majelis untuk hari <b>${currentDayName}</b>.</p>
            </div>`;
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
                        <span class="badge bg-light text-dark ms-2 border">${mitraList.length}</span>
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
                                    <div class="fw-bold text-dark">${bpName}</div>
                                    <div class="small text-muted" style="font-size:11px;">Total Majelis: ${majelisKeys.length}</div>
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
    const stBayar = (mitra.status_bayar || "").toLowerCase();
    const stKirim = (mitra.status_kirim || "").toLowerCase();

    const badgeBayar = stBayar === 'lunas' ? 'status-lunas' : 'status-telat';
    const badgeKirim = stKirim === 'terkirim' ? 'status-kirim' : 'status-belum';

    let specialUI = "";
    if (stBayar !== 'lunas' && stKirim === 'terkirim') {
        specialUI = `
            <div class="alert-reason">
                <div class="d-flex align-items-start text-danger mb-1" style="font-size:11px;">
                    <i class="fa-solid fa-circle-exclamation mt-1 me-2"></i>
                    <div>
                        <strong>Status Janggal:</strong> Telat tapi sudah dikirim.<br>
                        <em>Alasan Lapangan: "${mitra.alasan || '-'}"</em>
                    </div>
                </div>
                <input type="text" class="reason-input" placeholder="Wajib isi alasan validasi..." id="validasi-${mitra.id}">
            </div>
        `;
    }

    return `
        <div class="mitra-row">
            <div class="mitra-info">
                <div class="d-flex justify-content-between align-items-center">
                    <span class="mitra-name">${mitra.nama}</span>
                    <span class="mitra-id badge bg-light text-secondary border">${mitra.id}</span>
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

// --- GLOBAL EXPORTS ---
window.toggleValidation = function(element, id) {
    const inputReason = document.getElementById(`validasi-${id}`);
    
    if (!element.classList.contains('checked')) {
        if (inputReason && inputReason.value.trim() === "") {
            alert("Mohon isi alasan validasi terlebih dahulu.");
            inputReason.focus();
            return; 
        }
        element.classList.add('checked');
    } else {
        element.classList.remove('checked');
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        btnValAll.addEventListener('click', () => {
            if(confirm("Validasi semua data Lunas & Terkirim?")) {
                const checkboxes = document.querySelectorAll('.btn-check-custom');
                let count = 0;
                checkboxes.forEach(btn => {
                    const parent = btn.closest('.mitra-row');
                    if (!parent.querySelector('.alert-reason')) {
                        btn.classList.add('checked');
                        count++;
                    }
                });
                alert(`Berhasil memvalidasi otomatis ${count} data.`);
            }
        });
    }
});
