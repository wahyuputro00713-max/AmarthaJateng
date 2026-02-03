import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, set, onValue, off, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
// PASTIKAN URL INI SAMA DENGAN HASIL DEPLOY TERBARU (NEW VERSION) DI APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUJwnBdaF8Tsi20hSCs9UzrTgjyLEUh_EAlw3J5PeUTT5HigrmKxG7gPUlMxwGdkDJ/exec"; 
const ADMIN_ID = "17246";
// =========================================================================

const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pangasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

let userProfile = null;
let currentDayName = ""; 
let currentRole = ""; 
let globalMitraList = []; 
let allRawData = []; 

// DATA LOKAL (Disimpan di Browser)
let draftData = {}; 
let readStatusData = {}; 

let isPageLocked = false;
let lockOwner = "Admin"; 
let currentStats = { total: 0, telat: 0, bayar: 0 };
let currentLockListener = null; 

// Helper Strings (Pembersih Text untuk Pencocokan Filter)
const clean = (str) => {
    if (!str) return "";
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
};

// =================================================================
// 1. STORAGE MANAGEMENT
// =================================================================

function getStorageKey() {
    const dateInput = document.getElementById('dateInput');
    let dateStr = "";
    if (dateInput && !dateInput.classList.contains('d-none') && dateInput.value) {
        dateStr = dateInput.value; 
    } else {
        dateStr = new Date().toLocaleDateString('en-CA');
    }
    
    const userId = userProfile ? (userProfile.idKaryawan || "guest") : "guest";
    return `closing_draft_${userId}_${dateStr}`;
}

function loadFromStorage() {
    try {
        const key = getStorageKey();
        const raw = localStorage.getItem(key);
        if (raw) {
            draftData = JSON.parse(raw);
        } else {
            draftData = {};
        }
        
        const readKey = `closing_read_${new Date().toLocaleDateString('en-CA')}`;
        const rawRead = localStorage.getItem(readKey);
        readStatusData = rawRead ? JSON.parse(rawRead) : {};

    } catch (e) {
        console.error("Gagal load storage:", e);
        draftData = {};
    }
}

function saveToStorage(id, isChecked, reason, day) {
    if (!draftData) draftData = {};
    
    const safeId = String(id).replace(/[.#$/[\]]/g, "_"); 
    
    draftData[safeId] = {
        checked: isChecked,
        reason: reason || "",
        day: day || ""
    };

    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(draftData));
}

// =================================================================
// 2. LOCK SYSTEM (FIREBASE)
// =================================================================

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
        });
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
    const lockRef = ref(db, lockPath);

    if (currentLockListener) {
        off(lockRef, 'value', currentLockListener);
    }

    currentLockListener = onValue(lockRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.isLocked === true) {
            isPageLocked = true;
            lockOwner = data.lockedBy || "Admin";
            applyLockMode(lockOwner);
        } else {
            isPageLocked = false;
            releaseLockMode();
        }
    });
}

window.unlockGlobalStatus = function() {
    if (!userProfile || !userProfile.point) return;
    
    if (!["RM", "ADMIN"].includes(currentRole) && userProfile.idKaryawan !== ADMIN_ID) {
        alert("Hanya RM atau Admin yang bisa membuka kunci laporan.");
        return;
    }

    if (!confirm("Apakah Anda yakin ingin MEMBUKA KUNCI laporan ini?\nUser lain akan bisa mengedit kembali.")) {
        return;
    }

    const dateInput = document.getElementById('dateInput');
    let dateStr = "";
    if (dateInput && !dateInput.classList.contains('d-none')) {
        dateStr = dateInput.value; 
    } else {
        dateStr = new Date().toLocaleDateString('en-CA');
    }
    const pointKey = clean(userProfile.point); 
    const lockPath = `closing_locks/${pointKey}/${dateStr}`;

    remove(ref(db, lockPath))
        .then(() => {
            alert("Laporan berhasil dibuka kembali!");
        })
        .catch((error) => {
            alert("Gagal membuka kunci: " + error.message);
        });
};

