import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxSmjz4ybJmztePGYl1JGH_ih3mvBFW1nHcA8Qu8ShWzdgcLIDsMYvFcRgh0mKtyFf5/exec"; 
const ADMIN_ID = "17246";
// =========================================================================

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

// Helper string
const clean = (str) => {
    if (!str) return "";
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
};

// --- STORAGE LOKAL ---
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
        isPageLocked = false; 
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

// --- FUNGSI LOCKING (SERVER SIDE) ---
function setGlobalLock(status) {
    if(!userProfile || !userProfile.point) return;
    const dateInput = document.getElementById('dateInput');
    let dateStr = "";
    if (dateInput && !dateInput.classList.contains('d-none')) {
        dateStr = dateInput.value; 
    } else {
        dateStr = new Date().toLocaleDateString('en-CA');
    }

    const pointKey = clean(userProfile.point); 
    const lockPath = `closing_locks/${pointKey}/${dateStr}`;

    if (status === true) {
        set(ref(db, lockPath), {
            isLocked: true,
            lockedBy: userProfile.nama || "User",
            lockedAt: new Date().toISOString()
        }).then(() => {
            console.log(`Halaman dikunci untuk ${userProfile.point}`);
        }).catch((err) => console.error("Gagal lock:", err));
    }
}

function checkGlobalLock() {
    if(!userProfile || !userProfile.point) return;

    const dateInput = document.getElementById('dateInput');
    let dateStr = "";
    if (dateInput && !dateInput.classList.contains('d-none')) {
        dateStr = dateInput.value;
    } else {
        dateStr = new Date().toLocaleDateString('en-CA');
    }

    const pointKey = clean(userProfile.point);
    const lockPath = `closing_locks/${pointKey}/${dateStr}`;

    onValue(ref(db, lockPath), (snapshot) => {
        const data = snapshot.val();
        if (data && data.isLocked === true) {
            isPageLocked = true;
            applyLockMode(data.lockedBy);
        } else {
            isPageLocked = false;
            releaseLockMode();
        }
    });
}

window.markMajelisAsRead = function(uniqueKey, elementId) {
    if (!readStatusData[uniqueKey]) {
        readStatusData[uniqueKey] = true;
        localStorage.setItem(getReadStatusKey(), JSON.stringify(readStatusData));
        const dot = document.getElementById(`notif-${elementId}`);
        if(dot) dot.style.display = 'none';
    }
};

// --- AUTH & INIT ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadFromStorage(); checkUserRole(user.uid);
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
                if(container) container.innerHTML = `<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-2">Memuat data hari ${currentDayName}...</p></div>`;
                
                isPageLocked = false; 
                checkGlobalLock(); 

                setTimeout(() => { filterAndRenderData(); }, 500);
            }
        });
    } else {
        currentDayName = days[today.getDay()]; 
    }

    let targetPoint = (["RM", "AM", "ADMIN"].includes(currentRole)) ? "ALL" : userProfile.point;
    setTimeout(() => { checkGlobalLock(); }, 1000); 
    fetchRepaymentData(targetPoint);
}

