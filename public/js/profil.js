import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// Elemen DOM
const btnEdit = document.getElementById('btnEdit');
const btnSave = document.getElementById('btnSave');
const btnLogout = document.getElementById('btnLogout');
const inputs = document.querySelectorAll('.editable-input'); // Ambil semua input yg bisa diedit

let currentUserUid = null;

// 1. CEK LOGIN & LOAD DATA
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
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
            
            // Isi Header Profil
            document.getElementById('displayName').textContent = data.nama || "User";
            document.getElementById('displayEmail').textContent = data.email || "-";
            document.getElementById('profilePic').src = `https://ui-avatars.com/api/?name=${data.nama}&background=8e26d4&color=fff`;

            // Isi Form
            document.getElementById('namaInput').value = data.nama || "";
            document.getElementById('idKaryawanInput').value = data.idKaryawan || "";
            document.getElementById('hpInput').value = data.noHp || "";
            document.getElementById('jabatanInput').value = data.jabatan || "BM";
            document.getElementById('regionalInput').value = data.regional || "Jawa Tengah 1";
            document.getElementById('areaInput').value = data.area || "";
            document.getElementById('pointInput').value = data.point || "";
            document.getElementById('emailInput').value = data.email || ""; // Email readonly permanen
        }
    });
}

// 2. TOMBOL EDIT (BUKA KUNCI)
if (btnEdit) {
    btnEdit.addEventListener('click', () => {
        // Tampilkan tombol Simpan, Sembunyikan tombol Edit
        btnEdit.classList.add('d-none');
        btnSave.classList.remove('d-none');
        
        // Buka semua inputan
        inputs.forEach(input => {
            input.removeAttribute('readonly');
            input.removeAttribute('disabled');
            input.classList.remove('bg-light'); // Biar kelihatan putih (aktif)
        });
        
        // Fokus ke nama
        document.getElementById('namaInput').focus();
        alert("Silakan ubah data, lalu klik Simpan.");
    });
}

// 3. TOMBOL SIMPAN (UPDATE FIREBASE)
if (btnSave) {
    btnSave.addEventListener('click', async () => {
        if (!currentUserUid) return;

        const newData = {
            nama: document.getElementById('namaInput').value,
            idKaryawan: document.getElementById('idKaryawanInput').value,
            noHp: document.getElementById('hpInput').value,
            jabatan: document.getElementById('jabatanInput').value,
            regional: document.getElementById('regionalInput').value,
            area: document.getElementById('areaInput').value,
            point: document.getElementById('pointInput').value
        };

        try {
            // Update ke Database Realtime
            await update(ref(db, 'users/' + currentUserUid), newData);
            
            alert("✅ Data Berhasil Diperbarui!");
            
            // Kunci Kembali Form
            inputs.forEach(input => {
                // Kecuali jabatan & regional yg select, pake disabled
                if(input.tagName === 'SELECT') input.setAttribute('disabled', true);
                else input.setAttribute('readonly', true);
            });

            // Kembalikan Tombol
            btnSave.classList.add('d-none');
            btnEdit.classList.remove('d-none');
            
            // Refresh tampilan nama di atas
            document.getElementById('displayName').textContent = newData.nama;
            document.getElementById('profilePic').src = `https://ui-avatars.com/api/?name=${newData.nama}&background=8e26d4&color=fff`;

        } catch (error) {
            console.error(error);
            alert("❌ Gagal menyimpan: " + error.message);
        }
    });
}

// 4. LOGOUT
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        if(confirm("Yakin ingin keluar akun?")) {
            signOut(auth).then(() => window.location.replace("index.html"));
        }
    });
}