window.markMajelisAsRead = function(uniqueKey, elementId) {
    if (!readStatusData[uniqueKey]) {
        readStatusData[uniqueKey] = true;
        localStorage.setItem(`closing_read_${new Date().toLocaleDateString('en-CA')}`, JSON.stringify(readStatusData));
        const dot = document.getElementById(`notif-${elementId}`);
        if(dot) dot.style.display = 'none';
    }
};

// =================================================================
// 3. AUTH & INIT
// =================================================================

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
                loadFromStorage(); 

                setTimeout(() => { filterAndRenderData(); }, 500);
            }
        });
    } else {
        currentDayName = days[today.getDay()]; 
    }

    // Panggil fetch tanpa parameter area spesifik dulu (agar semua data turun)
    setTimeout(() => { 
        checkGlobalLock(); 
        loadFromStorage();
    }, 1000); 
    
    fetchRepaymentData();
}

// --- FUNGSI FETCH DENGAN PERBAIKAN FILTER ---
async function fetchRepaymentData() {
    const container = document.getElementById('accordionBP');
    const btnVal = document.getElementById('btnValidateAll');

    if (btnVal) {
        btnVal.disabled = true;
        btnVal.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Data..`;
        btnVal.classList.remove('btn-success', 'btn-primary', 'btn-danger');
        btnVal.classList.add('btn-secondary');
    }

    try {
        if(container) container.innerHTML = `<div class="empty-state"><div class="spinner-border text-primary" role="status"></div><p>Sinkronisasi Database...</p></div>`;
        
        console.log("Mengambil data dari Spreadsheet..."); // Debug Log

        // PERBAIKAN: Kirim 'area: "ALL"' untuk memaksa server mengirim semua data
        // agar kita bisa filter sendiri di sini. Ini mencegah data hilang karena beda nama area.
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', 
            body: JSON.stringify({ 
                action: "get_data_modal",
                area: "ALL" 
            }), 
            redirect: "follow", 
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        console.log("Respon Server:", result); // Debug Log

        if (result.result !== "success") { 
            alert("Gagal: " + result.error);
            if (btnVal) btnVal.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Error`;
            return; 
        }
        
        allRawData = result.data || [];
        console.log(`Berhasil mengambil ${allRawData.length} baris data.`); // Debug Log

        setupHeaderFilters();
        
        // Render data sesuai filter default
        if (currentRole === "BM" || currentRole === "AM" || currentRole === "RM" || currentRole === "ADMIN") {
            filterAndRenderData();
        } 

    } catch (error) {
        console.error("Fetch Error:", error);
        if(container) container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-wifi text-danger"></i><p>Gagal koneksi server.</p></div>`;
        if (btnVal) btnVal.innerHTML = `<i class="fa-solid fa-plug-circle-xmark"></i> Offline`;
    }
}

function setupHeaderFilters() {
    let filterContainer = document.getElementById('filterContainer');
    if (!filterContainer) {
        const navbar = document.querySelector('.navbar-custom .d-flex.flex-column');
        if (navbar) {
            filterContainer = document.createElement('div');
            filterContainer.id = 'filterContainer';
            filterContainer.className = 'mt-2 w-100';
            navbar.appendChild(filterContainer);
        } else {
            const header = document.querySelector('.navbar-custom');
            if(header) {
                filterContainer = document.createElement('div');
                filterContainer.id = 'filterContainer';
                filterContainer.className = 'mt-2 w-100 px-3 pb-2';
                header.appendChild(filterContainer);
            } else { return; }
        }
    }

    filterContainer.innerHTML = '';

    if (currentRole === "RM" || currentRole === "ADMIN") {
        const row = document.createElement('div');
        row.className = 'd-flex gap-2 mb-2';
        
        const selArea = document.createElement('select'); 
        selArea.id = 'selectArea'; 
        selArea.className = 'header-select flex-fill form-select form-select-sm shadow-sm';
        
        let areaOpts = `<option value="ALL">Semua Area</option>`;
        Object.keys(dataPoints).forEach(area => { 
            const isSelected = (userProfile.area && clean(area) === clean(userProfile.area)) ? "selected" : ""; 
            areaOpts += `<option value="${area}" ${isSelected}>${area}</option>`; 
        });
        selArea.innerHTML = areaOpts; 
        
        const selPoint = document.createElement('select'); 
        selPoint.id = 'selectPoint'; 
        selPoint.className = 'header-select flex-fill form-select form-select-sm shadow-sm';

        row.appendChild(selArea);
        row.appendChild(selPoint);
        filterContainer.appendChild(row);
        
        selArea.addEventListener('change', () => {
            updatePointDropdownOptions(); 
            filterAndRenderData();        
        });
        selPoint.addEventListener('change', () => {
            filterAndRenderData();        
        });
        updatePointDropdownOptions(); 

    } else if (currentRole === "AM") {
        // AM Filter: Hanya Pilih Point (Area otomatis terkunci di logic render)
        const selPoint = document.createElement('select'); 
        selPoint.id = 'selectPoint'; 
        selPoint.className = 'header-select w-100 mb-2 form-select form-select-sm shadow-sm';
        filterContainer.appendChild(selPoint);
        updatePointDropdownOptions(userProfile.area);
        selPoint.addEventListener('change', () => { filterAndRenderData(); });
    }
}

