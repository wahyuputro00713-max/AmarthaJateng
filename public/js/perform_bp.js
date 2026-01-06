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

// URL APPS SCRIPT (Pastikan Code.gs sudah di-Deploy New Version)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDMA8WmDpIEn0nx5-iHCXSYIc0pxCwPmPXRLASIyUmR4qAJzEzNONSt4mM-iL3HUt2NA/exec";

// --- DATA MASTER HARDCODED (Sama dengan Closing Point) ---
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
let allDataBP = [];
let userRole = "";  
let myArea = "";    
let myPoint = "";   

document.addEventListener("DOMContentLoaded", () => {
    // Event Listener Filter
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    
    if(selArea) {
        selArea.addEventListener('change', () => {
            updatePointOptions(selArea.value);
        });
    }

    if(selPoint) {
        selPoint.addEventListener('change', () => {
            filterBPs();
        });
    }

    // Binding Tombol Tampilkan ke Window agar bisa di-klik di HTML
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
            setupFilterUI();

            // Jika BP biasa, langsung load data dia sendiri
            if (userRole === "BP") {
                fetchPerformData(myIdKaryawan);
            }
        } else {
            showError("Gagal mengambil data master. Pastikan Code.gs sudah di-Deploy New Version.");
        }
    } catch (e) {
        console.error(e);
        showError("Koneksi Error. Cek apakah script sudah di-deploy: " + e.message);
    }
}

function setupFilterUI() {
    const filterContainer = document.getElementById('filterContainer');
    const selArea = document.getElementById('selArea');

    if(!filterContainer || !selArea) return;

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
            const cleanMyArea = clean(myArea);
            const matchedArea = areaList.find(a => clean(a) === cleanMyArea || clean(a).includes(cleanMyArea) || cleanMyArea.includes(clean(a)));

            if (matchedArea) {
                populateSelect(selArea, [matchedArea]); 
                selArea.value = matchedArea;
            } else {
                populateSelect(selArea, [myArea]); 
                selArea.value = myArea;
            }
            selArea.disabled = true;
        }

        updatePointOptions(selArea.value);
    }
}

function updatePointOptions(selectedArea) {
    const selPoint = document.getElementById('selPoint');
    const selBP = document.getElementById('selBP');
    
    if(!selPoint || !selBP) return;

    // Reset Point & BP
    selPoint.innerHTML = '<option value="">Pilih Point...</option>';
    selPoint.disabled = true;
    selBP.innerHTML = '<option value="">Pilih BP...</option>';
    selBP.disabled = true;

    if (selectedArea) {
        let pointsToShow = [];

        // Ambil list point dari dataPoints (Hardcoded)
        if (dataPoints[selectedArea]) {
            pointsToShow = dataPoints[selectedArea].sort();
        } else {
            // Fallback: ambil dari spreadsheet
            pointsToShow = [...new Set(allDataBP
                .filter(item => clean(item.area) === clean(selectedArea))
                .map(item => item.point)
            )].sort();
        }

        populateSelect(selPoint, pointsToShow, "Pilih Point...");

        if (userRole === "BM") {
            // BM: Point Terkunci
            const cleanMyPoint = clean(myPoint);
            const matchedPoint = pointsToShow.find(p => clean(p) === cleanMyPoint || clean(p).includes(cleanMyPoint) || cleanMyPoint.includes(clean(p)));

            if (matchedPoint) {
                selPoint.value = matchedPoint;
            } else {
                let opt = document.createElement('option');
                opt.value = myPoint;
                opt.textContent = myPoint;
                selPoint.appendChild(opt);
                selPoint.value = myPoint;
            }
            selPoint.disabled = true;
            
            filterBPs(); 
        
        } else {
            // RM & AM: Bisa pilih point
            selPoint.disabled = false;
            
            // Khusus AM: Auto-select point sendiri
            if(userRole === "AM") {
                const cleanMyPoint = clean(myPoint);
                const matchedPoint = pointsToShow.find(p => clean(p) === cleanMyPoint || clean(p).includes(cleanMyPoint) || cleanMyPoint.includes(clean(p)));
                if(matchedPoint) {
                    selPoint.value = matchedPoint;
                    filterBPs(); 
                }
            }
        }
    }
}

function filterBPs() {
    const selArea = document.getElementById('selArea');
    const selPoint = document.getElementById('selPoint');
    const selBP = document.getElementById('selBP');
    
    if(!selArea || !selPoint || !selBP) return;

    const selectedArea = selArea.value;
    const selectedPoint = selPoint.value;

    selBP.innerHTML = '<option value="">Pilih BP...</option>';
    selBP.disabled = true;

    if (selectedArea && selectedPoint) {
        const fArea = clean(selectedArea);
        const fPoint = clean(selectedPoint);

        const filteredBPs = allDataBP
            .filter(item => {
                const p_area_clean = clean(item.area);
                const p_point_clean = clean(item.point);
                return (p_area_clean.includes(fArea) || fArea.includes(p_area_clean)) &&
                       (p_point_clean.includes(fPoint) || fPoint.includes(p_point_clean));
            })
            .map(item => ({ id: item.id, nama: item.nama }))
            .sort((a, b) => a.nama.localeCompare(b.nama));

        if (filteredBPs.length > 0) {
            filteredBPs.forEach(bp => {
                let opt = document.createElement('option');
                opt.value = bp.id;
                opt.textContent = bp.nama;
                selBP.appendChild(opt);
            });
            selBP.disabled = false;
        } else {
            selBP.innerHTML = '<option value="">-- Tidak ada BP --</option>';
            selBP.disabled = true;
        }
    }
}

// --- FUNGSI UTAMA LOAD DATA ---
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

function applyFilterTrigger() {
    const selBP = document.getElementById('selBP');
    if (selBP && selBP.value) {
        fetchPerformData(selBP.value);
    } else {
        alert("Silakan pilih Nama BP terlebih dahulu.");
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

// --- HELPER FUNCTIONS ---
function clean(str) {
    if (!str) return "";
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function populateSelect(element, items, defaultText = "") {
    element.innerHTML = ""; 
    if (defaultText) {
        element.innerHTML = `<option value="">${defaultText}</option>`;
    }
    items.forEach(item => {
        let opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        element.appendChild(opt);
    });
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
