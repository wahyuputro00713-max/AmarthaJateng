import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8wOUkyZTa4W2hHHGZq_YKnGFqYEGOuH8",
    authDomain: "amarthajatengwebapp.firebaseapp.com",
    databaseURL: "https://amarthajatengwebapp-default-rtdb.firebaseio.com",
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

// DOM Elements
const pointNameEl = document.getElementById('pointName');
const areaNameEl = document.getElementById('areaName');
const displayDateEl = document.getElementById('displayDate');
const dateInputEl = document.getElementById('dateInput'); // Input Baru
const accordionBP = document.getElementById('accordionBP');

// Global User Data
let userProfile = {};
let globalData = [];

// --- HELPER: CONVERT DATE TO INDO DAY ---
function getHariIndo(dateStr) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = new Date(dateStr);
    return days[d.getDay()];
}

// --- HELPER: FORMAT TANGGAL ---
function formatTanggalIndo(dateStr) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

// 1. CEK AUTH & LOAD USER
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                userProfile = snapshot.val();
                pointNameEl.innerText = userProfile.point || "Point Unknown";
                areaNameEl.innerText = userProfile.area || "Area Unknown";

                // --- LOGIKA KHUSUS RM (UBAH TANGGAL) ---
                const today = new Date().toISOString().split('T')[0];
                
                if (userProfile.jabatan === "RM") {
                    // Tampilkan Input Date, Sembunyikan Text Biasa
                    displayDateEl.classList.add('d-none');
                    dateInputEl.classList.remove('d-none');
                    
                    // Set default hari ini
                    dateInputEl.value = today;

                    // Load Data Hari Ini
                    fetchMajelisData(today);

                    // Event Listener Ganti Tanggal
                    dateInputEl.addEventListener('change', () => {
                        const selectedDate = dateInputEl.value;
                        if(selectedDate) {
                            accordionBP.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2">Memuat data tanggal ${selectedDate}...</p></div>`;
                            fetchMajelisData(selectedDate);
                        }
                    });

                } else {
                    // User Biasa (Tidak bisa ubah tanggal)
                    displayDateEl.innerText = formatTanggalIndo(today);
                    fetchMajelisData(today);
                }
            } else {
                alert("Profil tidak ditemukan!");
                window.location.replace("index.html");
            }
        });
    } else {
        window.location.replace("index.html");
    }
});

// 2. FETCH DATA DARI APPS SCRIPT
async function fetchMajelisData(filterDate) {
    try {
        // Tentukan Hari berdasarkan Tanggal (Senin, Selasa, dll)
        const hariTarget = getHariIndo(filterDate); 
        console.log(`Fetching data for: ${filterDate} (${hariTarget})`);

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_majelis" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === "success") {
            // FILTER LOKAL
            // 1. Filter by Point User (Wajib)
            // 2. Filter by Hari (Sesuai tanggal yg dipilih)
            
            // Normalisasi nama point (hapus spasi berlebih/case insensitive jika perlu)
            const myPoint = String(userProfile.point).trim().toLowerCase();

            globalData = result.data.filter(item => {
                const itemPoint = String(item.cabang).trim().toLowerCase();
                const itemHari = String(item.hari).trim(); // Hari di spreadsheet (Senin, Selasa...)
                
                // Cek Point & Hari
                return itemPoint === myPoint && itemHari === hariTarget;
            });

            renderDashboard(globalData);
        } else {
            console.error("Error API:", result);
            accordionBP.innerHTML = `<div class="text-center py-5 text-danger"><i class="fa-solid fa-triangle-exclamation fa-2x mb-2"></i><p>Gagal memuat data.</p></div>`;
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        accordionBP.innerHTML = `<div class="text-center py-5 text-danger"><p>Terjadi kesalahan koneksi.</p></div>`;
    }
}

// 3. RENDER DASHBOARD (Statistik & List)
function renderDashboard(data) {
    // --- Hitung Statistik ---
    let totalTarget = data.length;
    let bayar = 0, kirim = 0;
    
    // Non-Current Stats
    let ncTotal = 0, ncBayar = 0, ncKirim = 0;

    const groupedBP = {};

    data.forEach(item => {
        const isLunas = item.status_bayar === "Lunas"; // Sesuaikan dgn output Apps Script
        const isKirim = String(item.status_kirim).toLowerCase().includes("sudah");
        const isNC = item.bucket !== "0" && item.bucket !== "Current"; // Asumsi bucket selain 0/Current adalah NC

        if (isLunas) bayar++;
        if (isKirim) kirim++;

        if (isNC) {
            ncTotal++;
            if (isLunas) ncBayar++;
            if (isKirim) ncKirim++;
        }

        // Grouping by BP
        const bpName = item.bp || "Tanpa BP";
        if (!groupedBP[bpName]) groupedBP[bpName] = [];
        groupedBP[bpName].push(item);
    });

    // Update UI Statistik
    document.getElementById('mmTotal').innerText = totalTarget;
    document.getElementById('mmBayar').innerText = bayar;
    document.getElementById('mmKirim').innerText = kirim;

    document.getElementById('ncTotal').innerText = ncTotal;
    document.getElementById('ncBayar').innerText = ncBayar;
    document.getElementById('ncKirim').innerText = ncKirim;

    // --- Render Accordion List ---
    if (totalTarget === 0) {
        accordionBP.innerHTML = `
            <div class="text-center py-5 opacity-50">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486777.png" width="80">
                <p class="mt-3">Tidak ada jadwal majelis untuk hari ini.</p>
            </div>
        `;
        return;
    }

    let html = "";
    Object.keys(groupedBP).sort().forEach((bp, index) => {
        const listMitra = groupedBP[bp];
        
        // Generate Rows Mitra
        const rows = listMitra.map(m => {
            const statusClass = m.status_bayar === "Lunas" ? "status-lunas" : "status-telat";
            const kirimClass = String(m.status_kirim).toLowerCase().includes("sudah") ? "status-kirim" : "status-belum";
            
            return `
                <div class="mitra-row">
                    <div class="mitra-info">
                        <span class="mitra-name">${m.nama_mitra}</span>
                        <div class="d-flex align-items-center gap-2">
                            <span class="mitra-id"><i class="fa-regular fa-id-card me-1"></i>${m.id_mitra}</span>
                            <span class="badge bg-secondary" style="font-size:9px;">${m.majelis}</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center mt-2 mt-sm-0">
                        <span class="status-badge ${statusClass}">${m.status_bayar}</span>
                        <span class="status-badge ${kirimClass}">${String(m.status_kirim).toLowerCase().includes("sudah") ? "Terkirim" : "Belum"}</span>
                        
                        <a href="closing_modal.html?cust=${m.id_mitra}&bp=${encodeURIComponent(bp)}" class="btn btn-sm btn-outline-primary ms-2">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');

        html += `
            <div class="accordion-item mb-3 border rounded overflow-hidden">
                <h2 class="accordion-header">
                    <button class="accordion-button ${index !== 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                        <div class="d-flex justify-content-between w-100 pe-3 align-items-center">
                            <span><i class="fa-solid fa-user-tie me-2"></i>${bp}</span>
                            <span class="badge bg-primary rounded-pill">${listMitra.length}</span>
                        </div>
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#accordionBP">
                    <div class="accordion-body p-0">
                        ${rows}
                    </div>
                </div>
            </div>
        `;
    });

    accordionBP.innerHTML = html;
}
