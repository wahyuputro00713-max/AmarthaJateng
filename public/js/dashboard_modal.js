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

// 🔴 GANTI URL INI DENGAN URL APPS SCRIPT TERBARU ANDA (/exec) 🔴
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchDataModal();
    } else {
        window.location.replace("index.html");
    }
});

async function fetchDataModal() {
    try {
        loadingOverlay.classList.remove('d-none');
        
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_data_modal" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        console.log("Data Modal:", result);

        if (result.result === "success" && Array.isArray(result.data)) {
            globalData = result.data;
            populateFilters(globalData);
            renderData(globalData);
        } else {
            alert("Gagal mengambil data: " + (result.error || "Data kosong"));
        }

    } catch (error) {
        console.error("Error:", error);
        alert("Terjadi kesalahan koneksi.");
    } finally {
        loadingOverlay.classList.add('d-none');
    }
}

function populateFilters(data) {
    const areas = [...new Set(data.map(item => item.area).filter(Boolean))].sort();
    const points = [...new Set(data.map(item => item.point).filter(Boolean))].sort();
    const dpds = [...new Set(data.map(item => item.dpd).filter(Boolean))].sort((a,b) => a-b);
    const haris = [...new Set(data.map(item => item.hari).filter(Boolean))].sort();

    fillSelect(filterArea, areas);
    fillSelect(filterPoint, points);
    fillSelect(filterDPD, dpds);
    fillSelect(filterHari, haris);
}

function fillSelect(element, items) {
    const currentVal = element.value;
    element.innerHTML = element.options[0].outerHTML;
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        element.appendChild(opt);
    });
    if(items.includes(currentVal)) element.value = currentVal;
}

function renderData(data) {
    dataContainer.innerHTML = "";
    
    const fArea = filterArea.value.toLowerCase();
    const fPoint = filterPoint.value.toLowerCase();
    const fDPD = filterDPD.value;
    const fHari = filterHari.value.toLowerCase();
    const fStatus = filterStatus.value.toLowerCase();

    const filtered = data.filter(item => {
        return (fArea === "" || String(item.area).toLowerCase() === fArea) &&
               (fPoint === "" || String(item.point).toLowerCase() === fPoint) &&
               (fDPD === "" || String(item.dpd) == fDPD) &&
               (fHari === "" || String(item.hari).toLowerCase() === fHari) &&
               (fStatus === "" || String(item.status).toLowerCase().includes(fStatus));
    });

    totalDataEl.textContent = filtered.length;

    if (filtered.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');

    filtered.forEach(item => {
        const statusClass = String(item.status).toLowerCase().includes("belum") ? "status-belum" : "status-bayar";
        const badgeClass = String(item.status).toLowerCase().includes("belum") ? "bg-belum" : "bg-bayar";
        
        const html = `
            <div class="data-card ${statusClass}">
                <span class="badge ${badgeClass} badge-status">${item.status}</span>
                
                <div class="mitra-name">${item.mitra || "Tanpa Nama"}</div>
                <small class="majelis-name"><i class="fa-solid fa-users me-1"></i> ${item.majelis}</small>
                
                <hr style="margin: 8px 0; opacity: 0.1;">
                
                <div class="card-row">
                    <span class="card-label">Nama BP</span>
                    <span class="card-val">${item.nama_bp}</span>
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

const filters = [filterArea, filterPoint, filterDPD, filterHari, filterStatus];
filters.forEach(el => el.addEventListener('change', () => renderData(globalData)));

btnReset.addEventListener('click', () => {
    filters.forEach(el => el.value = "");
    renderData(globalData);
});
