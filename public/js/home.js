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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); 

// URL APPS SCRIPT (Pastikan ini URL Deployment Web App TERBARU)
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

// Elemen DOM
const userNameSpan = document.getElementById('userName') || document.getElementById('welcomeName'); 
const logoutBtn = document.getElementById('logoutBtn');

// 1. Cek Status Login & Ambil Data Database
onAuthStateChanged(auth, (user) => {
    if (user) {
        // A. Ambil Data Detail User Login
        const userRef = ref(db, 'users/' + user.uid);
        
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const realName = data.nama || data.idKaryawan || user.email;

                if (userNameSpan) {
                    userNameSpan.textContent = realName;
                }
            } else {
                if (userNameSpan) userNameSpan.textContent = user.email;
            }
        }).catch((error) => {
            console.error("Gagal ambil data user:", error);
        });

        // B. Load Leaderboard (Fitur Baru)
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
// 3. LOGIKA LEADERBOARD (INTEGRASI BARU)
// ==========================================

async function loadLeaderboard() {
    try {
        console.log("Memuat Leaderboard...");
        
        // Ubah tampilan jadi "Memuat..." dulu agar user tahu proses berjalan
        setLoadingState(".rank-1");
        setLoadingState(".rank-2");
        setLoadingState(".rank-3");

        // Step A: Ambil Data Ranking dari Spreadsheet (via Apps Script)
        // Kirim action: "get_leaderboard"
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_leaderboard" })
        });
        
        const result = await response.json();

        if (result.result !== "success" || !result.data) {
            console.warn("Gagal ambil data leaderboard:", result);
            return;
        }

        const top3 = result.data; // Array data top 3 [Juara 1, Juara 2, Juara 3]

        // Step B: Ambil Data Profil User dari Firebase (Sekali panggil untuk efisiensi)
        // Kita butuh ini untuk mendapatkan Foto & Nama Asli berdasarkan ID Karyawan
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `users`));
        let usersMap = {}; 

        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const userData = childSnapshot.val();
                if (userData.idKaryawan) {
                    // Mapping ID Karyawan -> Data User
                    // Kita trim dan jadikan string agar pencarian akurat
                    const cleanID = String(userData.idKaryawan).trim();
                    usersMap[cleanID] = {
                        nama: userData.nama || "Tanpa Nama",
                        foto: userData.fotoProfil || null
                    };
                }
            });
        }

        // Step C: Update Tampilan HTML dengan Data Asli
        // Urutan array Apps Script: Index 0 (Juara 1), Index 1 (Juara 2), Index 2 (Juara 3)
        updatePodium(".rank-1", top3[0], usersMap); 
        updatePodium(".rank-2", top3[1], usersMap); 
        updatePodium(".rank-3", top3[2], usersMap); 

    } catch (error) {
        console.error("Error Leaderboard:", error);
    }
}

// Helper: Ubah teks jadi loading saat proses fetch
function setLoadingState(selectorClass) {
    const card = document.querySelector(selectorClass);
    if(card) {
        const elName = card.querySelector('.bp-name');
        const elAmount = card.querySelector('.bp-amount');
        if(elName) elName.textContent = "Memuat...";
        if(elAmount) elAmount.textContent = "-";
    }
}

// Helper: Update Kartu Podium dengan Data Real
function updatePodium(selectorClass, data, usersMap) {
    const card = document.querySelector(selectorClass);
    if (!card) return;

    // Elemen di dalam kartu HTML
    const elName = card.querySelector('.bp-name');
    const elAmount = card.querySelector('.bp-amount');
    const elImg = card.querySelector('.avatar-img');

    if (data && data.idKaryawan) {
        const idCari = String(data.idKaryawan).trim();
        
        // Cari data user di map Firebase
        const userProfile = usersMap[idCari];
        
        // Set Nama (Pakai nama profil jika ada, kalau tidak pakai ID)
        const displayName = userProfile ? userProfile.nama : `ID: ${data.idKaryawan}`;
        
        // Set Nominal
        const displayAmount = formatJuta(data.amount);

        // Set Foto (Pakai foto profil jika ada, kalau tidak pakai Avatar Default Inisial)
        let displayPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
        if (userProfile && userProfile.foto) {
            displayPhoto = userProfile.foto;
        }

        // Update Text & Gambar
        if (elName) elName.textContent = displayName;
        if (elAmount) elAmount.textContent = displayAmount;
        if (elImg) elImg.src = displayPhoto;

    } else {
        // Jika data kosong (misal belum ada juara 3)
        if (elName) elName.textContent = "-";
        if (elAmount) elAmount.textContent = "Rp 0";
    }
}

// Helper: Format Angka Singkat (1.2jt, 500rb)
function formatJuta(angka) {
    if (!angka) return "Rp 0";
    
    // Bersihkan karakter non-angka jika ada (misal "Rp 1.000.000")
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
