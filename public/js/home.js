import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// TAMBAHKAN IMPORT DATABASE
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); // Inisialisasi Database

// Elemen DOM
// Pastikan di HTML ID-nya adalah 'userName' atau 'welcomeName'
// Sesuaikan baris di bawah ini dengan ID di home.html Anda
const userNameSpan = document.getElementById('userName') || document.getElementById('welcomeName'); 
const logoutBtn = document.getElementById('logoutBtn');

// 1. Cek Status Login & Ambil Data Database
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Ambil Data Detail dari Database (Bukan cuma dari Auth)
        const userRef = ref(db, 'users/' + user.uid);
        
        get(userRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Prioritas: Nama Asli -> ID Karyawan -> Email
                const realName = data.nama || data.idKaryawan || user.email;

                if (userNameSpan) {
                    userNameSpan.textContent = realName;
                }
            } else {
                // Jika data database belum ada
                if (userNameSpan) userNameSpan.textContent = user.email;
            }
        }).catch((error) => {
            console.error("Gagal ambil data user:", error);
        });
        
    } else {
        // User tidak login -> Tendang ke halaman login
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