// --- FETCH DATA ---
async function fetchRepaymentData(targetPoint) {
    const container = document.getElementById('accordionBP');
    try {
        if(container) container.innerHTML = `<div class="empty-state"><div class="spinner-border text-primary" role="status"></div><p>Sinkronisasi Database...</p></div>`;
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
            if(container) container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-filter text-info"></i><h6>Siap Menampilkan Data</h6><p class="small">Silakan pilih Area & Point di atas, lalu klik <b>Tampilkan Data</b>.</p></div>`;
        }
    } catch (error) {
        if(container) container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wifi text-danger"></i><p>Gagal koneksi server.</p></div>`;
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
    // 1. Cek atau Buat Container Filter secara otomatis jika belum ada di HTML
    let filterContainer = document.getElementById('filterContainer');
    
    if (!filterContainer) {
        // Jika user lupa update HTML, kita buat container secara manual via JS
        const navbar = document.querySelector('.navbar-custom .d-flex.flex-column');
        if (navbar) {
            filterContainer = document.createElement('div');
            filterContainer.id = 'filterContainer';
            filterContainer.className = 'mt-2 w-100';
            navbar.appendChild(filterContainer);
        } else {
            // Fallback lokasi lain
            const header = document.querySelector('.navbar-custom');
            if(header) {
                filterContainer = document.createElement('div');
                filterContainer.id = 'filterContainer';
                filterContainer.className = 'mt-2 w-100 px-3 pb-2';
                header.appendChild(filterContainer);
            } else {
                return; // Gagal menemukan tempat
            }
        }
    }

    // Bersihkan isi container sebelum render ulang
    filterContainer.innerHTML = '';

    // 2. Logic Pembuatan Dropdown Berdasarkan Role
    if (currentRole === "RM" || currentRole === "ADMIN") {
        const row = document.createElement('div');
        row.className = 'd-flex gap-2 mb-2';
        
        // Buat Dropdown Area
        const selArea = document.createElement('select'); 
        selArea.id = 'selectArea'; 
        selArea.className = 'header-select flex-fill form-select form-select-sm shadow-sm';
        
        // Isi Opsi Area
        let areaOpts = `<option value="ALL">Semua Area</option>`;
        Object.keys(dataPoints).forEach(area => { 
            // Cek apakah user punya area default, jika ya set selected
            const isSelected = (userProfile.area && clean(area) === clean(userProfile.area)) ? "selected" : ""; 
            areaOpts += `<option value="${area}" ${isSelected}>${area}</option>`; 
        });
        selArea.innerHTML = areaOpts; 
        
        // Buat Dropdown Point
        const selPoint = document.createElement('select'); 
        selPoint.id = 'selectPoint'; 
        selPoint.className = 'header-select flex-fill form-select form-select-sm shadow-sm';

        row.appendChild(selArea);
        row.appendChild(selPoint);
        filterContainer.appendChild(row);

        // --- EVENT LISTENERS (LOGIKA UTAMA) ---
        
        // Saat Area diganti:
        selArea.addEventListener('change', () => {
            updatePointDropdownOptions(); // 1. Perbarui daftar Point sesuai Area baru
            filterAndRenderData();        // 2. Render ulang data tabel
        });

        // Saat Point diganti:
        selPoint.addEventListener('change', () => {
            filterAndRenderData();        // Render ulang data tabel
        });

        // Inisialisasi pertama kali
        updatePointDropdownOptions(); 

    } else if (currentRole === "AM") {
        // Khusus AM (Hanya Dropdown Point)
        const selPoint = document.createElement('select'); 
        selPoint.id = 'selectPoint'; 
        selPoint.className = 'header-select w-100 mb-2 form-select form-select-sm shadow-sm';
        filterContainer.appendChild(selPoint);
        
        updatePointDropdownOptions(userProfile.area);
        
        selPoint.addEventListener('change', () => {
            filterAndRenderData();
        });
    }

    // (Opsional) Hapus tombol manual jika ingin full otomatis, 
    // atau biarkan sebagai indikator visual.
    const btnShow = document.getElementById('btnShowData');
    if(btnShow) btnShow.style.display = 'none'; // Sembunyikan tombol manual agar tidak bingung
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

// --- RENDER DATA ---
function filterAndRenderData() {
    let stats = { mm_total: 0, mm_bayar: 0, mm_kirim: 0, nc_total: 0, nc_bayar: 0, nc_kirim: 0, mm_telat: 0, nc_telat: 0 };
    let hierarchy = {}; 
    const elArea = document.getElementById('selectArea');
    const elPoint = document.getElementById('selectPoint');
    let filterArea = (elArea && elArea.value) ? elArea.value : (currentRole === 'AM' ? (userProfile.area || "ALL") : "ALL");
    let filterPoint = (elPoint && elPoint.value) ? elPoint.value : (currentRole === 'BM' ? (userProfile.point || "ALL") : "ALL");

    globalMitraList = [];
    const container = document.getElementById('accordionBP');
    if(!container) return;
    if (!allRawData || allRawData.length === 0) { container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>Data Kosong.</p></div>`; return; }

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
        
        const st_bll = getValue(row, ["status_bll", "bll", "ket_bll"]) || "-";
        const val_data_o = getValue(row, ["data_o"]) || "-";

        const isLunas = st_bayar.toLowerCase().includes("lunas") || st_bayar.toLowerCase().includes("bayar");
        const isTerkirim = st_kirim.toLowerCase().includes("terkirim") || st_kirim.toLowerCase().includes("sudah");
        const bucketNum = parseInt(rawBucket);
        const isCurrent = rawBucket.toLowerCase().includes("current") || rawBucket.toLowerCase().includes("lancar") || (!isNaN(bucketNum) && bucketNum <= 1);

        // --- PERBAIKAN LOGIKA HITUNG ---
        if (isCurrent) { 
            // Kategori: Mitra Modal (DPD 0/Current)
            stats.mm_total++; 
            if (isLunas) {
                stats.mm_bayar++;
            } else {
                // Jika DPD Current tapi belum Lunas = Telat
                stats.mm_telat++;
            }
            if (isTerkirim) stats.mm_kirim++; 

        } else { 
            // Kategori: Bermasalah (DPD > 0)
            stats.nc_total++; 
            if (isLunas) {
                stats.nc_bayar++;
            } else {
                // Jika DPD Bermasalah dan belum Lunas = Telat
                stats.nc_telat++;
            }
            if (isTerkirim) stats.nc_kirim++; 
        }

        const mitraData = {
            id: getValue(row, ["id_mitra", "id", "account_id"]),
            nama: getValue(row, ["nama_mitra", "nama", "client_name"]),
            status_bayar: st_bayar, status_kirim: st_kirim, jenis_bayar: p_jenis,
            bucket: rawBucket, alasan: alasan_db, is_lunas: isLunas, is_terkirim: isTerkirim,
            bp: p_bp, majelis: p_majelis,
            status_bll: st_bll,
            data_o: val_data_o 
        };
        globalMitraList.push(mitraData);
        if (!hierarchy[p_bp]) hierarchy[p_bp] = {};
        if (!hierarchy[p_bp][p_majelis]) hierarchy[p_bp][p_majelis] = [];
        hierarchy[p_bp][p_majelis].push(mitraData);
    });

    renderStats(stats);
    if (matchCount === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>Tidak ada data di hari <b>${currentDayName}</b></p></div>`;
    } else {
        renderAccordion(hierarchy);
        updateGlobalValidationStatus();
        
        if (isPageLocked) {
            applyLockMode("System/Admin");
        } else {
            checkGlobalLock();
        }
    }
}

function renderStats(stats) {
    const el = (id) => document.getElementById(id);
    if(el('mmTotal')) el('mmTotal').textContent = stats.mm_total;
    if(el('mmBayar')) el('mmBayar').textContent = stats.mm_bayar;
    if(el('mmKirim')) el('mmKirim').textContent = stats.mm_kirim;
    if(el('mmTelat')) el('mmTelat').textContent = stats.mm_telat;

    if(el('ncTotal')) el('ncTotal').textContent = stats.nc_total;
    if(el('ncBayar')) el('ncBayar').textContent = stats.nc_bayar;
    if(el('ncKirim')) el('ncKirim').textContent = stats.nc_kirim;
    if(el('ncTelat')) el('ncTelat').textContent = stats.nc_telat;
}

function renderAccordion(hierarchy) {
    const container = document.getElementById('accordionBP'); if(!container) return; container.innerHTML = "";
    const counterHtml = `<div class="validation-bar"><div><i class="fa-solid fa-clipboard-check me-2 text-primary"></i><strong>Status Validasi</strong></div><span class="badge bg-primary rounded-pill p-2" id="statusCounter">0 / 0</span></div>`;
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
            const dotHtml = showDot ? `<span class="badge bg-danger rounded-circle p-1 ms-2" id="notif-maj-${bpIndex}-${majIndex}" style="font-size: 5px;"> </span>` : ``;
            let mitraRows = mitraList.map(m => createMitraCard(m)).join('');
            
            majelisHtml += `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="headingMaj-${bpIndex}-${majIndex}">
                        <button class="accordion-button collapsed py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMaj-${bpIndex}-${majIndex}" onclick="markMajelisAsRead('${uniqueKey}', 'maj-${bpIndex}-${majIndex}')">
                            <div class="d-flex align-items-center w-100 pe-3">
                                <div class="bg-light text-primary rounded p-2 me-3"><i class="fa-solid fa-users-rectangle"></i></div>
                                <div>
                                    <div class="fw-bold text-dark d-flex align-items-center" style="font-size:0.9rem;">${majName} ${dotHtml}</div>
                                    <div class="small text-muted mt-1" id="count-maj-${bpIndex}-${majIndex}">${checkedCount} / ${mitraList.length} Selesai</div>
                                </div>
                            </div>
                        </button>
                    </h2>
                    <div id="collapseMaj-${bpIndex}-${majIndex}" class="accordion-collapse collapse" data-bs-parent="#accordionMajelis-${bpIndex}">
                        <div class="accordion-body bg-light pt-3 pb-3">${mitraRows}</div>
                    </div>
                </div>`;
        });
        
        const bpWrapper = `
            <div class="card border-0 shadow-sm mb-3" style="border-radius: 16px; overflow:hidden;">
                <div class="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between" role="button" data-bs-toggle="collapse" data-bs-target="#collapseBP-${bpIndex}">
                    <div class="d-flex align-items-center gap-3">
                        <div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center shadow-sm" style="width: 42px; height: 42px;">
                            <i class="fa-solid fa-user-tie"></i>
                        </div>
                        <div>
                            <h6 class="mb-0 fw-bold text-dark">${bpName}</h6>
                            <small class="text-muted"><i class="fa-solid fa-layer-group me-1"></i>${Object.keys(majelisObj).length} Majelis</small>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-down text-muted"></i>
                </div>
                <div id="collapseBP-${bpIndex}" class="accordion-collapse collapse" data-bs-parent="#accordionBP">
                    <div class="card-body bg-light pt-0 pb-3 px-3" id="accordionMajelis-${bpIndex}">${majelisHtml}</div>
                </div>
            </div>`;
        container.insertAdjacentHTML('beforeend', bpWrapper);
    });
}

