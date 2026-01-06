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
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUDAYfm4Z02DbO_PHUuaEMoiP6uTJoza5XytvB86h6Msq7rXIZ_0sYOUGYOPfz_i9GJA/exec";

// --- DATA STRUKTUR AREA & POINT (Sama persis dengan closing_point.js) ---
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
let allDataBP = []; // Data BP dari Spreadsheet
let userRole = "";  
let myArea = "";    
let myPoint = "";   

document.addEventListener("DOMContentLoaded", () => {
    // Event Listener Filter
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    
    // Cascading: Area berubah -> Update Point
    if(selArea) {
        selArea.addEventListener('change', () => {
            updatePointOptions(selArea.value);
        });
    }

    // Cascading: Point berubah -> Filter Nama BP
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
            
            // Ambil Jabatan, Area, Point (Normalisasi ke UpperCase)
            const rawJabatan = userData.jabatan ? String(userData.jabatan).toUpperCase() : "";
            
            if (rawJabatan.includes("RM")) userRole = "RM";
            else if (rawJabatan.includes("AM")) userRole = "AM";
            else if (rawJabatan.includes("BM")) userRole = "BM";
            else userRole = "BP"; 

            myArea = userData.area || "";   
            myPoint = userData.point || ""; 

            // Ambil Data Master BP dari Spreadsheet
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
            
            // Setup Filter UI berdasarkan Role
            setupFilterUI();

            // Jika BP biasa, langsung load data dia sendiri
            if (userRole === "BP") {
                fetchPerformData(myIdKaryawan);
            }
        } else {
            showError("Gagal mengambil data master BP.");
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
        
        // Ambil Daftar Area dari dataPoints (Hardcoded)
        const areaList = Object.keys(dataPoints).sort();

        if (userRole === "RM") {
            // RM: Bisa pilih semua Area
            populateSelect(selArea, areaList, "Pilih Area...");
            selArea.disabled = false;
        
        } else {
            // AM & BM: Area Terkunci (Sesuai Firebase)
            // Cek apakah area user ada di daftar hardcoded
            // Gunakan logika clean() agar pencocokan nama area lebih fleksibel
            const cleanMyArea = clean(myArea);
            const matchedArea = areaList.find(a => clean(a) === cleanMyArea || clean(a).includes(cleanMyArea) || cleanMyArea.includes(clean(a)));

            if (matchedArea) {
                populateSelect(selArea, [matchedArea]); 
                selArea.value = matchedArea;
            } else {
                // Fallback: tampilkan apa adanya dari Firebase jika tidak match hardcoded
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
    
    // Reset Point & BP
    selPoint.innerHTML = '<option value="">Pilih Point...</option>';
    selPoint.disabled = true;
    
    const selBP = document.getElementById('selBP');
    if(selBP) {
        selBP.innerHTML = '<option value="">Pilih BP...</option>';
        selBP.
