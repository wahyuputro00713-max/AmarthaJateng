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

// URL APPS SCRIPT (Pastikan sudah Deploy New Version)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUDAYfm4Z02DbO_PHUuaEMoiP6uTJoza5XytvB86h6Msq7rXIZ_0sYOUGYOPfz_i9GJA/exec";

// --- DATA STRUKTUR AREA & POINT (Sesuai closing_point.js) ---
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// Global Variables
let allDataBP = []; // Data BP (Orang) dari Spreadsheet
let userRole = "";  
let myArea = "";    
let myPoint = "";   

document.addEventListener("DOMContentLoaded", () => {
    // Event Listener Filter
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    
    // Cascading: Ganti Area -> Update Point
    if(selArea) {
        selArea.addEventListener('change', () => {
            updatePointOptions(selArea.value);
        });
    }

    // Cascading: Ganti Point -> Update BP
    if(selPoint) {
        selPoint.addEventListener('change', () => {
            filterBPs();
        });
    }

    // Tombol Tampilkan
    window.applyFilter = applyFilterTrigger; 

    // Cek Login
    onAuthStateChanged(auth, (user) => {
        if (user) {
            checkUserAndRole(user.uid);
        } else {
            window.location.replace("index.html");
        }
    });
});

// 1. Cek User & Role dari Firebase
async function checkUserAndRole(uid) {
    try {
        const userRef = ref(db, 'users/' + uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Ambil Jabatan, Area, Point
            const rawJabatan = userData.jabatan ? String(userData.jabatan).toUpperCase() : "";
            
            if (rawJabatan.includes("RM")) userRole = "RM";
            else if (rawJabatan.includes("AM")) userRole = "AM";
            else if (rawJabatan.includes("BM")) userRole = "BM";
            else userRole = "BP"; 

            myArea = userData.area || "";   
            myPoint = userData.point || ""; 

            console.log(`Role: ${userRole} | Area: ${myArea} | Point: ${myPoint}`);

            // Ambil Data Master BP (Orang) dari Spreadsheet
            fetchDropdownData(userData.idKaryawan);

        } else {
            showError("Data User tidak ditemukan di Firebase.");
        }
    } catch (err) {
        showError("Gagal Auth: " + err.message);
    }
}

// 2. Ambil Data BP dari Spreadsheet
async function fetchDropdownData(myIdKaryawan) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_dropdown_data" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === "success") {
            allDataBP = result.data; // Simpan data BP
            
            // Setup Tampilan Filter
            setupFilterUI();

            // Jika BP biasa, langsung load data dia
            if (userRole === "BP") {
                fetchPerformData(myIdKaryawan);
            }
        } else {
            showError("Gagal mengambil data master.");
        }
    } catch (e) {
        console.error(e);
        showError("Koneksi Error: " + e.message);
    }
}

// 3. Setup Filter UI (Menggunakan dataPoints Hardcoded)
function setupFilterUI() {
    const filterContainer = document.getElementById('filterContainer');
    const selArea = document.getElementById('selArea');

    filterContainer.style.display = "none";

    // Hanya Manager (RM, AM, BM) yang lihat filter
    if (["RM", "AM", "BM"].includes(userRole)) {
        filterContainer.style.display = "block";
        
        // Ambil Daftar Area dari dataPoints (Hardcoded) agar rapi
        const areaList = Object.keys(dataPoints).sort();

        // --- LOGIC AREA ---
        if (userRole === "RM") {
            // RM: Bisa pilih semua Area
            populateSelect(selArea, areaList, "Pilih Area...");
            selArea.disabled = false;
        
        } else {
            // AM & BM: Area Terkunci (Sesuai Firebase)
            // Cek apakah area user ada di daftar dataPoints
            if (areaList.includes(myArea)) {
                populateSelect(selArea, [myArea]); 
                selArea.value = myArea;
            } else {
                // Fallback jika nama area di firebase beda dikit, tampilkan apa adanya
                populateSelect(selArea, [myArea]); 
                selArea.value = myArea;
            }
            selArea.disabled = true;
        }

        // Trigger update Point
        updatePointOptions(selArea.value);
    }
}

