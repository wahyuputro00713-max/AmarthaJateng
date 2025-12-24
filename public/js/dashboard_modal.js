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

// URL APPS SCRIPT LANGSUNG (Agar Stabil)
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

// --- DATA POINT STATIS (Sama seperti Collection/Sosialisasi) ---
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

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

// 1. Inisialisasi Dropdown Area & Point (Langsung saat load)
populateStaticDropdowns();

// 2. Cek Login & Load Profil
onAuthStateChanged(auth, (user) => {
    if (user) {
        getUserProfile(user.uid).then(() => {
            fetchDataModal(); // Ambil data tabel di background
        });
    } else {
        window.location.replace("index.html");
    }
});

// 3. Fungsi Isi Dropdown (Statis)
function populateStaticDropdowns() {
    // Isi Area
    filterArea.innerHTML = '<option value="">Semua Area</option>';
    Object.keys(dataPoints).forEach(area => {
        const option = document.createElement('option');
        option.value = area;
        option.textContent = area;
        filterArea.appendChild(option);
    });

    // Listener Perubahan Area
    filterArea.addEventListener('change', function() {
        updatePointsDropdown(this.value);
    });
}

// Update Dropdown Point Berdasarkan Area yang Dipilih
function updatePointsDropdown(selectedArea) {
    const points = dataPoints[selectedArea] || [];
    
    // Reset Point
    filterPoint.innerHTML = '<option value="">Semua Point</option>';
    
    if (points.length > 0) {
        filterPoint.disabled = false;
        points.forEach(point => {
            const option = document.createElement('option');
            option.value = point;
            option.textContent = point;
            filterPoint.appendChild(option);
        });
    } else {
        // Jika area kosong/tidak dipilih, point dimatikan atau reset
        filterPoint.value = "";
        // Opsional: filterPoint.disabled = true; 
    }
}

// 4. Ambil Profil User (Firebase)
async function getUserProfile(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (snapshot.exists()) {
            const val = snapshot.val();
            userProfile.area = val.area || "";
            userProfile.point = val.point || "";
            
            // Auto-fill Filter sesuai Profil
            if (userProfile.area && filterArea) {
                filterArea.value = userProfile.area;
                updatePointsDropdown(userProfile.area); // Trigger update point list
                
                if (userProfile.point && filterPoint) {
                    filterPoint.value = userProfile.point;
                }
            }
        }
    } catch (err) {
        console.error("Gagal load profil:", err);
    }
}

// 5. Fetch Data Modal (Data Tabel)
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
            // Kita tidak perlu populate filter lagi karena sudah pakai data statis
        } else {
            console.error("Gagal:", result);
            // Jangan alert error kalau data kosong, cukup log saja biar ga ganggu UX
        }

    } catch (error) {
        console.error("Error Fetch:", error);
        alert("Terjadi kesalahan koneksi saat mengambil data.");
    } finally {
        if(loadingOverlay) loadingOverlay.classList.add('d-none');
    }
}

// 6. Render Data (Saat Tombol Tampilkan Diklik)
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
        
        // Match Hari (Exact)
        const matchHari = fHari === "" || itemHari === fHari;

        // Match DPD (Includes agar lebih fleksibel)
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

// 7. Event Listeners Tombol
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
            updatePointsDropdown(userProfile.area); // Trigger update point list
        }
        
        // Reset Point kembali ke PROFIL USER
        if(filterPoint) {
            if (userProfile.point) {
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
