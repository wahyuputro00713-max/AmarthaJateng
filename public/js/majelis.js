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
const filterHari = document.getElementById('filterHari');
const searchBP = document.getElementById('searchBP');
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
            userProfile.idKaryawan = val.idKaryawan || "";
            userProfile.area = val.area || "";
            userProfile.point = val.point || "";
        }
    } catch (err) {
        console.error("Gagal load profil:", err);
    }
}

// 3. Fetch Data dari Spreadsheet
async function fetchData() {
    try {
        loadingOverlay.classList.remove('d-none');
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_data_modal" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        
        if (result.result === "success" && Array.isArray(result.data)) {
            globalData = result.data;
            populateFilters(globalData);
            
            // Set Default Filters
            if(userProfile.area) {
                filterArea.value = userProfile.area;
                updatePointDropdown(userProfile.area);
            }
            if(userProfile.point && filterPoint) {
                // Check if point exists in options
                const options = Array.from(filterPoint.options).map(o => o.value);
                if(options.includes(userProfile.point)) filterPoint.value = userProfile.point;
            }

            // Render awal
            renderGroupedData(globalData);
        } else {
            alert("Gagal ambil data: " + result.error);
        }
    } catch (error) {
        console.error(error);
        alert("Koneksi Error");
    } finally {
        loadingOverlay.classList.add('d-none');
    }
}

// 4. Populate Filters
function populateFilters(data) {
    const areas = [...new Set(data.map(i => i.area).filter(Boolean))].sort();
    fillSelect(filterArea, areas);
}

function updatePointDropdown(selectedArea) {
    const relevant = selectedArea ? globalData.filter(i => i.area === selectedArea) : globalData;
    const points = [...new Set(relevant.map(i => i.point).filter(Boolean))].sort();
    fillSelect(filterPoint, points);
}

filterArea.addEventListener('change', () => {
    filterPoint.value = "";
    updatePointDropdown(filterArea.value);
});

function fillSelect(el, items) {
    const current = el.value;
    let html = el.options[0].outerHTML;
    html += items.map(i => `<option value="${i}">${i}</option>`).join('');
    el.innerHTML = html;
    if(items.includes(current)) el.value = current;
}

// 5. RENDER UTAMA (Grouping Majelis)
function renderGroupedData(data) {
    majelisContainer.innerHTML = "";
    
    // FILTERING
    const fArea = filterArea.value.toLowerCase();
    const fPoint = filterPoint.value.toLowerCase();
    const fHari = filterHari.value.toLowerCase();
    const fBP = searchBP.value.toLowerCase();

    const filtered = data.filter(item => {
        return (fArea === "" || String(item.area).toLowerCase() === fArea) &&
               (fPoint === "" || String(item.point).toLowerCase() === fPoint) &&
               (fHari === "" || String(item.hari).toLowerCase() === fHari) &&
               (fBP === "" || String(item.nama_bp).toLowerCase().includes(fBP));
    });

    if (filtered.length === 0) {
        emptyState.classList.remove('d-none');
        document.getElementById('totalMajelis').innerText = "Total: 0";
        document.getElementById('totalMitra').innerText = "0 Mitra";
        return;
    }
    emptyState.classList.add('d-none');

    // GROUPING BY MAJELIS
    const grouped = {};
    filtered.forEach(item => {
        const majelis = item.majelis || "Tanpa Majelis";
        if (!grouped[majelis]) grouped[majelis] = [];
        grouped[majelis].push(item);
    });

    // Update Counter
    document.getElementById('totalMajelis').innerText = `Total: ${Object.keys(grouped).length} Majelis`;
    document.getElementById('totalMitra').innerText = `${filtered.length} Mitra`;

    // GENERATE HTML
    let htmlContent = "";
    Object.keys(grouped).sort().forEach((majelis, index) => {
        const mitras = grouped[majelis];
        const bpName = mitras[0].nama_bp || "-";
        
        // Generate Rows Mitra
        const rows = mitras.map(m => {
            const statusBayar = m.status || "-";
            const statusKirim = m.status_kirim || "-";
            const isSent = String(statusKirim).toLowerCase().includes("sudah");
            
            let btnAction = "";
            if(isSent) {
                btnAction = `<button class="btn btn-secondary btn-kirim" disabled><i class="fa-solid fa-check"></i> Terkirim</button>`;
            } else {
                // Tombol Kirim memicu fungsi kirimData()
                // Kita simpan data di attribut data-dataset agar mudah diambil
                const dataPayload = JSON.stringify({
                    namaBP: m.nama_bp,
                    custNo: m.cust_no,
                    mitra: m.mitra
                }).replace(/"/g, '&quot;');

                btnAction = `<button class="btn btn-primary btn-kirim" onclick="kirimData(this, ${dataPayload})">
                                <i class="fa-solid fa-paper-plane"></i> Kirim
                             </button>`;
            }

            return `
                <tr>
                    <td>
                        <div class="fw-bold">${m.mitra}</div>
                        <div class="text-muted small">${m.cust_no}</div>
                    </td>
                    <td class="text-center">
                        <span class="status-pill ${statusBayar.includes('Bayar') ? 'pill-success' : 'pill-danger'}">${statusBayar}</span>
                    </td>
                    <td class="text-end">
                        ${btnAction}
                    </td>
                </tr>
            `;
        }).join('');

        // Accordion Item
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
                                    <th class="ps-3">Nama Mitra</th>
                                    <th class="text-center">Status</th>
                                    <th class="text-end pe-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    });

    majelisContainer.innerHTML = htmlContent;
}

btnTampilkan.addEventListener('click', () => {
    if(loadingOverlay) {
        loadingOverlay.querySelector('p').textContent = "Memfilter Data...";
        loadingOverlay.classList.remove('d-none');
        setTimeout(() => {
            renderGroupedData(globalData);
            loadingOverlay.classList.add('d-none');
        }, 100);
    } else {
        renderGroupedData(globalData);
    }
});

// 6. FUNGSI KIRIM DATA (GLOBAL SCOPE AGAR BISA DIKLIK DARI HTML)
window.kirimData = async function(btn, data) {
    if(!confirm(`Kirim data closing untuk mitra: ${data.mitra}?`)) return;

    // Ubah tombol jadi loading
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    btn.disabled = true;

    try {
        const payload = {
            jenisLaporan: "ClosingModal", // Sesuai request: sama dengan input Closing Modal
            idKaryawan: userProfile.idKaryawan || "Unknown",
            namaBP: data.namaBP,
            customerNumber: data.custNo,
            jenisPembayaran: "Setoran Harian" // Default Value (bisa diganti)
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === 'success') {
            // Sukses
            btn.className = "btn btn-secondary btn-kirim";
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Terkirim`;
            // Opsional: Refresh data agar status 'Belum' berubah jadi 'Sudah' (Jika backend update otomatis)
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        alert("Gagal Kirim: " + error.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};
