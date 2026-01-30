import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- 1. KONFIGURASI FIREBASE ---
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

// --- 2. KONFIGURASI SCRIPT ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7lbSgTnp8OZ2QdOIv8_gfx40heiUXSXF9sfIGf2deyVDTEznkv6lq47NRK4ddIUiF/exec"; 

// State Management
let globalData = [];
let userProfile = { idKaryawan: "Unknown", area: "", point: "" };
let isTransactionActive = false; // Pengaman agar tidak spam tombol

// DOM Elements Cache
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

// --- 3. AUTH & ENTRY POINT ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        showLoading(true);
        try {
            // Ambil profil user dulu
            userProfile = await fetchUserProfile(user.uid);
            
            // Set filter awal jika ada data user
            if (userProfile.area && els.filterArea) {
                // Kita load data area user sebagai default
                globalData = await fetchMainData(userProfile.area);
                initializeFilters(); // Isi dropdown
                renderGroupedData(globalData); // Tampilkan data
            } else {
                // Jika user tidak punya area, load kosong atau semua (opsional)
                initializeFilters();
                renderGroupedData([]); 
            }
        } catch (error) {
            console.error("Error init:", error);
            alert("Terjadi kesalahan memuat data. Silakan refresh halaman.");
        } finally {
            showLoading(false);
        }
    } else {
        window.location.replace("index.html");
    }
});

async function fetchUserProfile(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (snapshot.exists()) return snapshot.val();
        return { idKaryawan: "Unknown", area: "", point: "" };
    } catch (err) {
        return { idKaryawan: "Unknown", area: "", point: "" };
    }
}

async function fetchMainData(reqArea) {
    try {
        const payload = { action: "get_data_modal", reqArea: reqArea || "" };
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        return (result.result === "success" && Array.isArray(result.data)) ? result.data : [];
    } catch (error) {
        console.error("Fetch Error:", error);
        throw error;
    }
}

// --- 4. LOGIKA FILTER & DROPDOWN ---
function initializeFilters() {
    // Isi Filter Area
    if (els.filterArea) {
        let areas = [...new Set(globalData.map(i => i.area).filter(i => i && i !== "-"))];
        if (userProfile.area && !areas.includes(userProfile.area)) areas.push(userProfile.area);
        areas.sort();
        fillSelect(els.filterArea, areas);
        els.filterArea.value = userProfile.area || "";
    }

    // Isi Filter Lainnya berdasarkan Area terpilih
    updateDependentFilters();

    // Set Hari ini otomatis
    if (els.filterHari) {
        const daysMap = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        const todayName = daysMap[new Date().getDay()];
        const dayOptionExists = [...els.filterHari.options].some(o => o.value === todayName);
        if (dayOptionExists) els.filterHari.value = todayName;
    }
}

function updateDependentFilters() {
    const selectedArea = els.filterArea ? els.filterArea.value : "";
    
    // Filter data sesuai area untuk mengisi dropdown Point & BP
    const relevantData = selectedArea ? globalData.filter(i => i.area === selectedArea) : globalData;

    // Update Point
    if (els.filterPoint) {
        const points = [...new Set(relevantData.map(i => i.point).filter(i => i && i !== "-"))].sort();
        fillSelect(els.filterPoint, points);
        if(userProfile.point && points.includes(userProfile.point)) {
            els.filterPoint.value = userProfile.point;
        }
    }

    // Update BP (Dipengaruhi Area & Point)
    updateBPDropdown();
}

function updateBPDropdown() {
    if (!els.filterBP) return;
    const sArea = els.filterArea ? els.filterArea.value : "";
    const sPoint = els.filterPoint ? els.filterPoint.value : "";

    let relevant = globalData;
    if (sArea) relevant = relevant.filter(i => i.area === sArea);
    if (sPoint) relevant = relevant.filter(i => i.point === sPoint);

    const bps = [...new Set(relevant.map(i => i.nama_bp).filter(i => i && i !== "-"))].sort();
    fillSelect(els.filterBP, bps);
}

// Event Listeners Filter
if(els.filterArea) {
    els.filterArea.addEventListener('change', async () => {
        const newArea = els.filterArea.value;
        const isDataAvailable = globalData.some(i => i.area === newArea);
        
        // Jika pindah area dan datanya belum ada di memori, fetch baru
        if (!isDataAvailable && newArea !== "") {
            showLoading(true);
            try {
                globalData = await fetchMainData(newArea);
            } catch(e) {
                alert("Gagal mengambil data area baru.");
            } finally {
                showLoading(false);
            }
        }
        
        // Reset filter anak & render ulang
        if(els.filterPoint) els.filterPoint.value = "";
        updateDependentFilters();
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
    // Simpan opsi pertama (Default: Semua...)
    const defaultOpt = el.options[0].cloneNode(true);
    
    items.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        fragment.appendChild(opt);
    });
    
    el.innerHTML = "";
    el.appendChild(defaultOpt);
    el.appendChild(fragment);
    
    // Restore value jika masih valid
    if(items.includes(current)) el.value = current;
}