function updatePointDropdownOptions(fixedArea = null) {
    const selectPoint = document.getElementById('selectPoint'); if (!selectPoint) return;
    const selectArea = document.getElementById('selectArea');
    
    // Tentukan Area yang dipakai untuk cari point
    const selectedArea = fixedArea || (selectArea ? selectArea.value : "ALL");
    
    let availablePoints = [];
    if (selectedArea !== "ALL") { 
        if (dataPoints[selectedArea]) availablePoints = dataPoints[selectedArea]; 
    } else { 
        Object.values(dataPoints).forEach(pts => availablePoints = availablePoints.concat(pts)); 
        availablePoints.sort(); 
    }

    let pointOpts = `<option value="ALL">Semua Point</option>`;
    availablePoints.forEach(p => pointOpts += `<option value="${p}">${p}</option>`);
    
    const oldValue = selectPoint.value; 
    selectPoint.innerHTML = pointOpts;
    
    // Kembalikan ke pilihan user sebelumnya jika valid
    if (availablePoints.includes(oldValue)) selectPoint.value = oldValue;
    else if (availablePoints.includes(userProfile.point)) selectPoint.value = userProfile.point;
    else selectPoint.value = "ALL";
}

// =================================================================
// 4. RENDER DATA & UI (FILTER FLEKSIBEL)
// =================================================================

