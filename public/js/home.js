import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, set, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// --- KONFIGURASI URL (PASTIKAN INI URL TERBARU SETELAH DEPLOY) ---
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";
const SCRIPT_URL_BP = "https://script.google.com/macros/s/AKfycbyxR8o5fLsh8LKWn5JrNGooLokQ024seuDHvgTCg97jgrQW3kISyFitIoEOWlDX_AU8Dw/exec"; 
const SCRIPT_URL_SURVEY = "https://script.google.com/macros/s/AKfycbzq0iFw8vIT9s7Zvl_5gydKaqy2LMkK_DaP9YV2Y_FThPSw9rtWwukFhjJlgfi0FeQ/exec"; 

const ADMIN_ID = "17246";

const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const btnAdmin = document.getElementById('btnAdmin'); 
const closingMenuBtn = document.getElementById('closingMenuBtn');
const valRepaymentBtn = document.getElementById('valRepaymentBtn');

let cachedLeaderboardData = [];
let cachedUsersMap = {};

// --- GLOBAL CHART INSTANCES ---
window.chartInstance1 = null;
window.chartInstance2 = null;
window.modalChartInstance1 = null;
window.modalChartInstance2 = null;
window.areaChartInstance = null;

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

// --- FUNGSI HELPER FETCH (FIXED CORS & CREDENTIALS) ---
async function fetchWithRetry(url, customOptions = {}, retries = 3, backoff = 300) {
    try {
        const defaultOptions = {
            method: 'POST',
            credentials: 'omit', // PENTING: Mencegah error login Google
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8" // PENTING: Mencegah preflight OPTIONS
            }
        };
        
        // Merge options
        const options = { ...defaultOptions, ...customOptions };
        
        // Pastikan body ada untuk POST
        if(options.method === 'POST' && !options.body) {
             options.body = JSON.stringify({});
        }

        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP Error! status: ${response.status}`);
        return response;
    } catch (error) {
        if (retries < 1) throw error;
        await new Promise(r => setTimeout(r, backoff));
        return fetchWithRetry(url, customOptions, retries - 1, backoff * 2);
    }
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
            btnAbsen.style.pointerEvents = "none"; 
            if (textEl) { textEl.innerText = "Sudah Absen"; textEl.style.color = "#2e7d32"; } 
            if (iconEl) { iconEl.innerHTML = '<i class="fa-solid fa-check"></i>'; iconEl.style.background = "#e8f5e9"; iconEl.style.color = "#2e7d32"; }
            if (labelEl) labelEl.innerText = "Terima Kasih";
        } else {
            const jamSekarang = getCurrentTimeWIB();
            if (jamSekarang > "08:15") {
                btnAbsen.style.pointerEvents = "none";
                btnAbsen.style.opacity = "0.7";
                if (textEl) { textEl.innerText = "Absen Tutup"; textEl.style.color = "#c62828"; }
                if (iconEl) { iconEl.style.background = "#ffebee"; iconEl.style.color = "#c62828"; }
            }
        }
    } catch (error) { console.error("Gagal cek absensi:", error); }
}

// --- FUNGSI CHECK DAILY BRIEFING (PERBAIKAN TIMEZONE) ---
function checkDailyBriefing(uid) {
    // Gunakan getLocalTodayDate() agar mengikuti jam HP user (WIB), bukan UTC.
    const today = getLocalTodayDate(); 
    
    const storageKey = `briefing_seen_${uid}`;
    const lastSeenDate = localStorage.getItem(storageKey);

    // Jika tanggal terakhir dilihat TIDAK SAMA dengan hari ini, tampilkan popup
    if (lastSeenDate !== today) {
        const briefingModalEl = document.getElementById('briefingModal');
        if (briefingModalEl) {
            const briefingModal = new bootstrap.Modal(briefingModalEl);
            briefingModal.show();

            const btnConfirm = document.getElementById('btnConfirmBriefing');
            if (btnConfirm) {
                // Clone button untuk memastikan event listener fresh (tidak menumpuk)
                const newBtn = btnConfirm.cloneNode(true);
                btnConfirm.parentNode.replaceChild(newBtn, btnConfirm);

                newBtn.onclick = function() {
                    // Simpan tanggal hari ini ke Local Storage
                    localStorage.setItem(storageKey, today);
                    briefingModal.hide();
                };
            }
        }
    }
}

// ==========================================
// MAIN AUTH & LOGIC CABANG (BP vs BM)
// ==========================================
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
                
                // Toggle Menu berdasarkan Jabatan
                if (["RM", "AM", "BM"].includes(userJabatan) && closingMenuBtn) {
                    closingMenuBtn.classList.remove('d-none');
                }
                if (["RM", "AM", "ADMIN"].includes(userJabatan) && valRepaymentBtn) {
                    valRepaymentBtn.classList.remove('d-none');
                }

                // --- LOGIKA TAMPILAN DASHBOARD ---
                if (userJabatan === "BP") {
                    const bpContainer = document.getElementById('bpSectionContainer');
                    if(bpContainer) bpContainer.classList.remove('d-none'); 
                    
                    if (data.idKaryawan) {
                        loadBpPerformance(data.idKaryawan); 
                    } else {
                        hideLoaderBP("ID Karyawan tidak ditemukan.");
                    }
                    checkSurveyStatus(user, data);

                    // >>> PANGGIL FUNGSI BRIEFING PAGI <<<
                    // Hanya dipanggil jika jabatan adalah BP
                    checkDailyBriefing(user.uid);
                } 
                else if (userJabatan === "BM") {
                    const bmContainer = document.getElementById('bmSectionContainer');
                    if(bmContainer) bmContainer.classList.remove('d-none'); 
                    
                    if (data.point) {
                        loadBmDashboard(data.point);
                    } else {
                        document.getElementById('bmLoader').innerHTML = '<p class="text-danger">Point tidak ditemukan di profil.</p>';
                    }
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
        if(confirm("Apakah Anda yakin ingin keluar?")) { signOut(auth).then(() => window.location.replace("index.html")); }
    });
}

const btnViewAll = document.getElementById('btnViewAllLeaderboard');
if(btnViewAll){
    btnViewAll.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById('fullLbModal');
        if(modal) {
            modal.classList.add('active');
            renderFullLeaderboard();
        }
    });
}

// --- FUNGSI FORMAT ANGKA ---
function formatJuta(n) {
    if (!n) return "Rp 0";
    let num = Number(String(n).replace(/[^0-9.-]+/g,""));
    if (isNaN(num)) return "Rp 0";
    if (num >= 1e9) return (num / 1e9).toFixed(1) + "M";
    else if (num >= 1e6) return (num / 1e6).toFixed(1) + "jt";
    else return (num / 1e3).toFixed(0) + "rb";
}
function formatJamOnly(val) {
    if (!val || val === "-" || val === "0") return "";
    try {
        const timeMatch = String(val).match(/(\d{1,2}:\d{2})/);
        if (timeMatch) return timeMatch[0];
        return "";
    } catch (e) { return ""; }
}
function getInitials(name) {
    if(!name) return "BP";
    const parts = name.split(' ');
    if(parts.length === 1) return parts[0].substring(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

// --- FUNGSI LOAD DATA UMUM ---
async function loadRepaymentInfo() {
    const label = document.getElementById('repaymentUpdateVal');
    if (!label) return;
    try {
        const response = await fetchWithRetry(SCRIPT_URL, {
            body: JSON.stringify({ action: "get_majelis" })
        });
        const result = await response.json();
        if (result.result === "success" && result.data.length > 0) {
            label.textContent = formatJamOnly(result.data[0].jam_update) || "N/A";
        } else { label.textContent = "-"; }
    } catch (error) { label.textContent = "Err"; }
}

async function loadLeaderboard() {
    try {
        try {
            const snapshot = await get(child(ref(db), `users`));
            if (snapshot.exists()) {
                snapshot.forEach((c) => {
                    const u = c.val();
                    if (u.idKaryawan) cachedUsersMap[String(u.idKaryawan).trim()] = { nama: u.nama, foto: u.fotoProfil };
                });
            }
        } catch (e) {}

        const response = await fetchWithRetry(SCRIPT_URL, {
            body: JSON.stringify({ action: "get_leaderboard" })
        });
        const result = await response.json();
        
        if (result.result === "success" && result.data) {
            cachedLeaderboardData = result.data;
            cachedLeaderboardData.sort((a, b) => b.amount - a.amount);
            updatePodium(".rank-1", cachedLeaderboardData[0], cachedUsersMap);
            updatePodium(".rank-2", cachedLeaderboardData[1], cachedUsersMap);
            updatePodium(".rank-3", cachedLeaderboardData[2], cachedUsersMap);
        }
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

    if (data) {
        const id = String(data.idKaryawan).trim();
        const p = usersMap[id];
        const name = p ? p.nama : (data.nama || id);
        const photo = (p && p.foto) ? p.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        
        if(txtName) txtName.textContent = name;
        if(txtAmt) txtAmt.textContent = formatJuta(data.amount);
        if(img) img.src = photo;
    } else {
        if(txtName) txtName.textContent = "-";
        if(txtAmt) txtAmt.textContent = "-";
    }
}

function renderFullLeaderboard() {
    const list = document.getElementById('fullLbList');
    if (!list || cachedLeaderboardData.length === 0) return;
    
    let html = '';
    cachedLeaderboardData.forEach((item, index) => {
        const rank = index + 1;
        const id = String(item.idKaryawan).trim();
        const p = cachedUsersMap[id];
        const name = p ? p.nama : (item.nama || id);
        const photo = (p && p.foto) ? p.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        const rankClass = rank <= 3 ? `top-${rank}` : '';

        html += `
        <div class="lb-list-item">
            <div class="lb-rank ${rankClass}">${rank}</div>
            <img src="${photo}" class="lb-user-img">
            <div class="lb-user-info">
                <div class="lb-user-name">${name}</div>
                <div class="lb-user-id">${id}</div>
            </div>
            <div class="lb-score">${formatJuta(item.amount)}</div>
        </div>`;
    });
    list.innerHTML = html;
}

// ==========================================
// BP PERFORMANCE LOGIC (FIXED)
// ==========================================
async function loadBpPerformance(idKaryawan) {
    const loader = document.getElementById('bpLoader');
    const content = document.getElementById('bpContent');
    const errorEl = document.getElementById('bpError');
    const ctx1 = document.getElementById('bpPerformanceChart');
    const ctx2 = document.getElementById('bpUserRepeatChart');

    if (!ctx1 || !ctx2) return;

    try {
        // MENGGUNAKAN fetchWithRetry YANG SUDAH DIPERBAIKI
        const response = await fetchWithRetry(SCRIPT_URL_BP, {
            body: JSON.stringify({ action: "get_bp_performance", idKaryawan: idKaryawan })
        });
        const result = await response.json();

        if(loader) loader.classList.add('d-none');

        if (result.result === "success" && result.data) {
            if(content) content.classList.remove('d-none');
            renderBpChart1(ctx1, result.data, false);
            renderBpChart2(ctx2, result.data, false);
            updateBpInfoText(result.data);
        } else {
            if(errorEl) errorEl.classList.remove('d-none');
        }
    } catch (e) {
        console.error("Err BP:", e);
        if(loader) loader.classList.add('d-none');
        if(errorEl) errorEl.classList.remove('d-none');
    }
}

function hideLoaderBP(msg) {
    const loader = document.getElementById('bpLoader');
    const errorEl = document.getElementById('bpError');
    if(loader) loader.classList.add('d-none');
    if(errorEl) {
        errorEl.classList.remove('d-none');
        errorEl.querySelector('p').innerText = msg;
    }
}

function updateBpInfoText(data) {
    const fmt = (n) => Number(n).toLocaleString('id-ID');
    const fmtJ = (n) => "Rp " + formatJuta(n);

    // Set Text Values
    document.getElementById('txtAmountAct').innerText = fmtJ(data.amount.actual);
    document.getElementById('txtAmountTgt').innerText = "Tgt: " + fmtJ(data.amount.target);
    document.getElementById('txtNoaAct').innerText = fmt(data.noa.actual);
    document.getElementById('txtNoaTgt').innerText = "Tgt: " + fmt(data.noa.target);
    document.getElementById('txtWeeklyAct').innerText = fmt(data.weekly.actual);
    document.getElementById('txtWeeklyTgt').innerText = "Tgt: " + fmt(data.weekly.target);

    if(data.user) {
        document.getElementById('txtUserAct').innerText = fmt(data.user.actual);
        document.getElementById('txtUserTgt').innerText = "Tgt: " + fmt(data.user.target);
    }
    if(data.repeat) {
        document.getElementById('txtRepeatAct').innerText = fmt(data.repeat.actual);
        document.getElementById('txtRepeatTgt').innerText = "Tgt: " + fmt(data.repeat.target);
    }
}

// ==========================================
// BM DASHBOARD LOGIC (FIXED)
// ==========================================
async function loadBmDashboard(point) {
    const loader = document.getElementById('bmLoader');
    const listContainer = document.getElementById('bmBpList');
    const cardWrapper = document.getElementById('bmCardWrapper');
    const totalLabel = document.getElementById('bmTotalMember');
    
    try {
        // MENGGUNAKAN fetchWithRetry
        const response = await fetchWithRetry(SCRIPT_URL_BP, {
            body: JSON.stringify({ action: "get_bm_team_data", point: point })
        });
        const result = await response.json();

        if(loader) loader.classList.add('d-none');

        if (result.result === "success" && result.data && result.data.length > 0) {
            if(cardWrapper) cardWrapper.classList.remove('d-none');
            if(totalLabel) totalLabel.innerText = result.data.length + " Org";

            // Sort Descending Amount
            result.data.sort((a, b) => b.amount.actual - a.amount.actual);

            let html = '';
            result.data.forEach(bp => {
                const dataStr = encodeURIComponent(JSON.stringify(bp));
                const init = getInitials(bp.nama);
                const amt = formatJuta(bp.amount.actual);
                const pct = Math.min((bp.amount.actual / bp.amount.target) * 100, 100) || 0;

                html += `
                <div class="p-3 border-bottom d-flex justify-content-between align-items-center bg-white" 
                     onclick="openBmDetail('${dataStr}')" 
                     style="cursor: pointer; transition: background 0.2s;"
                     onmouseover="this.style.background='#f8f9fa'" 
                     onmouseout="this.style.background='#fff'">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-light text-primary border d-flex align-items-center justify-content-center fw-bold me-3" style="width:38px; height:38px; font-size: 0.85rem;">${init}</div>
                        <div>
                            <div class="fw-bold text-dark text-truncate" style="font-size: 0.85rem; max-width: 150px;">${bp.nama}</div>
                            <div class="text-muted" style="font-size: 0.7rem;">ID: ${bp.idKaryawan}</div>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-success" style="font-size: 0.85rem;">${amt}</div>
                        <div class="progress mt-1" style="height: 3px; width: 60px; margin-left: auto;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${pct}%"></div>
                        </div>
                    </div>
                </div>`;
            });
            listContainer.innerHTML = html;
        } else {
            if(cardWrapper) cardWrapper.classList.remove('d-none');
            listContainer.innerHTML = '<div class="text-center py-4 small text-muted">Belum ada data tim.</div>';
        }
    } catch (e) {
        console.error("Err BM:", e);
        if(loader) loader.innerHTML = '<p class="text-danger small">Gagal memuat data.</p>';
    }
}

// Global Function untuk dipanggil dari HTML string
window.openBmDetail = function(dataStr) {
    const bp = JSON.parse(decodeURIComponent(dataStr));
    const modal = document.getElementById('bmDetailModal');
    
    document.getElementById('modalBpName').innerText = bp.nama;
    document.getElementById('modalBpId').innerText = "ID: " + bp.idKaryawan;

    // Set Text Modal
    const fmt = (n) => Number(n).toLocaleString('id-ID');
    const fmtJ = (n) => "Rp " + formatJuta(n);

    document.getElementById('mAmountAct').innerText = fmtJ(bp.amount.actual);
    document.getElementById('mNoaAct').innerText = fmt(bp.noa.actual);
    document.getElementById('mWeeklyAct').innerText = fmt(bp.weekly.actual);
    
    if(bp.user) document.getElementById('mUserAct').innerText = fmt(bp.user.actual);
    if(bp.repeat) document.getElementById('mRepeatAct').innerText = fmt(bp.repeat.actual);

    modal.classList.add('active');

    // Render Chart di Modal (Pass true as 3rd arg)
    setTimeout(() => {
        renderBpChart1(document.getElementById('modalChart1'), bp, true);
        renderBpChart2(document.getElementById('modalChart2'), bp, true);
    }, 200); 
};

// ==========================================
// CHART RENDERERS (REUSABLE)
// ==========================================
function renderBpChart1(canvasCtx, data, isModal) {
    const calcPct = (a, t) => t > 0 ? (a / t) * 100 : 0;
    const pAmt = calcPct(data.amount.actual, data.amount.target);
    const pNoa = calcPct(data.noa.actual, data.noa.target);
    const pWk = calcPct(data.weekly.actual, data.weekly.target);
    
    const getColor = (p) => p >= 100 ? '#2e7d32' : '#8e26d4';

    // Destroy existing instance based on context
    if (isModal) {
        if (window.modalChartInstance1) { window.modalChartInstance1.destroy(); }
    } else {
        if (window.chartInstance1) { window.chartInstance1.destroy(); }
    }

    const config = {
        type: 'bar',
        data: {
            labels: ['Amount', 'NoA', 'Weekly'],
            datasets: [
                { label: 'Capaian', data: [pAmt, pNoa, pWk], backgroundColor: [getColor(pAmt), getColor(pNoa), getColor(pWk)], borderRadius: 4, barPercentage: 0.5, z: 2 },
                { label: 'Target', data: [100, 100, 100], backgroundColor: '#f0f2f5', borderRadius: 4, barPercentage: 0.5, grouped: false, order: 1 }
            ]
        },
        options: getCommonChartOptions()
    };

    const newChart = new Chart(canvasCtx, config);
    if (isModal) window.modalChartInstance1 = newChart;
    else window.chartInstance1 = newChart;
}

function renderBpChart2(canvasCtx, data, isModal) {
    if(!data.user || !data.repeat) return;

    const calcPct = (a, t) => t > 0 ? (a / t) * 100 : 0;
    const pUser = calcPct(data.user.actual, data.user.target);
    const pRepeat = calcPct(data.repeat.actual, data.repeat.target);
    const getColor = (p) => p >= 100 ? '#2e7d32' : '#ffb300';

    if (isModal) {
        if (window.modalChartInstance2) { window.modalChartInstance2.destroy(); }
    } else {
        if (window.chartInstance2) { window.chartInstance2.destroy(); }
    }

    const config = {
        type: 'bar',
        data: {
            labels: ['User', 'Repeat'],
            datasets: [
                { label: 'Capaian', data: [pUser, pRepeat], backgroundColor: [getColor(pUser), getColor(pRepeat)], borderRadius: 4, barPercentage: 0.5, z: 2 },
                { label: 'Target', data: [100, 100], backgroundColor: '#f0f2f5', borderRadius: 4, barPercentage: 0.5, grouped: false, order: 1 }
            ]
        },
        options: getCommonChartOptions()
    };

    const newChart = new Chart(canvasCtx, config);
    if (isModal) window.modalChartInstance2 = newChart;
    else window.chartInstance2 = newChart;
}

function getCommonChartOptions() {
    return {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: function(ctx) { if (ctx.datasetIndex === 1) return null; return `Capaian: ${ctx.raw.toFixed(1)}%`; } } },
            datalabels: { anchor: 'end', align: 'end', offset: 4, color: '#333', font: { size: 10, weight: 'bold' }, formatter: (val, ctx) => ctx.datasetIndex === 1 ? "" : Math.round(val) + "%" }
        },
        scales: {
            x: { display: false, max: 130, beginAtZero: true },
            y: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#555' } }
        }
    };
}

// Area Chart (Main Page)
async function loadAreaProgressChart() {
    const ctx = document.getElementById('areaProgressChart');
    if (!ctx) return;

    try {
        const response = await fetchWithRetry(SCRIPT_URL, {
            body: JSON.stringify({ action: "get_area_progress" })
        });
        const result = await response.json();
        
        if (result.result === "success" && result.data) {
            if (window.areaChartInstance) window.areaChartInstance.destroy();
            Chart.register(ChartDataLabels);

            const labels = result.data.map(d => d.area);
            const daily = result.data.map(d => d.plan > 0 ? ((d.progress/d.plan)*100).toFixed(1) : 0);
            const achieve = result.data.map(d => d.target > 0 ? ((d.achievement/d.target)*100).toFixed(1) : 0);

            window.areaChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Harian', data: daily, backgroundColor: 'rgba(142, 38, 212, 0.7)', borderColor: '#8e26d4', borderWidth: 1, categoryPercentage: 0.8 },
                        { label: 'Pencapaian', data: achieve, backgroundColor: 'rgba(255, 179, 0, 0.7)', borderColor: '#ffb300', borderWidth: 1, categoryPercentage: 0.8 }
                    ]
                },
                options: {
                    indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: {size:10} } }, datalabels: { anchor:'end', align:'end', formatter: v => Math.round(v)+"%" } },
                    scales: { x: { display: false, max: 130 }, y: { grid: { display: false } } }
                }
            });
        }
    } catch (e) { console.error("Err AreaChart:", e); }
}

// --- SURVEY LOGIC ---
async function checkSurveyStatus(user, userData) {
    const date = new Date();
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const surveyRef = ref(db, `survei_logs/${period}/${user.uid}`);
    
    try {
        const snap = await get(surveyRef);
        if(!snap.exists()) {
            let namaBm = "BM Point " + (userData.point || "-");
            const surveyModal = new bootstrap.Modal(document.getElementById('surveyModal'), {backdrop:'static', keyboard:false});
            document.getElementById('sv_point').value = userData.point || "";
            document.getElementById('sv_namaBm').value = namaBm;
            
            document.getElementById('btnSubmitSurvey').onclick = () => submitSurvey(user, userData, period, namaBm, surveyModal);
            surveyModal.show();
        }
    } catch(e) { console.error(e); }
}

async function submitSurvey(user, data, period, bmName, modal) {
    const btn = document.getElementById('btnSubmitSurvey');
    const form = document.getElementById('formSurveyBm');
    if(!form.checkValidity()) { form.reportValidity(); return; }
    
    const formData = new FormData(form);
    btn.innerHTML = 'Mengirim...'; btn.disabled = true;

    try {
        const body = {
            action: "submit_survei_bm", idBp: data.idKaryawan, namaBp: data.nama, point: data.point, namaBm: bmName,
            q1: formData.get('q1'), q2: formData.get('q2'), q3: formData.get('q3'), q4: formData.get('q4'),
            q5: formData.get('q5'), q6: formData.get('q6'), q7: formData.get('q7'), q8: formData.get('q8'),
            q9: formData.get('q9'), q10: formData.get('q10'), q11: formData.get('q11')
        };
        await fetchWithRetry(SCRIPT_URL_SURVEY, { body: JSON.stringify(body) });
        await set(ref(db, `survei_logs/${period}/${user.uid}`), { timestamp: new Date().toISOString(), status: "done" });
        
        alert("Survei terkirim!");
        modal.hide();
    } catch(e) { 
        alert("Gagal kirim survei."); 
        btn.innerHTML = 'Kirim Survei'; btn.disabled = false;
    }
}

// Drag Scroll
const slider = document.querySelector('.horizontal-scroll-wrapper');
let isDown = false, startX, scrollLeft;
if (slider) {
    slider.addEventListener('mousedown', (e) => { isDown = true; slider.classList.add('active'); startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; slider.classList.remove('active'); });
    slider.addEventListener('mouseup', () => { isDown = false; slider.classList.remove('active'); });
    slider.addEventListener('mousemove', (e) => { if(!isDown) return; e.preventDefault(); const x = e.pageX - slider.offsetLeft; const walk = (x - startX) * 2; slider.scrollLeft = scrollLeft - walk; });
}
