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
// =========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7lbSgTnp8OZ2QdOIv8_gfx40heiUXSXF9sfIGf2deyVDTEznkv6lq47NRK4ddIUiF/exec"; 

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

// Event Listeners Filter
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

// 5. RENDER DATA (LOGIKA BARU)
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
        
        // Buat ID unik untuk majelis ini agar selector tidak bentrok
        const safeMajelisId = majelis.replace(/[^a-zA-Z0-9]/g, '_') + index;
        
        let countBayar = 0, countTelat = 0, countSudahKirim = 0, countBelumKirim = 0;

        mitras.forEach(m => {
            const statusBayar = String(m.status || "").toLowerCase();
            const statusKirim = String(m.status_kirim || "").toLowerCase().trim();
            
            let isSent = false;
            if (statusKirim === "sudah" || statusKirim === "sudah terkirim" || statusKirim === "terkirim") {
                isSent = true;
            }

            if(statusBayar.includes('telat')) countTelat++;
            else countBayar++; 

            if(isSent) countSudahKirim++;
            else countBelumKirim++;
        });

        // Generate baris HTML dengan ID Majelis yang diteruskan
        const rowsHtml = mitras.map(m => createRowHtml(m, safeMajelisId)).join('');

        // --- UPDATE 1: Tombol Kirim Majelis (Hanya muncul jika masih ada yang belum dikirim) ---
        let btnKirimMajelisHtml = '';
        if (countBelumKirim > 0) {
            btnKirimMajelisHtml = `
                <div class="p-3 border-top bg-light d-flex justify-content-end align-items-center gap-2">
                    <small class="text-muted fst-italic me-2" id="msg-${safeMajelisId}" style="font-size: 11px;">
                        *Pilih jenis bayar & centang SEMUA mitra untuk mengirim
                    </small>
                    <button class="btn btn-success" id="btn-kirim-${safeMajelisId}" disabled 
                        onclick="window.kirimSekaligus('${safeMajelisId}', '${majelis}', '${bpName}')">
                        <i class="fa-solid fa-paper-plane me-2"></i> Kirim Laporan Majelis
                    </button>
                </div>
            `;
        } else {
            btnKirimMajelisHtml = `
                <div class="p-3 border-top bg-light text-center">
                    <span class="badge bg-success"><i class="fa-solid fa-check-double"></i> Laporan Majelis Selesai</span>
                </div>
            `;
        }

        return `
            <div class="accordion-item" id="acc-item-${safeMajelisId}">
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
                        <table class="table table-striped table-mitra mb-0 w-100" id="table-${safeMajelisId}">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-3 text-center" style="width: 40px;"><i class="fa-solid fa-check"></i></th>
                                    <th>Mitra</th>
                                    <th>Tagihan</th>
                                    <th class="text-end pe-3">Input Bayar</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                        ${btnKirimMajelisHtml}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    els.majelisContainer.innerHTML = htmlContent;
}

// 6. HELPER: CREATE ROW HTML (LOGIKA BARU)
function createRowHtml(m, majelisId) {
    const rawNamaBP = m.nama_bp || "";
    const rawMitra = m.mitra || ""; 
    const rawCustNo = m.cust_no || "-";
    
    const statusBayar = String(m.status || "").toLowerCase().trim();
    const statusKirim = String(m.status_kirim || "").toLowerCase().trim();
    
    let isSent = false;
    if (statusKirim === "sudah" || statusKirim === "sudah terkirim" || statusKirim === "terkirim") {
        isSent = true;
    }

    const isBll = (m.status_bll === "BLL");
    const bllBadge = isBll ? '<span class="badge-bll">BLL</span>' : '';
    const badgeClass = statusBayar.includes("telat") ? "text-danger" : "text-success";
    
    const valAngsuran = formatRupiah(m.angsuran);
    const valPartial = formatRupiah(m.partial);
    const valSudahBayar = formatAngkaSaja(m.data_p);

    const selectId = `payment-${rawCustNo}`;
    const checkId = `check-${rawCustNo}`;
    
    let inputControlHtml;
    let checkboxHtml;

    // --- UPDATE 2: Logika Tombol & Checkbox ---
    if(isSent) {
        // Jika sudah terkirim: Tampilkan centang hijau statis, Dropdown mati
        checkboxHtml = `<i class="fa-solid fa-check-circle text-success fs-5"></i>`;
        inputControlHtml = `
            <div class="text-end">
                <span class="badge bg-secondary">Terkirim (${m.jenis_pembayaran || "-"})</span>
            </div>
        `;
    } else {
        // Jika belum terkirim:
        // 1. Checkbox DISABLED default-nya.
        // 2. Dropdown default KOSONG ("").
        // User harus pilih dropdown dulu -> baru checkbox aktif & auto centang.
        
        checkboxHtml = `
            <input type="checkbox" class="form-check-input chk-mitra-${majelisId}" 
                id="${checkId}" 
                data-custno="${rawCustNo}" 
                data-mitra="${rawMitra}"
                disabled
                onchange="window.handleCheckChange('${majelisId}')">
        `;

        inputControlHtml = `
            <select id="${selectId}" class="form-select form-select-sm ms-auto" 
                style="width: 110px; font-size: 11px;"
                onchange="window.handleJnsBayarChange(this, '${checkId}', '${majelisId}')">
                <option value="" selected disabled>-- Pilih --</option>
                <option value="Normal">Normal</option>
                <option value="PAR">PAR</option>
                <option value="Partial">Partial</option>
                <option value="Par Payment">Par Payment</option>
                <option value="JB">JB</option> 
            </select>
        `;
    }

    return `
        <tr>
            <td class="ps-3 align-middle text-center">
                ${checkboxHtml}
            </td>
            <td>
                <span class="mitra-name">${rawMitra} ${bllBadge}</span>
                <div style="font-size: 10px;" class="text-muted"><i class="fa-regular fa-id-card me-1"></i>${rawCustNo}</div>
                <div class="${badgeClass} fw-bold" style="font-size: 10px;">Status: ${m.status || "-"}</div>
            </td>
            <td>
                <div class="nominal-text">${valAngsuran}</div>
                ${valPartial !== '-' ? `<div class="nominal-text text-danger" style="font-size:9px">Partial: ${valPartial}</div>` : ''}
            </td>
            <td class="text-end align-middle pe-3">
                ${inputControlHtml}
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

