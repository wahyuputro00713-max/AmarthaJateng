import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, set, onValue, off, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- KONFIGURASI FIREBASE ---
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

// =========================================================================
// PASTIKAN URL INI SAMA DENGAN HASIL DEPLOY TERBARU ANDA DI APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxQULUjMJ494zBZ8L-pZJvtXr9vwmpWmEdjkWFchXURoEe5AIriDJCSMEE17sq4MgEi/exec"; 
const ADMIN_ID = "17246";
// =========================================================================

const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pangasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

let userProfile = null;
let currentDayName = ""; 
let currentRole = ""; 
let globalMitraList = []; 
let allRawData = []; 

// DATA LOKAL (Disimpan di Browser)
let draftData = {}; 
let readStatusData = {}; 

let isPageLocked = false;
let lockOwner = "Admin"; 
let currentStats = { total: 0, telat: 0, bayar: 0 };
let currentLockListener = null; 

// Helper Strings
const clean = (str) => {
    if (!str) return "";
    return String(str).toLowerCase().replace(/[^a-z0-9]/g, "");
};

// =================================================================
// 1. STORAGE MANAGEMENT
// =================================================================

function getStorageKey() {
    const dateInput = document.getElementById('dateInput');
    let dateStr = "";
    if (dateInput && !dateInput.classList.contains('d-none') && dateInput.value) {
        dateStr = dateInput.value; 
    } else {
        dateStr = new Date().toLocaleDateString('en-CA');
    }
    
    const userId = userProfile ? (userProfile.idKaryawan || "guest") : "guest";
    return `closing_draft_${userId}_${dateStr}`;
}

function loadFromStorage() {
    try {
        const key = getStorageKey();
        const raw = localStorage.getItem(key);
        if (raw) {
            draftData = JSON.parse(raw);
        } else {
            draftData = {};
        }
        
        const readKey = `closing_read_${new Date().toLocaleDateString('en-CA')}`;
        const rawRead = localStorage.getItem(readKey);
        readStatusData = rawRead ? JSON.parse(rawRead) : {};

    } catch (e) {
        console.error("Gagal load storage:", e);
        draftData = {};
    }
}

function saveToStorage(id, isChecked, reason, day) {
    if (!draftData) draftData = {};
    
    const safeId = String(id).replace(/[.#$/[\]]/g, "_"); 
    
    draftData[safeId] = {
        checked: isChecked,
        reason: reason || "",
        day: day || ""
    };

    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(draftData));
}

// =================================================================
// 2. LOCK SYSTEM (FIREBASE)
// =================================================================

function setGlobalLock(status) {
    if(!userProfile || !userProfile.point) return;
    const dateInput = document.getElementById('dateInput');
    let dateStr = "";
    if (dateInput && !dateInput.classList.contains('d-none')) {
        dateStr = dateInput.value; 
    } else {
        dateStr = new Date().toLocaleDateString('en-CA');
    }

    const pointKey = clean(userProfile.point); 
    const lockPath = `closing_locks/${pointKey}/${dateStr}`;

    if (status === true) {
        set(ref(db, lockPath), {
            isLocked: true,
            lockedBy: userProfile.nama || "User",
            lockedAt: new Date().toISOString()
        });
    }
}

function checkGlobalLock() {
    if(!userProfile || !userProfile.point) return;

    const dateInput = document.getElementById('dateInput');
    let dateStr = "";
    if (dateInput && !dateInput.classList.contains('d-none')) {
        dateStr = dateInput.value;
    } else {
        dateStr = new Date().toLocaleDateString('en-CA');
    }

    const pointKey = clean(userProfile.point);
    const lockPath = `closing_locks/${pointKey}/${dateStr}`;
    const lockRef = ref(db, lockPath);

    if (currentLockListener) {
        off(lockRef, 'value', currentLockListener);
    }

    currentLockListener = onValue(lockRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.isLocked === true) {
            isPageLocked = true;
            lockOwner = data.lockedBy || "Admin";
            applyLockMode(lockOwner);
        } else {
            isPageLocked = false;
            releaseLockMode();
        }
    });
}

