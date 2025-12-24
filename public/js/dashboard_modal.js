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

// 🔴🔴 GANTI URL INI DENGAN URL APPS SCRIPT HASIL DEPLOY TERBARU 🔴🔴
// Gunakan URL yang berakhiran '/exec'
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

// Variabel Global untuk menyimpan data
let globalData = [];

// Elemen DOM
const filterArea = document.getElementById('filterArea');
const filterPoint = document.getElementById('filterPoint');
const filterDPD = document.getElementById('filterDPD');
const filterHari = document.getElementById('filterHari');
const filterStatus = document.getElementById('filterStatus');
const btnReset = document.getElementById('btnReset');
const dataContainer = document.getElementById('dataContainer');
const emptyState = document.getElementById('emptyState');
const loadingOverlay = document.getElementById('loadingOverlay');
const totalDataEl = document.getElementById('totalData');

// 1. Cek Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Langsung tarik data tanpa cek profil user (sesuai request)
        fetchDataModal();
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fungsi Fetch Data dari Spreadsheet
async function fetchDataModal() {
    try {
        if(loadingOverlay) loadingOverlay.classList.remove('d-none');
        
        console.log("Mengambil data dari:", SCRIPT_URL);

        // Header text/plain penting agar tidak kena masalah CORS
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_data_modal" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        console.log("Data Diterima:", result);

        if (result.result === "success" && Array.isArray(result.data)) {
            globalData = result.data;
            populateFilters(globalData); // Isi dropdown otomatis
            renderData(globalData);      // Tampilkan data
        } else {
            console.error("Gagal:", result);
            alert("Gagal mengambil data: " + (result.error || "Data kosong/Tab tidak ditemukan"));
        }

    } catch (error) {
        console.error("Error Fetch:", error);
        alert("Terjadi kesalahan koneksi. Pastikan URL Script benar.");
    } finally {
        if(loadingOverlay) loadingOverlay.classList.add('d-none');
    }
}

// 3. Isi Pilihan Filter Otomatis (Mengambil nilai unik dari data)
function populateFilters(data) {
    const areas = [...new Set(data.map(item => item.area).filter(i => i && i !== "-"))].sort();
    const points = [...new Set(data.map(item => item.point).filter(i => i && i !== "-"))].sort();
    // Urutkan DPD secara angka (jika memungkinkan), kalau string urut abjad
    const dpds = [...new Set(data.map(item => item.dpd).filter(i => i && i !== "0"))].sort((a,b) => a-b);
    const haris = [...new Set(data.map(item => item.hari).filter(i => i && i !== "-"))].sort();

    fillSelect(filterArea, areas);
    fillSelect(filterPoint, points);
    fillSelect(filterDPD, dpds);
    fillSelect(filterHari, haris);
}

function fillSelect(element, items) {
    if (!element) return;
    const currentVal = element.value;
    // Reset option, sisakan yang pertama (Semua)
    element.innerHTML = element.options[0].outerHTML;
    
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        element.appendChild(opt);
    });
    // Restore value jika filter sedang aktif
    if(items.includes(currentVal)) element.value = currentVal;
}

// 4. Render Data ke HTML
function renderData(data) {
    if (!dataContainer) return;
    dataContainer.innerHTML = "";
    
    // Ambil nilai filter saat ini
    const fArea = filterArea ? filterArea.value.toLowerCase() : "";
    const fPoint = filterPoint ? filterPoint.value.toLowerCase() : "";
    const fDPD = filterDPD ? filterDPD.value : "";
    const fHari = filterHari ? filterHari.value.toLowerCase() : "";
    const fStatus = filterStatus ? filterStatus.value.toLowerCase() : "";

    // Lakukan Filtering
    const filtered = data.filter(item => {
        return (fArea === "" || String(item.area).toLowerCase() === fArea) &&
               (fPoint === "" || String(item.point).toLowerCase() === fPoint) &&
               (fDPD === "" || String(item.dpd) == fDPD) &&
               (fHari === "" || String(item.hari).toLowerCase() === fHari) &&
               (fStatus === "" || String(item.status).toLowerCase().includes(fStatus));
    });

    // Update Counter
    if(totalDataEl) totalDataEl.textContent = filtered.length;

    // Tampilkan Empty State jika data kosong
    if (filtered.length === 0) {
        if(emptyState) emptyState.classList.remove('d-none');
        return;
    }
    if(emptyState) emptyState.classList.add('d-none');

    // Loop data dan buat kartu HTML
    filtered.forEach(item => {
        const statusText = String(item.status).toLowerCase();
        const isBelum = statusText.includes("belum"); // Cek apakah "Belum Bayar"
        
        const statusClass = isBelum ? "status-belum" : "status-bayar";
        const badgeClass = isBelum ? "bg-belum" : "bg-bayar";
        
        const html = `
            <div class="data-card ${statusClass}">
                <span class="badge ${badgeClass} badge-status">${item.status}</span>
                
                <div class="mitra-name">${item.mitra || "Tanpa Nama"}</div>
                <small class="majelis-name"><i class="fa-solid fa-users me-1"></i> ${item.majelis || "-"}</small>
                
                <hr style="margin: 8px 0; opacity: 0.1;">
                
                <div class="card-row">
                    <span class="card-label">Nama BP</span>
                    <span class="card-val">${item.nama_bp || "-"}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Point</span>
                    <span class="card-val">${item.point}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Area</span>
                    <span class="card-val">${item.area}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">Hari</span>
                    <span class="card-val">${item.hari}</span>
                </div>
                <div class="card-row">
                    <span class="card-label">DPD</span>
                    <span class="card-val text-danger fw-bold">${item.dpd}</span>
                </div>
            </div>
        `;
        dataContainer.innerHTML += html;
    });
}

// 5. Event Listeners untuk Filter
const filters = [filterArea, filterPoint, filterDPD, filterHari, filterStatus];
filters.forEach(el => {
    if(el) el.addEventListener('change', () => renderData(globalData));
});

if(btnReset) {
    btnReset.addEventListener('click', () => {
        filters.forEach(el => { if(el) el.value = ""; });
        renderData(globalData);
    });
}
