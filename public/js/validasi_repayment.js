import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Konfigurasi Firebase
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

// URL Script Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzf9Pwl7VXVppjStO3dMkcRB5ftXwgRIlB5Ad93V1zArxToD3XdWrEVvdizSmfcKRXp/exec"; 

let userProfile = null;
let allData = [];

// 1. CEK AUTH & ROLE
onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                userProfile = snapshot.val();
                // --- UPDATE: IZINKAN RM AKSES ---
                if (["RM", "AM", "ADMIN"].includes(userProfile.jabatan)) {
                    document.getElementById('areaInfo').innerText = "Area: " + (userProfile.area || "-");
                    listenToRejectQueue();
                } else {
                    alert("Akses Ditolak. Khusus AM/RM/ADMIN.");
                    window.location.replace("home.html");
                }
            } else { window.location.replace("home.html"); }
        });
    } else { window.location.replace("index.html"); }
});

// 2. DENGARKAN DATA FIREBASE (REALTIME)
function listenToRejectQueue() {
    const container = document.getElementById('contentList');
    const rejectRef = ref(db, 'reject_queue');

    onValue(rejectRef, (snapshot) => {
        container.innerHTML = ""; 
        const data = snapshot.val();

        if (data) {
            let rawList = Object.values(data);

            // --- FILTER DATA BERDASARKAN AREA AM ---
            // Jika AM, hanya tampilkan data dari area yang sama
            // Jika RM atau ADMIN, tampilkan SEMUA (Lewati filter ini)
            if (userProfile.jabatan === "AM") {
                const myArea = (userProfile.area || "").toLowerCase().trim();
                rawList = rawList.filter(item => {
                    const itemArea = (item.area || "").toLowerCase().trim();
                    return itemArea === myArea;
                });
            }

            allData = rawList;
            setupPointFilter(allData);
            renderData(allData);
        } else {
            container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-check-circle mb-2 fs-1 text-success"></i><p>Tidak ada antrian validasi Reject.</p></div>`;
        }
    });
}

// 3. FILTER POINT
function setupPointFilter(data) {
    const select = document.getElementById('filterPoint');
    const currentVal = select.value;
    
    select.innerHTML = '<option value="ALL">Semua Point</option>';
    const points = [...new Set(data.map(item => item.point))].sort();
    
    points.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p; opt.innerText = p;
        if(p === currentVal) opt.selected = true;
        select.appendChild(opt);
    });

    const newSelect = select.cloneNode(true);
    select.parentNode.replaceChild(newSelect, select);
    
    newSelect.addEventListener('change', () => {
        const val = newSelect.value;
        if (val === "ALL") renderData(allData);
        else renderData(allData.filter(d => d.point === val));
    });
}

// 4. RENDER UI
function renderData(data) {
    const container = document.getElementById('contentList');
    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>Data tidak ditemukan.</p></div>`;
        return;
    }

    data.forEach(item => {
        const card = `
        <div class="mitra-card" id="card-${item.cust_no}">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                    <div class="fw-bold text-dark">${item.mitra}</div>
                    <small class="text-muted"><i class="fa-solid fa-id-badge me-1"></i>${item.cust_no}</small>
                </div>
                <span class="badge-pill badge-danger">Reject Request</span>
            </div>
            
            <div class="row g-1 mb-2" style="font-size: 0.8rem;">
                <div class="col-6"><i class="fa-solid fa-location-dot me-1 text-primary"></i> ${item.point}</div>
                <div class="col-6"><i class="fa-solid fa-user-tie me-1 text-primary"></i> ${item.nama_bp}</div>
                <div class="col-6"><i class="fa-solid fa-users me-1 text-primary"></i> ${item.majelis}</div>
            </div>

            <div class="reason-box">
                <strong><i class="fa-solid fa-comment-dots me-1"></i>Alasan:</strong> ${item.reason}
            </div>

            <div class="border-top pt-2 mt-2">
                <button class="btn-validate" onclick="window.confirmDelete('${item.cust_no}', '${item.mitra}')">
                    <i class="fa-solid fa-trash-can"></i> Validasi & Hapus Permanen
                </button>
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', card);
    });
}

// 5. EKSEKUSI HAPUS
window.confirmDelete = async function(custNo, namaMitra) {
    if (!confirm(`VALIDASI REJECT:\n${namaMitra} (${custNo})\n\nData akan dihapus permanen dari Sheet 'Tugas Modal'. Lanjutkan?`)) {
        return;
    }

    const btn = document.querySelector(`#card-${custNo} .btn-validate`);
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete_task_modal", custNo: custNo }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();

        if (result.result === "success") {
            const cleanId = String(custNo).replace(/[.#$/[\]]/g, "_");
            await remove(ref(db, 'reject_queue/' + cleanId));
            alert("SUKSES! Data berhasil dihapus.");
        } else {
            alert("Gagal menghapus di Sheet: " + result.error);
            if(btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Validasi & Hapus Permanen`; }
        }
    } catch (e) {
        console.error(e);
        alert("Gagal koneksi. Cek internet.");
        if(btn) { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Validasi & Hapus Permanen`; }
    }
};
