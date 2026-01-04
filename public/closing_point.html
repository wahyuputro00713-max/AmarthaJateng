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

// --- DATA POINT ---
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

let userProfile = null;
let currentDayName = ""; 
let currentRole = ""; 
let globalMitraList = []; 
let allRawData = []; 
let draftData = {}; 
let readStatusData = {}; 
let isPageLocked = false; 

const clean = (str) => {
    if (!str) return "";
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
};

// --- STORAGE ---
function getStorageKey() {
    const dateStr = new Date().toISOString().split('T')[0];
    return `closing_draft_${dateStr}`; 
}
function getReadStatusKey() {
    const dateStr = new Date().toISOString().split('T')[0];
    return `closing_read_${dateStr}`; 
}
function getLockStatusKey() {
    const dateStr = new Date().toISOString().split('T')[0];
    return `closing_lock_${dateStr}`; 
}

function loadFromStorage() {
    try {
        const rawDraft = localStorage.getItem(getStorageKey());
        draftData = rawDraft ? JSON.parse(rawDraft) : {};
        const rawRead = localStorage.getItem(getReadStatusKey());
        readStatusData = rawRead ? JSON.parse(rawRead) : {};
        const rawLock = localStorage.getItem(getLockStatusKey());
        isPageLocked = rawLock === "true"; 
    } catch (e) {
        draftData = {}; readStatusData = {}; isPageLocked = false;
    }
}

function saveToStorage(id, isChecked, reason, day = "") {
    if (isPageLocked) return; 
    if (!draftData) draftData = {};
    if (!draftData[id]) draftData[id] = {};
    draftData[id].checked = isChecked;
    draftData[id].reason = reason;
    draftData[id].day = day; 
    localStorage.setItem(getStorageKey(), JSON.stringify(draftData));
    updateGlobalValidationStatus();
}

function setPageLocked() {
    isPageLocked = true;
    localStorage.setItem(getLockStatusKey(), "true");
    applyLockMode();
}

window.markMajelisAsRead = function(uniqueKey, elementId) {
    if (!readStatusData[uniqueKey]) {
        readStatusData[uniqueKey] = true;
        localStorage.setItem(getReadStatusKey(), JSON.stringify(readStatusData));
        const dot = document.getElementById(`notif-${elementId}`);
        if(dot) dot.style.display = 'none';
    }
};