// 4. Update Dropdown Point (Berdasarkan Area yang dipilih)
function updatePointOptions(selectedArea) {
    const selPoint = document.getElementById('selPoint');
    
    // Reset Point
    selPoint.innerHTML = '<option value="">Pilih Point...</option>';
    selPoint.disabled = true;
    
    // Reset BP juga
    const selBP = document.getElementById('selBP');
    if(selBP) {
        selBP.innerHTML = '<option value="">Pilih BP...</option>';
        selBP.disabled = true;
    }

    if (selectedArea) {
        let pointsToShow = [];

        // Ambil list point dari dataPoints (Hardcoded)
        if (dataPoints[selectedArea]) {
            pointsToShow = dataPoints[selectedArea].sort();
        } else {
            // Jika area tidak ada di hardcoded (misal typo di firebase), 
            // coba cari dari data spreadsheet (fallback)
            pointsToShow = [...new Set(allDataBP
                .filter(item => item.area === selectedArea)
                .map(item => item.point)
            )].sort();
        }

        populateSelect(selPoint, pointsToShow, "Pilih Point...");

        // --- LOGIC POINT ---
        if (userRole === "BM") {
            // BM: Point Terkunci
            selPoint.value = myPoint;
            selPoint.disabled = true;
            
            // Langsung load BP
            filterBPs(); 
        
        } else {
            // RM & AM: Bisa pilih point
            selPoint.disabled = false;
            
            // Khusus AM: Auto-select point sendiri jika ada di list
            if(userRole === "AM" && pointsToShow.includes(myPoint)) {
                selPoint.value = myPoint;
                // Langsung load BP
                filterBPs();
            }
        }
    }
}

// 5. Filter BP (Berdasarkan Area & Point yang dipilih)
function filterBPs() {
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    const selBP = document.getElementById('selBP');
    
    const selectedArea = selArea.value;
    const selectedPoint = selPoint.value;

    // Reset BP
    selBP.innerHTML = '<option value="">Pilih BP...</option>';
    selBP.disabled = true;

    if (selectedArea && selectedPoint) {
        // Cari Nama BP dari data Spreadsheet (allDataBP)
        // Kita cocokan Area & Point. 
        // Note: Kita gunakan .includes() atau clean string agar lebih flexible 
        // jika ada perbedaan spasi antara hardcoded vs spreadsheet.
        
        const filteredBPs = allDataBP
            .filter(item => {
                // Normalisasi string (hapus spasi, lowercase) utk perbandingan aman
                const dataArea = cleanStr(item.area);
                const dataPoint = cleanStr(item.point);
                const selAreaClean = cleanStr(selectedArea);
                const selPointClean = cleanStr(selectedPoint);
                
                return dataArea === selAreaClean && dataPoint === selPointClean;
            })
            .map(item => ({ id: item.id, nama: item.nama }))
            .sort((a, b) => a.nama.localeCompare(b.nama));

        // Isi Dropdown
        filteredBPs.forEach(bp => {
            let opt = document.createElement('option');
            opt.value = bp.id;
            opt.textContent = bp.nama;
            selBP.appendChild(opt);
        });

        selBP.disabled = false; 
    }
}

// Helper: Bersihkan string untuk perbandingan
function cleanStr(str) {
    return String(str || "").toLowerCase().replace(/\s+/g, '').trim();
}

function populateSelect(element, items, defaultText = "") {
    // Simpan opsi default (indeks 0) jika ada
    if (defaultText) {
        element.innerHTML = `<option value="">${defaultText}</option>`;
    } else {
        element.innerHTML = "";
    }

    items.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        element.appendChild(opt);
    });
}

function applyFilterTrigger() {
    const selBP = document.getElementById('selBP');
    const selectedId = selBP.value;

    if (selectedId) {
        fetchPerformData(selectedId);
    } else {
        alert("Silakan pilih Nama BP terlebih dahulu.");
    }
}

async function fetchPerformData(targetId) {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('dataContent').style.display = 'none';
    document.getElementById('errorMsg').style.display = 'none';

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: "get_perform_bp",
                targetId: targetId
            }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === "success") {
            renderData(result.data);
        } else {
            showError(result.message || "Data performa tidak ditemukan.");
        }

    } catch (error) {
        console.error(error);
        showError("Gagal mengambil data performa.");
    }
}

function renderData(data) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dataContent').style.display = 'block';

    setText('displayNama', data.nama);
    setText('displayJabatan', data.jabatan);
    setText('valPoint', data.point);
    setText('harianSos', data.harian.sosialisasi);
    setText('harianColLoan', data.harian.col_loan);
    setText('harianColAmt', formatRupiah(data.harian.col_amount));
    setText('bulananSos', data.bulanan.sosialisasi);
    setText('bulananColLoan', data.bulanan.col_loan);
    setText('bulananColAmt', formatRupiah(data.bulanan.col_amount));
}

function setText(id, text) {
    const el = document.getElementById(id);
    if(el) el.innerText = (text === undefined || text === null || text === "") ? "-" : text;
}

function showError(msg) {
    const loading = document.getElementById('loading');
    const errDiv = document.getElementById('errorMsg');
    if(loading) loading.style.display = 'none';
    if(errDiv) {
        errDiv.style.display = 'block';
        errDiv.innerText = msg;
    }
}

function formatRupiah(angka) {
    if (!angka || isNaN(angka)) return "Rp 0";
    return "Rp " + Number(angka).toLocaleString('id-ID');
}
