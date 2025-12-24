import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js"; // Tambah database

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
const db = getDatabase(app); // Inisialisasi DB

// URL APPS SCRIPT
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

let globalData = [];
let userProfile = { area: "", point: "" }; // Simpan profil user

// Elemen DOM
const filterArea = document.getElementById('filterArea');
const filterPoint = document.getElementById('filterPoint');
const filterDPD = document.getElementById('filterDPD');
const filterHari = document.getElementById('filterHari');
const filterStatus = document.getElementById('filterStatus');

const btnSubmit = document.getElementById('btnSubmit');
const btnReset = document.getElementById('btnReset');

const dataContainer = document.getElementById('dataContainer');
const emptyState = document.getElementById('emptyState');
const welcomeState = document.getElementById('welcomeState');
const loadingOverlay = document.getElementById('loadingOverlay');
const totalDataEl = document.getElementById('totalData');

// 1. Cek Login & Load Profil
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Ambil profil user dulu, baru ambil data modal
        getUserProfile(user.uid).then(() => {
            fetchDataModal();
        });
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fungsi Ambil Profil User
async function getUserProfile(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (snapshot.exists()) {
            const val = snapshot.val();
            userProfile.area = val.area || "";
            userProfile.point = val.point || "";
            console.log("Profil User:", userProfile);
        }
    } catch (err) {
        console.error("Gagal load profil:", err);
    }
}

// 3. Fetch Data Modal
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
            console.log(`Berhasil: ${result.data.length} data diterima.`);
            globalData = result.data;
            
            // Isi dropdown Area/Point dari data yang ada
            populateFilters(globalData);
            
            // Set Filter Area & Point SESUAI PROFIL USER
            if(userProfile.area && filterArea) {
                filterArea.value = userProfile.area;
            }
            if(userProfile.point && filterPoint) {
                filterPoint.value = userProfile.point;
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

// 4. Populate Dropdown (Area & Point Saja)
function populateFilters(data) {
    // Ambil list unik dari data
    const areas = [...new Set(data.map(i => i.area).filter(i => i && i !== "-"))].sort();
    const points = [...new Set(data.map(i => i.point).filter(i => i && i !== "-"))].sort();

    fillSelect(filterArea, areas);
    fillSelect(filterPoint, points);
    
    // Hari & DPD TIDAK di-populate dari data, karena sudah hardcoded di HTML
}

function fillSelect(element, items) {
    if (!element) return;
    const currentVal = element.value; // Simpan nilai jika sudah ada
    
    let optionsHTML = element.options[0].outerHTML; 
    optionsHTML += items.map(item => `<option value="${item}">${item}</option>`).join('');
    
    element.innerHTML = optionsHTML;
    
    // Kembalikan nilai (berguna jika profil sudah set value sebelumnya)
    if(items.includes(currentVal)) element.value = currentVal;
    else if(currentVal !== "") {
        // Jika value profil tidak ada di list data (misal typo di database), tetap tambahkan opsi
        const opt = document.createElement('option');
        opt.value = currentVal;
        opt.textContent = currentVal;
        opt.selected = true;
        element.appendChild(opt);
    }
}

// 5. Render Data (Saat Tombol Diklik)
function renderData(data) {
    if (!dataContainer) return;
    
    if(welcomeState) welcomeState.classList.add('d-none');

    // Ambil nilai filter
    const fArea = filterArea ? filterArea.value.toLowerCase() : "";
    const fPoint = filterPoint ? filterPoint.value.toLowerCase() : "";
    const fDPD = filterDPD ? filterDPD.value.toLowerCase() : "";
    const fHari = filterHari ? filterHari.value.toLowerCase() : "";
    const fStatus = filterStatus ? filterStatus.value.toLowerCase() : "";

    // Filtering Data
    const filtered = data.filter(item => {
        // String Matching untuk DPD (karena format "01. Current")
        const itemDPD = String(item.dpd).toLowerCase();
        const itemHari = String(item.hari).toLowerCase();
        
        // Logika Filter
        const matchArea = fArea === "" || String(item.area).toLowerCase() === fArea;
        const matchPoint = fPoint === "" || String(item.point).toLowerCase() === fPoint;
        const matchStatus = fStatus === "" || String(item.status).toLowerCase().includes(fStatus);
        
        // Match Hari (Exact)
        const matchHari = fHari === "" || itemHari === fHari;

        // Match DPD (Includes agar lebih fleksibel)
        // Misal data di sheet "1-7 DPD", filter "02. 1-7 DPD" -> Kita pakai includes
        const matchDPD = fDPD === "" || fDPD.includes(itemDPD) || itemDPD.includes(fDPD);

        return matchArea && matchPoint && matchStatus && matchHari && matchDPD;
    });

    if(totalDataEl) totalDataEl.textContent = filtered.length;

    if (filtered.length === 0) {
        dataContainer.innerHTML = "";
        if(emptyState) emptyState.classList.remove('d-none');
        return;
    }
    if(emptyState) emptyState.classList.add('d-none');

    // Render Kartu (Optimized)
    const cardsHTML = filtered.map(item => {
        const statusText = String(item.status).toLowerCase();
        const isBelum = statusText.includes("belum");
        
        const statusClass = isBelum ? "status-belum" : "status-bayar";
        const badgeClass = isBelum ? "bg-belum" : "bg-bayar";
        
        return `
            <div class="data-card ${statusClass}">
                <span class="badge ${badgeClass} badge-status">${item.status}</span>
                <div class="mitra-name">${item.mitra || "Tanpa Nama"}</div>
                <small class="majelis-name"><i class="fa-solid fa-users me-1"></i> ${item.majelis || "-"}</small>
                <hr style="margin: 8px 0; opacity: 0.1;">
                <div class="card-row">
                    <span class="card-label">Nama BP</span><span class="card-val">${item.nama_bp || "-"}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Point</span><span class="card-val">${item.point}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Area</span><span class="card-val">${item.area}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Hari</span><span class="card-val">${item.hari}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">DPD</span><span class="card-val text-danger fw-bold">${item.dpd}</span>
                </div>
            </div>
        `;
    }).join(''); 

    dataContainer.innerHTML = cardsHTML;
}

// 6. Event Listeners
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

if(btnReset) {
    btnReset.addEventListener('click', () => {
        // Reset Area/Point kembali ke PROFIL USER (bukan kosong)
        if(filterArea) filterArea.value = userProfile.area;
        if(filterPoint) filterPoint.value = userProfile.point;
        if(filterHari) filterHari.value = "";
        if(filterDPD) filterDPD.value = "";
        if(filterStatus) filterStatus.value = "";

        dataContainer.innerHTML = "";
        if(welcomeState) welcomeState.classList.remove('d-none');
        if(emptyState) emptyState.classList.add('d-none');
        if(totalDataEl) totalDataEl.textContent = "-";
    });
}
