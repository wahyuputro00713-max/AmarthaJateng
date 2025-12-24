import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// URL APPS SCRIPT (Nanti dipakai untuk tarik data)
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

// 1. CEK LOGIN & LOAD PROFIL UTAMA
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadUserProfile(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

function loadUserProfile(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Isi Filter Otomatis (Readonly)
            document.getElementById('areaInput').value = data.area || "-";
            document.getElementById('pointInput').value = data.point || "-";
            document.getElementById('idKaryawan').value = data.idKaryawan || "-";
        }
    }).catch(err => {
        console.error("Gagal load profil:", err);
    });
}

// 2. LISTENER TOMBOL TAMPILKAN (LOGIKA MENYUSUL)
document.getElementById('filterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const hari = document.getElementById('hariSelect').value;
    const area = document.getElementById('areaInput').value;
    const point = document.getElementById('pointInput').value;

    if (!hari) {
        alert("⚠️ Silakan pilih Hari Kumpulan terlebih dahulu!");
        return;
    }

    // Nanti di sini kita panggil fungsi fetch ke Apps Script
    // fetchMitraBelumBayar(area, point, hari);
    
    alert(`[DEMO] Menampilkan data untuk:\nArea: ${area}\nPoint: ${point}\nHari: ${hari}\n\n(Data akan ditarik dari Spreadsheet setelah script backend siap)`);
});
