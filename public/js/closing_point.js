import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8wOUkyZTa4W2hHHGZq_YKnGFqYEGOuH8",
    authDomain: "amarthajatengwebapp.firebaseapp.com",
    projectId: "amarthajatengwebapp",
    storageBucket: "amarthajatengwebapp.firebasestorage.app",
    messagingSenderId: "22431520744",
    appId: "1:22431520744:web:711af76a5335d97179765d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// URL APPS SCRIPT LANGSUNG
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

let globalData = [];
let userProfile = { idKaryawan: "", area: "", point: "" };

const filterArea = document.getElementById('filterArea');
const filterPoint = document.getElementById('filterPoint');
const filterBP = document.getElementById('filterBP');
const filterHari = document.getElementById('filterHari');
const btnTampilkan = document.getElementById('btnTampilkan');
const majelisContainer = document.getElementById('majelisContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const emptyState = document.getElementById('emptyState');

// 1. Cek Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        getUserProfile(user.uid).then(() => {
            fetchData();
        });
    } else {
        window.location.replace("index.html");
    }
});

// 2. Load Profil
async function getUserProfile(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (snapshot.exists()) {
            const val = snapshot.val();
            userProfile.idKaryawan = val.idKaryawan || "Unknown";
            userProfile.area = val.area || "";
            userProfile.point = val.point || "";
        }
    } catch (err) {
        console.error("Gagal load profil:", err);
    }
}

// 3. Fetch Data (Hanya ambil data & isi filter, JANGAN render list)
async function fetchData() {
    try {
        if(loadingOverlay) loadingOverlay.classList.remove('d-none');
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_data_modal" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        
        if (result.result === "success" && Array.isArray(result.data)) {
            globalData = result.data;
            
            // Populasi Filter saja
            populateFilters(globalData);
            
            // Set Default Filter dari Profil User
            if(userProfile.area) {
                filterArea.value = userProfile.area;
                updatePointDropdown(userProfile.area);
                updateBPDropdown(); 
            }
            
            if(userProfile.point && filterPoint) {
                const options = Array.from(filterPoint.options).map(o => o.value);
                if(options.includes(userProfile.point)) {
                    filterPoint.value = userProfile.point;
                    updateBPDropdown(); 
                }
            }
            
        } else {
            console.error("Gagal data:", result);
            alert("Gagal mengambil data dari server.");
        }
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan koneksi.");
    } finally {
        if(loadingOverlay) loadingOverlay.classList.add('d-none');
    }
}

// 4. Logika Cascading Dropdown
function populateFilters(data) {
    const areas = [...new Set(data.map(i => i.area).filter(i => i && i !== "-"))].sort();
    fillSelect(filterArea, areas);
}

function updatePointDropdown(selectedArea) {
    const relevant = selectedArea ? globalData.filter(i => i.area === selectedArea) : globalData;
    const points = [...new Set(relevant.map(i => i.point).filter(i => i && i !== "-"))].sort();
    fillSelect(filterPoint, points);
}

function updateBPDropdown() {
    const selectedArea = filterArea.value;
    const selectedPoint = filterPoint.value;
    
    let relevant = globalData;
    if (selectedArea) {
        relevant = relevant.filter(i => i.area === selectedArea);
    }
    if (selectedPoint) {
        relevant = relevant.filter(i => i.point === selectedPoint);
    }

    const bps = [...new Set(relevant.map(i => i.nama_bp).filter(i => i && i !== "-"))].sort();
    fillSelect(filterBP, bps);
}

if(filterArea) {
    filterArea.addEventListener('change', () => {
        filterPoint.value = ""; 
        filterBP.value = "";    
        updatePointDropdown(filterArea.value);
        updateBPDropdown();
    });
}

if(filterPoint) {
    filterPoint.addEventListener('change', () => {
        filterBP.value = "";    
        updateBPDropdown();
    });
}