if(els.btnTampilkan) {
    els.btnTampilkan.addEventListener('click', () => {
        showLoading(true);
        setTimeout(() => {
            renderGroupedData(globalData);
            showLoading(false);
        }, 50);
    });
}

// =========================================================================
// INTERAKSI UI BARU (HANDLE CHECKBOX & KIRIM MAJELIS)
// =========================================================================

// 1. Saat dropdown pembayaran dipilih
window.handleJnsBayarChange = function(selectEl, checkId, majelisId) {
    const checkbox = document.getElementById(checkId);
    if (!checkbox) return;

    // Jika user memilih sesuatu (value tidak kosong) -> Aktifkan checkbox & Auto centang
    if (selectEl.value !== "") {
        checkbox.disabled = false;
        checkbox.checked = true; 
    } else {
        checkbox.checked = false;
        checkbox.disabled = true;
    }

    // Cek validasi seluruh majelis
    window.handleCheckChange(majelisId);
};

// 2. Saat checkbox dicentang/uncheck manual
window.handleCheckChange = function(majelisId) {
    const btnKirim = document.getElementById(`btn-kirim-${majelisId}`);
    const msg = document.getElementById(`msg-${majelisId}`);
    
    // Ambil semua checkbox AKTIF (yang belum terkirim) di majelis ini
    const allCheckboxes = document.querySelectorAll(`.chk-mitra-${majelisId}`);
    const total = allCheckboxes.length;
    
    // Hitung berapa yang dicentang
    let checkedCount = 0;
    allCheckboxes.forEach(chk => {
        if (chk.checked) checkedCount++;
    });

    // Syarat: Semua checkbox yang ada harus dicentang
    // Artinya: Semua mitra dalam majelis harus sudah dipilih jenis bayarnya dan dicentang
    if (total > 0 && checkedCount === total) {
        btnKirim.disabled = false;
        msg.classList.remove('text-muted');
        msg.classList.add('text-success', 'fw-bold');
        msg.innerText = "Siap dikirim!";
    } else {
        btnKirim.disabled = true;
        msg.classList.remove('text-success', 'fw-bold');
        msg.classList.add('text-muted');
        msg.innerText = `*Lengkapi pembayaran semua mitra (${checkedCount}/${total}) untuk mengirim`;
    }
};

