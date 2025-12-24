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
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyukYV8miaVWFHg6TWaomRodRFQPAYHnq2UlArNNHy73qR6TdUiz3PMYSvgaKZXmXX-/exec";

let globalData = [];
let userProfile = { area: "", point: "" }; 

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
            globalData = result.data;
            
            // 1. Isi Dropdown Area (Semua Area yang ada)
            populateAreaDropdown(globalData);
            
            // 2. Set Default Area dari Profil (Jika ada)
            if(userProfile.area && filterArea) {
                filterArea.value = userProfile.area;
            }

            // 3. Update Dropdown Point (Sesuai Area yang terpilih saat ini)
            updatePointDropdown(filterArea.value);

            // 4. Set Default Point dari Profil (Jika ada dan sesuai Area)
            if(userProfile.point && filterPoint) {
                // Cek apakah point user ada di dalam opsi point yang baru digenerate
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

// --- LOGIKA FILTER BERJENJANG (DEPENDENT DROPDOWN) ---

// Fungsi 1: Isi Area (Hanya sekali saat awal)
function populateAreaDropdown(data) {
    const areas = [...new Set(data.map(i => i.area).filter(i => i && i !== "-"))].sort();
    fillSelect(filterArea, areas);
}

// Fungsi 2: Update Isi Point Berdasarkan Area yang Dipilih
function updatePointDropdown(selectedArea) {
    // Jika ada Area dipilih, ambil data HANYA dari area itu.
    // Jika tidak ada (Semua Area), ambil SEMUA data.
    const relevantData = selectedArea 
        ? globalData.filter(item => item.area === selectedArea)
        : globalData;

    // Ambil daftar point unik dari data yang sudah disaring
    const points = [...new Set(relevantData.map(i => i.point).filter(i => i && i !== "-"))].sort();
    
    // Isi Dropdown Point
    fillSelect(filterPoint, points);
}

// Event Listener: Saat Area Berubah -> Update Point
if(filterArea) {
    filterArea.addEventListener('change', () => {
        // Reset pilihan Point ke "Semua Point" agar tidak nyangkut di point area lain
        filterPoint.value = ""; 
        updatePointDropdown(filterArea.value);
    });
}

// Helper: Mengisi Select Option
function fillSelect(element, items) {
    if (!element) return;
    const currentVal = element.value; // Simpan nilai lama (untuk preserve selection jika valid)
    
    // Simpan opsi pertama ("Semua ...")
    let optionsHTML = element.options[0].outerHTML; 
    
    // Tambahkan opsi baru
    optionsHTML += items.map(item => `<option value="${item}">${item}</option>`).join('');
    
    element.innerHTML = optionsHTML;
    
    // Kembalikan nilai lama jika masih valid di daftar baru
    if(items.includes(currentVal)) {
        element.value = currentVal;
    } else {
        element.value = ""; // Reset jika nilai lama tidak valid lagi (misal pindah area)
    }
}

// 4. Render Data (Saat Tombol Diklik)
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
        const itemDPD = String(item.dpd).toLowerCase();
        const itemHari = String(item.hari).toLowerCase();
        
        const matchArea = fArea === "" || String(item.area).toLowerCase() === fArea;
        const matchPoint = fPoint === "" || String(item.point).toLowerCase() === fPoint;
        const matchStatus = fStatus === "" || String(item.status).toLowerCase().includes(fStatus);
        const matchHari = fHari === "" || itemHari === fHari;
        
        // Filter DPD (Includes)
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

    // Render Kartu
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

// 5. Event Listeners Tombol
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
        // Reset Area kembali ke PROFIL USER
        if(filterArea) {
            filterArea.value = userProfile.area;
            updatePointDropdown(userProfile.area); // Trigger update point
        }
        
        // Reset Point kembali ke PROFIL USER (jika valid di area tsb)
        if(filterPoint) {
            // Cek apakah point user valid di area ini
            const options = Array.from(filterPoint.options).map(opt => opt.value);
            if(options.includes(userProfile.point)) {
                filterPoint.value = userProfile.point;
            } else {
                filterPoint.value = "";
            }
        }

        if(filterHari) filterHari.value = "";
        if(filterDPD) filterDPD.value = "";
        if(filterStatus) filterStatus.value = "";

        dataContainer.innerHTML = "";
        if(welcomeState) welcomeState.classList.remove('d-none');
        if(emptyState) emptyState.classList.add('d-none');
        if(totalDataEl) totalDataEl.textContent = "-";
    });
}
