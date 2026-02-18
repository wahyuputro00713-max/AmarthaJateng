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

// =========================================================================
// URL DEPLOYMENT GOOGLE APPS SCRIPT
// PASTIKAN INI ADALAH URL DARI DEPLOY TERBARU (New Deployment)
// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-MCecdv6l5xITTH7B3SZ0a3N65EC36v4lDUSCqwcI-b3gWHfnodYtN1gPZO_NfzQ/exec";

// State Management
let globalData = [];
let userProfile = { idKaryawan: "Guest", area: "", point: "" };
let isTransactionActive = false; // Mencegah double submit

// DOM Elements
const els = {
    filterArea: document.getElementById('filterArea'),
    filterPoint: document.getElementById('filterPoint'),
    filterBP: document.getElementById('filterBP'),
    filterHari: document.getElementById('filterHari'),
    btnTampilkan: document.getElementById('btnTampilkan'),
    majelisContainer: document.getElementById('majelisContainer'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    emptyState: document.getElementById('emptyState'),
    lblTotalMajelis: document.getElementById('totalMajelis'),
    lblTotalMitra: document.getElementById('totalMitra')
};

// 1. ENTRY POINT
onAuthStateChanged(auth, async (user) => {
    if (user) {
        showLoading(true);
        try {
            // Ambil profil user untuk ID Karyawan & Area default
            userProfile = await fetchUserProfile(user.uid);
            
            // Load data awal berdasarkan area user
            globalData = await fetchMainData(userProfile.area);
            
            // Siapkan filter dan render data
            initializeFilters();
            renderGroupedData(globalData);
        } catch (error) {
            console.error("Error init:", error);
            alert("Gagal memuat data. Silakan refresh.");
        } finally {
            showLoading(false);
        }
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fetch User Profile
async function fetchUserProfile(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (snapshot.exists()) {
            const val = snapshot.val();
            // Pastikan field idKaryawan ada, jika tidak pakai uid atau placeholder
            return {
                idKaryawan: val.idKaryawan || val.nik || "Unknown", 
                area: val.area || "",
                point: val.point || ""
            };
        }
        return { idKaryawan: "Unknown", area: "", point: "" };
    } catch (err) {
        console.warn("User profile fetch fail", err);
        return { idKaryawan: "Unknown", area: "", point: "" };
    }
}

// 3. Fetch Data Utama (Hit ke handleGetData di Apps Script)
async function fetchMainData(reqArea) {
    try {
        const payload = {
            action: "get_data_modal",
            reqArea: reqArea || ""
        };
        
        // Gunakan no-cors jika hanya testing, tapi untuk data JSON butuh cors normal
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            // Header text/plain penting agar tidak kena preflight options CORS Google
            headers: { "Content-Type": "text/plain;charset=utf-8" } 
        });
        
        const result = await response.json();
        
        if (result.result === "success" && Array.isArray(result.data)) {
            return result.data;
        } else {
            console.warn("Data kosong atau format salah", result);
            return [];
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

// 4. Filters & Dropdown Logic
function initializeFilters() {
    populateFilters(globalData);

    // Set Default Area dari User Profile
    if (userProfile.area && els.filterArea) {
        els.filterArea.value = userProfile.area;
        updatePointDropdown(userProfile.area);

        // Set Default Point jika ada
        if (userProfile.point && els.filterPoint) {
            // Cek apakah point user ada di opsi
            const pointExists = [...els.filterPoint.options].some(o => o.value === userProfile.point);
            if (pointExists) els.filterPoint.value = userProfile.point;
        }
        updateBPDropdown();
    }

    // Auto select Hari ini
    if (els.filterHari) {
        const daysMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const todayName = daysMap[new Date().getDay()];
        const dayOptionExists = [...els.filterHari.options].some(o => o.value === todayName);
        if (dayOptionExists) els.filterHari.value = todayName;
    }
}

function populateFilters(data) {
    if (!els.filterArea) return;
    // Ambil unique Area
    let areas = [...new Set(data.map(i => i.area).filter(i => i && i !== "-"))];
    if (userProfile.area && !areas.includes(userProfile.area)) areas.push(userProfile.area);
    areas.sort();
    fillSelect(els.filterArea, areas);
}

function updatePointDropdown(selectedArea) {
    if (!els.filterPoint) return;
    const relevant = selectedArea ? globalData.filter(i => i.area === selectedArea) : globalData;
    const points = [...new Set(relevant.map(i => i.point).filter(i => i && i !== "-"))].sort();
    fillSelect(els.filterPoint, points);
}

function updateBPDropdown() {
    if (!els.filterBP) return;
    const selectedArea = els.filterArea.value;
    const selectedPoint = els.filterPoint.value;

    let relevant = globalData;
    if (selectedArea) relevant = relevant.filter(i => i.area === selectedArea);
    if (selectedPoint) relevant = relevant.filter(i => i.point === selectedPoint);

    const bps = [...new Set(relevant.map(i => i.nama_bp).filter(i => i && i !== "-"))].sort();
    fillSelect(els.filterBP, bps);
}

// Event Listeners Filter
if (els.filterArea) {
    els.filterArea.addEventListener('change', async () => {
        const newArea = els.filterArea.value;
        // Cek apakah data area tersebut sudah ada di globalData? 
        // Karena globalData awal mungkin cuma 1 area. Jika pindah area, fetch baru.
        const hasData = globalData.some(i => i.area === newArea);

        if (!hasData && newArea !== "") {
            showLoading(true);
            try {
                const newData = await fetchMainData(newArea);
                // Kita replace globalData atau append? 
                // Agar tidak berat, replace saja jika pindah area jauh.
                globalData = newData; 
                
                // Reset child filters
                if (els.filterPoint) els.filterPoint.value = "";
                if (els.filterBP) els.filterBP.value = "";
                
                populateFilters(globalData); // Refresh list area biar sync
                els.filterArea.value = newArea; // Keep selection
                updatePointDropdown(newArea);
                updateBPDropdown();
                renderGroupedData(globalData);

            } catch (e) {
                alert("Gagal mengambil data area baru.");
            } finally {
                showLoading(false);
            }
        } else {
            // Data sudah ada, cukup update dropdown
            if (els.filterPoint) els.filterPoint.value = "";
            if (els.filterBP) els.filterBP.value = "";
            updatePointDropdown(els.filterArea.value);
            updateBPDropdown();
        }
    });
}

if (els.filterPoint) {
    els.filterPoint.addEventListener('change', () => {
        if (els.filterBP) els.filterBP.value = "";
        updateBPDropdown();
    });
}

function fillSelect(el, items) {
    const current = el.value;
    const fragment = document.createDocumentFragment();
    const defaultOpt = el.options[0].cloneNode(true);
    fragment.appendChild(defaultOpt);
    items.forEach(i => {
        const opt = document.createElement('option');
        const val = i || "";
        opt.value = val;
        opt.textContent = val;
        fragment.appendChild(opt);
    });
    el.innerHTML = "";
    el.appendChild(fragment);
    if (items.includes(current)) el.value = current;
}

// 5. RENDER UI UTAMA
function renderGroupedData(data) {
    const fArea = els.filterArea ? els.filterArea.value.toLowerCase() : "";
    const fPoint = els.filterPoint ? els.filterPoint.value.toLowerCase() : "";
    const fHari = els.filterHari ? els.filterHari.value.toLowerCase() : "";
    const fBP = els.filterBP ? els.filterBP.value : "";

    // Filtering Client Side
    const filtered = data.filter(item => {
        if (fArea && String(item.area).toLowerCase() !== fArea) return false;
        if (fPoint && String(item.point).toLowerCase() !== fPoint) return false;
        if (fHari && String(item.hari).toLowerCase() !== fHari) return false;
        if (fBP && item.nama_bp !== fBP) return false;
        return true;
    });

    // Empty State
    if (filtered.length === 0) {
        els.majelisContainer.innerHTML = "";
        els.emptyState.classList.remove('d-none');
        els.lblTotalMajelis.innerText = "Total: 0";
        els.lblTotalMitra.innerText = "0 Mitra";
        return;
    }

    els.emptyState.classList.add('d-none');

    // Grouping by Majelis
    const grouped = {};
    filtered.forEach(item => {
        const m = item.majelis || "Tanpa Majelis";
        if (!grouped[m]) grouped[m] = [];
        grouped[m].push(item);
    });

    const majelisKeys = Object.keys(grouped).sort();
    els.lblTotalMajelis.innerText = `Total: ${majelisKeys.length} Majelis`;
    els.lblTotalMitra.innerText = `${filtered.length} Mitra`;

    const htmlContent = majelisKeys.map((majelis, index) => {
        const mitras = grouped[majelis];
        const bpName = mitras[0].nama_bp || "-";
        const safeNamaBP = bpName.replace(/'/g, "\\'");

        let countBayar = 0, countTelat = 0, countSudahKirim = 0, countBelumKirim = 0;

        mitras.forEach(m => {
            const statusBayar = String(m.status || "").toLowerCase();
            const statusKirim = String(m.status_kirim || "").toLowerCase().trim();

            let isSent = (statusKirim === "sudah" || statusKirim === "sudah terkirim" || statusKirim === "terkirim");

            if (statusBayar.includes('telat')) countTelat++;
            else countBayar++; // Kosong/Lancar dianggap bayar

            if (isSent) countSudahKirim++;
            else countBelumKirim++;
        });

        const rowsHtml = mitras.map(m => createRowHtml(m, safeNamaBP)).join('');

        return `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                        <div class="d-flex flex-column w-100">
                            <div class="d-flex justify-content-between align-items-center w-100 pe-2">
                                <span class="fw-bold text-dark"><i class="fa-solid fa-users me-2 text-primary"></i>${majelis}</span>
                                <span class="majelis-badge">${mitras.length} Org</span>
                            </div>
                            <small class="text-muted fw-normal mt-1 mb-1" style="font-size: 11px;">BP: ${bpName}</small>
                            <div class="stats-row">
                                <span class="mini-stat stat-bayar"><i class="fa-solid fa-check-circle"></i> Bayar: ${countBayar}</span>
                                <span class="mini-stat stat-telat"><i class="fa-solid fa-circle-xmark"></i> Telat: ${countTelat}</span>
                                <span class="mini-stat stat-sent"><i class="fa-solid fa-paper-plane"></i> Selesai: ${countSudahKirim}</span>
                                ${(countBelumKirim > 0) ? `<span class="mini-stat stat-unsent"><i class="fa-regular fa-clock"></i> Belum: ${countBelumKirim}</span>` : ''}
                            </div>
                        </div>
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse" data-bs-parent="#majelisContainer">
                    <div class="accordion-body p-0">
                        <table class="table table-striped table-mitra mb-0 w-100">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-3" style="width: 10px;">#</th>
                                    <th>Mitra</th>
                                    <th>Tagihan</th>
                                    <th class="text-end pe-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    els.majelisContainer.innerHTML = htmlContent;
}

// 6. HELPER: CREATE ROW HTML
function createRowHtml(m, safeNamaBP) {
    const rawMitra = m.mitra || "";
    const rawCustNo = m.cust_no || "-";
    const safeMitra = rawMitra.replace(/'/g, "\\'");

    // Status Bayar Visual
    const rawStatus = String(m.status || "").trim();
    const statusLower = rawStatus.toLowerCase();
    const displayStatus = (rawStatus === "" || rawStatus === "-") ? "Lancar" : rawStatus;
    const badgeClass = statusLower.includes("telat") ? "text-danger" : "text-success";

    // Status Kirim Logic
    const statusKirim = String(m.status_kirim || "").toLowerCase().trim();
    let isSent = (statusKirim === "sudah" || statusKirim === "sudah terkirim" || statusKirim === "terkirim");

    const isBll = (m.status_bll === "BLL");
    const bllBadge = isBll ? '<span class="badge-bll">BLL</span>' : '';

    const valAngsuran = formatRupiah(m.angsuran);
    const valPartial = formatRupiah(m.partial);

    const selectId = `select-${rawCustNo}`;
    const btnId = `btn-${rawCustNo}`;
    const rowId = `row-wrapper-${rawCustNo}`;

    let actionHtml;

    if (isSent) {
        actionHtml = `
            <div class="d-flex flex-column align-items-end">
                <span class="badge bg-success rounded-pill">
                    <i class="fa-solid fa-check"></i> Terkirim
                </span>
                <div style="font-size: 9px; color: #666; margin-top:2px;">${m.jenis_pembayaran || "Normal"}</div>
            </div>
        `;
    } else {
        actionHtml = `
            <div class="d-flex justify-content-end align-items-center gap-1" id="${rowId}">
                <select id="${selectId}" class="form-select form-select-sm" 
                    style="width: 90px; font-size: 11px;"
                    onchange="window.enableSendButton('${btnId}', this)">
                    <option value="" selected disabled>Pilih...</option>
                    <option value="Normal">Normal</option>
                    <option value="PAR">PAR</option>
                    <option value="Partial">Partial</option>
                    <option value="Par Payment">Par Pay</option>
                    <option value="JB">JB</option> 
                    <option value="Lunas">Lunas</option> 
                </select>
                <button id="${btnId}" class="btn btn-primary btn-sm px-2 py-1" disabled
                    onclick="window.kirimPerMitra('${rawCustNo}', '${safeMitra}', '${safeNamaBP}', '${selectId}', '${btnId}', '${rowId}')">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        `;
    }

    let statusIcon = isSent 
        ? `<i class="fa-solid fa-circle-check text-success"></i>` 
        : `<i class="fa-regular fa-circle text-muted"></i>`;

    return `
        <tr>
            <td class="ps-3 align-middle text-center" style="font-size: 12px;">
                ${statusIcon}
            </td>
            <td class="align-middle">
                <span class="mitra-name">${rawMitra} ${bllBadge}</span>
                <div style="font-size: 10px;" class="text-muted"><i class="fa-regular fa-id-card me-1"></i>${rawCustNo}</div>
                <div class="${badgeClass} fw-bold" style="font-size: 10px;">${displayStatus}</div>
            </td>
            <td class="align-middle">
                <div class="nominal-text">${valAngsuran}</div>
                ${valPartial !== '-' ? `<div class="nominal-text text-danger" style="font-size:9px">Part: ${valPartial}</div>` : ''}
            </td>
            <td class="text-end align-middle pe-3">
                ${actionHtml}
            </td>
        </tr>
    `;
}

// Utilities
const formatRupiah = (val) => {
    if (!val || val === "0" || val === "-") return "-";
    const cleanVal = String(val).replace(/[^0-9]/g, '');
    if (!cleanVal) return "-";
    return "Rp " + parseInt(cleanVal).toLocaleString('id-ID');
};

function showLoading(show) {
    if (els.loadingOverlay) {
        if (show) els.loadingOverlay.classList.remove('d-none');
        else els.loadingOverlay.classList.add('d-none');
    }
}

if (els.btnTampilkan) {
    els.btnTampilkan.addEventListener('click', () => {
        showLoading(true);
        setTimeout(() => {
            renderGroupedData(globalData);
            showLoading(false);
        }, 50);
    });
}

// =========================================================================
// LOGIKA BARU: KIRIM PER MITRA (Compatible with New Code.gs)
// =========================================================================

window.enableSendButton = function(btnId, selectEl) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.disabled = (selectEl.value === "");
    }
}

window.kirimPerMitra = async function(custNo, namaMitra, namaBP, selectId, btnId, rowId) {
    if (isTransactionActive) {
        alert("⚠️ Tunggu transaksi sebelumnya selesai.");
        return;
    }

    const selectEl = document.getElementById(selectId);
    const jnsBayar = selectEl ? selectEl.value : "";
    const btn = document.getElementById(btnId);

    if (!jnsBayar) {
        alert("Pilih jenis pembayaran dulu!");
        return;
    }

    if (!confirm(`Kirim data untuk ${namaMitra} sebagai ${jnsBayar}?`)) return;

    isTransactionActive = true;

    // UI Feedback: Loading State
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    btn.disabled = true;
    selectEl.disabled = true;

    try {
        // PERHATIKAN: Nama key disini harus sama persis dengan yang diambil di Code.gs
        // Code.gs: params.customerNumber, params.idKaryawan, params.namaBP, params.jenisPembayaran
        const payload = {
            action: "input_laporan",
            idKaryawan: userProfile.idKaryawan || "Unknown",
            namaBP: namaBP,
            customerNumber: custNo,
            jenisPembayaran: jnsBayar
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === 'success') {
            // --- UPDATE DATA LOKAL (PENTING) ---
            // Karena backend tidak mengupdate status di spreadsheet sumber (Repayment),
            // kita harus update di globalData agar UI berubah jadi 'Terkirim'.
            const idx = globalData.findIndex(item => String(item.cust_no) === String(custNo));
            if (idx !== -1) {
                globalData[idx].status_kirim = "Sudah";
                globalData[idx].jenis_pembayaran = jnsBayar;
            }

            // Update Tampilan Baris Langsung (Tanpa Reload Semuanya)
            const wrapper = document.getElementById(rowId);
            if (wrapper) {
                // Ganti tombol dengan Badge Sukses
                wrapper.parentElement.innerHTML = `
                    <div class="d-flex flex-column align-items-end animate__animated animate__fadeIn">
                        <span class="badge bg-success rounded-pill">
                            <i class="fa-solid fa-check"></i> Terkirim
                        </span>
                        <div style="font-size: 9px; color: #666; margin-top:2px;">${jnsBayar}</div>
                    </div>
                `;
                
                // Opsional: Update Icon status di kolom kiri (kolom pertama)
                // Ini agak tricky karena harus naik ke parent TR, tapi bisa dilewatkan 
                // jika user tidak terlalu memperhatikan icon bulat kecil.
                const tr = wrapper.closest('tr');
                if(tr) {
                    const firstTd = tr.cells[0];
                    firstTd.innerHTML = `<i class="fa-solid fa-circle-check text-success animate__animated animate__heartBeat"></i>`;
                }
            }
        } else {
            throw new Error(result.error || "Gagal menyimpan");
        }

    } catch (error) {
        console.error(error);
        alert(`Gagal mengirim data ${namaMitra}. Silakan coba lagi.\nError: ${error.message}`);
        
        // Restore Tombol jika gagal
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
        selectEl.disabled = false;
    } finally {
        isTransactionActive = false;
    }
};
