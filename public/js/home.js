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

const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";
const ADMIN_ID = "17246";

const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const btnAdmin = document.getElementById('btnAdmin'); 
const closingMenuBtn = document.getElementById('closingMenuBtn');

// --- AUTO LOGOUT ---
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
    window.onmousemove = resetTimer; window.onmousedown = resetTimer; window.ontouchstart = resetTimer; 
    window.onclick = resetTimer; window.onkeypress = resetTimer; window.addEventListener('scroll', resetTimer, true); 

    loadAreaProgressChart();
};

function getLocalTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; 
}

function getCurrentTimeWIB() {
    return new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
}

// --- CEK ABSENSI ---
async function checkAbsensiStatus(uid) {
    const today = getLocalTodayDate();
    const absensiRef = ref(db, `absensi/${today}/${uid}`);
    try {
        const snapshot = await get(absensiRef);
        const btnAbsen = document.getElementById('btnAbsen');
        if (!btnAbsen) return;
        
        const textEl = btnAbsen.querySelector('.menu-text');
        const iconEl = btnAbsen.querySelector('.widget-icon');
        const labelEl = btnAbsen.querySelector('.widget-label');

        if (snapshot.exists()) {
            // Style: Sudah Absen
            btnAbsen.style.pointerEvents = "none"; 
            if (textEl) { textEl.innerText = "Sudah Absen"; textEl.style.color = "#2e7d32"; } 
            if (iconEl) { iconEl.innerHTML = '<i class="fa-solid fa-check"></i>'; iconEl.style.background = "#e8f5e9"; iconEl.style.color = "#2e7d32"; }
            if (labelEl) labelEl.innerText = "Terima Kasih";
        } else {
            const jamSekarang = getCurrentTimeWIB();
            if (jamSekarang > "08:15") {
                // Style: Terlambat/Tutup
                btnAbsen.style.pointerEvents = "none";
                btnAbsen.style.opacity = "0.7";
                if (textEl) { textEl.innerText = "Absen Tutup"; textEl.style.color = "#c62828"; }
                if (iconEl) { iconEl.style.background = "#ffebee"; iconEl.style.color = "#c62828"; }
            }
        }
    } catch (error) { console.error("Gagal cek absensi:", error); }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        checkAbsensiStatus(user.uid);
        loadLeaderboard();
        loadRepaymentInfo();

        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const realName = data.nama || data.idKaryawan || user.email;
                if (userNameSpan) {
                    userNameSpan.textContent = realName;
                    userNameSpan.classList.remove('skeleton-text'); 
                }
                
                if (String(data.idKaryawan).trim() === ADMIN_ID && btnAdmin) btnAdmin.classList.remove('d-none');
                
                const userJabatan = (data.jabatan || "").toUpperCase(); 
                
                // 1. Cek Menu Closing (RM/AM/BM)
                if (["RM", "AM", "BM"].includes(userJabatan) && closingMenuBtn) {
                    closingMenuBtn.classList.remove('d-none');
                }

                // 2. Cek Performance Chart (KHUSUS BP)
                if (userJabatan === "BP") {
                    const bpContainer = document.getElementById('bpSectionContainer');
                    if(bpContainer) bpContainer.classList.remove('d-none'); // Munculkan section
                    
                    if (data.idKaryawan) {
                        loadBpPerformance(data.idKaryawan); // Load data
                    } else {
                        // Kalau BP tapi gak ada ID Karyawan
                        const loader = document.getElementById('bpLoader');
                        const errorEl = document.getElementById('bpError');
                        if(loader) loader.classList.add('d-none');
                        if(errorEl) errorEl.classList.remove('d-none');
                    }
                }

            } else {
                if (userNameSpan) {
                    userNameSpan.textContent = user.email;
                    userNameSpan.classList.remove('skeleton-text');
                }
            }
        }).catch(err => console.log("Gagal load profil:", err));
    } else {
        window.location.replace("index.html");
    }
});

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if(confirm("Apakah Anda yakin ingin keluar?")) { signOut(auth).then(() => window.location.replace("index.html")); }
    });
}

// --- UPDATE JAM REPAYMENT ---
async function loadRepaymentInfo() {
    const labelUpdate = document.getElementById('repaymentUpdateVal');
    if (!labelUpdate) return;
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: "get_majelis" }), headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        if (result.result === "success" && result.data && result.data.length > 0) {
            const displayJam = formatJamOnly(result.data[0].jam_update);
            labelUpdate.textContent = displayJam !== "" ? displayJam : "N/A";
        } else { labelUpdate.textContent = "-"; }
    } catch (error) { labelUpdate.textContent = "Err"; }
}

function formatJamOnly(val) {
    if (!val || val === "-" || val === "0") return "";
    try {
        const timeMatch = String(val).match(/(\d{1,2}:\d{2})/);
        if (timeMatch) return timeMatch[0];
        const date = new Date(val);
        if (!isNaN(date.getTime())) return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
        return "";
    } catch (e) { return ""; }
}

