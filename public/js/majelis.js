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

// URL APPS SCRIPT
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

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

// 1. ENTRY POINT: Cek Login & Load Parallel
onAuthStateChanged(auth, async (user) => {
    if (user) {
        showLoading(true);
        try {
            // OPTIMASI: Jalankan request Profil dan Data secara BERSAMAAN (Parallel)
            // Tidak perlu menunggu profil selesai baru ambil data
            const [profile, data] = await Promise.all([
                fetchUserProfile(user.uid),
                fetchMainData()
            ]);

            // Set Data
            userProfile = profile;
            globalData = data;

            // Setup UI
            initializeFilters();
            
            // Auto render jika user punya default area
            if (userProfile.area) {
                renderGroupedData(globalData);
            }

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
            return snapshot.val();
        }
        return { idKaryawan: "Unknown", area: "", point: "" };
    } catch (err) {
        console.error("Gagal load profil:", err);
        return { idKaryawan: "Unknown", area: "", point: "" };
    }
}

// 3. Fetch Data Utama (UPDATED: Tanpa Session Storage agar tidak Error Quota)
async function fetchMainData() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_data_modal" }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        
        if (result.result === "success" && Array.isArray(result.data)) {
            // Langsung kembalikan data tanpa simpan ke sessionStorage
            // karena ukuran data terlalu besar (>5MB)
            return result.data;
        } else {
            throw new Error("Format data salah dari server");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

// 4. Logika Filter & Dropdown
function initializeFilters() {
    populateFilters(globalData);

    // Set Default Filter dari Profil
    if (userProfile.area && els.filterArea) {
        els.filterArea.value = userProfile.area;
        updatePointDropdown(userProfile.area);
        
        if (userProfile.point && els.filterPoint) {
            // Cek apakah point user ada di opsi
            const pointExists = [...els.filterPoint.options].some(o => o.value === userProfile.point);
            if(pointExists) {
                els.filterPoint.value = userProfile.point;
            }
        }
        updateBPDropdown();
    }
}

function populateFilters(data) {
    if (!els.filterArea) return;
    const areas = [...new Set(data.map(i => i.area).filter(i => i && i !== "-"))].sort();
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

// Event Listeners Filters
if(els.filterArea) {
    els.filterArea.addEventListener('change', () => {
        if(els.filterPoint) els.filterPoint.value = ""; 
        if(els.filterBP) els.filterBP.value = "";     
        updatePointDropdown(els.filterArea.value);
        updateBPDropdown();
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
    // Gunakan DocumentFragment untuk performa render option sedikit lebih cepat
    const fragment = document.createDocumentFragment();
    
    // Option default
    const defaultOpt = el.options[0].cloneNode(true);
    fragment.appendChild(defaultOpt);

    items.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        fragment.appendChild(opt);
    });

    el.innerHTML = "";
    el.appendChild(fragment);
    
    if(items.includes(current)) el.value = current;
}

// 5. RENDER DATA (Optimized)
function renderGroupedData(data) {
    // Ambil value sekali saja di awal
    const fArea = els.filterArea ? els.filterArea.value.toLowerCase() : "";
    const fPoint = els.filterPoint ? els.filterPoint.value.toLowerCase() : "";
    const fHari = els.filterHari ? els.filterHari.value.toLowerCase() : "";
    const fBP = els.filterBP ? els.filterBP.value : ""; // Nama BP biasanya case sensitive/spesifik

    // Filter
    const filtered = data.filter(item => {
        if (fArea && String(item.area).toLowerCase() !== fArea) return false;
        if (fPoint && String(item.point).toLowerCase() !== fPoint) return false;
        if (fHari && String(item.hari).toLowerCase() !== fHari) return false;
        if (fBP && item.nama_bp !== fBP) return false;
        return true;
    });

    // Handle Empty
    if (filtered.length === 0) {
        els.majelisContainer.innerHTML = "";
        els.emptyState.classList.remove('d-none');
        const msg = (fArea === "" && fPoint === "" && fBP === "" && fHari === "") 
            ? "Silakan pilih filter dan klik <b>Tampilkan Data</b>"
            : "Data tidak ditemukan sesuai filter.";
        els.emptyState.querySelector('p').innerHTML = msg;
        els.lblTotalMajelis.innerText = "Total: 0";
        els.lblTotalMitra.innerText = "0 Mitra";
        return;
    }

    els.emptyState.classList.add('d-none');

    // Grouping
    const grouped = {};
    filtered.forEach(item => {
        const m = item.majelis || "Tanpa Majelis";
        if (!grouped[m]) grouped[m] = [];
        grouped[m].push(item);
    });

    // Update Label Header
    const majelisKeys = Object.keys(grouped).sort();
    els.lblTotalMajelis.innerText = `Total: ${majelisKeys.length} Majelis`;
    els.lblTotalMitra.innerText = `${filtered.length} Mitra`;

    // Render HTML String Builder (Cepat)
    const htmlContent = majelisKeys.map((majelis, index) => {
        const mitras = grouped[majelis];
        const bpName = mitras[0].nama_bp || "-";
        
        const rowsHtml = mitras.map(m => createRowHtml(m)).join('');

        return `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                        <div class="d-flex flex-column w-100">
                            <div class="d-flex justify-content-between align-items-center w-100 pe-2">
                                <span><i class="fa-solid fa-users me-2"></i>${majelis}</span>
                                <span class="majelis-badge">${mitras.length}</span>
                            </div>
                            <small class="text-muted fw-normal mt-1" style="font-size: 11px;">BP: ${bpName}</small>
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

// Helper: Create Row HTML (Dipisah agar rapi)
function createRowHtml(m) {
    const statusBayar = String(m.status).toLowerCase();
    const statusKirim = String(m.status_kirim || "").toLowerCase();
    const isSent = statusKirim.includes("sudah");
    const isBll = (m.status_bll === "BLL");
    
    const bllBadge = isBll ? '<span class="badge-bll">BLL</span>' : '';
    const badgeClass = statusBayar === "telat" ? "text-danger" : "text-success";
    
    const valAngsuran = formatRupiah(m.angsuran);
    const valPartial = formatRupiah(m.partial);
    const valSudahBayar = formatAngkaSaja(m.data_p);

    const selectId = `payment-${m.cust_no}`;
    let actionHtml;

    if(isSent) {
        actionHtml = `<button class="btn btn-secondary btn-kirim" disabled><i class="fa-solid fa-check"></i> Terkirim</button>`;
    } else {
        const safeName = m.nama_bp.replace(/'/g, "");
        const safeMitra = m.mitra.replace(/'/g, "");
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
                    onclick="window.kirimData(this, '${safeName}', '${m.cust_no}', '${safeMitra}', '${selectId}')"
                    style="background-color: #9b59b6; border:none; height: 26px; display: flex; align-items: center;">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        `;
    }

    return `
        <tr>
            <td>
                <span class="mitra-name">${m.mitra} ${bllBadge}</span>
                <span class="mitra-id"><i class="fa-regular fa-id-card me-1"></i>${m.cust_no}</span>
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
                <span class="${badgeClass} fw-bold" style="font-size: 12px;">${m.status}</span>
            </td>
            <td class="text-end">
                ${actionHtml}
            </td>
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

// 6. Tombol Tampilkan
if(els.btnTampilkan) {
    els.btnTampilkan.addEventListener('click', () => {
        showLoading(true);
        // setTimeout agar UI sempat render loading overlay sebelum proses berat (renderGroupedData) jalan
        setTimeout(() => {
            renderGroupedData(globalData);
            showLoading(false);
        }, 50);
    });
}

// 7. FUNGSI KIRIM DATA (Global)
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
            action: "ClosingModal", // Sesuai dengan Code.gs
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
            const parentDiv = btn.parentElement;
            parentDiv.innerHTML = `<button class="btn btn-secondary btn-kirim" disabled><i class="fa-solid fa-check"></i> Terkirim</button>`;
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