// 3. Fungsi Kirim Sekaligus (Bulk Send)
window.kirimSekaligus = async function(majelisId, namaMajelis, namaBP) {
    // Ambil semua checkbox yang dicentang di grup ini
    const checkboxes = document.querySelectorAll(`.chk-mitra-${majelisId}:checked`);
    
    if (checkboxes.length === 0) return;
    if (!confirm(`Kirim data ${checkboxes.length} mitra di majelis ${namaMajelis}?`)) return;

    const btn = document.getElementById(`btn-kirim-${majelisId}`);
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...`;
    btn.disabled = true;
    
    // Disable semua input saat proses kirim
    checkboxes.forEach(chk => {
        chk.disabled = true;
        const custNo = chk.getAttribute('data-custno');
        const select = document.getElementById(`payment-${custNo}`);
        if(select) select.disabled = true;
    });

    // Kumpulkan Promise Request
    const requests = [];
    
    checkboxes.forEach(chk => {
        const custNo = chk.getAttribute('data-custno');
        const namaMitra = chk.getAttribute('data-mitra');
        
        // Ambil value dropdown terkait
        const selectEl = document.getElementById(`payment-${custNo}`);
        const jenisBayar = selectEl ? selectEl.value : "Normal";

        const payload = {
            action: "input_laporan",
            jenisLaporan: "ClosingModal",
            idKaryawan: userProfile.idKaryawan || "Unknown",
            namaBP: namaBP,
            customerNumber: custNo,
            jenisPembayaran: jenisBayar
        };

        // Fetch request per mitra
        const req = fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        }).then(async (response) => {
            const result = await response.json();
            if (result.result === 'success') {
                return { status: 'ok', custNo: custNo, jenisBayar: jenisBayar };
            } else {
                return { status: 'fail', mitra: namaMitra, error: result.error };
            }
        }).catch(err => {
            return { status: 'fail', mitra: namaMitra, error: err.message };
        });

        requests.push(req);
    });

    try {
        // Tunggu semua request selesai
        const results = await Promise.all(requests);
        
        const failed = results.filter(r => r.status === 'fail');
        const success = results.filter(r => r.status === 'ok');

        // Update Global Data Lokal untuk yang sukses
        success.forEach(s => {
            const idx = globalData.findIndex(item => String(item.cust_no) === String(s.custNo));
            if (idx !== -1) {
                globalData[idx].status_kirim = "Sudah";
                globalData[idx].jenis_pembayaran = s.jenisBayar;
            }
        });

        if (failed.length > 0) {
            alert(`Berhasil: ${success.length}\nGagal: ${failed.length}\nCek koneksi dan coba lagi.`);
        }

        // Render ulang UI
        renderGroupedData(globalData);
        
        // Buka kembali accordion yang sedang aktif
        setTimeout(() => {
           const accItem = document.getElementById(`acc-item-${majelisId}`);
           if(accItem) {
               const collapseDiv = accItem.querySelector('.accordion-collapse');
               const btnToggle = accItem.querySelector('.accordion-button');
               if(collapseDiv) collapseDiv.classList.add('show');
               if(btnToggle) btnToggle.classList.remove('collapsed');
           }
        }, 100);

    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan sistem saat pengiriman massal.");
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
        
        // Enable kembali input agar bisa dicoba ulang
        checkboxes.forEach(chk => {
            chk.disabled = false;
            const custNo = chk.getAttribute('data-custno');
            const select = document.getElementById(`payment-${custNo}`);
            if(select) select.disabled = false;
        });
        window.handleCheckChange(majelisId);
    }
};
