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
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyukYV8miaVWFHg6TWaomRodRFQPAYHnq2UlArNNHy73qR6TdUiz3PMYSvgaKZXmXX-/exec";

// State Data Global
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
const totalOsEl = document.getElementById('totalOs');

// 1. Cek Login
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchDataModal();
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fetch Data dari Spreadsheet
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
            populateFilters(globalData); // Isi opsi dropdown otomatis
            renderData(globalData);      // Tampilkan semua data awal
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

// 3. Isi Pilihan Filter Otomatis (Unik)
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
    // Simpan value yang sedang dipilih agar tidak reset saat refresh (opsional)
    const currentVal = element.value;
    // Reset option, sisakan yang pertama (Semua)
    element.innerHTML = element.options[0].outerHTML;
    
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        element.appendChild(opt);
    });
    // Restore value jika ada
    if(items.includes(currentVal)) element.value = currentVal;
}

// 4. Logika Rendering & Filtering
function renderData(data) {
    dataContainer.innerHTML = "";
    
    // Filter Data berdasarkan Dropdown
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

    // Update Summary
    totalDataEl.textContent = filtered.length;
    const sumOs = filtered.reduce((acc, curr) => acc + (Number(curr.os_pokok) || 0), 0);
    totalOsEl.textContent = formatRupiah(sumOs);

    // Tampilkan Data
    if (filtered.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');

    filtered.forEach(item => {
        // Tentukan Warna Status
        const statusClass = String(item.status).toLowerCase().includes("belum") ? "status-belum" : "status-bayar";
        const badgeClass = String(item.status).toLowerCase().includes("belum") ? "bg-belum" : "bg-bayar";
        
        const html = `
            <div class="data-card ${statusClass}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="mitra-name">${item.nama || "Tanpa Nama"}</div>
                        <span class="badge ${badgeClass} badge-status">${item.status}</span>
                    </div>
                    <div class="text-end">
                        <div class="card-label">DPD</div>
                        <div class="card-value text-danger">${item.dpd}</div>
                    </div>
                </div>
                <hr style="margin: 10px 0; opacity: 0.1;">
                <div class="row">
                    <div class="col-6">
                        <div class="card-label">Area</div>
                        <div class="card-value">${item.area}</div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="card-label">Hari</div>
                        <div class="card-value">${item.hari}</div>
                    </div>
                    <div class="col-6 mt-2">
                        <div class="card-label">Point</div>
                        <div class="card-value">${item.point}</div>
                    </div>
                    <div class="col-6 mt-2 text-end">
                        <div class="card-label">OS Pokok</div>
                        <div class="card-value text-primary">${formatRupiah(item.os_pokok)}</div>
                    </div>
                </div>
            </div>
        `;
        dataContainer.innerHTML += html;
    });
}

// 5. Event Listeners (Filter Otomatis saat ganti dropdown)
const filters = [filterArea, filterPoint, filterDPD, filterHari, filterStatus];
filters.forEach(el => {
    el.addEventListener('change', () => renderData(globalData));
});

// Tombol Reset
btnReset.addEventListener('click', () => {
    filters.forEach(el => el.value = "");
    renderData(globalData);
});

// Helper Rupiah
function formatRupiah(angka) {
    return "Rp " + Number(angka).toLocaleString('id-ID');
}
