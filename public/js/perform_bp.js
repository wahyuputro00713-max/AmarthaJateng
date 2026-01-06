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

// URL APPS SCRIPT (PASTIKAN INI BENAR)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyUDAYfm4Z02DbO_PHUuaEMoiP6uTJoza5XytvB86h6Msq7rXIZ_0sYOUGYOPfz_i9GJA/exec";

// Global Variables
let allDataBP = []; 
let userRole = ""; 
let myArea = "";
let myPoint = "";

document.addEventListener("DOMContentLoaded", () => {
    // Event Listeners Filter
    const areaSelect = document.getElementById('selArea');
    const pointSelect = document.getElementById('selPoint');
    
    if(areaSelect) areaSelect.addEventListener('change', filterPoints);
    if(pointSelect) pointSelect.addEventListener('change', filterBPs);

    // Bind function ke window agar bisa dipanggil onclick di HTML
    window.applyFilter = applyFilterTrigger; 

    onAuthStateChanged(auth, (user) => {
        if (user) {
            checkUserAccess(user.uid);
        } else {
            window.location.replace("index.html");
        }
    });
});

async function checkUserAccess(uid) {
    try {
        const userRef = ref(db, 'users/' + uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            const idKaryawan = userData.idKaryawan;

            if (idKaryawan) {
                // Ambil Data Master & Profil
                fetchMasterData(idKaryawan);
            } else {
                showError("ID Karyawan tidak terdaftar di database Users Firebase.");
            }
        } else {
            showError("User tidak ditemukan di Firebase.");
        }
    } catch (err) {
        showError("Gagal Auth: " + err.message);
    }
}

async function fetchMasterData(myId) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_dropdown_data" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        // Debugging: Cek jika response bukan JSON (biasanya error HTML dari Google)
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("Response bukan JSON:", text);
            showError("Terjadi kesalahan server (Invalid JSON). Cek Deployment Apps Script.");
            return;
        }

        if (result.result === "success") {
            allDataBP = result.data;
            
            // Cari Profil User yang Login di Data Spreadsheet
            const myProfile = allDataBP.find(item => String(item.id) === String(myId));

            if (myProfile) {
                userRole = String(myProfile.jabatan).toUpperCase().trim();
                myArea = myProfile.area;
                myPoint = myProfile.point;

                console.log("Role:", userRole, "Area:", myArea);

                setupFilterUI();
                fetchPerformData(myId); // Load data awal diri sendiri

            } else {
                // Jika ID user tidak ada di spreadsheet BP, tampilkan error atau load data performa saja (jika ada)
                showError("ID Anda (" + myId + ") tidak ditemukan di Sheet BP. Hubungi Admin.");
            }
        } else {
            showError("Gagal mengambil data master: " + result.message);
        }
    } catch (e) {
        console.error(e);
        showError("Koneksi Error saat ambil data master.");
    }
}

function setupFilterUI() {
    const filterContainer = document.getElementById('filterContainer');
    const selArea = document.getElementById('selArea');
    
    // Default sembunyi
    filterContainer.style.display = "none";

    // Hanya munculkan filter untuk Role tertentu
    if (["RM", "AM", "BM"].includes(userRole)) {
        filterContainer.style.display = "block";
        
        // Ambil list area unik
        const uniqueAreas = [...new Set(allDataBP.map(item => item.area))].sort();
        
        if (userRole === "RM") {
            // RM: Akses Semua Area
            populateSelect(selArea, uniqueAreas);
            selArea.value = myArea; // Default select area sendiri
            selArea.disabled = false;
        } else {
            // AM & BM: Area Terkunci
            populateSelect(selArea, [myArea]);
            selArea.value = myArea;
            selArea.disabled = true; 
        }

        // Jalankan rantai filter selanjutnya
        filterPoints(); 
    }
}

function filterPoints() {
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    
    // Safety check
    if(!selArea || !selPoint) return;

    const selectedArea = selArea.value;

    // Reset Point
    selPoint.innerHTML = '<option value="">Pilih Point...</option>';
    selPoint.disabled = true;

    if (selectedArea) {
        // Filter point sesuai area
        const filteredPoints = [...new Set(allDataBP
            .filter(item => item.area === selectedArea)
            .map(item => item.point)
        )].sort();

        populateSelect(selPoint, filteredPoints);

        if (userRole === "BM") {
            // BM: Point Terkunci
            selPoint.value = myPoint;
            selPoint.disabled = true;
        } else {
            // RM & AM: Bisa pilih point
            selPoint.disabled = false;
            // Auto select jika point sendiri ada di list
            if(filteredPoints.includes(myPoint)) {
               selPoint.value = myPoint; 
            }
        }

        // Jalankan rantai filter selanjutnya
        filterBPs();
    }
}

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
        // Filter BP sesuai Area & Point
        const filteredBPs = allDataBP
            .filter(item => item.area === selectedArea && item.point === selectedPoint)
            .map(item => ({ id: item.id, nama: item.nama }))
            .sort((a, b) => a.nama.localeCompare(b.nama));

        // Isi Dropdown BP
        filteredBPs.forEach(bp => {
            let opt = document.createElement('option');
            opt.value = bp.id;
            opt.textContent = bp.nama;
            selBP.appendChild(opt);
        });

        selBP.disabled = false; // Enable agar bisa dipilih
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

// Helper aman agar tidak error jika elemen tidak ada
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
