import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const userNameSpan = document.getElementById('userName') || document.getElementById('welcomeName');
const logoutBtn = document.getElementById('logoutBtn');
const btnAdmin = document.getElementById('btnAdmin'); 
const closingMenuBtn = document.getElementById('closingMenuBtn');

const ADMIN_ID = "17246";

// --- FITUR AUTO LOGOUT ---
let idleTime = 0;
const IDLE_LIMIT = 5; 

function timerIncrement() {
    idleTime = idleTime + 1;
    if (idleTime >= IDLE_LIMIT) { 
        signOut(auth).then(() => {
            alert("Sesi Anda berakhir karena tidak ada aktivitas selama 5 menit.");
            window.location.replace("index.html");
        });
    }
}
function resetTimer() { idleTime = 0; }

window.onload = function() {
    setInterval(timerIncrement, 60000); 
    window.onmousemove = resetTimer;
    window.onmousedown = resetTimer;      
    window.ontouchstart = resetTimer; 
    window.onclick = resetTimer;      
    window.onkeypress = resetTimer;    
    window.addEventListener('scroll', resetTimer, true); 

    // Initialize Chart
    initAreaProgressChart();
};

// --- HELPER TIME ---
function getLocalTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; 
}

function getCurrentTimeWIB() {
    return new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false
    });
}

// --- CEK ABSENSI ---
async function checkAbsensiStatus(uid) {
    const today = getLocalTodayDate();
    const absensiRef = ref(db, `absensi/${today}/${uid}`);

    try {
        const snapshot = await get(absensiRef);
        const btnAbsen = document.getElementById('btnAbsen') || document.querySelector('a[href="absensi.html"]');
        if (!btnAbsen) return;

        const textEl = btnAbsen.querySelector('.menu-text');

        if (snapshot.exists()) {
            btnAbsen.style.pointerEvents = "none";
            btnAbsen.style.opacity = "0.5"; 
            btnAbsen.style.filter = "grayscale(100%)"; 
            if (textEl) { textEl.innerText = "Sudah Absen"; textEl.style.fontWeight = "bold"; textEl.style.color = "#666"; }
        } else {
            const jamSekarang = getCurrentTimeWIB();
            const BATAS_WAKTU = "08:15";
            if (jamSekarang > BATAS_WAKTU) {
                btnAbsen.style.pointerEvents = "none";
                btnAbsen.style.opacity = "0.5"; 
                btnAbsen.style.filter = "grayscale(100%)"; 
                if (textEl) { textEl.innerText = "Absen Tutup"; textEl.style.fontWeight = "bold"; textEl.style.color = "#666"; }
            }
        }
    } catch (error) { console.error("Gagal cek absensi:", error); }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        checkAbsensiStatus(user.uid);
        
        // --- LOAD DATA KHUSUS (Termasuk Update Repayment) ---
        loadLeaderboard();
        loadRepaymentInfo();

        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const realName = data.nama || data.idKaryawan || user.email;
                if (userNameSpan) userNameSpan.textContent = realName;

                if (String(data.idKaryawan).trim() === ADMIN_ID) {
                    if (btnAdmin) btnAdmin.classList.remove('d-none');
                }

                const userJabatan = data.jabatan || ""; 
                const allowedRoles = ["RM", "AM", "BM"];
                if (allowedRoles.includes(userJabatan.toUpperCase())) {
                    if (closingMenuBtn) closingMenuBtn.classList.remove('d-none');
                }
            } else {
                if (userNameSpan) userNameSpan.textContent = user.email;
            }
        }).catch(err => console.log("Gagal load profil:", err));

    } else {
        window.location.replace("index.html");
    }
});

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if(confirm("Apakah Anda yakin ingin keluar?")) {
            signOut(auth).then(() => window.location.replace("index.html"));
        }
    });
}

// --- FUNGSI BARU: AMBIL JAM UPDATE DARI KOLOM S ---
async function loadRepaymentInfo() {
    const labelUpdate = document.getElementById('repaymentUpdateVal');
    if (!labelUpdate) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_majelis" }),
            // redirect: "follow", // Bisa dihapus jika tidak perlu redirect
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === "success" && result.data && result.data.length > 0) {
            // Ambil data mentah
            const rawJam = result.data[0].jam_update; 
            
            // Format hanya jam (misal: "14:30")
            const displayJam = formatJamOnly(rawJam);

            labelUpdate.textContent = displayJam !== "" ? displayJam : "N/A";
        } else {
            labelUpdate.textContent = "-";
        }
    } catch (error) {
        console.error("Gagal load update repayment:", error);
        labelUpdate.textContent = "Err";
    }
}

// Helper Format Jam (Sama seperti di majelis.js)
function formatJamOnly(val) {
    if (!val || val === "-" || val === "0") return "";
    try {
        // Cek jika formatnya sudah jam "14:30" atau "14:30:00"
        const timeMatch = String(val).match(/(\d{1,2}:\d{2})/);
        if (timeMatch) return timeMatch[0];

        // Jika format tanggal panjang, parse dulu
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        }
        return "";
    } catch (e) {
        return "";
    }
}