// --- LEADERBOARD ---
async function loadLeaderboard() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: "get_leaderboard" }), headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        if (result.result !== "success" || !result.data || result.data.length === 0) { return; }

        const top3 = result.data;
        let usersMap = {};
        try {
            const snapshot = await get(child(ref(db), `users`));
            if (snapshot.exists()) {
                snapshot.forEach((c) => {
                    const u = c.val();
                    if (u.idKaryawan) usersMap[String(u.idKaryawan).trim()] = { nama: u.nama || "Tanpa Nama", foto: u.fotoProfil || null };
                });
            }
        } catch (e) {}

        updatePodium(".rank-1", top3[0], usersMap);
        updatePodium(".rank-2", top3[1], usersMap);
        updatePodium(".rank-3", top3[2], usersMap);
    } catch (error) { console.error("Err Leaderboard", error); }
}

function updatePodium(sel, data, usersMap) {
    const c = document.querySelector(sel); if (!c) return;
    const txtName = c.querySelector('.p-name');
    const txtAmt = c.querySelector('.p-amount');
    const img = c.querySelector('.avatar-img');
    
    if(txtName) txtName.classList.remove('skeleton-text');
    if(txtAmt) txtAmt.classList.remove('skeleton-text');
    if(img) img.classList.remove('skeleton-img');

    if (data && data.idKaryawan) {
        const id = String(data.idKaryawan).trim();
        const p = usersMap[id];
        const name = p ? p.nama : `ID: ${data.idKaryawan}`;
        const photo = (p && p.foto) ? p.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        
        if(txtName) txtName.textContent = name;
        if(txtAmt) txtAmt.textContent = formatJuta(data.amount);
        if(img) img.src = photo;
    } else {
        if(txtName) txtName.textContent = "-";
    }
}

function formatJuta(n) {
    if (!n) return "Rp 0";
    let num = Number(String(n).replace(/[^0-9.-]+/g,""));
    if (isNaN(num)) return "Rp 0";
    if (num >= 1e9) return (num / 1e9).toFixed(1) + "M";
    else if (num >= 1e6) return (num / 1e6).toFixed(1) + "jt";
    else return (num / 1e3).toFixed(0) + "rb";
}

// --- CHART PROGRES AREA ---
async function loadAreaProgressChart() {
    const ctxCanvas = document.getElementById('areaProgressChart');
    if (!ctxCanvas) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: "get_area_progress" }), headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        if (result.result !== "success" || !result.data || result.data.length === 0) return;

        const areaData = result.data;
        const labels = areaData.map(d => d.area);
        
        const dailyPrc = areaData.map(d => d.plan > 0 ? ((d.progress / d.plan) * 100).toFixed(1) : 0);
        const achievePrc = areaData.map(d => d.target > 0 ? ((d.achievement / d.target) * 100).toFixed(1) : 0);

        if (window.myAreaChart) window.myAreaChart.destroy();
        Chart.register(ChartDataLabels);

        window.myAreaChart = new Chart(ctxCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Harian',
                        data: dailyPrc,
                        backgroundColor: 'rgba(142, 38, 212, 0.7)',
                        borderColor: 'rgba(142, 38, 212, 1)',
                        borderWidth: 1,
                        barPercentage: 0.7, categoryPercentage: 0.8
                    },
                    {
                        label: 'Pencapaian',
                        data: achievePrc,
                        backgroundColor: 'rgba(255, 179, 0, 0.7)',
                        borderColor: 'rgba(255, 179, 0, 1)',
                        borderWidth: 1,
                        barPercentage: 0.7, categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { right: 50 } }, 
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 10, usePointStyle: true } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                let lbl = ctx.dataset.label + ': ' + ctx.parsed.x + '%';
                                const item = areaData[ctx.dataIndex];
                                if (ctx.datasetIndex === 0) lbl += ` (${formatRibuan(item.progress)}/${formatRibuan(item.plan)})`;
                                else lbl += ` (${formatRibuan(item.achievement)}/${formatRibuan(item.target)})`;
                                return lbl;
                            }
                        }
                    },
                    datalabels: {
                        color: '#444',
                        anchor: 'end', align: 'end', offset: 4,
                        font: { weight: 'bold', size: 9 },
                        formatter: function(value) { return value + "%"; }
                    }
                },
                scales: {
                    x: { beginAtZero: true, suggestedMax: 120, grid: { display: false }, ticks: { display: false } },
                    y: { grid: { display: false }, ticks: { font: { size: 10, weight: '500' } } }
                }
            }
        });
    } catch (e) { console.error("Err Chart:", e); }
}

