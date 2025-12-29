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

            // PERUBAHAN: Tidak memanggil renderGroupedData() di sini.
            // Biarkan tampilan kosong sampai user klik tombol.
            
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

// 5. RENDER DATA (Hanya dipanggil saat tombol diklik)
function renderGroupedData(data) {
    majelisContainer.innerHTML = "";
    
    const fArea = filterArea.value.toLowerCase();
    const fPoint = filterPoint.value.toLowerCase();
    const fBP = filterBP.value; 
    const fHari = filterHari.value.toLowerCase();

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
        // Ubah pesan jika filter belum dipilih vs data memang kosong
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

    const grouped = {};
    filtered.forEach(item => {
        const majelis = item.majelis || "Tanpa Majelis";
        if (!grouped[majelis]) grouped[majelis] = [];
        grouped[majelis].push(item);
    });

    document.getElementById('totalMajelis').innerText = `Total: ${Object.keys(grouped).length} Majelis`;
    document.getElementById('totalMitra').innerText = `${filtered.length} Mitra`;

    let htmlContent = "";
    Object.keys(grouped).sort().forEach((majelis, index) => {
        const mitras = grouped[majelis];
        const bpName = mitras[0].nama_bp || "-";
        
        const rows = mitras.map(m => {
            const statusBayar = String(m.status).toLowerCase();
            const statusKirim = String(m.status_kirim || "").toLowerCase();
            const isSent = statusKirim.includes("sudah");
            
            // --- UPDATE WARNA STATUS ---
            // Jika "Telat" -> text-danger (Merah)
            // Selain itu (Bayar, dll) -> text-success (Hijau)
            let badgeClass = "text-success"; 
            if (statusBayar === "telat") {
                badgeClass = "text-danger";
            }
            
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

        htmlContent += `
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
                            <tbody>${rows}</tbody>
                        </table>
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
