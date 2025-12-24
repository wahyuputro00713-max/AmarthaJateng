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

// URL APPS SCRIPT
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

let globalData = [];
let userProfile = { area: "", point: "" };

// Elemen DOM
const filterArea = document.getElementById('filterArea');
const filterPoint = document.getElementById('filterPoint');
const filterDPD = document.getElementById('filterDPD');
const filterHari = document.getElementById('filterHari');
const filterStatus = document.getElementById('filterStatus');
const searchBP = document.getElementById('searchBP');

const btnSubmit = document.getElementById('btnSubmit');
const btnReset = document.getElementById('btnReset');

const dataContainer = document.getElementById('dataContainer');
const emptyState = document.getElementById('emptyState');
const welcomeState = document.getElementById('welcomeState');
const loadingOverlay = document.getElementById('loadingOverlay');
const totalDataEl = document.getElementById('totalData');

// 1. Cek Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        getUserProfile(user.uid).then(() => {
            fetchDataModal();
        });
    } else {
        window.location.replace("index.html");
    }
});

// 2. Ambil Profil
async function getUserProfile(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (snapshot.exists()) {
            const val = snapshot.val();
            userProfile.area = val.area || "";
            userProfile.point = val.point || "";
        }
    } catch (err) {
        console.error("Gagal load profil:", err);
    }
}

// 3. Fetch Data
async function fetchDataModal() {
    try {
        if(loadingOverlay) loadingOverlay.classList.remove('d-none');
        console.log("Mengambil data...");

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_data_modal" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        
        if (result.result === "success" && Array.isArray(result.data)) {
            globalData = result.data;
            
            // Isi Filter Area
            populateAreaDropdown(globalData);
            
            // Set Default dari Profil
            if(userProfile.area && filterArea) {
                filterArea.value = userProfile.area;
            }
            // Update Point sesuai Area terpilih
            updatePointDropdown(filterArea.value);

            if(userProfile.point && filterPoint) {
                const options = Array.from(filterPoint.options).map(opt => opt.value);
                if(options.includes(userProfile.point)) {
                    filterPoint.value = userProfile.point;
                }
            }
        } else {
            console.error("Gagal:", result);
            alert("Gagal mengambil data: " + (result.error || "Data kosong"));
        }

    } catch (error) {
        console.error("Error Fetch:", error);
        alert("Terjadi kesalahan koneksi.");
    } finally {
        if(loadingOverlay) loadingOverlay.classList.add('d-none');
    }
}

// 4. Dropdown Logic
function populateAreaDropdown(data) {
    const areas = [...new Set(data.map(i => i.area).filter(i => i && i !== "-"))].sort();
    fillSelect(filterArea, areas);
}

function updatePointDropdown(selectedArea) {
    const relevantData = selectedArea 
        ? globalData.filter(item => item.area === selectedArea)
        : globalData;
    const points = [...new Set(relevantData.map(i => i.point).filter(i => i && i !== "-"))].sort();
    fillSelect(filterPoint, points);
}

if(filterArea) {
    filterArea.addEventListener('change', () => {
        filterPoint.value = ""; 
        updatePointDropdown(filterArea.value);
    });
}

function fillSelect(element, items) {
    if (!element) return;
    const currentVal = element.value;
    let optionsHTML = element.options[0].outerHTML; 
    optionsHTML += items.map(item => `<option value="${item}">${item}</option>`).join('');
    element.innerHTML = optionsHTML;
    if(items.includes(currentVal)) {
        element.value = currentVal;
    } else {
        element.value = "";
    }
}