function createMitraCard(mitra) {
    const savedData = draftData[mitra.id] || {};
    const isChecked = savedData.checked ? "checked" : "";
    const savedReason = savedData.reason || ""; 
    const savedDay = savedData.day || ""; 

    // --- LOGIKA UTAMA ---
    const jenisBayar = String(mitra.jenis_bayar).toUpperCase().trim();
    const isJB = jenisBayar === "JB";
    const isNonNormal = ["PAR", "PARTIAL", "PAR PAYMENT"].includes(jenisBayar);

    const isLunas = mitra.is_lunas;
    const isTerkirim = mitra.is_terkirim;

    const isValidationLocked = !isTerkirim;
    const lockedClass = isValidationLocked ? "disabled" : "";
    const lockedAttr = isValidationLocked ? "" : `onclick="toggleValidation(this, '${mitra.id}')"`;
    
    // --- LOGIKA WAJIB ALASAN (REVISI) ---
    // Wajib jika: (PAR/PARTIAL) ATAU (Belum Lunas + Terkirim + Jenis Normal)
    const isNormalLateAndSent = (!isLunas && isTerkirim && jenisBayar === "NORMAL");
    const isMandatoryReason = isNonNormal || isNormalLateAndSent;

    // Styling Classes
    const cardStatusClass = isLunas ? "card-lunas" : (isTerkirim ? "card-normal" : "card-telat");
    const badgeBayarClass = isLunas ? "badge-success" : "badge-danger";
    const badgeKirimClass = isTerkirim ? "badge-success" : "badge-warning";
    const badgeJenisClass = "badge-info";

    // Logic Bucket
    let bucketText = (mitra.bucket == "0" || String(mitra.bucket).toLowerCase().includes("current")) ? "Lancar" : `DPD: ${mitra.bucket}`;
    let badgeBucketClass = (mitra.bucket == "0" || String(mitra.bucket).toLowerCase().includes("current")) ? "badge-info" : "badge-warning";

    // Logic BLL
    let bllText = (mitra.status_bll || "").trim();
    let bllBadgeHtml = "";
    if (bllText && bllText !== "-" && bllText.toLowerCase() !== "null") {
        bllBadgeHtml = `<span class="badge-pill badge-purple">${bllText}</span>`;
    }

    // Logic Data O
    let badgeDataO = "";
    if (mitra.data_o && mitra.data_o !== "-" && mitra.data_o !== "null") {
        let labelTgl = mitra.data_o;
        try {
            const dateObj = new Date(mitra.data_o);
            if (!isNaN(dateObj)) {
                labelTgl = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}`;
            }
        } catch(e){}
        badgeDataO = `<span class="badge-pill badge-warning"><i class="fa-regular fa-calendar me-1"></i>${labelTgl}</span>`;
    }

    // Form Input
    let inputHtml = "";
    if (isJB) {
        inputHtml = `
            <div class="mt-2 p-2 bg-light rounded border border-warning">
                <label class="small fw-bold text-warning mb-1"><i class="fa-solid fa-calendar-days me-1"></i>Pilih Hari Baru:</label>
                <select class="form-select form-select-sm" id="day-${mitra.id}" onchange="window.saveReasonInput('${mitra.id}', '', this.value)" style="font-size:0.8rem;">
                    <option value="" disabled ${savedDay === "" ? "selected" : ""}>- Pilih -</option>
                    <option value="Senin" ${savedDay === "Senin" ? "selected" : ""}>Senin</option>
                    <option value="Selasa" ${savedDay === "Selasa" ? "selected" : ""}>Selasa</option>
                    <option value="Rabu" ${savedDay === "Rabu" ? "selected" : ""}>Rabu</option>
                    <option value="Kamis" ${savedDay === "Kamis" ? "selected" : ""}>Kamis</option>
                    <option value="Jumat" ${savedDay === "Jumat" ? "selected" : ""}>Jumat</option>
                </select>
            </div>
        `;
    } else {
        const placeholder = isMandatoryReason ? "Wajib isi alasan..." : "Ket. (Opsional)...";
        const requiredClass = isMandatoryReason ? "required" : ""; 
        const requiredAttr = isMandatoryReason ? 'data-wajib="true"' : 'data-wajib="false"';

        inputHtml = `
            <input type="text" class="input-modern ${requiredClass}" 
                   placeholder="${placeholder}" 
                   id="validasi-${mitra.id}" 
                   ${requiredAttr}
                   value="${savedReason}"
                   oninput="window.saveReasonInput('${mitra.id}', this.value, '')">
        `;
    }

    return `
        <div class="mitra-card ${cardStatusClass}">
            <div class="mitra-info">
                <div class="d-flex align-items-center flex-wrap gap-1 mb-2">
                    <span class="mitra-name me-2">${mitra.nama}</span>
                    <span class="mitra-id">${mitra.id}</span>
                    ${badgeDataO}
                </div>
                
                <div class="mb-2">
                    <span class="badge-pill ${badgeBayarClass}">${mitra.status_bayar}</span>
                    <span class="badge-pill ${badgeKirimClass}">${mitra.status_kirim}</span>
                    <span class="badge-pill ${badgeJenisClass}">${mitra.jenis_bayar}</span>
                    <span class="badge-pill ${badgeBucketClass}">${bucketText}</span>
                    ${bllBadgeHtml}
                </div>

                ${inputHtml}
            </div>
            
            <div class="d-flex align-items-center h-100 ps-2">
                <button class="btn-check-action ${isChecked} ${lockedClass}" 
                        ${lockedAttr} 
                        id="btn-${mitra.id}">
                    <i class="fa-solid fa-check"></i>
                </button>
            </div>
        </div>
    `;
}

// --- EVENTS ---

window.saveReasonInput = function(id, reason, day) {
    if (isPageLocked) return;
    const btn = document.querySelector(`#btn-${id}`);
    const existing = draftData[id] || {};
    const currentReason = reason !== undefined ? reason : (existing.reason || "");
    const currentDay = day !== undefined ? day : (existing.day || "");
    const isChecked = btn && btn.classList.contains('checked');
    saveToStorage(id, isChecked, currentReason, currentDay);
};

window.toggleValidation = function(element, id) {
    if (isPageLocked || element.classList.contains('disabled')) return;

    const daySelect = document.getElementById(`day-${id}`);
    const inputReason = document.getElementById(`validasi-${id}`);

    // VALIDASI WAJIB
    if (inputReason) {
        const isWajib = inputReason.getAttribute('data-wajib') === 'true';
        if (isWajib && inputReason.value.trim() === "") {
            alert("Wajib mengisi alasan/keterangan untuk status ini!");
            inputReason.focus();
            inputReason.classList.add('required');
            return;
        }
    }

    if (daySelect && daySelect.value === "") {
        alert("Harap pilih HARI BARU untuk mitra JB!");
        daySelect.focus();
        return; 
    }

    // Toggle Check
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

// --- BATCH UPDATE JB ---
async function updateJBDaysToServer() {
    const updates = [];
    globalMitraList.forEach(m => {
        const stored = draftData[m.id];
        const isJB = String(m.jenis_bayar).toUpperCase() === "JB";
        if (isJB && stored && stored.checked && stored.day) {
            updates.push({ customerNumber: m.id, hariBaru: stored.day });
        }
    });

    if (updates.length === 0) return; 

    const btn = document.getElementById('btnValidateAll');
    if(btn) btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Update Hari JB...`;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: "batch_update_jb", items: updates }),
            redirect: "follow", headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const res = await response.json();
        console.log("Update JB:", res);
    } catch (err) {
        console.error("Gagal JB:", err);
        alert("Peringatan: Gagal update tanggal JB.");
    }
}

// --- LOCK UI ---
function applyLockMode(lockedBy = "Admin") {
    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        btnValAll.disabled = true;
        btnValAll.innerHTML = `<i class="fa-solid fa-lock me-1"></i> Terkunci oleh ${lockedBy}`;
        btnValAll.classList.replace('btn-primary', 'btn-secondary');
    }
    document.querySelectorAll('.btn-check-action').forEach(b => b.classList.add('disabled'));
    document.querySelectorAll('input, select').forEach(i => i.disabled = true);
}

function releaseLockMode() {
    if(!isPageLocked) {
        const btnValAll = document.getElementById('btnValidateAll');
        if(btnValAll) {
            btnValAll.disabled = false; 
            btnValAll.classList.replace('btn-secondary', 'btn-primary');
            btnValAll.innerHTML = `<i class="fa-solid fa-calendar-check me-1"></i> Validasi Hari Ini`;
        }
        if(allRawData.length > 0) filterAndRenderData();
    }
}

function updateGlobalValidationStatus() {
    if (isPageLocked) return;
    const totalMitra = document.querySelectorAll('.btn-check-action').length;
    const checkedMitra = document.querySelectorAll('.btn-check-action.checked').length;
    
    const counterEl = document.getElementById('statusCounter');
    if(counterEl) counterEl.textContent = `${checkedMitra} / ${totalMitra}`;

    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        if (checkedMitra === totalMitra && totalMitra > 0) {
            btnValAll.disabled = false;
            btnValAll.innerHTML = `<i class="fa-solid fa-file-arrow-down me-1"></i> Selesai & Download`; 
            btnValAll.classList.remove('btn-primary', 'btn-secondary');
            btnValAll.classList.add('btn-success'); 
        } else {
            btnValAll.disabled = true;
            btnValAll.innerHTML = `<i class="fa-solid fa-hourglass-half me-1"></i> Selesaikan ${totalMitra - checkedMitra} Lagi`;
            btnValAll.classList.remove('btn-success', 'btn-primary');
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
        const allInMajelis = collapseDiv.querySelectorAll('.btn-check-action').length;
        const checkedInMajelis = collapseDiv.querySelectorAll('.btn-check-action.checked').length;
        countDiv.innerText = `${checkedInMajelis} / ${allInMajelis} Selesai`;
    }
}

function downloadCSV() {
    if (globalMitraList.length === 0) return alert("Data kosong.");
    let csvContent = "ID Mitra,Nama Mitra,BP,Majelis,Status Bayar,Status Kirim,Status BLL,Jenis Bayar,Hari Baru (JB),DPD Bucket,Keterangan\n";
    globalMitraList.forEach(m => {
        const stored = draftData[m.id] || {};
        const finalReason = stored.reason || m.alasan || "-";
        const finalDay = stored.day || "-";
        const row = [`'${m.id}`, `"${m.nama}"`, `"${m.bp}"`, `"${m.majelis}"`, m.status_bayar, m.status_kirim, m.status_bll, m.jenis_bayar, finalDay, m.bucket, `"${finalReason}"`].join(",");
        csvContent += row + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Closing_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

document.addEventListener("DOMContentLoaded", () => {
    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        btnValAll.disabled = true;
        btnValAll.addEventListener('click', async () => {
            if(confirm("VALIDASI & DOWNLOAD?\n\nPERINGATAN:\n1. Update Hari JB ke Server.\n2. Laporan TERKUNCI untuk semua user.")) {
               btnValAll.disabled = true;
               btnValAll.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
               await updateJBDaysToServer();
               downloadCSV();
               setGlobalLock(true);
            }
        });
    }
});