// --- STYLES ---
function injectModernStyles() {
    const styleId = 'closing-point-modern-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            :root { --primary-color: #6366f1; --success-bg: #dcfce7; --success-text: #166534; --danger-bg: #fee2e2; --danger-text: #991b1b; --info-bg: #e0f2fe; --info-text: #0369a1; --gray-bg: #f3f4f6; --gray-text: #374151; --bg-card: #ffffff; --bg-body: #f3f4f6; }
            .mitra-card { background: var(--bg-card); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid #f0f0f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s ease; display: flex; align-items: flex-start; justify-content: space-between; }
            .mitra-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.06); border-color: var(--primary-color); }
            .mitra-card.locked-card { opacity: 0.8; background-color: #fafafa; border-color: #e5e7eb; pointer-events: none; }
            .mitra-name { font-weight: 700; color: #1f2937; font-size: 0.95rem; display: block; margin-bottom: 4px; }
            .mitra-id { font-size: 0.75rem; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 6px; }
            .badge-status { font-size: 0.7rem; padding: 4px 10px; border-radius: 20px; font-weight: 600; letter-spacing: 0.3px; text-transform: uppercase; display: inline-block; }
            .btn-check-modern { width: 42px; height: 42px; border-radius: 50%; background: #f9fafb; border: 2px solid #e5e7eb; color: #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); margin-top: 10px; }
            .btn-check-modern:hover { background: #f3f4f6; border-color: #d1d5db; }
            .btn-check-modern.checked { background: #22c55e; border-color: #22c55e; color: white; transform: scale(1.1); box-shadow: 0 4px 10px rgba(34, 197, 94, 0.4); }
            .btn-check-modern.disabled { background: #e5e7eb !important; border-color: #d1d5db !important; color: #9ca3af !important; cursor: not-allowed !important; pointer-events: none; opacity: 0.7; }
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
            .input-modern:disabled { background: #e9ecef; color: #6c757d; border-color: #ced4da; }
            .notif-dot { width: 10px; height: 10px; background-color: #ef4444; border-radius: 50%; display: inline-block; margin-left: 8px; box-shadow: 0 0 0 2px white; animation: pulse-dot 2s infinite; }
            @keyframes pulse-dot { 0% { transform: scale(0.95); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); } 100% { transform: scale(0.95); } }
            .validation-status-bar { background: white; border-radius: 8px; padding: 10px 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-size: 0.9rem; font-weight: 600; color: #374151; }
            .status-counter { color: #4f46e5; font-weight: bold; }
            .header-select { border: 1px solid #ced4da; border-radius: 6px; padding: 4px 8px; font-size: 1rem; font-weight: 700; color: #2c3e50; background-color: white; cursor: pointer; max-width: 250px; margin-bottom: 5px; display: block; }
            .header-select:focus { outline: none; border-color: var(--primary-color); }
            .debug-table { width: 100%; border-collapse: collapse; font-size: 0.7rem; margin-top:10px; color: #333; }
            .debug-table th, .debug-table td { border: 1px solid #ccc; padding: 4px; text-align: left; }
            .debug-table th { background: #f0f0f0; }
        `;
        document.head.appendChild(style);
    }
}

// --- 3. AUTH & INIT ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        injectModernStyles(); loadFromStorage(); checkUserRole(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

function checkUserRole(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            currentRole = (data.jabatan || "").toUpperCase();
            if (["RM", "AM", "BM", "ADMIN"].includes(currentRole) || String(data.idKaryawan).trim() === ADMIN_ID) {
                userProfile = data; initPage();
            } else {
                alert("Akses Ditolak."); window.location.replace("home.html");
            }
        } else { window.location.replace("home.html"); }
    });
}

function initPage() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('displayDate').textContent = today.toLocaleDateString('id-ID', options);

    const areaEl = document.getElementById('areaName');
    const pointEl = document.getElementById('pointName');
    if(areaEl) areaEl.textContent = userProfile.area || "Area -";
    if(pointEl) pointEl.textContent = userProfile.point || "Point -";

    const dateInput = document.getElementById('dateInput');
    const displayDate = document.getElementById('displayDate');

    if (currentRole === "RM" && dateInput) {
        displayDate.classList.add('d-none');
        dateInput.classList.remove('d-none');
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        currentDayName = days[today.getDay()];

        dateInput.addEventListener('change', function() {
            if (this.value) {
                const parts = this.value.split('-');
                const selectedDate = new Date(parts[0], parts[1] - 1, parts[2]); 
                currentDayName = days[selectedDate.getDay()]; 
                const container = document.getElementById('accordionBP');
                if(container) container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Memuat data hari ${currentDayName}...</p></div>`;
                setTimeout(() => { filterAndRenderData(); }, 500);
            }
        });
    } else {
        currentDayName = days[today.getDay()]; 
    }

    let targetPoint = (["RM", "AM", "ADMIN"].includes(currentRole)) ? "ALL" : userProfile.point;
    fetchRepaymentData(targetPoint);
}

// --- 4. FETCH DATA ---
async function fetchRepaymentData(targetPoint) {
    const container = document.getElementById('accordionBP');
    try {
        if(container) container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><p>Mengambil Data Server...</p></div>`;
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: "get_majelis" }), 
            redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        if (result.result !== "success") { alert("Gagal: " + result.error); return; }
        allRawData = result.data || [];
        setupHeaderFilters();
        if (currentRole === "BM") filterAndRenderData();
        else {
            if(container) container.innerHTML = `<div class="text-center py-5 text-muted"><i class="fa-solid fa-filter fa-2x mb-3 text-info"></i><h6 class="text-dark fw-bold">Siap Menampilkan Data</h6><p class="small">Total Data Masuk: <b>${allRawData.length} Baris</b>.<br>Silakan pilih Area & Point, lalu klik tombol <b>Tampilkan Data</b>.</p></div>`;
        }
    } catch (error) {
        if(container) container.innerHTML = `<div class="text-center text-secondary py-5"><p>Gagal koneksi server.</p></div>`;
    }
}

function getValue(row, keys) {
    const rowKeys = Object.keys(row);
    for (let k of keys) {
        const found = rowKeys.find(rk => rk.toLowerCase() === k.toLowerCase());
        if (found) return row[found] || "";
    }
    return "";
}

function setupHeaderFilters() {
    const areaEl = document.getElementById('areaName');
    const pointEl = document.getElementById('pointName');
    if (!areaEl || !pointEl || (areaEl.tagName === 'SELECT' && pointEl.tagName === 'SELECT')) return;

    const createButton = () => {
        if(document.getElementById('btnShowData')) return; 
        const btn = document.createElement('button');
        btn.id = 'btnShowData';
        btn.className = 'btn btn-sm btn-primary mt-1 mb-1 shadow-sm d-block';
        btn.innerHTML = '<i class="fa-solid fa-magnifying-glass me-1"></i> Tampilkan Data';
        btn.style.fontSize = "0.8rem";
        btn.addEventListener('click', function() {
             const originalText = this.innerHTML; this.disabled = true; this.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Memuat...';
             setTimeout(() => { filterAndRenderData(); this.disabled = false; this.innerHTML = originalText; }, 300);
        });
        const pointSelect = document.getElementById('selectPoint');
        if(pointSelect && pointSelect.parentNode) pointSelect.parentNode.insertBefore(btn, pointSelect.nextSibling);
        else pointEl.parentNode.appendChild(btn);
    };

    if (currentRole === "RM" || currentRole === "ADMIN") {
        if (areaEl.tagName !== 'SELECT') {
            const selArea = document.createElement('select'); selArea.id = 'selectArea'; selArea.className = 'header-select text-secondary mb-1';
            let areaOpts = `<option value="ALL">Semua Area</option>`;
            Object.keys(dataPoints).forEach(area => { const selected = (area === userProfile.area) ? "selected" : ""; areaOpts += `<option value="${area}" ${selected}>${area}</option>`; });
            selArea.innerHTML = areaOpts; areaEl.replaceWith(selArea);
            selArea.addEventListener('change', () => updatePointDropdownOptions());
        }
        if (pointEl.tagName !== 'SELECT') {
            const selPoint = document.createElement('select'); selPoint.id = 'selectPoint'; selPoint.className = 'header-select mb-1'; pointEl.replaceWith(selPoint);
        }
        updatePointDropdownOptions(); createButton();
    } else if (currentRole === "AM") {
        if (pointEl.tagName !== 'SELECT') {
            const selPoint = document.createElement('select'); selPoint.id = 'selectPoint'; selPoint.className = 'header-select mb-1'; pointEl.replaceWith(selPoint);
            updatePointDropdownOptions(userProfile.area);
        }
        createButton();
    }
}

function updatePointDropdownOptions(fixedArea = null) {
    const selectPoint = document.getElementById('selectPoint'); if (!selectPoint) return;
    const selectArea = document.getElementById('selectArea');
    const selectedArea = fixedArea || (selectArea ? selectArea.value : "ALL");
    let availablePoints = [];
    if (selectedArea !== "ALL") { if (dataPoints[selectedArea]) availablePoints = dataPoints[selectedArea]; } 
    else { Object.values(dataPoints).forEach(pts => availablePoints = availablePoints.concat(pts)); availablePoints.sort(); }
    let pointOpts = `<option value="ALL">Semua Point</option>`;
    availablePoints.forEach(p => pointOpts += `<option value="${p}">${p}</option>`);
    const oldValue = selectPoint.value; selectPoint.innerHTML = pointOpts;
    if (availablePoints.includes(oldValue)) selectPoint.value = oldValue;
    else if (availablePoints.includes(userProfile.point)) selectPoint.value = userProfile.point;
    else selectPoint.value = "ALL";
}

// --- 5. RENDER DATA ---
function filterAndRenderData() {
    let stats = { mm_total: 0, mm_bayar: 0, mm_kirim: 0, nc_total: 0, nc_bayar: 0, nc_kirim: 0 };
    let hierarchy = {}; 
    const elArea = document.getElementById('selectArea');
    const elPoint = document.getElementById('selectPoint');
    let filterArea = (elArea && elArea.value) ? elArea.value : (currentRole === 'AM' ? (userProfile.area || "ALL") : "ALL");
    let filterPoint = (elPoint && elPoint.value) ? elPoint.value : (currentRole === 'BM' ? (userProfile.point || "ALL") : "ALL");

    globalMitraList = [];
    const container = document.getElementById('accordionBP');
    if(!container) return;
    if (!allRawData || allRawData.length === 0) { container.innerHTML = `<div class="text-center py-5">Data Kosong.</div>`; return; }

    let matchCount = 0;
    const todayClean = clean(currentDayName);

    allRawData.forEach(row => {
        const p_hari_clean = clean(getValue(row, ["hari", "day"]));
        if (p_hari_clean !== todayClean) return;
        const p_area_clean = clean(getValue(row, ["area", "region"]));
        const p_cabang_clean = clean(getValue(row, ["cabang", "point", "unit"]));
        if (filterArea !== "ALL") { const fArea = clean(filterArea); if (!p_area_clean.includes(fArea) && !fArea.includes(p_area_clean)) return; }
        if (filterPoint !== "ALL") { const fPoint = clean(filterPoint); if (!p_cabang_clean.includes(fPoint) && !fPoint.includes(p_cabang_clean)) return; }

        matchCount++;
        const p_bp = getValue(row, ["bp", "petugas", "ao"]) || "Tanpa BP";
        const p_majelis = getValue(row, ["majelis", "group", "kelompok"]) || "Umum";
        const rawBucket = String(getValue(row, ["bucket", "dpd", "kolek"]) || "0").trim();
        const st_bayar = getValue(row, ["status_bayar", "bayar"]) || "Belum";
        const st_kirim = getValue(row, ["status_kirim", "kirim"]) || "Belum";
        const alasan_db = getValue(row, ["keterangan", "alasan"]) || "";
        const p_jenis = getValue(row, ["jenis_pembayaran", "jenis", "type"]) || "-";

        const isLunas = st_bayar.toLowerCase().includes("lunas") || st_bayar.toLowerCase().includes("bayar");
        const isTerkirim = st_kirim.toLowerCase().includes("terkirim") || st_kirim.toLowerCase().includes("sudah");
        const bucketNum = parseInt(rawBucket);
        const isCurrent = rawBucket.toLowerCase().includes("current") || rawBucket.toLowerCase().includes("lancar") || (!isNaN(bucketNum) && bucketNum <= 1);

        if (isCurrent) { stats.mm_total++; if (isLunas) stats.mm_bayar++; if (isTerkirim) stats.mm_kirim++; } 
        else { stats.nc_total++; if (isLunas) stats.nc_bayar++; if (isTerkirim) stats.nc_kirim++; }

        const mitraData = {
            id: getValue(row, ["id_mitra", "id", "account_id"]),
            nama: getValue(row, ["nama_mitra", "nama", "client_name"]),
            status_bayar: st_bayar, status_kirim: st_kirim, jenis_bayar: p_jenis,
            bucket: rawBucket, alasan: alasan_db, is_lunas: isLunas, is_terkirim: isTerkirim,
            bp: p_bp, majelis: p_majelis
        };
        globalMitraList.push(mitraData);
        if (!hierarchy[p_bp]) hierarchy[p_bp] = {};
        if (!hierarchy[p_bp][p_majelis]) hierarchy[p_bp][p_majelis] = [];
        hierarchy[p_bp][p_majelis].push(mitraData);
    });

    renderStats(stats);
    if (matchCount === 0) {
        container.innerHTML = `<div class="text-center text-muted py-5"><h6 class="text-dark">Data Tidak Ditemukan</h6><p>Cek filter: Hari=<b>${currentDayName}</b></p></div>`;
    } else {
        renderAccordion(hierarchy);
        updateGlobalValidationStatus();
        if (isPageLocked) applyLockMode();
    }
}

function renderStats(stats) {
    const el = (id) => document.getElementById(id);
    if(el('mmTotal')) el('mmTotal').textContent = stats.mm_total;
    if(el('mmBayar')) el('mmBayar').textContent = stats.mm_bayar;
    if(el('mmKirim')) el('mmKirim').textContent = stats.mm_kirim;
    if(el('ncTotal')) el('ncTotal').textContent = stats.nc_total;
    if(el('ncBayar')) el('ncBayar').textContent = stats.nc_bayar;
    if(el('ncKirim')) el('ncKirim').textContent = stats.nc_kirim;
}

function renderAccordion(hierarchy) {
    const container = document.getElementById('accordionBP'); if(!container) return; container.innerHTML = "";
    const counterHtml = `<div class="validation-status-bar"><span><i class="fa-solid fa-list-check me-2"></i>Status Validasi</span><span class="status-counter" id="statusCounter">0 / 0 Mitra</span></div>`;
    container.insertAdjacentHTML('beforeend', counterHtml);

    Object.keys(hierarchy).sort().forEach((bpName, bpIndex) => {
        let majelisHtml = "";
        const majelisObj = hierarchy[bpName];
        Object.keys(majelisObj).sort().forEach((majName, majIndex) => {
            const mitraList = majelisObj[majName];
            let checkedCount = 0; let hasNewUpdate = false;
            mitraList.forEach(m => { const saved = draftData[m.id] || {}; if (saved.checked) checkedCount++; if (m.is_terkirim) hasNewUpdate = true; });
            const uniqueKey = `${bpName}_${majName}`.replace(/\s+/g, '_');
            const showDot = (hasNewUpdate && !readStatusData[uniqueKey]);
            const dotHtml = showDot ? `<span class="notif-dot" id="notif-maj-${bpIndex}-${majIndex}"></span>` : ``;
            let mitraRows = mitraList.map(m => createMitraCard(m)).join('');
            majelisHtml += `
                <div class="accordion-item mt-2">
                    <h2 class="accordion-header" id="headingMaj-${bpIndex}-${majIndex}">
                        <button class="accordion-button collapsed py-2 px-3 bg-white border shadow-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMaj-${bpIndex}-${majIndex}" onclick="markMajelisAsRead('${uniqueKey}', 'maj-${bpIndex}-${majIndex}')">
                            <div class="d-flex align-items-center w-100 gap-3">
                                <div class="bg-indigo-50 text-indigo p-2 rounded"><i class="fa-solid fa-users-rectangle text-primary"></i></div>
                                <div class="flex-grow-1"><div class="d-flex align-items-center"><div class="fw-bold text-dark" style="font-size:0.9rem;">${majName}</div>${dotHtml}</div><div class="small text-muted" id="count-maj-${bpIndex}-${majIndex}">${checkedCount} / ${mitraList.length} Validasi</div></div>
                                <i class="fa-solid fa-chevron-down text-muted small custom-arrow"></i>
                            </div>
                        </button>
                    </h2>
                    <div id="collapseMaj-${bpIndex}-${majIndex}" class="accordion-collapse collapse" data-bs-parent="#accordionMajelis-${bpIndex}"><div class="accordion-body p-2 bg-light rounded-bottom">${mitraRows}</div></div>
                </div>`;
        });
        const bpWrapper = `<div class="card border-0 shadow-sm mb-3" style="border-radius: 16px; overflow:hidden;"><div class="card-header bg-white border-0 py-3" id="headingBP-${bpIndex}" type="button" data-bs-toggle="collapse" data-bs-target="#collapseBP-${bpIndex}"><div class="d-flex align-items-center justify-content-between"><div class="d-flex align-items-center gap-3"><div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center shadow-sm" style="width: 48px; height: 48px;"><i class="fa-solid fa-user-tie fa-lg"></i></div><div><h6 class="mb-0 fw-bold text-dark">${bpName}</h6><small class="text-muted"><i class="fa-solid fa-layer-group me-1"></i>${Object.keys(majelisObj).length} Majelis Hari Ini</small></div></div><button class="btn btn-sm btn-light rounded-circle"><i class="fa-solid fa-chevron-down custom-arrow"></i></button></div></div><div id="collapseBP-${bpIndex}" class="accordion-collapse collapse" data-bs-parent="#accordionBP"><div class="card-body bg-light pt-0 pb-3 px-3" id="accordionMajelis-${bpIndex}">${majelisHtml}</div></div></div>`;
        container.insertAdjacentHTML('beforeend', bpWrapper);
    });
}

function createMitraCard(mitra) {
    const stBayar = (mitra.status_bayar || "").toLowerCase();
    const stKirim = (mitra.status_kirim || "").toLowerCase();
    const savedData = draftData[mitra.id] || {};
    const isChecked = savedData.checked ? "checked" : "";
    const savedReason = savedData.reason || ""; 
    const savedDay = savedData.day || ""; 

    // --- LOGIKA UTAMA (PERBAIKAN) ---
    // 1. Tentukan Jenis Bayar (Bersihkan string agar tidak error)
    const jenisBayar = String(mitra.jenis_bayar).toUpperCase().trim();
    const isJB = jenisBayar === "JB";
    const isNonNormal = ["PAR", "PARTIAL", "PAR PAYMENT"].includes(jenisBayar);

    // 2. Status Dasar
    const isLunas = stBayar.includes('lunas') || stBayar.includes('bayar') || stBayar.includes('sudah');
    
    // 3. Logika Terkirim: 
    // Data dianggap "SIAP VALIDASI" jika: 
    // a. Statusnya sudah terkirim/sudah di spreadsheet
    // b. ATAU Statusnya adalah JB (karena JB inputnya langsung di sini, dianggap sudah "dikirim" datanya)
    const isTerkirim = stKirim.includes('terkirim') || stKirim.includes('sudah') || stKirim.includes('kirim') || isJB;

    // 4. Logika Kunci Validasi (Tombol Centang)
    // Jika belum terkirim DAN bukan JB, maka dikunci. 
    // Jika JB, maka TIDAK dikunci (enabled).
    const isValidationLocked = !isTerkirim;
    const lockedClass = isValidationLocked ? "disabled" : "";
    const lockedAttr = isValidationLocked ? "" : `onclick="toggleValidation(this, '${mitra.id}')"`;
    const lockedTitle = isValidationLocked ? "Status Kirim Belum Selesai (Terkunci)" : "Klik untuk Validasi";

    const checkBtnClass = isChecked ? "checked" : "";

    // 5. Styles Badge
    let styleBayar = isLunas ? "background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc;" : "background-color: #f8d7da; color: #842029; border: 1px solid #f5c2c7;";
    let styleKirim = isTerkirim ? "background-color: #198754; color: white; box-shadow: 0 2px 4px rgba(25, 135, 84, 0.3);" : "background-color: #dc3545; color: white; box-shadow: 0 2px 4px rgba(220, 53, 69, 0.3);";
    const styleJenis = "background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;";
    
    let bucketText = (mitra.bucket == "0" || String(mitra.bucket).toLowerCase().includes("current")) ? "Lancar" : `DPD: ${mitra.bucket}`;
    let styleBucket = (mitra.bucket == "0" || String(mitra.bucket).toLowerCase().includes("current")) ? "background-color: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe;" : "background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d;";

    // UI Input (JB = Dropdown Hari, PAR/Partial = Wajib Input, Normal = Optional)
    let inputHtml = "";
    
    if (isJB) {
        // --- DROPDOWN HARI (JB) ---
        inputHtml = `
            <div class="mt-2">
                <label class="small fw-bold text-warning mb-1"><i class="fa-solid fa-calendar-days me-1"></i>Pilih Hari Baru (Wajib):</label>
                <select class="form-select form-select-sm input-modern required"
                        id="day-${mitra.id}"
                        style="background-color: #fffaf0; border-color: #fcd34d; color: #92400e;"
                        onchange="window.saveReasonInput('${mitra.id}', '', this.value)">
                    <option value="" disabled ${savedDay === "" ? "selected" : ""}>Pilih Hari...</option>
                    <option value="Senin" ${savedDay === "Senin" ? "selected" : ""}>Senin</option>
                    <option value="Selasa" ${savedDay === "Selasa" ? "selected" : ""}>Selasa</option>
                    <option value="Rabu" ${savedDay === "Rabu" ? "selected" : ""}>Rabu</option>
                    <option value="Kamis" ${savedDay === "Kamis" ? "selected" : ""}>Kamis</option>
                    <option value="Jumat" ${savedDay === "Jumat" ? "selected" : ""}>Jumat</option>
                </select>
            </div>
        `;
    } else {
        // --- TEXT INPUT (PAR/NORMAL) ---
        const placeholder = isNonNormal ? "Wajib isi alasan..." : "Keterangan (Opsional)...";
        const requiredClass = isNonNormal ? "required" : ""; // Class penanda visual
        const requiredAttr = isNonNormal ? 'data-wajib="true"' : 'data-wajib="false"';

        inputHtml = `
            <div>
                <input type="text" class="input-modern ${requiredClass}" 
                       placeholder="${placeholder}" 
                       id="validasi-${mitra.id}" 
                       ${requiredAttr}
                       value="${savedReason}"
                       oninput="window.saveReasonInput('${mitra.id}', this.value, '')">
            </div>
        `;
    }

    let specialUI = "";
    // Alert jika telat tapi sudah dikirim (dan BUKAN JB, karena JB wajar telat)
    if (!isLunas && isTerkirim && !isJB) {
        specialUI = `
            <div class="alert-modern">
                <div class="d-flex align-items-start gap-2">
                    <i class="fa-solid fa-triangle-exclamation mt-1"></i>
                    <div><small>Status Telat tapi sudah dikirim.</small></div>
                </div>
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
                
                <div class="d-flex flex-wrap gap-2 mb-2">
                    <span class="badge-status" style="${styleBayar}">${mitra.status_bayar}</span>
                    <span class="badge-status" style="${styleKirim}">${mitra.status_kirim}</span>
                    <span class="badge-status" style="background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;">${mitra.jenis_bayar}</span>
                    <span class="badge-status" style="${styleBucket}">${bucketText}</span>
                </div>

                ${specialUI}
                ${inputHtml}
            </div>
            
            <div class="ms-3 border-start ps-3 d-flex align-items-center">
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

window.saveReasonInput = function(id, reason, day) {
    if (isPageLocked) return;
    const btn = document.querySelector(`.btn-check-modern[onclick*="'${id}'"]`);
    const existing = draftData[id] || {};
    // Pertahankan nilai lama jika parameter undefined/kosong
    const currentReason = reason !== undefined ? reason : (existing.reason || "");
    const currentDay = day !== undefined ? day : (existing.day || "");
    const isChecked = btn && btn.classList.contains('checked');
    saveToStorage(id, isChecked, currentReason, currentDay);
};

window.toggleValidation = function(element, id) {
    if (isPageLocked || element.classList.contains('disabled')) return;

    const daySelect = document.getElementById(`day-${id}`);
    const inputReason = document.getElementById(`validasi-${id}`);

    // 1. VALIDASI WAJIB ISI (PAR/PARTIAL)
    if (inputReason) {
        const isWajib = inputReason.getAttribute('data-wajib') === 'true';
        if (isWajib && inputReason.value.trim() === "") {
            alert("Wajib mengisi alasan/keterangan untuk status ini sebelum validasi!");
            inputReason.focus();
            inputReason.style.borderColor = "red";
            inputReason.style.backgroundColor = "#fff0f0";
            setTimeout(() => { 
                inputReason.style.borderColor = "#d1d5db"; 
                inputReason.style.backgroundColor = "#fafafa"; 
            }, 2000);
            return;
        }
    }

    // 2. VALIDASI WAJIB PILIH HARI (JB)
    if (daySelect) {
        if (daySelect.value === "") {
            alert("Harap pilih HARI BARU terlebih dahulu untuk mitra JB!");
            daySelect.focus();
            daySelect.style.borderColor = "red";
            return; 
        } else {
            daySelect.style.borderColor = "#fcd34d";
        }
    }

    element.style.transform = "scale(0.9)";
    setTimeout(() => {
        if (element.classList.contains('checked')) {
            element.style.transform = "scale(1)";
        } else {
            element.style.transform = "scale(1.1)";
        }
    }, 100);

    if (!element.classList.contains('checked')) {
        element.classList.add('checked');
    } else {
        element.classList.remove('checked');
    }

    const valReason = inputReason ? inputReason.value : "";
    const valDay = daySelect ? daySelect.value : "";
    saveToStorage(id, element.classList.contains('checked'), valReason, valDay);
    updateMajelisStats(element);
};

async function updateJBDaysToServer() {
    const updates = [];
    globalMitraList.forEach(m => {
        const stored = draftData[m.id];
        const isJB = String(m.jenis_bayar).toUpperCase() === "JB";
        if (isJB && stored && stored.checked && stored.day) {
            updates.push({ custNo: m.id, namaBP: m.bp, hariBaru: stored.day });
        }
    });

    if (updates.length === 0) return; 

    const btn = document.getElementById('btnValidateAll');
    if(btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i> Mengupdate Hari...`;

    const promises = updates.map(item => {
        const payload = {
            jenisLaporan: "ClosingModal",
            idKaryawan: userProfile.idKaryawan || "Admin",
            namaBP: item.namaBP,
            customerNumber: item.custNo,
            jenisPembayaran: "JB",
            hariBaru: item.hariBaru
        };
        return fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        }).catch(err => console.error("Gagal update JB:", item.custNo, err));
    });

    await Promise.all(promises);
}

function applyLockMode() {
    const allInputs = document.querySelectorAll('.input-modern, select.input-modern');
    allInputs.forEach(input => {
        input.disabled = true;
        input.style.backgroundColor = "#e9ecef";
        input.style.color = "#6c757d";
    });

    const allChecks = document.querySelectorAll('.btn-check-modern');
    allChecks.forEach(btn => {
        btn.classList.add('disabled');
        btn.removeAttribute('onclick');
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
    });

    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        btnValAll.disabled = true;
        btnValAll.innerHTML = `<i class="fa-solid fa-lock me-1"></i> Laporan Terkirim & Terkunci`;
        btnValAll.classList.remove('btn-success', 'btn-primary');
        btnValAll.classList.add('btn-secondary');
        btnValAll.style.cursor = "not-allowed";
    }
}

function updateGlobalValidationStatus() {
    if (isPageLocked) return;

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
            btnValAll.innerHTML = `<i class="fa-solid fa-file-csv me-1"></i> Validasi & Download`; 
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

function downloadCSV() {
    if (globalMitraList.length === 0) {
        alert("Tidak ada data untuk diunduh.");
        return;
    }

    let csvContent = "ID Mitra,Nama Mitra,BP,Majelis,Status Bayar,Status Kirim,Jenis Bayar,Hari Baru (JB),DPD Bucket,Keterangan\n";

    globalMitraList.forEach(m => {
        const stored = draftData[m.id] || {};
        const finalReason = stored.reason || m.alasan || "-";
        const finalDay = stored.day || "-";

        const row = [
            `'${m.id}`, 
            `"${m.nama}"`,
            `"${m.bp}"`,
            `"${m.majelis}"`,
            m.status_bayar,
            m.status_kirim,
            m.jenis_bayar,
            finalDay,
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
        
        btnValAll.addEventListener('click', async () => {
            if(confirm("Apakah Anda yakin ingin melakukan VALIDASI dan MENGUNDUH laporan?\n\nPERINGATAN:\n1. Data Hari untuk mitra 'JB' akan diupdate di server.\n2. Laporan ini akan TERKUNCI.")) {
               
               btnValAll.disabled = true;
               await updateJBDaysToServer();
               downloadCSV();
               setPageLocked(); 
            }
        });
    }
});
