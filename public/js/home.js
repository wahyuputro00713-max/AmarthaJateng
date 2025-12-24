import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// 🔴 PENTING: Pastikan ini URL Web App Google Script TERBARU (akhiran /exec)
// Jika pakai Cloudflare Worker, gunakan URL Worker.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyukYV8miaVWFHg6TWaomRodRFQPAYHnq2UlArNNHy73qR6TdUiz3PMYSvgaKZXmXX-/exec"; 

// Elemen DOM
const userNameSpan = document.getElementById('userName') || document.getElementById('welcomeName'); 
const logoutBtn = document.getElementById('logoutBtn');

// 1. Cek Status Login
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
        });

        loadLeaderboard();
        
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fungsi Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if(confirm("Apakah Anda yakin ingin keluar?")) {
            signOut(auth).then(() => window.location.replace("index.html"));
        }
    });
}

// 3. FUNGSI LEADERBOARD
async function loadLeaderboard() {
    try {
        console.log("Memuat Leaderboard...");
        setLoadingState();

        // --- FETCH DATA ---
        // Trik: Gunakan text/plain untuk menghindari CORS Preflight (OPTIONS request) yang sering gagal di GAS
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_leaderboard" }),
            redirect: "follow",
            headers: { 
                "Content-Type": "text/plain;charset=utf-8" 
            }
        });
        
        const result = await response.json();
        console.log("Data Leaderboard Diterima:", result);

        // Validasi Data
        if (result.result !== "success" || !result.data || !Array.isArray(result.data)) {
            console.warn("Format data salah atau kosong:", result);
            showErrorState("Data Kosong");
            return;
        }

        const top3 = result.data; 

        // --- AMBIL DATA USER FIREBASE ---
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users`));
        let usersMap = {}; 

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

        // --- UPDATE TAMPILAN ---
        // Pastikan array top3 memiliki minimal data yang dibutuhkan, jika tidak kirim object kosong
        updatePodium(".rank-1", top3[0] || {}, usersMap); 
        updatePodium(".rank-2", top3[1] || {}, usersMap); 
        updatePodium(".rank-3", top3[2] || {}, usersMap); 

    } catch (error) {
        console.error("Gagal Load Leaderboard:", error);
        showErrorState("Gagal Muat");
    }
}

function setLoadingState() {
    [".rank-1", ".rank-2", ".rank-3"].forEach(sel => {
        const card = document.querySelector(sel);
        if(card) {
            const nameEl = card.querySelector('.bp-name');
            const amtEl = card.querySelector('.bp-amount');
            if(nameEl) nameEl.textContent = "Memuat...";
            if(amtEl) amtEl.textContent = "-";
        }
    });
}

function showErrorState(msg) {
    [".rank-1", ".rank-2", ".rank-3"].forEach(sel => {
        const card = document.querySelector(sel);
        if(card) {
            const nameEl = card.querySelector('.bp-name');
            const amtEl = card.querySelector('.bp-amount');
            if(nameEl) nameEl.textContent = msg;
            if(amtEl) amtEl.textContent = "-";
        }
    });
}

function updatePodium(selectorClass, data, usersMap) {
    const card = document.querySelector(selectorClass);
    if (!card) return;

    const elName = card.querySelector('.bp-name');
    const elAmount = card.querySelector('.bp-amount');
    const elImg = card.querySelector('.avatar-img');

    if (data && data.idKaryawan) {
        const idCari = String(data.idKaryawan).trim();
        const userProfile = usersMap[idCari];
        
        // Nama: Prioritas dari Firebase > ID Karyawan
        const displayName = userProfile ? userProfile.nama : `ID: ${data.idKaryawan}`;
        
        // Foto: Prioritas dari Firebase > Avatar Default
        let displayPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
        if (userProfile && userProfile.foto) {
            displayPhoto = userProfile.foto;
        }

        if (elName) elName.textContent = displayName;
        if (elAmount) elAmount.textContent = formatJuta(data.amount);
        if (elImg) elImg.src = displayPhoto;

    } else {
        // Data kosong (misal cuma ada 2 juara, juara 3 kosong)
        if (elName) elName.textContent = "-";
        if (elAmount) elAmount.textContent = "";
        // Reset foto ke default/kosong jika mau
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
