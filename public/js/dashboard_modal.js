import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// URL Apps Script Langsung
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

let globalData = [];

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

// 1. Cek Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Ambil data untuk mengisi dropdown, tapi JANGAN tampilkan kartu dulu
        fetchDataModal();
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fetch Data (Hanya untuk Populasi Filter)
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
            
            // HANYA Isi Filter Dropdown (Agar user bisa milih)
            populateFilters(globalData);
            
            // Tampilan tetap di 'Welcome State' (Silakan pilih filter...)
            
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

// 3. Populate Dropdown (Agar user bisa memilih)
function populateFilters(data) {
    const areas = [...new Set(data.map(i => i.area).filter(i => i && i !== "-"))].sort();
    const points = [...new Set(data.map(i => i.point).filter(i => i && i !== "-"))].sort();
    const dpds = [...new Set(data.map(i => i.dpd).filter(i => i && i !== "0"))].sort((a,b) => a-b);
    const haris = [...new Set(data.map(i => i.hari).filter(i => i && i !== "-"))].sort();

    fillSelect(filterArea, areas);
    fillSelect(filterPoint, points);
    fillSelect(filterDPD, dpds);
    fillSelect(filterHari, haris);
}

function fillSelect(element, items) {
    if (!element) return;
    const currentVal = element.value;
    
    let optionsHTML = element.options[0].outerHTML; 
    optionsHTML += items.map(item => `<option value="${item}">${item}</option>`).join('');
    
    element.innerHTML = optionsHTML;
    if(items.includes(currentVal)) element.value = currentVal;
}

// 4. Render Data (Hanya dipanggil saat Tombol Submit diklik)
function renderData(data) {
    if (!dataContainer) return;
    
    // Sembunyikan pesan selamat datang
    if(welcomeState) welcomeState.classList.add('d-none');

    // Ambil nilai filter
    const fArea = filterArea ? filterArea.value.toLowerCase() : "";
    const fPoint = filterPoint ? filterPoint.value.toLowerCase() : "";
    const fDPD = filterDPD ? filterDPD.value : "";
    const fHari = filterHari ? filterHari.value.toLowerCase() : "";
    const fStatus = filterStatus ? filterStatus.value.toLowerCase() : "";

    // Filtering Data
    const filtered = data.filter(item => {
        return (fArea === "" || String(item.area).toLowerCase() === fArea) &&
               (fPoint === "" || String(item.point).toLowerCase() === fPoint) &&
               (fDPD === "" || String(item.dpd) == fDPD) &&
               (fHari === "" || String(item.hari).toLowerCase() === fHari) &&
               (fStatus === "" || String(item.status).toLowerCase().includes(fStatus));
    });

    // Update Counter
    if(totalDataEl) totalDataEl.textContent = filtered.length;

    // Cek Hasil Filter
    if (filtered.length === 0) {
        dataContainer.innerHTML = "";
        if(emptyState) emptyState.classList.remove('d-none');
        return;
    }
    if(emptyState) emptyState.classList.add('d-none');

    // Optimasi Render (Anti Lag)
    const cardsHTML = filtered.map(item => {
        const statusText = String(item.status).toLowerCase();
        const isBelum = statusText.includes("belum");
        
        const statusClass = isBelum ? "status-belum" : "status-bayar";
        const badgeClass = isBelum ? "bg-belum" : "bg-bayar";
        const namaBp = item.nama_bp || "-";
        const namaMitra = item.mitra || "Tanpa Nama";
        const majelis = item.majelis || "-";
        
        return `
            <div class="data-card ${statusClass}">
                <span class="badge ${badgeClass} badge-status">${item.status}</span>
                <div class="mitra-name">${namaMitra}</div>
                <small class="majelis-name"><i class="fa-solid fa-users me-1"></i> ${majelis}</small>
                <hr style="margin: 8px 0; opacity: 0.1;">
                <div class="card-row">
                    <span class="card-label">Nama BP</span><span class="card-val">${namaBp}</span>
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

// 5. Event Listeners
// Tombol Submit: Baru render data
if(btnSubmit) {
    btnSubmit.addEventListener('click', () => {
        // Efek loading sesaat agar user tahu ada proses
        if(loadingOverlay) {
            loadingOverlay.querySelector('p').textContent = "Menampilkan data...";
            loadingOverlay.classList.remove('d-none');
            
            // Gunakan timeout agar UI loading sempat muncul sebelum proses berat render
            setTimeout(() => {
                renderData(globalData);
                loadingOverlay.classList.add('d-none');
            }, 100); 
        } else {
            renderData(globalData);
        }
    });
}

// Tombol Reset: Bersihkan filter dan kembalikan ke Welcome State
if(btnReset) {
    btnReset.addEventListener('click', () => {
        [filterArea, filterPoint, filterDPD, filterHari, filterStatus].forEach(el => { if(el) el.value = ""; });
        
        // Kembalikan ke tampilan awal
        dataContainer.innerHTML = "";
        if(welcomeState) welcomeState.classList.remove('d-none');
        if(emptyState) emptyState.classList.add('d-none');
        if(totalDataEl) totalDataEl.textContent = "-";
    });
}
