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

// --- KONFIGURASI URL APPS SCRIPT ---
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 
const SCRIPT_URL_BP = "https://script.google.com/macros/s/AKfycbzbfr4VW1-Atl1TzEo5sy4WnAGFT1agQl-shtGLTmFQNa6JZByvrUlTKo9h0-4YN7P7ww/exec"; 

const ADMIN_ID = "17246";

const userNameSpan = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');
const btnAdmin = document.getElementById('btnAdmin'); 
const closingMenuBtn = document.getElementById('closingMenuBtn');

let cachedLeaderboardData = [];
let cachedUsersMap = {};

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

// ==========================================
// LOGIKA SURVEI BARU (11 PERTANYAAN)
// ==========================================

async function checkSurveyStatus(user, userData) {
    // 1. Cek Jabatan (Hanya BP)
    if (userData.jabatan !== "BP") return;

    // 2. Tentukan Periode Survei (Format: YYYY-MM) -> Februari 2026
    const date = new Date();
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; 

    // 3. Cek Firebase apakah user sudah isi bulan ini
    const surveyRef = ref(db, `survei_logs/${period}/${user.uid}`);
    
    try {
        const snapshot = await get(surveyRef);
        
        if (!snapshot.exists()) {
            // -- JIKA BELUM ISI --
            console.log("User BP belum isi survei bulan ini. Memulai pengecekan BM...");

            // A. Cari Nama BM Otomatis berdasarkan Point
            let namaBm = "BM Point " + (userData.point || "-"); 
            try {
                // Ambil semua user untuk mencari BM di point yang sama
                const usersRef = ref(db, 'users');
                const snapshotUsers = await get(usersRef);
                
                if (snapshotUsers.exists()) {
                    snapshotUsers.forEach((childSnapshot) => {
                        const u = childSnapshot.val();
                        // Cocokkan Point & Jabatan BM
                        if (u.point === userData.point && u.jabatan === "BM") {
                            namaBm = u.nama;
                        }
                    });
                }
            } catch (e) { console.log("Gagal auto-detect BM", e); }

            console.log("Nama BM Terdeteksi:", namaBm);

            // B. Isi data hidden form di Modal
            const inpPoint = document.getElementById('sv_point');
            const inpBm = document.getElementById('sv_namaBm');
            if(inpPoint) inpPoint.value = userData.point || "";
            if(inpBm) inpBm.value = namaBm;

            // C. Tampilkan Modal (Locked / Tidak bisa ditutup)
            const surveyModalEl = document.getElementById('surveyModal');
            if (surveyModalEl) {
                const modal = new bootstrap.Modal(surveyModalEl, {
                    backdrop: 'static', 
                    keyboard: false     
                });
                modal.show();
                
                // Setup Listener Tombol Submit
                const btnSubmit = document.getElementById('btnSubmitSurvey');
                if(btnSubmit) {
                    btnSubmit.onclick = () => submitSurvey(user, userData, period, namaBm, modal);
                }
            }
        }
    } catch (error) {
        console.error("Error cek survei:", error);
    }
}