function formatRibuan(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

// --- FITUR PERFORMANCE BP (Baru) ---
async function loadBpPerformance(idKaryawan) {
    const loader = document.getElementById('bpLoader');
    const content = document.getElementById('bpContent');
    const errorEl = document.getElementById('bpError');
    const ctx = document.getElementById('bpPerformanceChart');

    if (!ctx) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_bp_performance", idKaryawan: idKaryawan }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        
        if(loader) loader.classList.add('d-none');

        if (result.result === "success" && result.data) {
            if(content) content.classList.remove('d-none');
            renderBpChart(ctx, result.data);
            updateBpInfoText(result.data);
        } else {
            if(errorEl) errorEl.classList.remove('d-none');
        }

    } catch (e) {
        console.error("Err Load BP:", e);
        if(loader) loader.classList.add('d-none');
        if(errorEl) errorEl.classList.remove('d-none');
    }
}

function updateBpInfoText(data) {
    // Helper format angka
    const fmtJuta = (n) => {
        let val = Number(n);
        if(isNaN(val)) return "0";
        if(val >= 1e9) return (val/1e9).toFixed(2) + " M";
        if(val >= 1e6) return (val/1e6).toFixed(1) + " Jt";
        return val.toLocaleString('id-ID');
    };
    
    const fmtNum = (n) => Number(n).toLocaleString('id-ID');

    // Update Text Amount
    document.getElementById('txtAmountAct').innerText = "Rp " + fmtJuta(data.amount.actual);
    document.getElementById('txtAmountTgt').innerText = "Target: Rp " + fmtJuta(data.amount.target);

    // Update Text NoA
    document.getElementById('txtNoaAct').innerText = fmtNum(data.noa.actual);
    document.getElementById('txtNoaTgt').innerText = "Target: " + fmtNum(data.noa.target);

    // Update Text Weekly
    document.getElementById('txtWeeklyAct').innerText = fmtNum(data.weekly.actual);
    document.getElementById('txtWeeklyTgt').innerText = "Target: " + fmtNum(data.weekly.target);
}

function renderBpChart(canvasCtx, data) {
    // Hitung % Capaian (Max visual 100% untuk bar, tapi label tetap angka asli)
    const calcPct = (act, tgt) => (tgt > 0) ? (act / tgt) * 100 : 0;
    
    const pAmt = calcPct(data.amount.actual, data.amount.target);
    const pNoa = calcPct(data.noa.actual, data.noa.target);
    const pWk = calcPct(data.weekly.actual, data.weekly.target);

    // Tentukan warna: Hijau jika >= 100%, Ungu jika belum
    const colAmt = pAmt >= 100 ? '#2e7d32' : '#8e26d4';
    const colNoa = pNoa >= 100 ? '#2e7d32' : '#8e26d4';
    const colWk = pWk >= 100 ? '#2e7d32' : '#8e26d4';

    // Chart.js Configuration
    new Chart(canvasCtx, {
        type: 'bar',
        data: {
            labels: ['Amount', 'NoA', 'Weekly'],
            datasets: [
                {
                    // Layer Depan: Capaian Aktual
                    label: 'Capaian',
                    data: [pAmt, pNoa, pWk],
                    backgroundColor: [colAmt, colNoa, colWk],
                    borderRadius: 4,
                    barPercentage: 0.5,
                    categoryPercentage: 0.8,
                    z: 2 // Layer atas
                },
                {
                    // Layer Belakang: Background Bar (Target 100%)
                    label: 'Target',
                    data: [100, 100, 100], 
                    backgroundColor: '#f0f2f5',
                    borderRadius: 4,
                    barPercentage: 0.5,
                    categoryPercentage: 0.8,
                    grouped: false, // Stacked effect manual
                    order: 1, // Layer bawah
                    hoverBackgroundColor: '#f0f2f5'
                }
            ]
        },
        options: {
            indexAxis: 'y', // Horizontal Bar
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(ctx) {
                            if (ctx.datasetIndex === 1) return null; // Hide tooltip bg
                            let pct = ctx.raw.toFixed(1) + "%";
                            return `Capaian: ${pct}`;
                        }
                    }
                },
                datalabels: {
                    anchor: 'end',
                    align: 'end',
                    offset: 4,
                    color: '#333',
                    font: { size: 10, weight: 'bold' },
                    formatter: function(value, ctx) {
                        if (ctx.datasetIndex === 1) return ""; // Hide label bg
                        return Math.round(value) + "%";
                    }
                }
            },
            scales: {
                x: {
                    display: false,
                    max: 130, // Memberi ruang teks di kanan
                    beginAtZero: true
                },
                y: {
                    grid: { display: false, drawBorder: false },
                    ticks: { 
                        font: { size: 11, weight: '600' },
                        color: '#555'
                    }
                }
            },
            animation: { duration: 1500 }
        }
    });
}

// Fitur Drag-to-Scroll untuk Desktop/Laptop
const slider = document.querySelector('.horizontal-scroll-wrapper');
let isDown = false;
let startX;
let scrollLeft;

if (slider) {
    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active'); 
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active');
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active');
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return; 
        e.preventDefault(); 
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2; 
        slider.scrollLeft = scrollLeft - walk;
    });
}