// --- LOGIKA LEADERBOARD ---
async function loadLeaderboard() {
    try {
        setLoadingState();
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_leaderboard" }),
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        
        const result = await response.json();
        if (result.result !== "success" || !result.data || result.data.length === 0) {
            showErrorState("Belum Ada Data");
            return;
        }

        const top3 = result.data;
        let usersMap = {};
        
        try {
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, `users`));
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const userData = childSnapshot.val();
                    if (userData.idKaryawan) {
                        const cleanID = String(userData.idKaryawan).trim();
                        usersMap[cleanID] = {
                            nama: userData.nama || "Tanpa Nama",
                            foto: userData.fotoProfil || null
                        };
                    }
                });
            }
        } catch (dbError) { console.warn("Gagal ambil detail user."); }

        updatePodium(".rank-1", top3[0], usersMap);
        updatePodium(".rank-2", top3[1], usersMap);
        updatePodium(".rank-3", top3[2], usersMap);

    } catch (error) {
        console.error("Critical Error Leaderboard:", error);
        showErrorState("Gagal Koneksi");
    }
}

function setLoadingState() {
    [".rank-1", ".rank-2", ".rank-3"].forEach(sel => {
        const card = document.querySelector(sel);
        if(card) {
            const elName = card.querySelector('.bp-name');
            const elPoint = card.querySelector('.bp-point');
            const elAmount = card.querySelector('.bp-amount');
            if(elName) elName.textContent = "Memuat...";
            if(elPoint) elPoint.textContent = "-";
            if(elAmount) elAmount.textContent = "-";
        }
    });
}

function showErrorState(msg) {
    const card1 = document.querySelector(".rank-1");
    if(card1) {
        card1.querySelector('.bp-name').innerHTML = `<span style="color:red; font-size:10px;">${msg}</span>`;
    }
}

function updatePodium(selectorClass, data, usersMap) {
    const card = document.querySelector(selectorClass);
    if (!card) return;

    const elName = card.querySelector('.bp-name');
    const elPoint = card.querySelector('.bp-point');
    const elAmount = card.querySelector('.bp-amount');
    const elImg = card.querySelector('.avatar-img');

    if (data && data.idKaryawan) {
        const idCari = String(data.idKaryawan).trim();
        const userProfile = usersMap[idCari];
        const displayName = userProfile ? userProfile.nama : `ID: ${data.idKaryawan}`;
        
        let displayPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
        if (userProfile && userProfile.foto) {
            displayPhoto = userProfile.foto;
        }

        if (elName) elName.textContent = displayName;
        if (elPoint) elPoint.textContent = data.point || "-";
        if (elAmount) elAmount.textContent = formatJuta(data.amount);
        if (elImg) elImg.src = displayPhoto;

    } else {
        if (elName) elName.textContent = "-";
        if (elPoint) elPoint.textContent = "-";
        if (elAmount) elAmount.textContent = "";
    }
}

function formatJuta(angka) {
    if (!angka) return "Rp 0";
    let num = Number(String(angka).replace(/[^0-9.-]+/g,""));
    if (isNaN(num)) return "Rp 0";
    if (num >= 1000000000) return "Rp " + (num / 1000000000).toFixed(1) + "M";
    else if (num >= 1000000) return "Rp " + (num / 1000000).toFixed(1) + "jt";
    else if (num >= 1000) return "Rp " + (num / 1000).toFixed(0) + "rb";
    else return "Rp " + num.toLocaleString('id-ID');
}

// --- FUNGSI CHART AREA PROGRESS ---
function initAreaProgressChart() {
    const ctx = document.getElementById('areaProgressChart');
    if (!ctx) return;

    // DATA DUMMY (Silahkan diganti dengan logic Fetch API jika sudah ada endpointnya)
    // Structure: Area, Plan Hari Ini, Progres Hari Ini, Target Bulan Ini, Achievement Bulan Ini
    const areaData = [
        { area: "Semarang", plan: 50, progress: 45, target: 1000, achievement: 850 },
        { area: "Solo", plan: 40, progress: 20, target: 800, achievement: 400 },
        { area: "Jogja", plan: 60, progress: 60, target: 1200, achievement: 1100 },
        { area: "Magelang", plan: 30, progress: 15, target: 600, achievement: 300 },
        { area: "Pekalongan", plan: 45, progress: 40, target: 900, achievement: 880 }
    ];

    // Calculate Percentages
    const labels = areaData.map(d => d.area);
    const dailyPrc = areaData.map(d => d.plan > 0 ? ((d.progress / d.plan) * 100).toFixed(1) : 0);
    const achievePrc = areaData.map(d => d.target > 0 ? ((d.achievement / d.target) * 100).toFixed(1) : 0);

    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '% Harian (Prog vs Plan)',
                    data: dailyPrc,
                    backgroundColor: 'rgba(54, 162, 235, 0.7)', // Biru
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                },
                {
                    label: '% Pencapaian (Ach vs Tgt)',
                    data: achievePrc,
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', // Hijau Teal
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }
            ]
        },
        options: {
            indexAxis: 'y', // Membuat grafik horizontal (Menurun ke bawah)
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 10 },
                        boxWidth: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label = label.split('(')[0].trim() + ': ';
                            }
                            label += context.parsed.x + '%';
                            
                            // Menambahkan detail angka asli
                            const dataIndex = context.dataIndex;
                            const item = areaData[dataIndex];
                            if (context.datasetIndex === 0) {
                                label += ` (${item.progress}/${item.plan})`;
                            } else {
                                label += ` (${item.achievement}/${item.target})`;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 120, // Space lebih agar label angka muat
                    ticks: {
                        callback: function(value) { return value + "%" },
                        font: { size: 9 }
                    }
                },
                y: {
                    ticks: {
                        font: { size: 10, weight: 'bold' }
                    }
                }
            }
        }
    });
}
