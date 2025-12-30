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

// --- KONFIGURASI APLIKASI ---
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 
const ADMIN_ID = "17246";

let userProfile = null;
let currentDayName = ""; 

// --- 1. INJECT STYLE MODERN (CSS) ---
function injectModernStyles() {
    const styleId = 'closing-point-modern-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            :root {
                --primary-color: #6366f1;
                --success-bg: #dcfce7; --success-text: #166534;
                --danger-bg: #fee2e2; --danger-text: #991b1b;
                --bg-card: #ffffff;
                --bg-body: #f3f4f6;
            }
            .mitra-card {
                background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 12px;
                border: 1px solid #f0f0f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                transition: all 0.2s ease; display: flex; align-items: center; justify-content: space-between;
            }
            .mitra-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.06); border-color: var(--primary-color); }
            .mitra-name { font-weight: 700; color: #1f2937; font-size: 0.95rem; display: block; margin-bottom: 4px; }
            .mitra-id { font-size: 0.75rem; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 6px; }
            .badge-status { font-size: 0.7rem; padding: 4px 10px; border-radius: 20px; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; display: inline-block; }
            
            /* Custom Check Button */
            .btn-check-modern {
                width: 42px; height: 42px; border-radius: 50%; background: #f9fafb; border: 2px solid #e5e7eb; color: #d1d5db;
                display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .btn-check-modern:hover { background: #f3f4f6; border-color: #d1d5db; }
            .btn-check-modern.checked { background: #22c55e; border-color: #22c55e; color: white; transform: scale(1.1); box-shadow: 0 4px 10px rgba(34, 197, 94, 0.4); }
            
            /* Accordion Styling */
            .accordion-button::after { display: none !important; }
            .custom-arrow { transition: transform 0.3s ease; }
            .accordion-button:not(.collapsed) .custom-arrow { transform: rotate(180deg); }
            .card-header[aria-expanded="true"] .custom-arrow { transform: rotate(180deg); }

            .accordion-button { font-weight: 600; border-radius: 12px !important; }
            .accordion-button:not(.collapsed) { background-color: #eef2ff; color: #4f46e5; box-shadow: none; }
            .accordion-item { border: none; margin-bottom: 10px; background: transparent; }
            .accordion-button:focus { box-shadow: none; border-color: rgba(0,0,0,.125); }
            
            .alert-modern { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; border-radius: 8px; padding: 10px; font-size: 0.8rem; margin-top: 10px; }
            .input-modern { width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; font-size: 0.85rem; margin-top: 6px; transition: border-color 0.2s; }
            .input-modern:focus { outline: none; border-color: var(--primary-color); }
        `;
        document.head.appendChild(style);
    }
}

// --- 2. AUTH & INIT ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        injectModernStyles(); 
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
    currentDayName = today.toLocaleDateString('id-ID', { weekday: 'long' });
    
    document.getElementById('displayDate').textContent = today.toLocaleDateString('id-ID', options);
    const userArea = userProfile.area || "Area -";
    const userPoint = userProfile.point || "Point -";

    document.getElementById('areaName').textContent = userArea;
    document.getElementById('pointName').textContent = userPoint;

    fetchRepaymentData(userPoint);
}

// --- 3. FETCH DATA ---
async function fetchRepaymentData(targetPoint) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_majelis" }), 
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        if (result.result !== "success") {
            alert("Gagal: " + result.error);
            return;
        }
        processAndRender(result.data, targetPoint);

    } catch (error) {
        console.error(error);
        document.getElementById('accordionBP').innerHTML = `
            <div class="text-center text-secondary py-5">
                <i class="fa-solid fa-cloud-bolt fa-2x mb-3 text-muted"></i>
                <p>Gagal koneksi server.</p>
            </div>`;
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

// --- 4. PROCESSING DATA (PERBAIKAN LOGIKA) ---
function processAndRender(rawData, targetPoint) {
    let stats = { mm_total: 0, mm_bayar: 0, mm_kirim: 0, nc_total: 0, nc_bayar: 0, nc_kirim: 0 };
    let hierarchy = {}; 
    const normalize = (str) => String(str || "").trim().toUpperCase();
    const safeTarget = normalize(targetPoint);

    if (!rawData || rawData.length === 0) {
        document.getElementById('accordionBP').innerHTML = `<div class="text-center py-5">Data Kosong.</div>`;
        return;
    }

    rawData.forEach(row => {
        const p_cabang  = normalize(getValue(row, ["cabang", "point", "unit"]));
        const p_bp      = getValue(row, ["bp", "petugas", "ao"]) || "Tanpa BP";
        const p_majelis = getValue(row, ["majelis", "group", "kelompok"]) || "Umum";
        const p_hari    = getValue(row, ["hari", "day"]) || "";
        
        const p_bucket  = parseInt(getValue(row, ["bucket", "dpd", "kolek"]) || 0);
        const st_bayar  = getValue(row, ["status_bayar", "bayar"]) || "Belum";
        const st_kirim  = getValue(row, ["status_kirim", "kirim"]) || "Belum";
        const alasan_db = getValue(row, ["keterangan", "alasan"]) || "";

        // PERBAIKAN: Gunakan .includes agar "Bayar" atau "Sudah Bayar" tetap dianggap lunas
        const bayarLower = st_bayar.toLowerCase();
        const kirimLower = st_kirim.toLowerCase();

        const isLunas = bayarLower.includes("lunas") || bayarLower.includes("bayar") || bayarLower.includes("sudah");
        const isTerkirim = kirimLower.includes("terkirim") || kirimLower.includes("sudah") || kirimLower.includes("kirim");

        // Filter Point & Hari
        if (safeTarget !== "ALL" && p_cabang !== safeTarget) return; 
        if (p_hari.toLowerCase() !== currentDayName.toLowerCase()) return;

        const isCurrent = p_bucket <= 1; 

        if (isCurrent) {
            stats.mm_total++;
            if (isLunas) stats.mm_bayar++;
            if (isTerkirim) stats.mm_kirim++;
            
            if (!hierarchy[p_bp]) hierarchy[p_bp] = {};
            if (!hierarchy[p_bp][p_majelis]) hierarchy[p_bp][p_majelis] = [];
            
            hierarchy[p_bp][p_majelis].push({
                id: getValue(row, ["id_mitra", "id", "account_id"]),
                nama: getValue(row, ["nama_mitra", "nama", "client_name"]),
                status_bayar: st_bayar,
                status_kirim: st_kirim,
                alasan: alasan_db
            });
        } else {
            stats.nc_total++;
            if (isLunas) stats.nc_bayar++;
            if (isTerkirim) stats.nc_kirim++;
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

// --- 5. RENDER UI ---
function renderAccordion(hierarchy) {
    const container = document.getElementById('accordionBP');
    container.innerHTML = ""; 

    const bpKeys = Object.keys(hierarchy).sort(); 

    if (bpKeys.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <div class="mb-3 p-3 bg-light rounded-circle d-inline-block">
                    <i class="fa-solid fa-calendar-xmark fa-2x"></i>
                </div>
                <h6 class="fw-bold text-dark">Tidak Ada Jadwal</h6>
                <p class="small">Tidak ada data majelis untuk hari <b>${currentDayName}</b>.</p>
            </div>`;
        return;
    }

    bpKeys.forEach((bpName, bpIndex) => {
        const majelisObj = hierarchy[bpName];
        const majelisKeys = Object.keys(majelisObj).sort();
        
        let majelisHtml = "";
        
        majelisKeys.forEach((majName, majIndex) => {
            const mitraList = majelisObj[majName];
            let mitraRows = mitraList.map(m => createMitraCard(m)).join('');

            majelisHtml += `
                <div class="accordion-item mt-2">
                    <h2 class="accordion-header" id="headingMaj-${bpIndex}-${majIndex}">
                        <button class="accordion-button collapsed py-2 px-3 bg-white border shadow-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMaj-${bpIndex}-${majIndex}">
                            <div class="d-flex align-items-center w-100 gap-3">
                                <div class="bg-indigo-50 text-indigo p-2 rounded">
                                    <i class="fa-solid fa-users-rectangle text-primary"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="fw-bold text-dark" style="font-size:0.9rem;">${majName}</div>
                                    <div class="small text-muted">${mitraList.length} Mitra</div>
                                </div>
                                <i class="fa-solid fa-chevron-down text-muted small custom-arrow"></i>
                            </div>
                        </button>
                    </h2>
                    <div id="collapseMaj-${bpIndex}-${majIndex}" class="accordion-collapse collapse" data-bs-parent="#accordionMajelis-${bpIndex}">
                        <div class="accordion-body p-2 bg-light rounded-bottom">
                            ${mitraRows}
                        </div>
                    </div>
                </div>
            `;
        });

        const bpWrapper = `
            <div class="card border-0 shadow-sm mb-3" style="border-radius: 16px; overflow:hidden;">
                <div class="card-header bg-white border-0 py-3" id="headingBP-${bpIndex}" type="button" data-bs-toggle="collapse" data-bs-target="#collapseBP-${bpIndex}" aria-expanded="false">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-3">
                            <div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center shadow-sm" style="width: 48px; height: 48px;">
                                <i class="fa-solid fa-user-tie fa-lg"></i>
                            </div>
                            <div>
                                <h6 class="mb-0 fw-bold text-dark">${bpName}</h6>
                                <small class="text-muted"><i class="fa-solid fa-layer-group me-1"></i>${majelisKeys.length} Majelis Hari Ini</small>
                            </div>
                        </div>
                        <button class="btn btn-sm btn-light rounded-circle"><i class="fa-solid fa-chevron-down custom-arrow"></i></button>
                    </div>
                </div>
                <div id="collapseBP-${bpIndex}" class="accordion-collapse collapse" data-bs-parent="#accordionBP">
                    <div class="card-body bg-light pt-0 pb-3 px-3" id="accordionMajelis-${bpIndex}">
                        ${majelisHtml}
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', bpWrapper);
    });
}

function createMitraCard(mitra) {
    const stBayar = (mitra.status_bayar || "").toLowerCase();
    const stKirim = (mitra.status_kirim || "").toLowerCase();

    // PERBAIKAN: Gunakan .includes() untuk style warna juga
    let styleBayar = "";
    if (stBayar.includes('lunas') || stBayar.includes('bayar') || stBayar.includes('sudah')) {
        // Hijau Transparan
        styleBayar = "background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc;";
    } else {
        // Merah Transparan
        styleBayar = "background-color: #f8d7da; color: #842029; border: 1px solid #f5c2c7;";
    }

    let styleKirim = "";
    if (stKirim.includes('terkirim') || stKirim.includes('sudah') || stKirim.includes('kirim')) {
        // Hijau Solid
        styleKirim = "background-color: #198754; color: white; box-shadow: 0 2px 4px rgba(25, 135, 84, 0.3);";
    } else {
        // Merah Solid
        styleKirim = "background-color: #dc3545; color: white; box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);";
    }

    // Logic Alert: Jika Belum Lunas (Merah) TAPI Sudah Terkirim (Hijau) -> Tampilkan Alert
    // Kita cek lagi manual karena variabel styleBayar hanya string CSS
    const isLunas = stBayar.includes('lunas') || stBayar.includes('bayar') || stBayar.includes('sudah');
    const isTerkirim = stKirim.includes('terkirim') || stKirim.includes('sudah') || stKirim.includes('kirim');

    let specialUI = "";
    if (!isLunas && isTerkirim) {
        specialUI = `
            <div class="alert-modern">
                <div class="d-flex align-items-start gap-2">
                    <i class="fa-solid fa-triangle-exclamation mt-1"></i>
                    <div>
                        <strong>Cek Kembali:</strong> Status Telat tapi sudah dikirim.
                        <div class="small mt-1 fst-italic text-muted">"${mitra.alasan || '-'}"</div>
                    </div>
                </div>
                <input type="text" class="input-modern" placeholder="Tulis alasan validasi..." id="validasi-${mitra.id}">
            </div>
        `;
    }

    return `
        <div class="mitra-card">
            <div style="flex: 1;">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="mitra-name mb-0">${mitra.nama}</span>
                    <span class="mitra-id">${mitra.id}</span>
                </div>
                <div class="d-flex flex-wrap gap-2">
                    <span class="badge-status" style="${styleBayar}">
                        <i class="fa-solid fa-money-bill-wave me-1"></i>${mitra.status_bayar}
                    </span>
                    <span class="badge-status" style="${styleKirim}">
                        <i class="fa-solid fa-paper-plane me-1"></i>${mitra.status_kirim}
                    </span>
                </div>
                ${specialUI}
            </div>
            
            <div class="ms-3 border-start ps-3">
                <div class="btn-check-modern shadow-sm" onclick="toggleValidation(this, '${mitra.id}')" title="Klik untuk Validasi">
                    <i class="fa-solid fa-check"></i>
                </div>
            </div>
        </div>
    `;
}

// --- 6. EXPORTS & EVENTS ---
window.toggleValidation = function(element, id) {
    const inputReason = document.getElementById(`validasi-${id}`);
    
    element.style.transform = "scale(0.9)";
    setTimeout(() => {
        if (element.classList.contains('checked')) {
            element.style.transform = "scale(1)";
        } else {
            element.style.transform = "scale(1.1)";
        }
    }, 100);

    if (!element.classList.contains('checked')) {
        if (inputReason && inputReason.value.trim() === "") {
            inputReason.style.borderColor = "red";
            inputReason.focus();
            setTimeout(() => inputReason.style.borderColor = "#d1d5db", 2000);
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
            if(confirm("Validasi semua data yang Lunas & Terkirim?")) {
                const checkboxes = document.querySelectorAll('.btn-check-modern');
                let count = 0;
                checkbox
