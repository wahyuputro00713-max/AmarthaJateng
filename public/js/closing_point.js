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
let globalMitraList = []; 
let draftData = {}; 
let readStatusData = {}; 

// --- 1. MANAGEMEN PENYIMPANAN LOKAL (AUTO-SAVE & NOTIFIKASI) ---
function getStorageKey() {
    const dateStr = new Date().toISOString().split('T')[0];
    return `closing_draft_${dateStr}`; 
}

function getReadStatusKey() {
    const dateStr = new Date().toISOString().split('T')[0];
    return `closing_read_${dateStr}`; 
}

function loadFromStorage() {
    try {
        const rawDraft = localStorage.getItem(getStorageKey());
        draftData = rawDraft ? JSON.parse(rawDraft) : {};

        const rawRead = localStorage.getItem(getReadStatusKey());
        readStatusData = rawRead ? JSON.parse(rawRead) : {};
    } catch (e) {
        draftData = {};
        readStatusData = {};
    }
}

function saveToStorage(id, isChecked, reason) {
    if (!draftData) draftData = {};
    
    if (!draftData[id]) draftData[id] = {};
    draftData[id].checked = isChecked;
    draftData[id].reason = reason;

    localStorage.setItem(getStorageKey(), JSON.stringify(draftData));
    updateGlobalValidationStatus();
}

window.markMajelisAsRead = function(uniqueKey, elementId) {
    if (!readStatusData[uniqueKey]) {
        readStatusData[uniqueKey] = true;
        localStorage.setItem(getReadStatusKey(), JSON.stringify(readStatusData));
        
        const dot = document.getElementById(`notif-${elementId}`);
        if(dot) dot.style.display = 'none';
    }
};

