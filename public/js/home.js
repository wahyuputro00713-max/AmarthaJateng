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

// 🔴🔴 PASTE URL APPS SCRIPT BARU DI SINI 🔴🔴
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

const userNameSpan = document.getElementById('userName') || document.getElementById('welcomeName'); 
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, (user) => {
    if (user) {
        const userRef = ref(db, 'users/' + user.uid);
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const realName = data.nama || data.idKaryawan || user.email;
                if (userNameSpan) userNameSpan.textContent = realName;
            } else {
                if (userNameSpan) userNameSpan.textContent = user.email;
            }
        }).catch(err => console.log("Gagal load profil sendiri:", err));

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
        console.log("Data Spreadsheet:", result);

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
            console.warn("Gagal ambil detail user, lanjut tampilkan ID saja.");
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
        card1.querySelector('.bp-point').textContent = "";
        card1.querySelector('.bp-amount').textContent = "";
    }
}

function updatePodium(selectorClass, data, usersMap) {
    const card = document.querySelector(selectorClass);
    if (!card) return;

    const elName = card.querySelector('.bp-name');
    const elPoint = card.querySelector('.bp-point'); // Elemen Baru
    const elAmount = card.querySelector('.bp-amount');
    const elImg = card.querySelector('.avatar-img');

    if (data && data.idKaryawan) {
        const idCari = String(data.idKaryawan).trim();
        const userProfile = usersMap[idCari];
        const displayName = userProfile ? userProfile.nama : `ID: ${data.idKaryawan}`;
        
        // Foto
        let displayPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
        if (userProfile && userProfile.foto) {
            displayPhoto = userProfile.foto;
        }

        if (elName) elName.textContent = displayName;
        if (elPoint) elPoint.textContent = data.point || "-"; // Tampilkan Point
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