// 5. RENDER DATA (MODE TABEL/LIST SIMPLE)
function renderData(data) {
    if (!dataContainer) return;
    if(welcomeState) welcomeState.classList.add('d-none');

    // Ambil Filter
    const fArea = filterArea ? filterArea.value.toLowerCase() : "";
    const fPoint = filterPoint ? filterPoint.value.toLowerCase() : "";
    const fDPD = filterDPD ? filterDPD.value.toLowerCase() : "";
    const fHari = filterHari ? filterHari.value.toLowerCase() : "";
    const fStatus = filterStatus ? filterStatus.value.toLowerCase() : "";
    const fSearch = searchBP ? searchBP.value.toLowerCase().trim() : "";

    const filtered = data.filter(item => {
        const itemDPD = String(item.dpd).toLowerCase();
        const itemHari = String(item.hari).toLowerCase();
        const itemBP = String(item.nama_bp).toLowerCase();

        const matchArea = fArea === "" || String(item.area).toLowerCase() === fArea;
        const matchPoint = fPoint === "" || String(item.point).toLowerCase() === fPoint;
        const matchStatus = fStatus === "" || String(item.status).toLowerCase().includes(fStatus);
        const matchHari = fHari === "" || itemHari === fHari;
        const matchDPD = fDPD === "" || fDPD.includes(itemDPD) || itemDPD.includes(fDPD);
        const matchSearch = fSearch === "" || itemBP.includes(fSearch);

        return matchArea && matchPoint && matchStatus && matchHari && matchDPD && matchSearch;
    });

    if(totalDataEl) totalDataEl.textContent = filtered.length;

    if (filtered.length === 0) {
        dataContainer.innerHTML = "";
        if(emptyState) emptyState.classList.remove('d-none');
        return;
    }
    if(emptyState) emptyState.classList.add('d-none');

    // --- RENDER TABEL ---
    const rowsHTML = filtered.map(item => {
        const statusText = String(item.status).toLowerCase();
        const isBelum = statusText.includes("belum");
        const badgeClass = isBelum ? "bg-belum" : "bg-bayar";
        
        return `
            <tr>
                <td>
                    <span class="fw-bold d-block text-dark">${item.mitra || "-"}</span>
                    <small class="text-muted" style="font-size: 10px;">${item.majelis || "-"}</small>
                </td>
                <td>
                    <span class="d-block">${item.nama_bp || "-"}</span>
                    <small class="text-muted" style="font-size: 10px;">${item.point || "-"} (${item.area || "-"})</small>
                </td>
                <td class="text-center">${item.hari || "-"}</td>
                <td class="text-end">
                    <span class="badge ${badgeClass}" style="font-size: 10px;">${item.status}</span>
                    <div class="text-danger fw-bold" style="font-size: 10px;">${item.dpd} DPD</div>
                </td>
            </tr>
        `;
    }).join('');

    dataContainer.innerHTML = `
        <div class="bg-white rounded shadow-sm overflow-hidden border">
            <div class="table-responsive">
                <table class="table table-hover table-custom mb-0 w-100">
                    <thead>
                        <tr>
                            <th style="width: 35%;">Mitra/Mjl</th>
                            <th style="width: 30%;">BP/Point</th>
                            <th style="width: 15%;" class="text-center">Hari</th>
                            <th style="width: 20%;" class="text-end">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// 6. Listeners
if(btnSubmit) {
    btnSubmit.addEventListener('click', () => {
        if(loadingOverlay) {
            loadingOverlay.querySelector('p').textContent = "Menampilkan data...";
            loadingOverlay.classList.remove('d-none');
            setTimeout(() => {
                renderData(globalData);
                loadingOverlay.classList.add('d-none');
            }, 100); 
        } else {
            renderData(globalData);
        }
    });
}

if(searchBP) {
    searchBP.addEventListener('input', () => {
        renderData(globalData);
    });
}

if(btnReset) {
    btnReset.addEventListener('click', () => {
        if(filterArea) {
            filterArea.value = userProfile.area;
            updatePointDropdown(userProfile.area);
        }
        if(filterPoint) {
            const options = Array.from(filterPoint.options).map(opt => opt.value);
            if(options.includes(userProfile.point)) filterPoint.value = userProfile.point;
            else filterPoint.value = "";
        }

        if(filterHari) filterHari.value = "";
        if(filterDPD) filterDPD.value = "";
        if(filterStatus) filterStatus.value = "";
        if(searchBP) searchBP.value = "";

        dataContainer.innerHTML = "";
        if(welcomeState) welcomeState.classList.remove('d-none');
        if(emptyState) emptyState.classList.add('d-none');
        if(totalDataEl) totalDataEl.textContent = "-";
    });
}