// --- 5. RENDER UI (Modern Card Layout) ---
function renderGroupedData(data) {
    const fArea = els.filterArea ? els.filterArea.value.toLowerCase() : "";
    const fPoint = els.filterPoint ? els.filterPoint.value.toLowerCase() : "";
    const fHari = els.filterHari ? els.filterHari.value.toLowerCase() : "";
    const fBP = els.filterBP ? els.filterBP.value : "";

    // Filtering
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
        els.lblTotalMajelis.innerText = "0 Majelis";
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
    els.lblTotalMajelis.innerText = `${majelisKeys.length} Majelis`;
    els.lblTotalMitra.innerText = `${filtered.length} Mitra`;

    // Generate HTML
    const htmlContent = majelisKeys.map((majelis, index) => {
        const mitras = grouped[majelis];
        const bpName = mitras[0].nama_bp || "-";
        
        // SAFETY: Escape string untuk parameter fungsi onclick
        const safeNamaBP = escapeString(bpName);

        let stats = { bayar: 0, telat: 0, sent: 0, pending: 0 };

        mitras.forEach(m => {
            const statusBayar = String(m.status || "").toLowerCase();
            const statusKirim = String(m.status_kirim || "").toLowerCase().trim();
            const isSent = (statusKirim === "sudah" || statusKirim === "sudah terkirim" || statusKirim === "terkirim");
            
            if(statusBayar.includes('telat')) stats.telat++; else stats.bayar++;
            if(isSent) stats.sent++; else stats.pending++;
        });

        const itemsHtml = mitras.map(m => createMitraItemHtml(m, safeNamaBP)).join('');

        return `
            <div class="majelis-card animate-fade-in" style="animation-delay: ${Math.min(index * 0.05, 1)}s">
                <div class="majelis-header collapsed" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="majelis-title">
                            <i class="fa-solid fa-users text-primary"></i> ${majelis}
                            <span class="badge-count">${mitras.length}</span>
                        </div>
                        <i class="fa-solid fa-chevron-down text-muted" style="font-size: 0.8rem;"></i>
                    </div>
                    <div class="bp-label">BP: ${bpName}</div>
                    <div class="header-stats">
                        <span class="mini-tag tag-bayar"><i class="fa-solid fa-check"></i> ${stats.bayar}</span>
                        <span class="mini-tag tag-telat"><i class="fa-solid fa-xmark"></i> ${stats.telat}</span>
                        <span class="mini-tag tag-sent"><i class="fa-solid fa-paper-plane"></i> ${stats.sent}</span>
                        ${stats.pending > 0 ? `<span class="mini-tag tag-pending">Sisa: ${stats.pending}</span>` : ''}
                    </div>
                </div>
                <div id="collapse${index}" class="collapse">
                    <div class="border-top border-light">
                        ${itemsHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    els.majelisContainer.innerHTML = htmlContent;
}

function createMitraItemHtml(m, safeNamaBP) {
    const rawMitra = m.mitra || "";
    const rawCustNo = m.cust_no || "-";
    
    // SAFETY: Escape string agar tombol tidak error jika ada tanda petik
    const safeMitra = escapeString(rawMitra);
    // SAFETY: Bersihkan CustNo dari spasi untuk ID HTML yang valid
    const cleanCustNo = String(rawCustNo).replace(/[^a-zA-Z0-9]/g, '');

    const statusBayar = String(m.status || "").toLowerCase().trim();
    const statusKirim = String(m.status_kirim || "").toLowerCase().trim();
    const isSent = (statusKirim === "sudah" || statusKirim === "sudah terkirim" || statusKirim === "terkirim");
    
    const isBll = (m.status_bll === "BLL");
    const bllBadge = isBll ? '<span class="badge-bll">BLL</span>' : '';
    const statusClass = statusBayar.includes("telat") ? "st-telat" : "st-lancar";

    const valAngsuran = formatRupiah(m.angsuran);
    const valPartial = formatRupiah(m.partial);

    const selectId = `sel-${cleanCustNo}`;
    const btnId = `btn-${cleanCustNo}`;
    const rowId = `row-${cleanCustNo}`;

    let actionHtml;
    if(isSent) {
        actionHtml = `
            <div class="sent-badge">
                <i class="fa-solid fa-circle-check"></i> 
                <span>Terkirim (${m.jenis_pembayaran || "N"})</span>
            </div>
        `;
    } else {
        // Tombol Kirim: Perhatikan fungsi window.kirimPerMitra dipanggil di sini
        actionHtml = `
            <div class="action-wrapper" id="${rowId}">
                <select id="${selectId}" class="select-action" onchange="window.enableSendButton('${btnId}', this)">
                    <option value="" selected disabled>Bayar...</option>
                    <option value="Normal">Normal</option>
                    <option value="PAR">PAR</option>
                    <option value="Partial">Partial</option>
                    <option value="Par Payment">Par Pay</option>
                    <option value="JB">JB</option> 
                </select>
                <button id="${btnId}" class="btn-send-mini" disabled
                    onclick="window.kirimPerMitra('${rawCustNo}', '${safeMitra}', '${safeNamaBP}', '${selectId}', '${btnId}', '${rowId}')">
                    <i class="fa-solid fa-paper-plane" style="font-size: 0.8rem;"></i>
                </button>
            </div>
        `;
    }

    return `
        <div class="mitra-item">
            <div class="mitra-top">
                <div class="mitra-info">
                    <div class="mitra-name">${rawMitra} ${bllBadge}</div>
                    <div class="mitra-id">
                        <i class="fa-regular fa-id-card"></i> ${rawCustNo}
                    </div>
                </div>
                <div class="mitra-financial">
                    <div class="nominal-main">${valAngsuran}</div>
                    ${(valPartial && valPartial !== '-') ? `<div class="nominal-sub">Part: ${valPartial}</div>` : ''}
                </div>
            </div>
            <div class="mitra-actions">
                <span class="status-pill ${statusClass}">${m.status || "-"}</span>
                ${actionHtml}
            </div>
        </div>
    `;
}

// --- 6. GLOBAL FUNCTIONS (Diikat ke window agar bisa dibaca HTML) ---

// Fungsi Helper untuk Escape String (PENTING untuk keamanan tombol)
function escapeString(str) {
    if (!str) return "";
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.enableSendButton = function(btnId, selectEl) {
    const btn = document.getElementById(btnId);
    if(btn) {
        btn.disabled = (selectEl.value === "");
    }
}

window.kirimPerMitra = async function(custNo, namaMitra, namaBP, selectId, btnId, rowId) {
    // 1. Cek Lock Transaksi
    if (isTransactionActive) {
        alert("⚠️ Sedang mengirim data lain. Mohon tunggu sampai selesai.");
        return;
    }

    const selectEl = document.getElementById(selectId);
    const jnsBayar = selectEl ? selectEl.value : "";
    const btn = document.getElementById(btnId);

    if (!jnsBayar) {
        alert("Pilih jenis pembayaran dulu!");
        return;
    }
    
    // Konfirmasi User
    if (!confirm(`Kirim data untuk ${namaMitra} sebagai ${jnsBayar}?`)) return;

    // 2. Aktifkan Lock & UI Loading
    isTransactionActive = true; 
    const originalBtnContent = btn.innerHTML;
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
            jenisPembayaran: jnsBayar
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();

        if (result.result === 'success') {
            // Update Data Lokal (Supaya tidak perlu reload)
            const idx = globalData.findIndex(item => String(item.cust_no) === String(custNo));
            if (idx !== -1) {
                globalData[idx].status_kirim = "Sudah";
                globalData[idx].jenis_pembayaran = jnsBayar;
            }
            
            // Update UI ke "Terkirim"
            const wrapper = document.getElementById(rowId);
            if (wrapper) {
                wrapper.innerHTML = `
                    <div class="sent-badge animate-fade-in">
                        <i class="fa-solid fa-circle-check"></i> 
                        <span>Terkirim (${jnsBayar})</span>
                    </div>
                `;
                // Hapus style wrapper agar layout rapi
                wrapper.className = ""; 
            }
        } else {
            throw new Error(result.error || "Gagal menyimpan di server");
        }
    } catch (error) {
        console.error(error);
        alert(`Gagal kirim: ${error.message}. Coba lagi.`);
        
        // Restore Tombol jika gagal
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
        if(selectEl) selectEl.disabled = false;
    } finally {
        // 3. Lepas Lock (PENTING: Agar bisa klik lagi walaupun error)
        isTransactionActive = false;
    }
};

// Utilities & Event Listener Tombol Utama
const formatRupiah = (val) => {
    if(!val || val === "0" || val === "-") return "-";
    const cleanVal = String(val).replace(/[^0-9]/g, '');
    if(!cleanVal || cleanVal === "0") return "-";
    return "Rp " + parseInt(cleanVal).toLocaleString('id-ID');
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
