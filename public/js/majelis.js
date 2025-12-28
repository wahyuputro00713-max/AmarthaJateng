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

// Gunakan URL Script yang sama dengan Dashboard Modal
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

// 2. Load Profil (Untuk mendapatkan ID Karyawan pelapor)
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

// 3. Fetch Data (Action: get_data_modal)
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
            
            // Populasi Filter Area & Point
            populateFilters(globalData);
            
            // Auto Select Filter berdasarkan Profil User
            if(userProfile.area) {
                filterArea.value = userProfile.area;
                updatePointDropdown(userProfile.area);
            }
            if(userProfile.point && filterPoint) {
                const options = Array.from(filterPoint.options).map(o => o.value);
                if(options.includes(userProfile.point)) filterPoint.value = userProfile.point;
            }

            // Tampilkan Data Awal
            renderGroupedData(globalData);
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

// 4. Logika Filter Dropdown
function populateFilters(data) {
    const areas = [...new Set(data.map(i => i.area).filter(i => i && i !== "-"))].sort();
    fillSelect(filterArea, areas);
}

function updatePointDropdown(selectedArea) {
    const relevant = selectedArea ? globalData.filter(i => i.area === selectedArea) : globalData;
    const points = [...new Set(relevant.map(i => i.point).filter(i => i && i !== "-"))].sort();
    fillSelect(filterPoint, points);
}

if(filterArea) {
    filterArea.addEventListener('change', () => {
        filterPoint.value = "";
        updatePointDropdown(filterArea.value);
    });
}

function fillSelect(el, items) {
    const current = el.value;
    let html = el.options[0].outerHTML;
    html += items.map(i => `<option value="${i}">${i}</option>`).join('');
    el.innerHTML = html;
    if(items.includes(current)) el.value = current;
}

// 5. RENDER DATA (GROUP BY MAJELIS)
function renderGroupedData(data) {
    majelisContainer.innerHTML = "";
    
    // Ambil Nilai Filter
    const fArea = filterArea.value.toLowerCase();
    const fPoint = filterPoint.value.toLowerCase();
    const fHari = filterHari.value.toLowerCase();
    const fBP = searchBP.value.toLowerCase();

    // Filter Data
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

    // Grouping
    const grouped = {};
    filtered.forEach(item => {
        const majelis = item.majelis || "Tanpa Majelis";
        if (!grouped[majelis]) grouped[majelis] = [];
        grouped[majelis].push(item);
    });

    document.getElementById('totalMajelis').innerText = `Total: ${Object.keys(grouped).length} Majelis`;
    document.getElementById('totalMitra').innerText = `${filtered.length} Mitra`;

    // Buat HTML Accordion
    let htmlContent = "";
    Object.keys(grouped).sort().forEach((majelis, index) => {
        const mitras = grouped[majelis];
        const bpName = mitras[0].nama_bp || "-";
        
        // Generate Baris Mitra
        const rows = mitras.map(m => {
            const statusBayar = String(m.status).toLowerCase();
            const statusKirim = String(m.status_kirim || "").toLowerCase();
            const isSent = statusKirim.includes("sudah");
            
            // Badge Status Bayar
            const badgeClass = statusBayar.includes("belum") ? "pill-belum" : "pill-bayar";
            
            // Tombol Aksi
            let btnAction = "";
            if(isSent) {
                btnAction = `<button class="btn btn-secondary btn-kirim" disabled><i class="fa-solid fa-check"></i> Terkirim</button>`;
            } else {
                // Data yang akan dikirim saat tombol diklik
                // Kita encode ke attribute agar aman
                const safeName = m.nama_bp.replace(/'/g, "");
                const safeMitra = m.mitra.replace(/'/g, "");
                
                btnAction = `<button class="btn btn-primary btn-kirim" 
                                onclick="window.kirimData(this, '${safeName}', '${m.cust_no}', '${safeMitra}')"
                                style="background-color: #9b59b6; border:none;">
                                <i class="fa-solid fa-paper-plane"></i> Kirim
                             </button>`;
            }

            return `
                <tr>
                    <td>
                        <span class="mitra-name">${m.mitra}</span>
                        <span class="mitra-id"><i class="fa-regular fa-id-card me-1"></i>${m.cust_no}</span>
                    </td>
                    <td class="text-center">
                        <span class="status-pill ${badgeClass}">${m.status}</span>
                    </td>
                    <td class="text-end">
                        ${btnAction}
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
                                    <th class="ps-3">Mitra / Cust No</th>
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

// 6. Tombol Tampilkan
btnTampilkan.addEventListener('click', () => {
    if(loadingOverlay) {
        loadingOverlay.classList.remove('d-none');
        setTimeout(() => {
            renderGroupedData(globalData);
            loadingOverlay.classList.add('d-none');
        }, 100);
    } else {
        renderGroupedData(globalData);
    }
});

// 7. FUNGSI GLOBAL KIRIM DATA (Agar bisa dipanggil dari onclick HTML)
window.kirimData = async function(btn, namaBP, custNo, namaMitra) {
    if(!confirm(`Kirim laporan closing untuk mitra: ${namaMitra}?`)) return;

    // Loading State Button
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
    btn.disabled = true;

    try {
        const payload = {
            jenisLaporan: "ClosingModal", // Sesuai Backend
            idKaryawan: userProfile.idKaryawan || "Unknown",
            namaBP: namaBP,
            customerNumber: custNo,
            jenisPembayaran: "Setoran Harian" // Default Value
        };

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === 'success') {
            // Jika sukses, ubah tombol jadi Terkirim
            btn.className = "btn btn-secondary btn-kirim";
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Terkirim`;
            // Kita tidak refresh semua data agar user tidak kehilangan posisi scroll
        } else {
            throw new Error(result.error || "Gagal menyimpan data.");
        }

    } catch (error) {
        alert("Gagal Kirim: " + error.message);
        btn.innerHTML = originalContent; // Kembalikan tombol jika gagal
        btn.disabled = false;
    }
};
