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
// PASTIKAN URL INI ADALAH DEPLOYMENT TERBARU DARI CODE.GS
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbynQOdD2iePdOg07iDSk-i8vN-tbKgcAPisjkMfBlG07NnDLZbP0N_jxWPxOz0SKxnm/exec"; 
// =========================================================================

// State Management
let globalData = [];
let userProfile = { idKaryawan: "", area: "", point: "" };

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
            userProfile = await fetchUserProfile(user.uid);
            globalData = await fetchMainData(userProfile.area);
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
        if (snapshot.exists()) return snapshot.val();
        return { idKaryawan: "Unknown", area: "", point: "" };
    } catch (err) {
        return { idKaryawan: "Unknown", area: "", point: "" };
    }
}

// 3. Fetch Data Utama
async function fetchMainData(reqArea) {
    try {
        const payload = { 
            action: "get_data_modal",
            reqArea: reqArea || "" 
        };
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        if (result.result === "success" && Array.isArray(result.data)) {
            return result.data;
        } else {
            return [];
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

// 4. Filters & Dropdown
function initializeFilters() {
    populateFilters(globalData);

    if (userProfile.area && els.filterArea) {
        els.filterArea.value = userProfile.area; 
        updatePointDropdown(userProfile.area);
        
        if (userProfile.point && els.filterPoint) {
            const pointExists = [...els.filterPoint.options].some(o => o.value === userProfile.point);
            if(pointExists) els.filterPoint.value = userProfile.point;
        }
        updateBPDropdown();
    }

    if (els.filterHari) {
        const daysMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const todayName = daysMap[new Date().getDay()];
        const dayOptionExists = [...els.filterHari.options].some(o => o.value === todayName);
        if (dayOptionExists) els.filterHari.value = todayName;
    }
}

function populateFilters(data) {
    if (!els.filterArea) return;
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

// Event Listeners
if(els.filterArea) {
    els.filterArea.addEventListener('change', async () => {
        const newArea = els.filterArea.value;
        const hasData = globalData.some(i => i.area === newArea);
        
        if (!hasData && newArea !== "") {
            showLoading(true);
            try {
                const newData = await fetchMainData(newArea);
                globalData = newData;
                renderGroupedData(globalData);
                
                if(els.filterPoint) els.filterPoint.value = ""; 
                if(els.filterBP) els.filterBP.value = "";        
                updatePointDropdown(newArea);
                updateBPDropdown();
            } catch(e) {
                alert("Gagal ambil data area baru.");
            } finally {
                showLoading(false);
            }
        } else {
            if(els.filterPoint) els.filterPoint.value = ""; 
            if(els.filterBP) els.filterBP.value = "";        
            updatePointDropdown(els.filterArea.value);
            updateBPDropdown();
        }
    });
}

if(els.filterPoint) {
    els.filterPoint.addEventListener('change', () => {
        if(els.filterBP) els.filterBP.value = "";        
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
    if(items.includes(current)) el.value = current;
}

// 5. RENDER DATA
function renderGroupedData(data) {
    const fArea = els.filterArea ? els.filterArea.value.toLowerCase() : "";
    const fPoint = els.filterPoint ? els.filterPoint.value.toLowerCase() : "";
    const fHari = els.filterHari ? els.filterHari.value.toLowerCase() : "";
    const fBP = els.filterBP ? els.filterBP.value : ""; 

    const filtered = data.filter(item => {
        if (fArea && String(item.area).toLowerCase() !== fArea) return false;
        if (fPoint && String(item.point).toLowerCase() !== fPoint) return false;
        if (fHari && String(item.hari).toLowerCase() !== fHari) return false;
        if (fBP && item.nama_bp !== fBP) return false;
        return true;
    });

    if (filtered.length === 0) {
        els.majelisContainer.innerHTML = "";
        els.emptyState.classList.remove('d-none');
        els.lblTotalMajelis.innerText = "Total: 0";
        els.lblTotalMitra.innerText = "0 Mitra";
        return;
    }

    els.emptyState.classList.add('d-none');

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
        
        let countBayar = 0, countTelat = 0, countSudahKirim = 0, countBelumKirim = 0;

        mitras.forEach(m => {
            const statusBayar = String(m.status || "").toLowerCase();
            const statusKirim = String(m.status_kirim || "").toLowerCase();
            
            // --- PERBAIKAN LOGIKA HITUNGAN STATISTIK ---
            // Hanya dihitung terkirim jika mengandung kata 'terkirim'
            // atau 'sudah' TAPI BUKAN 'sudah bayar'
            const isSent = statusKirim.includes('terkirim') || (statusKirim.includes('sudah') && !statusKirim.includes('bayar'));

            if(statusBayar === 'telat') countTelat++;
            else countBayar++; 

            if(isSent) countSudahKirim++;
            else countBelumKirim++;
        });

        const rowsHtml = mitras.map(m => createRowHtml(m)).join('');

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
                                <span class="mini-stat stat-sent"><i class="fa-solid fa-paper-plane"></i> Terkirim: ${countSudahKirim}</span>
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
                                    <th class="ps-3">Mitra</th>
                                    <th>Tagihan</th>
                                    <th class="text-center">Status</th>
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

// 6. HELPER: CREATE ROW HTML (BAGIAN YG DIPERBAIKI)
function createRowHtml(m) {
    // PROTEKSI DATA: Pakai String(...) || "" agar tidak error undefined
    const rawNamaBP = m.nama_bp || "";
    // m.mitra adalah key dari Code.gs
    const rawMitra = m.mitra || "";
    // m.cust_no adalah key dari Code.gs
    const rawCustNo = m.cust_no || "-";
    
    const statusBayar = String(m.status || "").toLowerCase();
    const statusKirim = String(m.status_kirim || "").toLowerCase();
    
    // --- PERBAIKAN UTAMA DI SINI ---
    // Logika diperketat:
    // 1. Jika mengandung kata 'terkirim' -> SENT
    // 2. Jika mengandung kata 'sudah' DAN TIDAK mengandung 'bayar' -> SENT (jaga-jaga input manual)
    const isSent = statusKirim.includes("terkirim") || (statusKirim.includes("sudah") && !statusKirim.includes("bayar"));
    
    const isBll = (m.status_bll === "BLL");
    
    const bllBadge = isBll ? '<span class="badge-bll">BLL</span>' : '';
    const badgeClass = statusBayar === "telat" ? "text-danger" : "text-success";
    
    const valAngsuran = formatRupiah(m.angsuran);
    const valPartial = formatRupiah(m.partial);
    const valSudahBayar = formatAngkaSaja(m.data_p);
    const selectId = `payment-${rawCustNo}`;
    
    let actionHtml;
    if(isSent) {
        // Tombol disabled jika sudah terkirim
        actionHtml = `<button class="btn btn-secondary btn-kirim" disabled><i class="fa-solid fa-check"></i> Terkirim</button>`;
    } else {
        // AMAN DARI ERROR REPLACE
        const safeName = String(rawNamaBP).replace(/'/g, "");
        const safeMitra = String(rawMitra).replace(/'/g, "");
        
        actionHtml = `
            <div class="d-flex justify-content-end align-items-center gap-1">
                <select id="${selectId}" class="form-select form-select-sm p-0 px-1" style="width: auto; height: 26px; font-size: 10px; border-radius: 6px;">
                    <option value="Normal">Normal</option>
                    <option value="PAR">PAR</option>
                    <option value="Partial">Partial</option>
                    <option value="Par Payment">Par Payment</option>
                    <option value="JB">JB</option> 
                </select>
                <button class="btn btn-primary btn-kirim" 
                    onclick="window.kirimData(this, '${safeName}', '${rawCustNo}', '${safeMitra}', '${selectId}')"
                    style="background-color: #9b59b6; border:none; height: 26px; display: flex; align-items: center;">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        `;
    }

    return `
        <tr>
            <td>
                <span class="mitra-name">${rawMitra} ${bllBadge}</span>
                <span class="mitra-id"><i class="fa-regular fa-id-card me-1"></i>${rawCustNo}</span>
            </td>
            <td>
                <div class="nominal-text">${valAngsuran}</div>
                <span class="nominal-label">Angsuran</span>
                <div class="nominal-text mt-1 text-danger">${valPartial}</div>
                <span class="nominal-label">Partial</span>
                <div class="nominal-text mt-1 text-primary fw-bold">${valSudahBayar}</div>
                <span class="nominal-label">Angsuran Sudah dibayar</span>
            </td>
            <td class="text-center">
                <span class="${badgeClass} fw-bold" style="font-size: 12px;">${m.status || "-"}</span>
            </td>
            <td class="text-end">${actionHtml}</td>
        </tr>
    `;
}

// Utilities
const formatRupiah = (val) => {
    if(!val || val === "0" || val === "-") return "-";
    const cleanVal = String(val).replace(/[^0-9]/g, '');
    if(!cleanVal) return "-";
    return "Rp " + parseInt(cleanVal).toLocaleString('id-ID');
};

const formatAngkaSaja = (val) => {
    if (!val || val === "-" || val === "0") return "-";
    const clean = String(val).replace(/[^0-9]/g, '');
    return clean === "" ? "-" : clean;
};

function showLoading(show) {
    if(els.loadingOverlay) {
        if(show) els.loadingOverlay.classList.remove('d-none');
        else els.loadingOverlay.classList.add('d-none');
    }
}

if(els.btnTampilkan) {
    els.btnTampilkan.addEventListener('click', () => {
        showLoading(true);
        setTimeout(() => {
            renderGroupedData(globalData);
            showLoading(false);
        }, 50);
    });
}

// 7. FUNGSI KIRIM DATA (Input Laporan)
window.kirimData = async function(btn, namaBP, custNo, namaMitra, selectId) {
    const selectEl = document.getElementById(selectId);
    const jenisBayar = selectEl ? selectEl.value : "Normal";
    
    if(!confirm(`Kirim laporan closing untuk mitra: ${namaMitra}\nJenis Pembayaran: ${jenisBayar}?`)) return;

    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    btn.disabled = true;
    if(selectEl) selectEl.disabled = true;

    try {
        const payload = {
            action: "input_laporan",    
            jenisLaporan: "ClosingModal", 
            idKaryawan: userProfile.idKaryawan || "Unknown",
            namaBP: namaBP,
            customerNumber: custNo,
            jenisPembayaran: jenisBayar
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        
        if (result.result === 'success') {
            // Update UI Lokal secara instan
            const index = globalData.findIndex(item => String(item.cust_no) === String(custNo));
            if (index !== -1) {
                globalData[index].status_kirim = "Sudah Terkirim"; 
            }

            // Simpan posisi accordion agar tidak menutup sendiri
            const openAccordion = document.querySelector('.accordion-collapse.show');
            const openId = openAccordion ? openAccordion.id : null;

            renderGroupedData(globalData);

            // Buka kembali accordion yang sedang aktif
            if (openId) {
                const elContent = document.getElementById(openId);
                const btnToggle = document.querySelector(`button[data-bs-target="#${openId}"]`);
                if (elContent) elContent.classList.add('show');
                if (btnToggle) btnToggle.classList.remove('collapsed');
            }
        } else {
            throw new Error(result.error || "Gagal menyimpan data.");
        }
    } catch (error) {
        alert("Gagal Kirim: " + error.message);
        btn.innerHTML = originalContent;
        btn.disabled = false;
        if(selectEl) selectEl.disabled = false;
    }
};