function filterAndRenderData() {
    let stats = { mm_total: 0, mm_bayar: 0, mm_kirim: 0, nc_total: 0, nc_bayar: 0, nc_kirim: 0, mm_telat: 0, nc_telat: 0 };
    let hierarchy = {}; 
    const elArea = document.getElementById('selectArea');
    const elPoint = document.getElementById('selectPoint');
    
    // Ambil Filter Pilihan User
    let filterArea = (elArea && elArea.value) ? elArea.value : (currentRole === 'AM' ? (userProfile.area || "ALL") : "ALL");
    let filterPoint = (elPoint && elPoint.value) ? elPoint.value : (currentRole === 'BM' ? (userProfile.point || "ALL") : "ALL");

    // Jika Admin/RM pilih ALL, tampilkan semua
    if (currentRole === "RM" && (!elArea || elArea.value === "ALL")) {
        filterArea = "ALL";
    }

    globalMitraList = [];
    const container = document.getElementById('accordionBP');
    if(!container) return;
    
    // Cek Data Mentah
    if (!allRawData || allRawData.length === 0) { 
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>Data dari Server Kosong.</p></div>`; 
        const btnVal = document.getElementById('btnValidateAll');
        if(btnVal) {
            btnVal.disabled = true;
            btnVal.innerHTML = `<i class="fa-solid fa-ban me-1"></i> Data Kosong`;
            btnVal.classList.remove('btn-success', 'btn-secondary', 'btn-danger');
            btnVal.classList.add('btn-primary');
        }
        return; 
    }

    let matchCount = 0;
    const todayClean = clean(currentDayName);

    allRawData.forEach(row => {
        // 1. Filter Hari (Wajib)
        const p_hari_clean = clean(row.hari || "");
        if (p_hari_clean !== todayClean) return;
        
        // 2. Filter Area & Point (Fleksibel - Two Way Includes)
        const p_area_clean = clean(row.area || "");
        const p_point_clean = clean(row.point || ""); // Menggunakan nama variabel konsisten

        if (filterArea !== "ALL") { 
            const fArea = clean(filterArea); 
            // Cek apakah Area User ada di dalam Area Excel ATAU Area Excel ada di dalam Area User
            // Contoh: "Yogya" match dengan "Area Yogyakarta"
            if (!p_area_clean.includes(fArea) && !fArea.includes(p_area_clean)) return; 
        }
        
        if (filterPoint !== "ALL") { 
            const fPoint = clean(filterPoint); 
            if (!p_point_clean.includes(fPoint) && !fPoint.includes(p_point_clean)) return; 
        }

        matchCount++;
        
        // Mapping Kolom Excel ke UI
        const p_bp = row.nama_bp || "Tanpa BP";
        const p_majelis = row.majelis || "Umum";
        const rawBucket = String(row.dpd_bucket || row.dpd || "0").trim();
        const st_bayar = row.status || "Belum";
        const st_kirim = row.status_kirim || "Belum";
        const p_jenis = row.jenis_pembayaran || "-";
        const st_bll = row.status_bll || "-";
        const val_data_o = row.data_o || "-";
        const val_last_pay = row.last_payment_date || "-"; 

        const isLunas = st_bayar.toLowerCase().includes("lunas") || st_bayar.toLowerCase().includes("bayar");
        const isTerkirim = st_kirim.toLowerCase().includes("terkirim") || st_kirim.toLowerCase().includes("sudah");
        const bucketNum = parseInt(rawBucket);
        const isCurrent = rawBucket.toLowerCase().includes("current") || rawBucket.toLowerCase().includes("lancar") || (!isNaN(bucketNum) && bucketNum <= 1);

        // Statistik
        if (isCurrent) { 
            stats.mm_total++; 
            if (isLunas) stats.mm_bayar++; else stats.mm_telat++;
            if (isTerkirim) stats.mm_kirim++; 
        } else { 
            stats.nc_total++; 
            if (isLunas) stats.nc_bayar++; else stats.nc_telat++;
            if (isTerkirim) stats.nc_kirim++; 
        }

        const mitraData = {
            id: String(row.cust_no).trim(), 
            nama: row.mitra,
            status_bayar: st_bayar, 
            status_kirim: st_kirim, 
            jenis_bayar: p_jenis,
            bucket: rawBucket, 
            alasan: "", 
            is_lunas: isLunas, 
            is_terkirim: isTerkirim,
            bp: p_bp, 
            majelis: p_majelis,
            status_bll: st_bll,
            data_o: val_data_o,
            tgl_bayar_terakhir: val_last_pay 
        };
        globalMitraList.push(mitraData);
        
        if (!hierarchy[p_bp]) hierarchy[p_bp] = {};
        if (!hierarchy[p_bp][p_majelis]) hierarchy[p_bp][p_majelis] = [];
        hierarchy[p_bp][p_majelis].push(mitraData);
    });

    currentStats.total = stats.mm_total + stats.nc_total;
    currentStats.telat = stats.mm_telat + stats.nc_telat;
    currentStats.bayar = stats.mm_bayar + stats.nc_bayar;

    renderStats(stats);

    if (matchCount === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>Data kosong untuk <b>${currentDayName}</b><br><small>Area: ${filterArea}, Point: ${filterPoint}</small></p></div>`;
        const btnVal = document.getElementById('btnValidateAll');
        if(btnVal) {
            btnVal.disabled = true;
            btnVal.innerHTML = `<i class="fa-solid fa-ban me-1"></i> Data Kosong`;
            btnVal.classList.remove('btn-success', 'btn-secondary', 'btn-danger');
            btnVal.classList.add('btn-primary');
        }
    } else {
        renderAccordion(hierarchy);
        updateGlobalValidationStatus(); 
        
        if (isPageLocked) {
            applyLockMode(lockOwner);
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

    Object.keys(hierarchy).sort().forEach((bpName, bpIndex) => {
        let majelisHtml = "";
        const majelisObj = hierarchy[bpName];
        Object.keys(majelisObj).sort().forEach((majName, majIndex) => {
            const mitraList = majelisObj[majName];
            let checkedCount = 0; let hasNewUpdate = false;
            
            mitraList.forEach(m => { 
                const safeKey = String(m.id).replace(/[.#$/[\]]/g, "_");
                const saved = draftData[safeKey] || {}; 
                if (saved.checked) checkedCount++; 
                if (m.is_terkirim) hasNewUpdate = true; 
            });

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
    const safeKey = String(mitra.id).replace(/[.#$/[\]]/g, "_");
    const savedData = draftData[safeKey] || {};
    
    const isChecked = savedData.checked ? "checked" : "";
    const savedReason = savedData.reason || ""; 
    const savedDay = savedData.day || ""; 

    const jenisBayar = String(mitra.jenis_bayar).toUpperCase().trim();
    const statusText = String(mitra.status_bayar).toLowerCase();
    const isStatusBayar = statusText.includes("bayar") || statusText.includes("lunas");
    const isStatusTelat = !isStatusBayar; 

    const isJenisNormal = jenisBayar === "NORMAL";
    const isJB = jenisBayar === "JB";
    const isTerkirim = mitra.is_terkirim;

    const isValidationLocked = (isStatusTelat && isJenisNormal) || !isTerkirim;
    const lockedClass = isValidationLocked ? "disabled" : "";
    const lockedAttr = isValidationLocked ? "" : `onclick="toggleValidation(this, '${mitra.id}')"`;
    
    const isNonNormal = ["PAR", "PARTIAL", "PAR PAYMENT"].includes(jenisBayar);
    const isNormalLateAndSent = (isStatusTelat && isTerkirim && isJenisNormal);
    const isMandatoryReason = isNonNormal || isNormalLateAndSent;

    const cardStatusClass = isStatusBayar ? "card-lunas" : (isTerkirim ? "card-normal" : "card-telat");
    const badgeBayarClass = isStatusBayar ? "badge-success" : "badge-danger";
    const badgeKirimClass = isTerkirim ? "badge-success" : "badge-warning";
    const badgeJenisClass = "badge-info";

    let bucketText = (mitra.bucket == "0" || String(mitra.bucket).toLowerCase().includes("current")) ? "Lancar" : `DPD: ${mitra.bucket}`;
    let badgeBucketClass = (mitra.bucket == "0" || String(mitra.bucket).toLowerCase().includes("current")) ? "badge-info" : "badge-warning";

    let bllText = (mitra.status_bll || "").trim();
    let bllBadgeHtml = "";
    if (bllText && bllText !== "-" && bllText.toLowerCase() !== "null") {
        bllBadgeHtml = `<span class="badge-pill badge-purple">${bllText}</span>`;
    }

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

    let badgeLastPay = "";
    if (mitra.tgl_bayar_terakhir && mitra.tgl_bayar_terakhir !== "-" && mitra.tgl_bayar_terakhir !== "" && String(mitra.tgl_bayar_terakhir).toLowerCase() !== "null") {
        let labelTglBayar = mitra.tgl_bayar_terakhir;
        try {
            const dateObj = new Date(mitra.tgl_bayar_terakhir);
            if (!isNaN(dateObj)) {
                labelTglBayar = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}`;
            }
        } catch(e){}
        badgeLastPay = `<span class="badge-pill badge-success" title="Terakhir Bayar"><i class="fa-solid fa-clock-rotate-left me-1"></i>${labelTglBayar}</span>`;
    }

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
                    ${badgeLastPay} </div>
                
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

// =================================================================
// 5. USER INTERACTIONS
// =================================================================

window.saveReasonInput = function(id, reason, day) {
    if (isPageLocked) return;
    const btn = document.querySelector(`#btn-${id}`);
    const safeKey = String(id).replace(/[.#$/[\]]/g, "_");
    const existing = draftData[safeKey] || {};
    
    const currentReason = reason !== undefined ? reason : (existing.reason || "");
    const currentDay = day !== undefined ? day : (existing.day || "");
    const isChecked = btn && btn.classList.contains('checked');
    
    saveToStorage(id, isChecked, currentReason, currentDay);
};

window.toggleValidation = function(element, id) {
    if (isPageLocked || element.classList.contains('disabled')) return;
    const daySelect = document.getElementById(`day-${id}`);
    const inputReason = document.getElementById(`validasi-${id}`);

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

// --- FUNGSI UPDATE JB KE SERVER ---
async function updateJBDaysToServer() {
    const updates = [];
    globalMitraList.forEach(m => {
        const safeKey = String(m.id).replace(/[.#$/[\]]/g, "_");
        const stored = draftData[safeKey];
        const isJB = String(m.jenis_bayar).toUpperCase() === "JB";
        
        if (isJB && stored && stored.checked && stored.day) {
            updates.push({ 
                customerNumber: String(m.id).trim(), 
                hariBaru: stored.day 
            });
        }
    });

    if (updates.length === 0) return true; // Tidak ada yang perlu diupdate
    
    const btn = document.getElementById('btnValidateAll');
    if(btn) btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Update ${updates.length} JB...`;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', 
            body: JSON.stringify({ action: "batch_update_jb", items: updates }),
            redirect: "follow", 
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        
        const result = await response.json();
        if (result.result === "success") {
            return true;
        } else {
            alert("Gagal Update JB: " + result.error);
            return false;
        }
    } catch (err) {
        console.error("Gagal JB:", err);
        alert("Kesalahan koneksi saat update JB.");
        return false;
    }
}

async function sendClosingSummary() {
    const btn = document.getElementById('btnValidateAll');
    if(btn) btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up fa-spin me-1"></i> Mengirim Rekap...`;

    const elArea = document.getElementById('selectArea');
    const elPoint = document.getElementById('selectPoint');
    const areaName = (elArea && elArea.value !== "ALL") ? elArea.value : userProfile.area;
    const pointName = (elPoint && elPoint.value !== "ALL") ? elPoint.value : userProfile.point;

    const payload = {
        action: "closing_summary",
        area: areaName,
        point: pointName,
        totalAkun: currentStats.total,
        totalTelat: currentStats.telat,
        totalBayar: currentStats.bayar
    };

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST', 
            body: JSON.stringify(payload),
            redirect: "follow", 
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
    } catch (err) {
        console.error("Gagal kirim rekap:", err);
    }
}

function applyLockMode(lockedBy = "Admin") {
    const btnValAll = document.getElementById('btnValidateAll');
    const canUnlock = ["RM", "ADMIN"].includes(currentRole) || userProfile.idKaryawan === ADMIN_ID;

    if(btnValAll) {
        if (canUnlock) {
            btnValAll.disabled = false;
            btnValAll.innerHTML = `<i class="fa-solid fa-lock-open me-1"></i> Buka Kunci (Locked by ${lockedBy})`;
            btnValAll.classList.remove('btn-primary', 'btn-success', 'btn-secondary');
            btnValAll.classList.add('btn-danger');
            btnValAll.onclick = window.unlockGlobalStatus; 
        } else {
            btnValAll.disabled = true;
            btnValAll.innerHTML = `<i class="fa-solid fa-lock me-1"></i> Terkunci oleh ${lockedBy}`;
            btnValAll.classList.replace('btn-primary', 'btn-secondary');
            btnValAll.classList.remove('btn-success', 'btn-danger');
        }
    }
    document.querySelectorAll('.btn-check-action').forEach(b => b.classList.add('disabled'));
    document.querySelectorAll('input, select').forEach(i => i.disabled = true);
}

function releaseLockMode() {
    if(!isPageLocked) {
        const btnValAll = document.getElementById('btnValidateAll');
        const totalMitra = document.querySelectorAll('.btn-check-action').length;
        const checkedMitra = document.querySelectorAll('.btn-check-action.checked').length;

        if(btnValAll) {
            if (btnValAll.onclick) btnValAll.onclick = null; 
            btnValAll.classList.remove('btn-secondary', 'btn-danger');

            if (totalMitra > 0 && totalMitra === checkedMitra) {
                btnValAll.disabled = false; 
                btnValAll.classList.remove('btn-primary');
                btnValAll.classList.add('btn-success');
                btnValAll.innerHTML = `<i class="fa-solid fa-file-arrow-down me-1"></i> Selesai & Download`;
            } else if (totalMitra > 0) {
                btnValAll.disabled = true;
                btnValAll.classList.remove('btn-success');
                btnValAll.classList.add('btn-primary');
                btnValAll.innerHTML = `<i class="fa-solid fa-calendar-check me-1"></i> Selesaikan ${totalMitra - checkedMitra} Lagi`;
            } else {
                btnValAll.disabled = true;
                btnValAll.classList.add('btn-primary');
                if (!btnValAll.innerHTML.includes("spin")) {
                    btnValAll.innerHTML = `<i class="fa-solid fa-ban me-1"></i> Data Kosong`;
                }
            }
        }
        
        const allChecks = document.querySelectorAll('.btn-check-action');
        allChecks.forEach(btn => {
            if(btn.getAttribute('onclick')) {
                 btn.classList.remove('disabled');
            }
        });

        const allInputs = document.querySelectorAll('input.input-modern, select');
        allInputs.forEach(inp => inp.disabled = false);
    }
}

function updateGlobalValidationStatus() {
    if (isPageLocked) return;
    const totalMitra = document.querySelectorAll('.btn-check-action').length;
    const checkedMitra = document.querySelectorAll('.btn-check-action.checked').length;
    
    const btnValAll = document.getElementById('btnValidateAll');
    if(btnValAll) {
        if (totalMitra > 0 && checkedMitra === totalMitra) {
            btnValAll.disabled = false;
            btnValAll.innerHTML = `<i class="fa-solid fa-file-arrow-down me-1"></i> Selesai & Download`; 
            btnValAll.classList.remove('btn-primary', 'btn-secondary');
            btnValAll.classList.add('btn-success'); 
        } else if (totalMitra > 0) {
            btnValAll.disabled = true;
            btnValAll.innerHTML = `<i class="fa-solid fa-hourglass-half me-1"></i> Selesaikan ${totalMitra - checkedMitra} Lagi`;
            btnValAll.classList.remove('btn-success', 'btn-secondary');
            btnValAll.classList.add('btn-primary');
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
    updateGlobalValidationStatus();
}

function downloadCSV() {
    if (globalMitraList.length === 0) return alert("Data kosong.");
    let csvContent = "ID Mitra,Nama Mitra,BP,Majelis,Status Bayar,Status Kirim,Status BLL,Jenis Bayar,Hari Baru (JB),DPD Bucket,Keterangan\n";
    globalMitraList.forEach(m => {
        const safeKey = String(m.id).replace(/[.#$/[\]]/g, "_");
        const stored = draftData[safeKey] || {};
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

// =================================================================
// 6. MAIN EVENT LISTENER
// =================================================================
document.addEventListener("DOMContentLoaded", () => {
    const btnValAll = document.getElementById('btnValidateAll');
    
    if(btnValAll) {
        btnValAll.disabled = true;
        
        btnValAll.addEventListener('click', async () => {
            if(!confirm("VALIDASI & DOWNLOAD?\n\nPERINGATAN:\n1. Update Hari JB ke Server.\n2. Laporan TERKUNCI untuk semua user.")) {
                return;
            }

            // UI Loading
            const originalBtnText = btnValAll.innerHTML;
            btnValAll.disabled = true;
            btnValAll.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;

            try {
                // 1. UPDATE JB KE SERVER
                const isJbSuccess = await updateJBDaysToServer();

                if (!isJbSuccess) {
                    btnValAll.disabled = false;
                    btnValAll.innerHTML = originalBtnText;
                    return; 
                }

                // 2. KIRIM REKAP
                await sendClosingSummary();

                // 3. DOWNLOAD CSV
                downloadCSV();

                // 4. KUNCI HALAMAN
                setGlobalLock(true);
                
                // 5. SELESAI
                alert("Berhasil! Data JB terupdate dan Laporan Terkirim.");
                location.reload(); 

            } catch (error) {
                console.error("Critical Error:", error);
                alert("Terjadi kesalahan fatal. Cek konsol.");
                btnValAll.disabled = false;
                btnValAll.innerHTML = originalBtnText;
            }
        });
    }
});
