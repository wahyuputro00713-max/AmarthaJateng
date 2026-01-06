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

// GANTI DENGAN URL APPS SCRIPT ANDA (PASTIKAN DIAKHIRI /exec)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw0OVIz6dm8SRQCQ7eYoQsYPl-uRoeSDyPcWy_T0EvrFg0fxOhpwtZmYgl8Tc8_WRA1kg/exec";

// Global Variable untuk menyimpan data master
let allDataBP = []; 
let userRole = ""; 
let myArea = "";
let myPoint = "";

document.addEventListener("DOMContentLoaded", () => {
    // Event Listener untuk Dropdown Cascading
    document.getElementById('selArea').addEventListener('change', filterPoints);
    document.getElementById('selPoint').addEventListener('change', filterBPs);

    // Agar fungsi applyFilter bisa dipanggil dari HTML onclick
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
                // Ambil Data Master Dropdown Sekaligus Profil User
                fetchMasterData(idKaryawan);
            } else {
                showError("ID Karyawan tidak terdaftar di Database User.");
            }
        } else {
            showError("User tidak ditemukan.");
        }
    } catch (err) {
        showError("Error Auth: " + err.message);
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

        const result = await response.json();

        if (result.result === "success") {
            allDataBP = result.data;
            
            // Cari Data Diri Sendiri di List
            const myProfile = allDataBP.find(item => String(item.id) === String(myId));

            if (myProfile) {
                userRole = String(myProfile.jabatan).toUpperCase().trim();
                myArea = myProfile.area;
                myPoint = myProfile.point;

                // Set Logic Filter Berdasarkan Jabatan
                setupFilterUI();

                // Load Data Awal (Diri Sendiri)
                fetchPerformData(myId); 

            } else {
                // Jika ID tidak ada di sheet BP, asumsi dia BP biasa yang datanya belum masuk sheet BP
                showError("Data Anda tidak ditemukan di Sheet BP. Hubungi Admin.");
            }
        } else {
            showError("Gagal mengambil data master filter.");
        }
    } catch (e) {
        console.error(e);
        showError("Koneksi bermasalah saat ambil data.");
    }
}

function setupFilterUI() {
    const filterContainer = document.getElementById('filterContainer');
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    
    // Cek Role untuk Menampilkan Filter
    if (["RM", "AM", "BM"].includes(userRole)) {
        filterContainer.style.display = "block"; // Munculkan Box Filter
        
        // Ambil Unique Areas
        const uniqueAreas = [...new Set(allDataBP.map(item => item.area))].sort();
        
        // 1. LOGIC AREA
        if (userRole === "RM") {
            // RM: Bebas Pilih Area
            populateSelect(selArea, uniqueAreas);
            selArea.value = myArea; // Default select area sendiri
            selArea.disabled = false;
        
        } else {
            // AM & BM: Area Terkunci
            populateSelect(selArea, [myArea]); // Isi cuma 1 opsi
            selArea.value = myArea;
            selArea.disabled = true; 
        }

        // Trigger update dropdown selanjutnya
        filterPoints(); 
    }
}

function filterPoints() {
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    const selectedArea = selArea.value;

    // Reset Point
    selPoint.innerHTML = '<option value="">Pilih Point...</option>';
    selPoint.disabled = true;

    if (selectedArea) {
        // Ambil points di area terpilih
        const filteredPoints = [...new Set(allDataBP
            .filter(item => item.area === selectedArea)
            .map(item => item.point)
        )].sort();

        populateSelect(selPoint, filteredPoints);

        // 2. LOGIC POINT
        if (userRole === "BM") {
            // BM: Point Terkunci
            selPoint.value = myPoint;
            selPoint.disabled = true;
        } else {
            // RM & AM: Bebas Pilih Point (di Area tsb)
            selPoint.disabled = false;
            // Jika AM, default select point sendiri (opsional)
            if(userRole === "AM" && filteredPoints.includes(myPoint)) {
                selPoint.value = myPoint; 
            }
        }

        filterBPs();
    }
}

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
        // Ambil BP di Area & Point terpilih
        const filteredBPs = allDataBP
            .filter(item => item.area === selectedArea && item.point === selectedPoint)
            .map(item => ({ id: item.id, nama: item.nama }))
            .sort((a, b) => a.nama.localeCompare(b.nama));

        // Isi Dropdown (Value=ID, Text=Nama)
        filteredBPs.forEach(bp => {
            let opt = document.createElement('option');
            opt.value = bp.id;
            opt.textContent = bp.nama;
            selBP.appendChild(opt);
        });

        // 3. LOGIC BP: Semua role (RM, AM, BM) bisa pilih BP
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
    const selectedId = selBP.value;

    if (selectedId) {
        fetchPerformData(selectedId);
    } else {
        alert("Silakan pilih Nama BP terlebih dahulu.");
    }
}

async function fetchPerformData(targetId) {
    // UI Loading
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
            showError(result.message || "Data tidak ditemukan.");
        }

    } catch (error) {
        console.error(error);
        showError("Gagal mengambil data performa.");
    }
}

function renderData(data) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dataContent').style.display = 'block';

    document.getElementById('displayNama').innerText = data.nama || "-";
    document.getElementById('displayJabatan').innerText = data.jabatan || "-";
    document.getElementById('valPoint').innerText = data.point || "0";

    document.getElementById('harianSos').innerText = data.harian.sosialisasi || "0";
    document.getElementById('harianColLoan').innerText = data.harian.col_loan || "0";
    document.getElementById('harianColAmt').innerText = formatRupiah(data.harian.col_amount);

    document.getElementById('bulananSos').innerText = data.bulanan.sosialisasi || "0";
    document.getElementById('bulananColLoan').innerText = data.bulanan.col_loan || "0";
    document.getElementById('bulananColAmt').innerText = formatRupiah(data.bulanan.col_amount);
}

function showError(msg) {
    document.getElementById('loading').style.display = 'none';
    const errDiv = document.getElementById('errorMsg');
    errDiv.style.display = 'block';
    errDiv.innerText = msg;
}

function formatRupiah(angka) {
    if (!angka || isNaN(angka)) return "Rp 0";
    return "Rp " + Number(angka).toLocaleString('id-ID');
}
