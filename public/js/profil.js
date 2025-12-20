import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateEmail, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIG FIREBASE ---
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

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');

// Inputs Data Diri
const inputsProfil = [
    document.getElementById('namaInput'),
    document.getElementById('idKaryawanInput'),
    document.getElementById('jabatanInput'),
    document.getElementById('regionalInput'),
    document.getElementById('areaInput')
];
const btnEditProfil = document.getElementById('btnEditProfil');
const actionButtons = document.getElementById('actionButtons');
const btnBatalEdit = document.getElementById('btnBatalEdit');
const profilForm = document.getElementById('profilForm');

// Inputs Keamanan
const emailInput = document.getElementById('emailInput');
const btnEditEmail = document.getElementById('btnEditEmail');
const btnSimpanEmail = document.getElementById('btnSimpanEmail');
const emailEditGroup = document.getElementById('emailEditGroup');

const passInput = document.getElementById('passwordInput');
const btnEditPass = document.getElementById('btnEditPass');
const btnSimpanPass = document.getElementById('btnSimpanPass');
const passEditGroup = document.getElementById('passEditGroup');

let currentUser = null;

// 1. CEK LOGIN & LOAD DATA
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        emailInput.value = user.email; // Load Email Login
        loadUserData(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

function loadUserData(uid) {
    const userRef = ref(db, 'users/' + uid);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById('namaInput').value = data.nama || "";
            document.getElementById('idKaryawanInput').value = data.idKaryawan || "";
            document.getElementById('jabatanInput').value = data.jabatan || "";
            document.getElementById('regionalInput').value = data.regional || "";
            document.getElementById('areaInput').value = data.area || "";
        }
    });
}

// 2. LOGIKA EDIT DATA DIRI
btnEditProfil.addEventListener('click', () => {
    // Aktifkan semua input
    inputsProfil.forEach(input => input.disabled = false);
    // Tampilkan tombol simpan, sembunyikan tombol edit
    actionButtons.style.display = "grid";
    btnEditProfil.style.display = "none";
});

btnBatalEdit.addEventListener('click', () => {
    // Refresh halaman untuk reset data
    window.location.reload();
});

profilForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) return;

    loadingOverlay.style.display = 'flex';

    // Data yang akan diupdate ke Database
    const updates = {
        nama: document.getElementById('namaInput').value,
        idKaryawan: document.getElementById('idKaryawanInput').value,
        jabatan: document.getElementById('jabatanInput').value,
        regional: document.getElementById('regionalInput').value,
        area: document.getElementById('areaInput').value
    };

    update(ref(db, 'users/' + currentUser.uid), updates)
        .then(() => {
            alert("✅ Profil berhasil diperbarui!");
            window.location.reload();
        })
        .catch((error) => {
            console.error(error);
            alert("❌ Gagal update: " + error.message);
            loadingOverlay.style.display = 'none';
        });
});

// 3. LOGIKA UPDATE EMAIL
btnEditEmail.addEventListener('click', () => {
    emailInput.disabled = !emailInput.disabled;
    if (!emailInput.disabled) {
        emailInput.focus();
        emailEditGroup.style.display = 'block';
    } else {
        emailEditGroup.style.display = 'none';
        emailInput.value = currentUser.email; // Reset jika batal
    }
});

btnSimpanEmail.addEventListener('click', () => {
    const newEmail = emailInput.value.trim();
    if (!newEmail) return;
    
    if (confirm("Yakin ingin mengubah email login? Anda harus login ulang setelah ini.")) {
        loadingOverlay.style.display = 'flex';
        updateEmail(currentUser, newEmail)
            .then(() => {
                alert("✅ Email berhasil diubah! Silakan login ulang.");
                window.location.replace("index.html");
            })
            .catch((error) => {
                loadingOverlay.style.display = 'none';
                if (error.code === 'auth/requires-recent-login') {
                    alert("⚠️ Untuk keamanan, silakan Logout dan Login kembali sebelum mengganti Email.");
                } else {
                    alert("❌ Gagal: " + error.message);
                }
            });
    }
});

// 4. LOGIKA UPDATE PASSWORD
btnEditPass.addEventListener('click', () => {
    passInput.disabled = !passInput.disabled;
    if (!passInput.disabled) {
        passInput.focus();
        passEditGroup.style.display = 'block';
    } else {
        passEditGroup.style.display = 'none';
        passInput.value = "";
    }
});

btnSimpanPass.addEventListener('click', () => {
    const newPass = passInput.value;
    if (newPass.length < 6) {
        alert("Password minimal 6 karakter.");
        return;
    }

    if (confirm("Apakah Anda yakin ingin mengganti password?")) {
        loadingOverlay.style.display = 'flex';
        updatePassword(currentUser, newPass)
            .then(() => {
                alert("✅ Password berhasil diganti!");
                passInput.value = "";
                passInput.disabled = true;
                passEditGroup.style.display = 'none';
                loadingOverlay.style.display = 'none';
            })
            .catch((error) => {
                loadingOverlay.style.display = 'none';
                if (error.code === 'auth/requires-recent-login') {
                    alert("⚠️ Untuk keamanan, silakan Logout dan Login kembali sebelum mengganti Password.");
                } else {
                    alert("❌ Gagal: " + error.message);
                }
            });
    }
});
