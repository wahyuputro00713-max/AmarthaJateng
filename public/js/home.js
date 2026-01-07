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

const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; // Pastikan Worker ini meneruskan request ke Apps Script Anda
const ADMIN_ID = "17246";

const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const btnAdmin = document.getElementById('btnAdmin'); 
const closingMenuBtn = document.getElementById('closingMenuBtn');

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
    window.onmousemove = resetTimer; window.onmousedown = resetTimer; window.ontouchstart = resetTimer; 
    window.onclick = resetTimer; window.onkeypress = resetTimer; window.addEventListener('scroll', resetTimer, true); 

    // LOAD GRAFIK AREA SETELAH HALAMAN SIAP
    loadAreaProgressChart();
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
        if (snapshot.exists()) {
            btnAbsen.style.pointerEvents = "none"; btnAbsen.style.opacity = "0.5"; btnAbsen.style.filter = "grayscale(100%)"; 
            if (textEl) { textEl.innerText = "Sudah Absen"; textEl.style.fontWeight = "bold"; textEl.style.color = "#666"; }
        } else {
            const jamSekarang = getCurrentTimeWIB();
            if (jamSekarang > "08:15") {
                btnAbsen.style.pointerEvents = "none"; btnAbsen.style.opacity = "0.5"; btnAbsen.style.filter = "grayscale(100%)"; 
                if (textEl) { textEl.innerText = "Absen Tutup"; textEl.style.fontWeight = "bold"; textEl.style.color = "#666"; }
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
                if (userNameSpan) userNameSpan.textContent = realName;
                if (String(data.idKaryawan).trim() === ADMIN_ID && btnAdmin) btnAdmin.classList.remove('d-none');
                const userJabatan = data.jabatan || ""; 
                if (["RM", "AM", "BM"].includes(userJabatan.toUpperCase()) && closingMenuBtn) closingMenuBtn.classList.remove('d-none');
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
        if(confirm("Apakah Anda yakin ingin keluar?")) { signOut(auth).then(() => window.location.replace("index.html")); }
    });
}

// --- FUNGSI UPDATE JAM REPAYMENT ---
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

// --- FUNGSI LEADERBOARD ---
async function loadLeaderboard() {
    try {
        setLoadingState();
        const response = await fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: "get_leaderboard" }), headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        if (result.result !== "success" || !result.data || result.data.length === 0) { showErrorState("Belum Ada Data"); return; }

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
    } catch (error) { showErrorState("Gagal Koneksi"); }
}

function setLoadingState() {
    [".rank-1", ".rank-2", ".rank-3"].forEach(sel => {
        const c = document.querySelector(sel);
        if(c) {
            if(c.querySelector('.bp-name')) c.querySelector('.bp-name').textContent = "Memuat...";
            if(c.querySelector('.bp-amount')) c.querySelector('.bp-amount').textContent = "-";
        }
    });
}
function showErrorState(msg) {
    const c = document.querySelector(".rank-1");
    if(c) c.querySelector('.bp-name').innerHTML = `<span style="color:red; font-size:10px;">${msg}</span>`;
}
function updatePodium(sel, data, usersMap) {
    const c = document.querySelector(sel); if (!c) return;
    if (data && data.idKaryawan) {
        const id = String(data.idKaryawan).trim();
        const p = usersMap[id];
        const name = p ? p.nama : `ID: ${data.idKaryawan}`;
        const photo = (p && p.foto) ? p.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        
        c.querySelector('.bp-name').textContent = name;
        c.querySelector('.bp-point').textContent = data.point || "-";
        c.querySelector('.bp-amount').textContent = formatJuta(data.amount);
        c.querySelector('.avatar-img').src = photo;
    } else {
        c.querySelector('.bp-name').textContent = "-";
        c.querySelector('.bp-amount').textContent = "";
    }
}
function formatJuta(n) {
    if (!n) return "Rp 0";
    let num = Number(String(n).replace(/[^0-9.-]+/g,""));
    if (isNaN(num)) return "Rp 0";
    if (num >= 1e9) return "Rp " + (num / 1e9).toFixed(1) + "M";
    else if (num >= 1e6) return "Rp " + (num / 1e6).toFixed(1) + "jt";
    else if (num >= 1e3) return "Rp " + (num / 1e3).toFixed(0) + "rb";
    else return "Rp " + num.toLocaleString('id-ID');
}

