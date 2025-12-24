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

// ⚠️ PENTING: GANTI INI DENGAN URL 'WEB APP' DARI GOOGLE APPS SCRIPT SETELAH 'NEW DEPLOYMENT' ⚠️
// Jangan pakai workers.dev dulu untuk memastikan koneksi langsung berhasil.
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

// Elemen DOM
const userNameSpan = document.getElementById('userName') || document.getElementById('welcomeName'); 
const logoutBtn = document.getElementById('logoutBtn');

// 1. Cek Status Login & Load Data
onAuthStateChanged(auth, (user) => {
    if (user) {
        // A. Load Nama User
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

        // B. Load Leaderboard
        loadLeaderboard();
        
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fungsi Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if(confirm("Apakah Anda yakin ingin keluar?")) {
            signOut(auth).then(() => {
                window.location.replace("index.html");
            });
        }
    });
}

// ==========================================
// 3. LOGIKA LEADERBOARD
// ==========================================

async function loadLeaderboard() {
    try {
        console.log("Menghubungi Server Leaderboard...");
        
        // Ubah tampilan jadi "Memuat..."
        updateStatusLoading(".rank-1");
        updateStatusLoading(".rank-2");
        updateStatusLoading(".rank-3");

        // Request ke Google Apps Script
        // Mode 'no-cors' dihapus agar kita bisa baca response JSON
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_leaderboard" })
        });
        
        const result = await response.json();
        console.log("Data Diterima:", result); // Cek Console jika masih Error

        // Validasi Data
        if (result.result !== "success" || !Array.isArray(result.data) || result.data.length === 0) {
            console.warn("Data leaderboard kosong/gagal:", result);
            showErrorState("Data Kosong");
            return;
        }

        const top3 = result.data; 

        // Ambil Data Profil User dari Firebase (untuk Nama & Foto)
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

        // Update Tampilan HTML
        // Data Spreadsheet: [Juara 1, Juara 2, Juara 3]
        updatePodium(".rank-1", top3[0], usersMap); 
        updatePodium(".rank-2", top3[1], usersMap); 
        updatePodium(".rank-3", top3[2], usersMap); 

    } catch (error) {
        console.error("Gagal Load Leaderboard:", error);
        showErrorState("Gagal Muat");
    }
}

// Helper: Tampilan Loading
function updateStatusLoading(selector) {
    const card = document.querySelector(selector);
    if(card) {
        const elName = card.querySelector('.bp-name');
        const elAmount = card.querySelector('.bp-amount');
        if(elName) elName.textContent = "Memuat...";
        if(elAmount) elAmount.textContent = "-";
    }
}

// Helper: Tampilan Error
function showErrorState(msg) {
    [".rank-1", ".rank-2", ".rank-3"].forEach(sel => {
        const card = document.querySelector(sel);
        if(card) {
            card.querySelector('.bp-name').textContent = msg;
            card.querySelector('.bp-amount').textContent = "-";
        }
    });
}

// Helper: Update Kartu Podium
function updatePodium(selectorClass, data, usersMap) {
    const card = document.querySelector(selectorClass);
    if (!card) return;

    const elName = card.querySelector('.bp-name');
    const elAmount = card.querySelector('.bp-amount');
    const elImg = card.querySelector('.avatar-img');

    if (data && data.idKaryawan) {
        const idCari = String(data.idKaryawan).trim();
        
        // Cari data user di map Firebase
        const userProfile = usersMap[idCari];
        
        // Nama: Prioritas dari Firebase, kalau tidak ada pakai ID
        const displayName = userProfile ? userProfile.nama : `ID: ${data.idKaryawan}`;
        
        // Nominal
        const displayAmount = formatJuta(data.amount);

        // Foto
        let displayPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
        if (userProfile && userProfile.foto) {
            displayPhoto = userProfile.foto;
        }

        // Update DOM
        if (elName) elName.textContent = displayName;
        if (elAmount) elAmount.textContent = displayAmount;
        if (elImg) elImg.src = displayPhoto;

    } else {
        // Jika data kurang (misal cuma ada 2 juara)
        if (elName) elName.textContent = "-";
        if (elAmount) elAmount.textContent = "";
    }
}

// Helper: Format Angka (1.2jt, 500rb)
function formatJuta(angka) {
    if (!angka) return "Rp 0";
    // Bersihkan karakter non-angka (misal Rp, titik, koma)
    let num = Number(String(angka).replace(/[^0-9.-]+/g,""));
    
    if (isNaN(num)) return "Rp 0";

    if (num >= 1000000000) {
        return "Rp " + (num / 1000000000).toFixed(1) + "M";
    } else if (num >= 1000000) {
        return "Rp " + (num / 1000000).toFixed(1) + "jt";
    } else if (num >= 1000) {
        return "Rp " + (num / 1000).toFixed(0) + "rb";
    } else {
        return "Rp " + num.toLocaleString('id-ID');
    }
}