// --- 2. INJECT STYLE MODERN (CSS) ---
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
                --info-bg: #e0f2fe; --info-text: #0369a1;
                --gray-bg: #f3f4f6; --gray-text: #374151;
                --bg-card: #ffffff;
                --bg-body: #f3f4f6;
            }
            .mitra-card {
                background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 12px;
                border: 1px solid #f0f0f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                transition: all 0.2s ease; display: flex; align-items: flex-start; justify-content: space-between;
            }
            .mitra-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.06); border-color: var(--primary-color); }
            .mitra-name { font-weight: 700; color: #1f2937; font-size: 0.95rem; display: block; margin-bottom: 4px; }
            .mitra-id { font-size: 0.75rem; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 6px; }
            .badge-status { font-size: 0.7rem; padding: 4px 10px; border-radius: 20px; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; display: inline-block; }
            
            .btn-check-modern {
                width: 42px; height: 42px; border-radius: 50%; background: #f9fafb; border: 2px solid #e5e7eb; color: #d1d5db;
                display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                margin-top: 10px; 
            }
            .btn-check-modern:hover { background: #f3f4f6; border-color: #d1d5db; }
            .btn-check-modern.checked { background: #22c55e; border-color: #22c55e; color: white; transform: scale(1.1); box-shadow: 0 4px 10px rgba(34, 197, 94, 0.4); }
            
            /* DISABLED STATE UNTUK TOMBOL VALIDASI MITRA */
            .btn-check-modern.disabled {
                background: #e5e7eb !important; border-color: #d1d5db !important; color: #9ca3af !important;
                cursor: not-allowed !important; pointer-events: none; opacity: 0.7;
            }

            /* Accordion Styling */
            .accordion-button::after { display: none !important; }
            .custom-arrow { transition: transform 0.3s ease; }
            .accordion-button:not(.collapsed) .custom-arrow { transform: rotate(180deg); }
            
            .accordion-button { font-weight: 600; border-radius: 12px !important; }
            .accordion-button:not(.collapsed) { background-color: #eef2ff; color: #4f46e5; box-shadow: none; }
            .accordion-item { border: none; margin-bottom: 10px; background: transparent; }
            .accordion-button:focus { box-shadow: none; border-color: rgba(0,0,0,.125); }
            
            .alert-modern { background: #fffbeb; border: 1px solid #fcd34d; color: #92400e; border-radius: 8px; padding: 8px 10px; font-size: 0.8rem; margin-top: 8px; }
            .input-modern { width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; font-size: 0.85rem; margin-top: 8px; transition: border-color 0.2s; background: #fafafa; }
            .input-modern:focus { outline: none; border-color: var(--primary-color); background: #fff; }
            .input-modern.required { border-color: #f87171; background-color: #fef2f2; }
            .input-modern.required:focus { border-color: #ef4444; }

            .notif-dot {
                width: 10px; height: 10px; background-color: #ef4444;
                border-radius: 50%; display: inline-block; margin-left: 8px;
                box-shadow: 0 0 0 2px white; animation: pulse-dot 2s infinite;
            }
            @keyframes pulse-dot {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }

            .validation-status-bar {
                background: white; border-radius: 8px; padding: 10px 15px; margin-bottom: 10px;
                display: flex; justify-content: space-between; align-items: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 0.9rem; font-weight: 600; color: #374151;
            }
            .status-counter { color: #4f46e5; font-weight: bold; }
        `;
        document.head.appendChild(style);
    }
}

// --- 3. AUTH & INIT ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        injectModernStyles(); 
        loadFromStorage(); 
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

// --- 4. FETCH DATA ---
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

// --- 5. PROCESSING DATA ---
function processAndRender(rawData, targetPoint) {
    let stats = { mm_total: 0, mm_bayar: 0, mm_kirim: 0, nc_total: 0, nc_bayar: 0, nc_kirim: 0 };
    let hierarchy = {}; 
    const normalize = (str) => String(str || "").trim().toUpperCase();
    const safeTarget = normalize(targetPoint);

    globalMitraList = [];

    if (!rawData || rawData.length === 0) {
        document.getElementById('accordionBP').innerHTML = `<div class="text-center py-5">Data Kosong.</div>`;
        return;
    }

    rawData.forEach(row => {
        const p_cabang  = normalize(getValue(row, ["cabang", "point", "unit"]));
        const p_bp      = getValue(row, ["bp", "petugas", "ao"]) || "Tanpa BP";
        const p_majelis = getValue(row, ["majelis", "group", "kelompok"]) || "Umum";
        const p_hari    = getValue(row, ["hari", "day"]) || "";
        
        // Ambil data Bucket
        const rawBucket = String(getValue(row, ["bucket", "dpd", "kolek"]) || "0").trim();
        
        const st_bayar  = getValue(row, ["status_bayar", "bayar"]) || "Belum";
        const st_kirim  = getValue(row, ["status_kirim", "kirim"]) || "Belum";
        const alasan_db = getValue(row, ["keterangan", "alasan"]) || "";
        const p_jenis   = getValue(row, ["jenis_pembayaran", "jenis", "type"]) || "-";

        const bayarLower = st_bayar.toLowerCase();
        const kirimLower = st_kirim.toLowerCase();

        const isLunas = bayarLower.includes("lunas") || bayarLower.includes("bayar") || bayarLower.includes("sudah");
        const isTerkirim = kirimLower.includes("terkirim") || kirimLower.includes("sudah") || kirimLower.includes("kirim");

        if (safeTarget !== "ALL" && p_cabang !== safeTarget) return; 
        if (p_hari.toLowerCase() !== currentDayName.toLowerCase()) return;

        // Logic cek Current: Jika mengandung "Current", "Lancar", atau angka <= 1
        const bucketNum = parseInt(rawBucket);
        const isCurrent = rawBucket.toLowerCase().includes("current") || rawBucket.toLowerCase().includes("lancar") || (!isNaN(bucketNum) && bucketNum <= 1);

        if (isCurrent) {
            stats.mm_total++;
            if (isLunas) stats.mm_bayar++;
            if (isTerkirim) stats.mm_kirim++;
        } else {
            stats.nc_total++;
            if (isLunas) stats.nc_bayar++;
            if (isTerkirim) stats.nc_kirim++;
        }

        const mitraData = {
            id: getValue(row, ["id_mitra", "id", "account_id"]),
            nama: getValue(row, ["nama_mitra", "nama", "client_name"]),
            status_bayar: st_bayar,
            status_kirim: st_kirim,
            jenis_bayar: p_jenis,
            bucket: rawBucket, 
            alasan: alasan_db,
            is_lunas: isLunas,
            is_terkirim: isTerkirim,
            bp: p_bp,
            majelis: p_majelis
        };

        globalMitraList.push(mitraData);

        if (!hierarchy[p_bp]) hierarchy[p_bp] = {};
        if (!hierarchy[p_bp][p_majelis]) hierarchy[p_bp][p_majelis] = [];
        hierarchy[p_bp][p_majelis].push(mitraData);
    });

    renderStats(stats);
    renderAccordion(hierarchy);
    updateGlobalValidationStatus();
}

function renderStats(stats) {
    document.getElementById('mmTotal').textContent = stats.mm_total;
    document.getElementById('mmBayar').textContent = stats.mm_bayar;
    document.getElementById('mmKirim').textContent = stats.mm_kirim;
    document.getElementById('ncTotal').textContent = stats.nc_total;
    document.getElementById('ncBayar').textContent = stats.nc_bayar;
    document.getElementById('ncKirim').textContent = stats.nc_kirim;
}

// --- 6. RENDER UI ---
function renderAccordion(hierarchy) {
    const container = document.getElementById('accordionBP');
    container.innerHTML = ""; 

    const counterHtml = `
        <div class="validation-status-bar">
            <span><i class="fa-solid fa-list-check me-2"></i>Status Validasi</span>
            <span class="status-counter" id="statusCounter">0 / 0 Mitra</span>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', counterHtml);

    const bpKeys = Object.keys(hierarchy).sort(); 

    if (bpKeys.length === 0) {
        container.innerHTML += `
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
            
            let checkedCount = 0;
            let hasNewUpdate = false; 

            mitraList.forEach(m => {
                const saved = draftData[m.id] || {};
                if (saved.checked) checkedCount++;
                if (m.is_terkirim) hasNewUpdate = true; 
            });

            const uniqueKey = `${bpName}_${majName}`.replace(/\s+/g, '_');
            const isRead = readStatusData[uniqueKey] === true;
            const showDot = hasNewUpdate && !isRead;
            const dotHtml = showDot ? `<span class="notif-dot" id="notif-maj-${bpIndex}-${majIndex}"></span>` : ``;

            let mitraRows = mitraList.map(m => createMitraCard(m)).join('');

            majelisHtml += `
                <div class="accordion-item mt-2">
                    <h2 class="accordion-header" id="headingMaj-${bpIndex}-${majIndex}">
                        <button class="accordion-button collapsed py-2 px-3 bg-white border shadow-sm" 
                                type="button" 
                                data-bs-toggle="collapse" 
                                data-bs-target="#collapseMaj-${bpIndex}-${majIndex}"
                                onclick="markMajelisAsRead('${uniqueKey}', 'maj-${bpIndex}-${majIndex}')">
                            <div class="d-flex align-items-center w-100 gap-3">
                                <div class="bg-indigo-50 text-indigo p-2 rounded">
                                    <i class="fa-solid fa-users-rectangle text-primary"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center">
                                        <div class="fw-bold text-dark" style="font-size:0.9rem;">${majName}</div>
                                        ${dotHtml} 
                                    </div>
                                    <div class="small text-muted" id="count-maj-${bpIndex}-${majIndex}">
                                        ${checkedCount} / ${mitraList.length} Validasi
                                    </div>
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

    const savedData = draftData[mitra.id] || {};
    const isChecked = savedData.checked ? "checked" : "";
    const savedReason = savedData.reason || ""; 

    let styleBayar = "";
    if (stBayar.includes('lunas') || stBayar.includes('bayar') || stBayar.includes('sudah')) {
        styleBayar = "background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc;"; 
    } else {
        styleBayar = "background-color: #f8d7da; color: #842029; border: 1px solid #f5c2c7;"; 
    }

    let styleKirim = "";
    if (stKirim.includes('terkirim') || stKirim.includes('sudah') || stKirim.includes('kirim')) {
        styleKirim = "background-color: #198754; color: white; box-shadow: 0 2px 4px rgba(25, 135, 84, 0.3);"; 
    } else {
        styleKirim = "background-color: #dc3545; color: white; box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);"; 
    }

    const styleJenis = "background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;";

    // --- LOGIKA TAMPILAN BUCKET / DPD ---
    let bucketText = "";
    let styleBucket = "";
    const bucketRaw = String(mitra.bucket);
    const bucketLower = bucketRaw.toLowerCase();
    const bucketNum = parseInt(bucketRaw);

    if (bucketLower.includes("current") || bucketLower.includes("lancar") || (!isNaN(bucketNum) && bucketNum <= 1)) {
        bucketText = "Lancar";
        styleBucket = "background-color: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe;"; 
    } else {
        bucketText = `DPD: ${mitra.bucket}`; 
        if (mitra.bucket > 7) {
             styleBucket = "background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;"; 
        } else {
             styleBucket = "background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d;"; 
        }
    }

    const isLunas = stBayar.includes('lunas') || stBayar.includes('bayar') || stBayar.includes('sudah');
    const isTerkirim = stKirim.includes('terkirim') || stKirim.includes('sudah') || stKirim.includes('kirim');

    // --- LOGIKA DISABLE TOMBOL VALIDASI ---
    // Jika belum terkirim -> DISABLE
    const isValidationLocked = !isTerkirim;
    const lockedClass = isValidationLocked ? "disabled" : "";
    const lockedAttr = isValidationLocked ? "" : `onclick="toggleValidation(this, '${mitra.id}')"`;
    const lockedTitle = isValidationLocked ? "Status Kirim Belum Selesai (Terkunci)" : "Klik untuk Validasi";

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
            </div>
        `;
    }

    const jenisNormal = mitra.jenis_bayar.toLowerCase().includes("normal");
    const isRequired = !jenisNormal; 
    const placeholder = isRequired ? "Wajib isi alasan (Jenis: " + mitra.jenis_bayar + ")..." : "Keterangan (Opsional)...";
    const requiredClass = isRequired ? "required" : "";
    const inputValue = savedReason; 
    const checkBtnClass = isChecked ? "checked" : "";

    return `
        <div class="mitra-card">
            <div style="flex: 1;">
                <div class="d-flex align-items-center gap-2 mb-2">
                    <span class="mitra-name mb-0">${mitra.nama}</span>
                    <span class="mitra-id">${mitra.id}</span>
                </div>
                
                <div class="d-flex flex-wrap gap-2 mb-2">
                    <span class="badge-status" style="${styleBayar}">
                        <i class="fa-solid fa-money-bill-wave me-1"></i>${mitra.status_bayar}
                    </span>
                    <span class="badge-status" style="${styleKirim}">
                        <i class="fa-solid fa-paper-plane me-1"></i>${mitra.status_kirim}
                    </span>
                    <span class="badge-status" style="${styleJenis}">
                        <i class="fa-solid fa-receipt me-1"></i>${mitra.jenis_bayar}
                    </span>
                    <span class="badge-status" style="${styleBucket}">
                        <i class="fa-solid fa-chart-line me-1"></i>${bucketText}
                    </span>
                </div>

                ${specialUI}

                <div>
                    <input type="text" class="input-modern ${requiredClass}" 
                           placeholder="${placeholder}" 
                           id="validasi-${mitra.id}" 
                           data-required="${isRequired}"
                           value="${inputValue}"
                           oninput="window.saveReasonInput('${mitra.id}', this.value)">
                </div>
            </div>
            
            <div class="ms-3 border-start ps-3">
                <div class="btn-check-modern shadow-sm ${checkBtnClass} ${lockedClass}" 
                     ${lockedAttr}
                     title="${lockedTitle}">
                    <i class="fa-solid fa-check"></i>
                </div>
            </div>
        </div>
    `;
}

// --- 7. EXPORTS & EVENTS ---

window.saveReasonInput = function(id, value) {
    const btn = document.querySelector(`.btn-check-modern[onclick*="'${id}'"]`);
    // Jika tombol disabled, jangan simpan state checked-nya (tapi input tetap bisa disave jika perlu)
    if (!btn || btn.classList.contains('disabled')) {
        saveToStorage(id, false, value); 
        return;
    }
    const isChecked = btn.classList.contains('checked');
    saveToStorage(id, isChecked, value);
};

function updateGlobalValidationStatus() {
    const totalMitra = document.querySelectorAll('.btn-check-modern').length;
    const checkedMitra = document.querySelectorAll('.btn-check-modern.checked').length;
    
    const counterEl = document.getElementById('statusCounter');
    if(counterEl) {
        counterEl.textContent = `${checkedMitra} / ${totalMitra} Mitra`;
        counterEl.style.color = (checkedMitra === totalMitra && totalMitra > 0) ? '#166534' : '#4f46e5';
    }

    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        if (checkedMitra === totalMitra && totalMitra > 0) {
            btnValAll.disabled = false;
            btnValAll.innerHTML = `<i class="fa-solid fa-file-csv me-1"></i> Download Laporan CSV`; 
            btnValAll.classList.remove('btn-secondary');
            btnValAll.classList.add('btn-success'); 
        } else {
            btnValAll.disabled = true;
            btnValAll.innerHTML = `<i class="fa-solid fa-lock me-1"></i> Selesaikan ${totalMitra - checkedMitra} Lagi`;
            btnValAll.classList.remove('btn-success');
            btnValAll.classList.add('btn-secondary');
        }
    }
}

function updateMajelisStats(btnElement) {
    const collapseDiv = btnElement.closest('.accordion-collapse');
    if (!collapseDiv) return;

    const headerId = collapseDiv.getAttribute('aria-labelledby') || collapseDiv.id.replace('collapse', 'heading');
    const countDiv = document.querySelector(`#${headerId} .small.text-muted`); 

    if (countDiv) {
        const allInMajelis = collapseDiv.querySelectorAll('.btn-check-modern').length;
        const checkedInMajelis = collapseDiv.querySelectorAll('.btn-check-modern.checked').length;
        countDiv.innerText = `${checkedInMajelis} / ${allInMajelis} Validasi`;
    }
}

window.toggleValidation = function(element, id) {
    // Double check agar tidak bisa diklik jika disabled
    if (element.classList.contains('disabled')) return;

    const inputReason = document.getElementById(`validasi-${id}`);
    const isRequired = inputReason.getAttribute('data-required') === "true";
    
    element.style.transform = "scale(0.9)";
    setTimeout(() => {
        if (element.classList.contains('checked')) {
            element.style.transform = "scale(1)";
        } else {
            element.style.transform = "scale(1.1)";
        }
    }, 100);

    if (!element.classList.contains('checked')) {
        if (isRequired && inputReason.value.trim() === "") {
            inputReason.style.borderColor = "red";
            inputReason.style.backgroundColor = "#fff0f0";
            inputReason.focus();
            
            setTimeout(() => {
                inputReason.style.borderColor = "#d1d5db";
                inputReason.style.backgroundColor = "#fef2f2";
            }, 2000);
            return; 
        }
        element.classList.add('checked');
    } else {
        element.classList.remove('checked');
    }

    saveToStorage(id, element.classList.contains('checked'), inputReason.value);
    updateMajelisStats(element);
};

// --- 8. FUNGSI DOWNLOAD CSV ---
function downloadCSV() {
    if (globalMitraList.length === 0) {
        alert("Tidak ada data untuk diunduh.");
        return;
    }

    let csvContent = "ID Mitra,Nama Mitra,BP,Majelis,Status Bayar,Status Kirim,Jenis Bayar,DPD Bucket,Keterangan/Alasan\n";

    globalMitraList.forEach(m => {
        const inputReason = document.getElementById(`validasi-${m.id}`);
        const userReason = inputReason ? inputReason.value : "";
        
        const stored = draftData[m.id] || {};
        const finalReason = userReason || stored.reason || m.alasan || "-";

        const row = [
            `'${m.id}`, 
            `"${m.nama}"`,
            `"${m.bp}"`,
            `"${m.majelis}"`,
            m.status_bayar,
            m.status_kirim,
            m.jenis_bayar,
            m.bucket, 
            `"${finalReason}"`
        ].join(",");

        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `Laporan_Closing_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener("DOMContentLoaded", () => {
    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        btnValAll.disabled = true;
        
        btnValAll.addEventListener('click', () => {
            if(confirm("Apakah Anda yakin ingin mengunduh laporan validasi ini?")) {
               downloadCSV();
            }
        });
    }
});
