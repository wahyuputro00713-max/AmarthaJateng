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

// DATA POINTS (Sama seperti di Report)
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucul"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const btnEditProfil = document.getElementById('btnEditProfil');
const actionButtons = document.getElementById('actionButtons');
const btnBatalEdit = document.getElementById('btnBatalEdit');
const profilForm = document.getElementById('profilForm');

const areaInput = document.getElementById('areaInput');
const pointInput = document.getElementById('pointInput'); // Dropdown Point

const inputsProfil = [
    document.getElementById('namaInput'),
    document.getElementById('idKaryawanInput'),
    document.getElementById('jabatanInput'),
    document.getElementById('regionalInput'),
    areaInput,
    pointInput
];

let currentUser = null;

// LOGIKA DROPDOWN CASCADING DI PROFIL
areaInput.addEventListener('change', function() {
    updatePoints(this.value);
});

function updatePoints(selectedArea, selectedPoint = null) {
    const points = dataPoints[selectedArea] || [];
    pointInput.innerHTML = '<option value="" selected disabled>Pilih Point...</option>';
    
    if (points.length > 0) {
        points.forEach(point => {
            const option = document.createElement('option');
            option.value = point;
            option.textContent = point;
            pointInput.appendChild(option);
        });
        if (selectedPoint) pointInput.value = selectedPoint;
    } else {
        pointInput.innerHTML = '<option value="" disabled>Tidak ada data</option>';
    }
}

// 1. CEK LOGIN & LOAD DATA
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('emailInput').value = user.email;
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
            
            // Set Area & Point
            if (data.area) {
                areaInput.value = data.area;
                updatePoints(data.area, data.point); // Load point sesuai area yg tersimpan
            }
            
            if(btnEditProfil) btnEditProfil.disabled = false;
        }
    });
}

// 2. LOGIKA EDIT
if (btnEditProfil) {
    btnEditProfil.addEventListener('click', (e) => {
        e.preventDefault();
        inputsProfil.forEach(input => { if(input) input.disabled = false; });
        if(actionButtons) actionButtons.style.display = "grid";
        btnEditProfil.style.display = "none";
    });
}

if (btnBatalEdit) {
    btnBatalEdit.addEventListener('click', () => window.location.reload());
}

if (profilForm) {
    profilForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) return;

        loadingOverlay.style.display = 'flex';

        const updates = {
            nama: document.getElementById('namaInput').value,
            idKaryawan: document.getElementById('idKaryawanInput').value,
            jabatan: document.getElementById('jabatanInput').value,
            regional: document.getElementById('regionalInput').value,
            area: areaInput.value,
            point: pointInput.value // Simpan Point
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
}

// ... (SISA KODE EMAIL & PASSWORD SAMA SEPERTI SEBELUMNYA) ...
// (Untuk menghemat tempat, bagian updateEmail dan updatePassword tidak saya tulis ulang
//  karena sama persis dengan file profil.js sebelumnya. 
//  Pastikan Anda tetap menyertakan bagian itu di bawah sini.)
const btnEditEmail = document.getElementById('btnEditEmail');
const btnSimpanEmail = document.getElementById('btnSimpanEmail');
const emailEditGroup = document.getElementById('emailEditGroup');
const emailInput = document.getElementById('emailInput');

if(btnEditEmail) {
    btnEditEmail.addEventListener('click', () => {
        emailInput.disabled = !emailInput.disabled;
        if (!emailInput.disabled) {
            emailInput.focus();
            emailEditGroup.style.display = 'block';
        } else {
            emailEditGroup.style.display = 'none';
            emailInput.value = currentUser.email; 
        }
    });
}

if(btnSimpanEmail) {
    btnSimpanEmail.addEventListener('click', () => {
        const newEmail = emailInput.value.trim();
        if(confirm("Ubah email login? Anda harus login ulang.")) {
            loadingOverlay.style.display = 'flex';
            updateEmail(currentUser, newEmail).then(() => {
                alert("✅ Sukses! Silakan login ulang.");
                window.location.replace("index.html");
            }).catch(err => {
                loadingOverlay.style.display = 'none';
                alert("❌ Gagal: " + err.message);
            });
        }
    });
}

const btnEditPass = document.getElementById('btnEditPass');
const btnSimpanPass = document.getElementById('btnSimpanPass');
const passEditGroup = document.getElementById('passEditGroup');
const passInput = document.getElementById('passwordInput');

if(btnEditPass) {
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
}

if(btnSimpanPass) {
    btnSimpanPass.addEventListener('click', () => {
        const newPass = passInput.value;
        if (newPass.length < 6) return alert("Min 6 karakter");
        
        if(confirm("Ganti password?")) {
            loadingOverlay.style.display = 'flex';
            updatePassword(currentUser, newPass).then(() => {
                alert("✅ Password diganti.");
                window.location.reload();
            }).catch(err => {
                loadingOverlay.style.display = 'none';
                alert("❌ Gagal: " + err.message);
            });
        }
    });
}