// --- FUNGSI CHART AREA PROGRESS (UPDATED: LABEL DI LUAR + FORMAT RIBUAN) ---
async function loadAreaProgressChart() {
    const ctxCanvas = document.getElementById('areaProgressChart');
    if (!ctxCanvas) return;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_area_progress" }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        if (result.result !== "success" || !result.data || result.data.length === 0) {
            console.warn("Data Area Progress kosong/gagal."); return;
        }

        const areaData = result.data;
        const labels = areaData.map(d => d.area);
        
        // Hitung Persentase
        const dailyPrc = areaData.map(d => d.plan > 0 ? ((d.progress / d.plan) * 100).toFixed(1) : 0);
        const achievePrc = areaData.map(d => d.target > 0 ? ((d.achievement / d.target) * 100).toFixed(1) : 0);

        if (window.myAreaChart) window.myAreaChart.destroy();

        // Register Plugin
        Chart.register(ChartDataLabels);

        window.myAreaChart = new Chart(ctxCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Harian (Prog / Plan)',
                        data: dailyPrc,
                        backgroundColor: 'rgba(54, 162, 235, 0.8)', // Biru
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        barPercentage: 0.7, categoryPercentage: 0.8
                    },
                    {
                        label: 'Pencapaian (Ach / Tgt)',
                        data: achievePrc,
                        backgroundColor: 'rgba(75, 192, 192, 0.8)', // Hijau Teal
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        barPercentage: 0.7, categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: { 
                    padding: { right: 80 } // Tambah padding kanan agar text panjang tidak terpotong
                }, 
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 10 }, boxWidth: 10 } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                // Tooltip dengan format ribuan
                                let lbl = ctx.dataset.label || '';
                                if (lbl.includes('(')) lbl = lbl.split('(')[0].trim() + ': ';
                                lbl += ctx.parsed.x + '%';
                                
                                const item = areaData[ctx.dataIndex];
                                if (ctx.datasetIndex === 0) lbl += ` (${formatRibuan(item.progress)}/${formatRibuan(item.plan)})`;
                                else lbl += ` (${formatRibuan(item.achievement)}/${formatRibuan(item.target)})`;
                                return lbl;
                            }
                        }
                    },
                    // KONFIGURASI LABEL ANGKA DI LUAR BATANG
                    datalabels: {
                        color: 'black', // Text hitam karena background putih (di luar batang)
                        anchor: 'end',  // Posisi di ujung batang
                        align: 'end',   // Menjorok ke luar (ke kanan)
                        offset: 4,      // Jarak dari batang
                        font: { weight: 'bold', size: 9 },
                        formatter: function(value, context) {
                            const index = context.dataIndex;
                            const item = areaData[index];

                            // FORMAT RIBUAN DITERAPKAN DI SINI (TITIK)
                            if (context.datasetIndex === 0) {
                                return `${formatRibuan(item.progress)} / ${formatRibuan(item.plan)}`;
                            } else {
                                return `${formatRibuan(item.achievement)} / ${formatRibuan(item.target)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        beginAtZero: true, 
                        // Tambah max value visual agar batang 100% tidak mentok kanan & nabrak text
                        suggestedMax: 130, 
                        ticks: { callback: v => v + "%", font: { size: 9 } } 
                    },
                    y: { ticks: { font: { size: 10, weight: 'bold' } } }
                }
            }
        });
    } catch (e) { console.error("Err Chart:", e); }
}

function formatRibuan(n) { return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