async function submitSurvey(user, userData, period, namaBm, modalInstance) {
    const btn = document.getElementById('btnSubmitSurvey');
    const form = document.getElementById('formSurveyBm');
    
    // 1. Validasi Input HTML5 (Required fields)
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Ambil Value dari Form
    const formData = new FormData(form);
    const dataKirim = {
        action: "submit_survei_bm",
        idBp: userData.idKaryawan,
        namaBp: userData.nama,
        point: userData.point,
        namaBm: namaBm, // Dikirim otomatis
        // 11 Pertanyaan
        q1: formData.get('q1'),
        q2: formData.get('q2'),
        q3: formData.get('q3'),
        q4: formData.get('q4'),
        q5: formData.get('q5'),
        q6: formData.get('q6'),
        q7: formData.get('q7'),
        q8: formData.get('q8'),
        q9: formData.get('q9'),
        q10: formData.get('q10'),
        q11: formData.get('q11')
    };

    // 2. Loading State
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Mengirim...';
    btn.disabled = true;

    try {
        // 3. Kirim ke Spreadsheet (Apps Script)
        await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(dataKirim),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        // 4. Simpan Log di Firebase (Tandai sudah isi bulan ini)
        await set(ref(db, `survei_logs/${period}/${user.uid}`), {
            timestamp: new Date().toISOString(),
            status: "done"
        });

        // 5. Sukses
        alert("Terima kasih! Survei berhasil dikirim. Selamat bekerja.");
        modalInstance.hide(); 
        
        // Restore tombol
        btn.innerHTML = originalText;
        btn.disabled = false;

    } catch (error) {
        console.error("Gagal kirim survei:", error);
        alert("Gagal mengirim survei. Mohon periksa koneksi internet Anda.");
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ==========================================
// MAIN AUTH LISTENER
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
                
                if (["RM", "AM", "BM"].includes(userJabatan) && closingMenuBtn) {
                    closingMenuBtn.classList.remove('d-none');
                }

                if (userJabatan === "BP") {
                    const bpContainer = document.getElementById('bpSectionContainer');
                    if(bpContainer) bpContainer.classList.remove('d-none'); 
                    
                    if (data.idKaryawan) {
                        loadBpPerformance(data.idKaryawan); 
                    } else {
                        const loader = document.getElementById('bpLoader');
                        const errorEl = document.getElementById('bpError');
                        if(loader) loader.classList.add('d-none');
                        if(errorEl) errorEl.classList.remove('d-none');
                    }

                    // ==> CEK STATUS SURVEI (Trigger Modal) <==
                    checkSurveyStatus(user, data);
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

async function loadLeaderboard() {
    try {
        try {
            const snapshot = await get(child(ref(db), `users`));
            if (snapshot.exists()) {
                snapshot.forEach((c) => {
                    const u = c.val();
                    if (u.idKaryawan) cachedUsersMap[String(u.idKaryawan).trim()] = { nama: u.nama || "Tanpa Nama", foto: u.fotoProfil || null };
                });
            }
        } catch (e) {}

        const response = await fetch(SCRIPT_URL, {
            method: 'POST', body: JSON.stringify({ action: "get_leaderboard" }), headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        
        if (result.result === "success" && result.data && result.data.length > 0) {
            cachedLeaderboardData = result.data;
            cachedLeaderboardData.sort((a, b) => b.amount - a.amount);
            updatePodium(".rank-1", cachedLeaderboardData[0], cachedUsersMap);
            updatePodium(".rank-2", cachedLeaderboardData[1], cachedUsersMap);
            updatePodium(".rank-3", cachedLeaderboardData[2], cachedUsersMap);
        } else {
             updatePodium(".rank-1", null);
        }

    } catch (error) { console.error("Err Leaderboard", error); }
}

function updatePodium(sel, data, usersMap = {}) {
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
        const name = p ? p.nama : (data.nama || `ID: ${data.idKaryawan}`);
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
    const listContainer = document.getElementById('fullLbList');
    if (!listContainer) return;

    if (cachedLeaderboardData.length === 0) {
        listContainer.innerHTML = '<div class="text-center py-5 text-muted">Data tidak tersedia.</div>';
        return;
    }

    let html = '';
    cachedLeaderboardData.forEach((item, index) => {
        const rank = index + 1;
        const id = String(item.idKaryawan).trim();
        const p = cachedUsersMap[id];
        const name = p ? p.nama : (item.nama || `ID: ${item.idKaryawan}`);
        const photo = (p && p.foto) ? p.foto : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        
        let rankClass = '';
        if(rank === 1) rankClass = 'top-1';
        else if(rank === 2) rankClass = 'top-2';
        else if(rank === 3) rankClass = 'top-3';

        html += `
        <div class="lb-list-item">
            <div class="lb-rank ${rankClass}">${rank}</div>
            <img src="${photo}" class="lb-user-img" alt="${name}">
            <div class="lb-user-info">
                <div class="lb-user-name">${name}</div>
                <div class="lb-user-id">${id}</div>
            </div>
            <div class="lb-score">${formatJuta(item.amount)}</div>
        </div>
        `;
    });
    listContainer.innerHTML = html;
}

function formatJuta(n) {
    if (!n) return "Rp 0";
    let num = Number(String(n).replace(/[^0-9.-]+/g,""));
    if (isNaN(num)) return "Rp 0";
    if (num >= 1e9) return (num / 1e9).toFixed(1) + "M";
    else if (num >= 1e6) return (num / 1e6).toFixed(1) + "jt";
    else return (num / 1e3).toFixed(0) + "rb";
}

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

async function loadBpPerformance(idKaryawan) {
    const loader = document.getElementById('bpLoader');
    const content = document.getElementById('bpContent');
    const errorEl = document.getElementById('bpError');
    const ctx1 = document.getElementById('bpPerformanceChart');
    const ctx2 = document.getElementById('bpUserRepeatChart'); 

    if (!ctx1 || !ctx2) return;

    try {
        const response = await fetch(SCRIPT_URL_BP, {
            method: 'POST',
            body: JSON.stringify({ action: "get_bp_performance", idKaryawan: idKaryawan }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();
        
        console.log("BP Perf Data:", result);

        if(loader) loader.classList.add('d-none');

        if (result.result === "success" && result.data) {
            if(content) content.classList.remove('d-none');
            
            renderBpChart1(ctx1, result.data);
            renderBpChart2(ctx2, result.data);
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
    const fmtJuta = (n) => {
        let val = Number(n);
        if(isNaN(val)) return "0";
        if(val >= 1e9) return (val/1e9).toFixed(2) + " M";
        if(val >= 1e6) return (val/1e6).toFixed(1) + " Jt";
        return val.toLocaleString('id-ID');
    };
    const fmtNum = (n) => Number(n).toLocaleString('id-ID');

    document.getElementById('txtAmountAct').innerText = "Rp " + fmtJuta(data.amount.actual);
    document.getElementById('txtAmountTgt').innerText = "Tgt: Rp " + fmtJuta(data.amount.target);
    document.getElementById('txtNoaAct').innerText = fmtNum(data.noa.actual);
    document.getElementById('txtNoaTgt').innerText = "Tgt: " + fmtNum(data.noa.target);
    document.getElementById('txtWeeklyAct').innerText = fmtNum(data.weekly.actual);
    document.getElementById('txtWeeklyTgt').innerText = "Tgt: " + fmtNum(data.weekly.target);

    if(data.user && data.repeat) {
        document.getElementById('txtUserAct').innerText = fmtNum(data.user.actual);
        document.getElementById('txtUserTgt').innerText = "Tgt: " + fmtNum(data.user.target);
        document.getElementById('txtRepeatAct').innerText = fmtNum(data.repeat.actual);
        document.getElementById('txtRepeatTgt').innerText = "Tgt: " + fmtNum(data.repeat.target);
    }
}

function renderBpChart1(canvasCtx, data) {
    const calcPct = (act, tgt) => (tgt > 0) ? (act / tgt) * 100 : 0;
    
    const pAmt = calcPct(data.amount.actual, data.amount.target);
    const pNoa = calcPct(data.noa.actual, data.noa.target);
    const pWk = calcPct(data.weekly.actual, data.weekly.target);
    
    const getColor = (p) => p >= 100 ? '#2e7d32' : '#8e26d4';

    if (window.chartInstance1) window.chartInstance1.destroy();

    window.chartInstance1 = new Chart(canvasCtx, {
        type: 'bar',
        data: {
            labels: ['Amount', 'NoA', 'Weekly'],
            datasets: [
                {
                    label: 'Capaian',
                    data: [pAmt, pNoa, pWk],
                    backgroundColor: [getColor(pAmt), getColor(pNoa), getColor(pWk)],
                    borderRadius: 4, barPercentage: 0.5, z: 2
                },
                {
                    label: 'Target', data: [100, 100, 100], 
                    backgroundColor: '#f0f2f5', borderRadius: 4, barPercentage: 0.5, grouped: false, order: 1
                }
            ]
        },
        options: getChartOptions()
    });
}

function renderBpChart2(canvasCtx, data) {
    if(!data.user || !data.repeat) return; 

    const calcPct = (act, tgt) => (tgt > 0) ? (act / tgt) * 100 : 0;

    const pUser = calcPct(data.user.actual, data.user.target);
    const pRepeat = calcPct(data.repeat.actual, data.repeat.target);

    const getColor = (p) => p >= 100 ? '#2e7d32' : '#ffb300'; 

    if (window.chartInstance2) window.chartInstance2.destroy();

    window.chartInstance2 = new Chart(canvasCtx, {
        type: 'bar',
        data: {
            labels: ['User', 'Repeat'],
            datasets: [
                {
                    label: 'Capaian',
                    data: [pUser, pRepeat],
                    backgroundColor: [getColor(pUser), getColor(pRepeat)],
                    borderRadius: 4, barPercentage: 0.5, z: 2
                },
                {
                    label: 'Target', data: [100, 100], 
                    backgroundColor: '#f0f2f5', borderRadius: 4, barPercentage: 0.5, grouped: false, order: 1
                }
            ]
        },
        options: getChartOptions()
    });
}

function getChartOptions() {
    return {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(ctx) {
                        if (ctx.datasetIndex === 1) return null;
                        return `Capaian: ${ctx.raw.toFixed(1)}%`;
                    }
                }
            },
            datalabels: {
                anchor: 'end', align: 'end', offset: 4, color: '#333',
                font: { size: 10, weight: 'bold' },
                formatter: (val, ctx) => ctx.datasetIndex === 1 ? "" : Math.round(val) + "%"
            }
        },
        scales: {
            x: { display: false, max: 130, beginAtZero: true },
            y: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#555' } }
        }
    };
}

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
