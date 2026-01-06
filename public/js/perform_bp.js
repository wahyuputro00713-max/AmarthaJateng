import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- Config Firebase (Copy dari file home.js Anda) ---
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

// URL Apps Script Anda
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx40G5B9WVienIPwcGrsFcjDI69ahZNq3eJ7oENYPiweHC-oxFNeCGNihcRn8KVum9cIA/exec";

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Ambil ID Karyawan dari database users berdasarkan UID
            const userRef = ref(db, 'users/' + user.uid);
            get(userRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    const idKaryawan = userData.idKaryawan;
                    
                    if(idKaryawan) {
                        fetchPerformData(idKaryawan);
                    } else {
                        showError("ID Karyawan tidak ditemukan di profil Anda.");
                    }
                } else {
                    showError("Data User tidak ditemukan.");
                }
            }).catch(err => {
                showError("Gagal mengambil profil user: " + err.message);
            });
        } else {
            // Jika belum login, lempar ke index
            window.location.replace("index.html");
        }
    });
});

async function fetchPerformData(id) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: "get_perform_bp",
                idKaryawan: id
            }),
            // mode: "no-cors", // JANGAN gunakan no-cors jika ingin baca response JSON
            redirect: "follow",
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === "success") {
            renderData(result.data);
        } else {
            showError(result.message || "Data tidak ditemukan di Spreadsheet.");
        }

    } catch (error) {
        console.error(error);
        showError("Gagal mengambil data performa. Cek koneksi internet.");
    }
}

function renderData(data) {
    // Sembunyikan loading, tampilkan konten
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dataContent').style.display = 'block';

    // Header Info
    document.getElementById('displayNama').innerText = data.nama || "User";
    document.getElementById('displayJabatan').innerText = data.jabatan || "-";
    document.getElementById('valPoint').innerText = data.point || "0";

    // Harian
    document.getElementById('harianSos').innerText = data.harian.sosialisasi || "0";
    document.getElementById('harianColLoan').innerText = data.harian.col_loan || "0";
    document.getElementById('harianColAmt').innerText = formatRupiah(data.harian.col_amount);

    // Bulanan
    document.getElementById('bulananSos').innerText = data.bulanan.sosialisasi || "0";
    document.getElementById('bulananColLoan').innerText = data.bulanan.col_loan || "0";
    document.getElementById('bulananColAmt').innerText = formatRupiah(data.bulanan.col_amount);
}

function showError(msg) {
    document.getElementById('loading').style.display = 'none';
    const errDiv = document.getElementById('errorMsg');
    errDiv.style.display = 'block';
    errDiv.innerText = msg;
}

function formatRupiah(angka) {
    if (!angka || isNaN(angka)) return "Rp 0";
    return "Rp " + Number(angka).toLocaleString('id-ID');
}