window.unlockGlobalStatus = function() {
    if (!userProfile || !userProfile.point) return;
    
    if (!["RM", "ADMIN"].includes(currentRole) && userProfile.idKaryawan !== ADMIN_ID) {
        alert("Hanya RM atau Admin yang bisa membuka kunci laporan.");
        return;
    }

    if (!confirm("Apakah Anda yakin ingin MEMBUKA KUNCI laporan ini?\nUser lain akan bisa mengedit kembali.")) {
        return;
    }

    const dateInput = document.getElementById('dateInput');
    let dateStr = "";
    if (dateInput && !dateInput.classList.contains('d-none')) {
        dateStr = dateInput.value; 
    } else {
        dateStr = new Date().toLocaleDateString('en-CA');
    }
    const pointKey = clean(userProfile.point); 
    const lockPath = `closing_locks/${pointKey}/${dateStr}`;

    remove(ref(db, lockPath))
        .then(() => {
            alert("Laporan berhasil dibuka kembali!");
        })
        .catch((error) => {
            alert("Gagal membuka kunci: " + error.message);
        });
};

window.markMajelisAsRead = function(uniqueKey, elementId) {
    if (!readStatusData[uniqueKey]) {
        readStatusData[uniqueKey] = true;
        localStorage.setItem(`closing_read_${new Date().toLocaleDateString('en-CA')}`, JSON.stringify(readStatusData));
        const dot = document.getElementById(`notif-${elementId}`);
        if(dot) dot.style.display = 'none';
    }
};

// =================================================================
// 3. AUTH & INIT
// =================================================================

onAuthStateChanged(auth, (user) => {
    if (user) {
        checkUserRole(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

function checkUserRole(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            currentRole = (data.jabatan || "").toUpperCase();
            if (["RM", "AM", "BM", "ADMIN"].includes(currentRole) || String(data.idKaryawan).trim() === ADMIN_ID) {
                userProfile = data; initPage();
            } else {
                alert("Akses Ditolak."); window.location.replace("home.html");
            }
        } else { window.location.replace("home.html"); }
    });
}

function initPage() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    document.getElementById('displayDate').textContent = today.toLocaleDateString('id-ID', options);

    const areaEl = document.getElementById('areaName');
    const pointEl = document.getElementById('pointName');
    if(areaEl) areaEl.textContent = userProfile.area || "Area -";
    if(pointEl) pointEl.textContent = userProfile.point || "Point -";

    const dateInput = document.getElementById('dateInput');
    const displayDate = document.getElementById('displayDate');

    if (currentRole === "RM" && dateInput) {
        displayDate.classList.add('d-none');
        dateInput.classList.remove('d-none');
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        currentDayName = days[today.getDay()];

        dateInput.addEventListener('change', function() {
            if (this.value) {
                const parts = this.value.split('-');
                const selectedDate = new Date(parts[0], parts[1] - 1, parts[2]); 
                currentDayName = days[selectedDate.getDay()]; 
                const container = document.getElementById('accordionBP');
                if(container) container.innerHTML = `<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-2">Memuat data hari ${currentDayName}...</p></div>`;
                
                isPageLocked = false; 
                checkGlobalLock(); 
                loadFromStorage(); 

                setTimeout(() => { filterAndRenderData(); }, 500);
            }
        });
    } else {
        currentDayName = days[today.getDay()]; 
    }

    let targetPoint = (["RM", "AM", "ADMIN"].includes(currentRole)) ? "ALL" : userProfile.point;
    
    setTimeout(() => { 
        checkGlobalLock(); 
        loadFromStorage();
    }, 1000); 
    
    fetchRepaymentData(targetPoint);
}

async function fetchRepaymentData(targetPoint) {
    const container = document.getElementById('accordionBP');
    const btnVal = document.getElementById('btnValidateAll');

    if (btnVal) {
        btnVal.disabled = true;
        btnVal.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Data..`;
        btnVal.classList.remove('btn-success', 'btn-primary', 'btn-danger');
        btnVal.classList.add('btn-secondary');
    }

    try {
        if(container) container.innerHTML =
