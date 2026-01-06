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

// GANTI DENGAN URL DEPLOYMENT TERBARU ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUDAYfm4Z02DbO_PHUuaEMoiP6uTJoza5XytvB86h6Msq7rXIZ_0sYOUGYOPfz_i9GJA/exec";

// Global Variables
let allDataBP = []; // Data master dari spreadsheet (utk isi dropdown)
let userRole = "";  // Role dari Firebase
let myArea = "";    // Area dari Firebase
let myPoint = "";   // Point dari Firebase

document.addEventListener("DOMContentLoaded", () => {
    // Event Listener Dropdown
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    
    if(selArea) selArea.addEventListener('change', filterPoints);
    if(selPoint) selPoint.addEventListener('change', filterBPs);

    window.applyFilter = applyFilterTrigger; 

    onAuthStateChanged(auth, (user) => {
        if (user) {
            checkUserAndRole(user.uid);
        } else {
            window.location.replace("index.html");
        }
    });
});

// 1. Cek Data User Langsung dari Firebase
async function checkUserAndRole(uid) {
    try {
        const userRef = ref(db, 'users/' + uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Baca data Jabatan, Area, dan Point DARI FIREBASE
            const rawJabatan = userData.jabatan ? String(userData.jabatan).toUpperCase() : "";
            
            // Tentukan Role
            if (rawJabatan.includes("RM")) userRole = "RM";
            else if (rawJabatan.includes("AM")) userRole = "AM";
            else if (rawJabatan.includes("BM")) userRole = "BM";
            else userRole = "BP"; // Default

            // Simpan Area & Point User (untuk locking filter nanti)
            myArea = userData.area || "";   
            myPoint = userData.point || ""; 

            console.log(`Login sebagai: ${userRole} | Area: ${myArea} | Point: ${myPoint}`);

            // Ambil Data Master (Semua BP) dari Spreadsheet untuk mengisi dropdown
            fetchDropdownData(userData.idKaryawan);

        } else {
            showError("Data User tidak ditemukan di Firebase.");
        }
    } catch (err) {
        showError("Gagal Auth: " + err.message);
    }
}

// 2. Ambil Opsi Dropdown dari Spreadsheet
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
            allDataBP = result.data;
            
            // Setup Tampilan
            setupFilterUI();

            // Jika dia BP biasa (Bukan Manager), langsung load datanya sendiri
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

// 3. Atur Filter Logic Berdasarkan Role Firebase
function setupFilterUI() {
    const filterContainer = document.getElementById('filterContainer');
    const selArea = document.getElementById('selArea');

    // Default: Sembunyikan Filter
    filterContainer.style.display = "none";

    // Hanya Tampilkan Filter jika RM, AM, atau BM
    if (["RM", "AM", "BM"].includes(userRole)) {
        filterContainer.style.display = "block";
        
        // Ambil list semua Area unik dari Spreadsheet untuk opsi select
        const uniqueAreas = [...new Set(allDataBP.map(item => item.area))].sort();

        // --- LOGIC AREA ---
        if (userRole === "RM") {
            // RM: BISA PILIH SEMUA AREA
            populateSelect(selArea, uniqueAreas);
            selArea.disabled = false;
        
        } else {
            // AM & BM: AREA TERKUNCI sesuai data Firebase
            // Tampilkan hanya area dia sendiri di dropdown
            populateSelect(selArea, [myArea]); 
            selArea.value = myArea;
            selArea.disabled = true; // Disabled agar tidak bisa ganti
        }

        // Trigger logic selanjutnya (Point)
        filterPoints(); 
    }
}

// 4. Logic Filter Point (Cascading)
function filterPoints() {
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    
    if(!selArea || !selPoint) return;
    const selectedArea = selArea.value;

    // Reset Point
    selPoint.innerHTML = '<option value="">Pilih Point...</option>';
    selPoint.disabled = true;

    if (selectedArea) {
        // Ambil Point yang ada di Area terpilih (dari data master)
        const filteredPoints = [...new Set(allDataBP
            .filter(item => item.area === selectedArea)
            .map(item => item.point)
        )].sort();

        populateSelect(selPoint, filteredPoints);

        // --- LOGIC POINT ---
        if (userRole === "BM") {
            // BM: POINT TERKUNCI sesuai data Firebase
            selPoint.value = myPoint;
            selPoint.disabled = true;
        
        } else {
            // RM & AM: BISA PILIH POINT
            selPoint.disabled = false;
            
            // Khusus AM, jika ingin default terpilih pointnya sendiri (opsional):
            if(userRole === "AM" && filteredPoints.includes(myPoint)) {
                selPoint.value = myPoint;
            }
        }
        
        // Lanjut ke filter BP
        filterBPs();
    }
}

// 5. Logic Filter BP (Cascading)
function filterBPs() {
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    const selBP = document.getElementById('selBP');
    
    if(!selArea || !selPoint || !selBP) return;

    const selectedArea = selArea.value;
    const selectedPoint = selPoint.value;

    // Reset BP
    selBP.innerHTML = '<option value="">Pilih BP...</option>';
    selBP.disabled = true;

    if (selectedArea && selectedPoint) {
        // Cari BP di Area & Point tersebut
        const filteredBPs = allDataBP
            .filter(item => item.area === selectedArea && item.point === selectedPoint)
            .map(item => ({ id: item.id, nama: item.nama }))
            .sort((a, b) => a.nama.localeCompare(b.nama));

        // Isi Dropdown
        filteredBPs.forEach(bp => {
            let opt = document.createElement('option');
            opt.value = bp.id;
            opt.textContent = bp.nama;
            selBP.appendChild(opt);
        });

        // Semua Manager (RM, AM, BM) bisa memilih nama BP
        selBP.disabled = false; 
    }
}

function populateSelect(element, items) {
    items.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        element.appendChild(opt);
    });
}

function applyFilterTrigger() {
    const selBP = document.getElementById('selBP');
    if (!selBP) return;
    
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
