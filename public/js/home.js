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

// URL APPS SCRIPT LANGSUNG
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

const userNameSpan = document.getElementById('userName') || document.getElementById('welcomeName');
const logoutBtn = document.getElementById('logoutBtn');
const btnAdmin = document.getElementById('btnAdmin'); 

// ID ADMIN
const ADMIN_ID = "17246";

// --- FUNGSI HELPER: TANGGAL & JAM LOKAL (WIB) ---
function getLocalTodayDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; 
}

function getCurrentTimeWIB() {
    return new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// --- FUNGSI CEK STATUS ABSENSI ---
async function checkAbsensiStatus(uid) {
    const today = getLocalTodayDate();
    const absensiRef = ref(db, `absensi/${today}/${uid}`);

    try {
        const snapshot = await get(absensiRef);
        const btnAbsen = document.getElementById('btnAbsen') || document.querySelector('a[href="absensi.html"]');

        if (!btnAbsen) return;

        const textEl = btnAbsen.querySelector('.menu-text');

        // KONDISI 1: SUDAH ABSEN
        if (snapshot.exists()) {
            btnAbsen.style.pointerEvents = "none";
            btnAbsen.style.opacity = "0.5"; // Transparan
            btnAbsen.style.filter = "grayscale(100%)"; // Hitam Putih
            
            if (textEl) {
                textEl.innerText = "Sudah Absen";
                textEl.style.fontWeight = "bold";
                textEl.style.color = "#666"; // Abu-abu netral
            }
        } 
        // KONDISI 2: BELUM ABSEN TAPI SUDAH LEWAT JAM 08:15 WIB
        else {
            const jamSekarang = getCurrentTimeWIB();
            const BATAS_WAKTU = "08:15";

            if (jamSekarang > BATAS_WAKTU) {
                // Matikan Tombol (Transparan Saja, Jangan Merah)
                btnAbsen.style.pointerEvents = "none";
                btnAbsen.style.opacity = "0.5"; // Efek Transparan / Pudar
                btnAbsen.style.filter = "grayscale(100%)"; // Hitam Putih
                
                if (textEl) {
                    textEl.innerText = "Absen Tutup";
                    textEl.style.fontWeight = "bold";
                    textEl.style.color = "#666"; // Abu-abu netral (Bukan Merah)
                }
            }
        }

    } catch (error) {
        console.error("Gagal cek absensi:", error);
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        checkAbsensiStatus(user.uid);

        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const realName = data.nama || data.idKaryawan || user.email;
                if (userNameSpan) userNameSpan.textContent = realName;

                if (String(data.idKaryawan).trim() === ADMIN_ID) {
                    if (btnAdmin) btnAdmin.classList.remove('d-none');
                }
            } else {
                if (userNameSpan) userNameSpan.textContent = user.email;
            }
        }).catch(err => console.log("Gagal load profil:", err));

        loadLeaderboard();
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

// --- LOGIKA LEADERBOARD ---
async function loadLeaderboard() {
    try {
        console.log("Memuat Leaderboard...");
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
        } catch (dbError) {
            console.warn("Gagal ambil detail user.");
        }

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