function fillSelect(el, items) {
    const current = el.value;
    let html = el.options[0].outerHTML; 
    html += items.map(i => `<option value="${i}">${i}</option>`).join('');
    el.innerHTML = html;
    if(items.includes(current)) el.value = current;
    else el.value = "";
}

// 5. RENDER DATA (STRUKTUR BARU: BP -> MAJELIS -> MITRA)
function renderGroupedData(data) {
    majelisContainer.innerHTML = "";
    
    const fArea = filterArea.value.toLowerCase();
    const fPoint = filterPoint.value.toLowerCase();
    const fBP = filterBP.value; 
    const fHari = filterHari.value.toLowerCase();

    // Filter Data
    const filtered = data.filter(item => {
        const matchArea = fArea === "" || String(item.area).toLowerCase() === fArea;
        const matchPoint = fPoint === "" || String(item.point).toLowerCase() === fPoint;
        const matchHari = fHari === "" || String(item.hari).toLowerCase() === fHari;
        const matchBP = fBP === "" || item.nama_bp === fBP;
        return matchArea && matchPoint && matchHari && matchBP;
    });

    // Handle Empty State
    if (filtered.length === 0) {
        emptyState.classList.remove('d-none');
        if (fArea === "" && fPoint === "" && fBP === "" && fHari === "") {
             emptyState.querySelector('p').innerHTML = "Silakan pilih filter dan klik <b>Tampilkan Data</b>";
        } else {
             emptyState.querySelector('p').textContent = "Data tidak ditemukan sesuai filter.";
        }
        
        document.getElementById('totalMajelis').innerText = "Total: 0";
        document.getElementById('totalMitra').innerText = "0 Mitra";
        return;
    }
    emptyState.classList.add('d-none');

    // --- GROUPING LOGIC (HIERARKI 3 LEVEL) ---
    // Struktur: { "Nama BP": { "Nama Majelis": [Array Mitra] } }
    const hierarchy = {};

    filtered.forEach(item => {
        const bpName = item.nama_bp || "Tanpa BP";
        const majelisName = item.majelis || "Tanpa Majelis";

        if (!hierarchy[bpName]) hierarchy[bpName] = {};
        if (!hierarchy[bpName][majelisName]) hierarchy[bpName][majelisName] = [];
        
        hierarchy[bpName][majelisName].push(item);
    });

    // Hitung Total Statistik
    const totalBP = Object.keys(hierarchy).length;
    let totalMajelis = 0;
    Object.values(hierarchy).forEach(majObj => totalMajelis += Object.keys(majObj).length);

    document.getElementById('totalMajelis').innerText = `Total: ${totalBP} BP / ${totalMajelis} Majelis`;
    document.getElementById('totalMitra').innerText = `${filtered.length} Mitra`;

    // --- RENDER HTML ---
    let htmlContent = "";
    const bpKeys = Object.keys(hierarchy).sort();

    bpKeys.forEach((bpName, bpIndex) => {
        const majelisObj = hierarchy[bpName];
        const majelisKeys = Object.keys(majelisObj).sort();
        
        // --- LEVEL 2: DAFTAR MAJELIS (ACCORDION DALAM) ---
        let majelisHtml = `<div class="accordion" id="accordionMajelis-${bpIndex}">`;
        
        majelisKeys.forEach((majName, majIndex) => {
            const mitras = majelisObj[majName];
            
            // Generate Table Rows untuk Mitra
            const rows = mitras.map(m => {
                const statusBayar = String(m.status).toLowerCase();
                const statusKirim = String(m.status_kirim || "").toLowerCase();
                const isSent = statusKirim.includes("sudah");
                
                let badgeClass = "text-success"; 
                if (statusBayar === "telat") badgeClass = "text-danger";
                
                const formatRupiah = (val) => {
                    if(!val || val === "0" || val === "-") return "-";
                    const cleanVal = String(val).replace(/[^0-9]/g, '');
                    if(!cleanVal) return "-";
                    return "Rp " + parseInt(cleanVal).toLocaleString('id-ID');
                };

                const valAngsuran = formatRupiah(m.angsuran);
                const valPartial = formatRupiah(m.partial);

                const selectId = `payment-${m.cust_no}`;
                let actionHtml = "";
                
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
                            <span class="mitra-name">${m.mitra}</span>
                            <span class="mitra-id"><i class="fa-regular fa-id-card me-1"></i>${m.cust_no}</span>
                        </td>
                        <td>
                            <div class="nominal-text">${valAngsuran}</div>
                            <span class="nominal-label">Angsuran</span>
                            <div class="nominal-text mt-1 text-danger">${valPartial}</div>
                            <span class="nominal-label">Partial</span>
                        </td>
                        <td class="text-center">
                            <span class="${badgeClass} fw-bold" style="font-size: 12px;">${m.status}</span>
                        </td>
                        <td class="text-end">
                            ${actionHtml}
                        </td>
                    </tr>
                `;
            }).join('');

            // Item Accordion Majelis
            majelisHtml += `
                <div class="accordion-item border-start border-4 border-info mb-2" style="border-radius: 8px !important;">
                    <h2 class="accordion-header" id="headingMaj-${bpIndex}-${majIndex}">
                        <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#collapseMaj-${bpIndex}-${majIndex}">
                            <div class="d-flex justify-content-between align-items-center w-100 pe-2">
                                <span style="font-size: 12px; font-weight:600;"><i class="fa-solid fa-users-rectangle me-2"></i>${majName}</span>
                                <span class="badge bg-info text-dark rounded-pill" style="font-size: 10px;">${mitras.length}</span>
                            </div>
                        </button>
                    </h2>
                    <div id="collapseMaj-${bpIndex}-${majIndex}" class="accordion-collapse collapse" data-bs-parent="#accordionMajelis-${bpIndex}">
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
                                <tbody>${rows}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        });
        majelisHtml += `</div>`; // Tutup div accordion majelis

        // --- LEVEL 1: ITEM BP (ACCORDION LUAR) ---
        htmlContent += `
            <div class="accordion-item mb-3 shadow-sm border-0 overflow-hidden" style="border-radius: 12px !important;">
                <h2 class="accordion-header" id="headingBP-${bpIndex}">
                    <button class="accordion-button collapsed bg-white text-dark shadow-none py-3" type="button" data-bs-toggle="collapse" data-bs-target="#collapseBP-${bpIndex}">
                        <div class="d-flex align-items-center w-100">
                            <div class="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-3" style="width: 40px; height: 40px; min-width: 40px;">
                                <i class="fa-solid fa-user-tie"></i>
                            </div>
                            <div class="d-flex flex-column">
                                <span class="fw-bold" style="font-size: 14px;">${bpName}</span>
                                <span class="text-muted" style="font-size: 11px;">Membawahi ${majelisKeys.length} Majelis</span>
                            </div>
                        </div>
                    </button>
                </h2>
                <div id="collapseBP-${bpIndex}" class="accordion-collapse collapse" data-bs-parent="#majelisContainer">
                    <div class="accordion-body bg-light p-2">
                        ${majelisHtml}
                    </div>
                </div>
            </div>
        `;
    });

    majelisContainer.innerHTML = htmlContent;
}

// 6. Tombol Tampilkan -> Baru Render Data
btnTampilkan.addEventListener('click', () => {
    if(loadingOverlay) {
        loadingOverlay.querySelector('p').textContent = "Menampilkan data...";
        loadingOverlay.classList.remove('d-none');
        setTimeout(() => {
            renderGroupedData(globalData);
            loadingOverlay.classList.add('d-none');
        }, 100);
    } else {
        renderGroupedData(globalData);
    }
});

// 7. FUNGSI KIRIM DATA
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
            jenisLaporan: "ClosingModal",
            idKaryawan: userProfile.idKaryawan || "Unknown",
            namaBP: namaBP,
            customerNumber: custNo,
            jenisPembayaran: jenisBayar
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            redirect: "follow",
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
