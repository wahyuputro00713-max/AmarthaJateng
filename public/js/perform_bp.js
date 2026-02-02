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
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDMA8WmDpIEn0nx5-iHCXSYIc0pxCwPmPXRLASIyUmR4qAJzEzNONSt4mM-iL3HUt2NA/exec";

// Data Master Area & Point (Hardcoded agar rapi)
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pangasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
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

async function checkUserAndRole(uid) {
    try {
        const userRef = ref(db, 'users/' + uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Tentukan Role (Normalisasi ke UpperCase)
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
        // Tampilkan indikator loading di dropdown BP
        const selBP = document.getElementById('selBP');
        if(selBP) {
            selBP.innerHTML = '<option>Sedang memuat data...</option>';
            selBP.disabled = true;
        }

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_dropdown_data" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === "success") {
            allDataBP = result.data; // Simpan data BP
            console.log("Data BP Loaded:", allDataBP.length, "baris");

            setupFilterUI();

            // Jika BP biasa, langsung load data dia sendiri
            if (userRole === "BP") {
                fetchPerformData(myIdKaryawan);
            }
        } else {
            showError("Gagal mengambil data master. Pastikan Code.gs sudah di-Deploy.");
            if(selBP) selBP.innerHTML = '<option>Gagal memuat data</option>';
        }
    } catch (e) {
        console.error(e);
        showError("Koneksi Error: " + e.message);
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
            // RM: Bebas Pilih Area
            populateSelect(selArea, areaList, "Pilih Area...");
            selArea.disabled = false;
        
        } else {
            // AM & BM: Area Terkunci (Auto Select)
            const cleanMyArea = clean(myArea);
            
            // Cari area di list yang cocok dengan area user
            const matchedArea = areaList.find(a => {
                const cleanA = clean(a);
                return cleanA === cleanMyArea || cleanA.includes(cleanMyArea) || cleanMyArea.includes(cleanA);
            });

            if (matchedArea) {
                populateSelect(selArea, [matchedArea]); 
                selArea.value = matchedArea;
            } else {
                // Fallback jika tidak ada di list hardcoded
                populateSelect(selArea, [myArea]); 
                selArea.value = myArea;
            }
            selArea.disabled = true;
        }

        // Trigger update Point
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

        // Ambil list point dari dataPoints (Hardcoded) jika ada
        if (dataPoints[selectedArea]) {
            pointsToShow = dataPoints[selectedArea].sort();
        } else {
            // Fallback: ambil unik dari spreadsheet jika area tidak dikenal
            const fArea = clean(selectedArea);
            pointsToShow = [...new Set(allDataBP
                .filter(item => {
                    const iArea = clean(item.area);
                    return iArea.includes(fArea) || fArea.includes(iArea);
                })
                .map(item => item.point)
            )].sort();
        }

        populateSelect(selPoint, pointsToShow, "Pilih Point...");

        if (userRole === "BM") {
            // BM: Point Terkunci
            const cleanMyPoint = clean(myPoint);
            
            // Cari point yang cocok
            const matchedPoint = pointsToShow.find(p => {
                const cleanP = clean(p);
                return cleanP === cleanMyPoint || cleanP.includes(cleanMyPoint) || cleanMyPoint.includes(cleanP);
            });

            if (matchedPoint) {
                selPoint.value = matchedPoint;
            } else {
                // Tambahkan opsi paksa jika tidak ketemu di list
                let opt = document.createElement('option');
                opt.value = myPoint;
                opt.textContent = myPoint;
                selPoint.appendChild(opt);
                selPoint.value = myPoint;
            }
            selPoint.disabled = true;
            
            // Auto Load BP untuk BM
            filterBPs(); 
        
        } else {
            // RM & AM: Bisa pilih point
            selPoint.disabled = false;
            
            // Khusus AM: Auto-select point sendiri jika ada di list
            if(userRole === "AM") {
                const cleanMyPoint = clean(myPoint);
                const matchedPoint = pointsToShow.find(p => {
                    const cleanP = clean(p);
                    return cleanP === cleanMyPoint || cleanP.includes(cleanMyPoint) || cleanMyPoint.includes(cleanP);
                });

                if(matchedPoint) {
                    selPoint.value = matchedPoint;
                    filterBPs(); // Auto Load BP untuk AM
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

        console.log("Filtering BP for:", selectedArea, selectedPoint);

        const filteredBPs = allDataBP
            .filter(item => {
                const p_area_clean = clean(item.area);
                const p_point_clean = clean(item.point);
                
                // Logika pencocokan fleksibel (bolak-balik includes)
                const matchArea = p_area_clean.includes(fArea) || fArea.includes(p_area_clean);
                const matchPoint = p_point_clean.includes(fPoint) || fPoint.includes(p_point_clean);
                
                return matchArea && matchPoint;
            })
            .map(item => ({ id: item.id, nama: item.nama }))
            .sort((a, b) => a.nama.localeCompare(b.nama));

        // Isi Dropdown
        selBP.innerHTML = "";
        
        if (filteredBPs.length > 0) {
            let defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.textContent = `Pilih BP (${filteredBPs.length} ditemukan)`;
            selBP.appendChild(defaultOpt);

            filteredBPs.forEach(bp => {
                let opt = document.createElement('option');
                opt.value = bp.id;
                opt.textContent = bp.nama;
                selBP.appendChild(opt);
            });
            selBP.disabled = false; // AKTIFKAN DROPDOWN
        } else {
            let opt = document.createElement('option');
            opt.value = "";
            opt.textContent = "-- Tidak ada BP ditemukan --";
            selBP.appendChild(opt);
            selBP.disabled = true; // Nonaktifkan jika kosong
            
            // Opsional: Cek console untuk debug
            console.warn("Tidak ada BP yang cocok dengan Area/Point ini di Spreadsheet.");
        }
    }
}

// --- HELPER FUNCTIONS ---

// Fungsi Clean: Hapus spasi & simbol, lowercase
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
