import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyC8wOUkyZTa4W2hHHGZq_YKnGFqYEGOuH8",
    authDomain: "amarthajatengwebapp.firebaseapp.com",
    projectId: "amarthajatengwebapp",
    storageBucket: "amarthajatengwebapp.firebasestorage.app",
    messagingSenderId: "22431520744",
    appId: "1:22431520744:web:711af76a5335d97179765d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ID KHUSUS ADMIN
const ADMIN_ID = "17246";

let allUsers = [];
const usersContainer = document.getElementById('usersContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const searchUser = document.getElementById('searchUser');
const editModal = new bootstrap.Modal(document.getElementById('editModal'));

// 1. Cek Login & Hak Akses
onAuthStateChanged(auth, (user) => {
    if (user) {
        checkAdminAccess(user.uid);
    } else {
        window.location.replace("index.html");
    }
});

// 2. Cek apakah ID Karyawan adalah 17246
async function checkAdminAccess(uid) {
    try {
        const snapshot = await get(ref(db, 'users/' + uid));
        if (snapshot.exists()) {
            const profile = snapshot.val();
            // Jika BUKAN Admin, tendang ke home
            if (String(profile.idKaryawan) !== ADMIN_ID) {
                alert("Anda tidak memiliki akses ke halaman ini!");
                window.location.replace("home.html");
                return;
            }
            // Jika Admin, ambil data semua user
            fetchAllUsers();
        } else {
            window.location.replace("index.html");
        }
    } catch (err) {
        console.error(err);
        window.location.replace("home.html");
    }
}

// 3. Ambil Semua Data User
async function fetchAllUsers() {
    try {
        const snapshot = await get(ref(db, 'users'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert object ke array dan simpan key (uid)
            allUsers = Object.keys(data).map(key => ({
                uid: key,
                ...data[key]
            }));
            
            renderUsers(allUsers);
        } else {
            document.getElementById('emptyState').classList.remove('d-none');
        }
    } catch (err) {
        alert("Gagal mengambil data user: " + err.message);
    } finally {
        loadingOverlay.classList.add('d-none');
    }
}

// 4. Render User ke Layar
function renderUsers(users) {
    usersContainer.innerHTML = "";
    
    if (users.length === 0) {
        document.getElementById('emptyState').classList.remove('d-none');
        return;
    }
    document.getElementById('emptyState').classList.add('d-none');

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = "user-card";
        div.innerHTML = `
            <div class="user-info">
                <h6>${u.nama || "Tanpa Nama"}</h6>
                <p><i class="fa-regular fa-id-badge me-1"></i>${u.idKaryawan || "-"}</p>
                <p><i class="fa-solid fa-location-dot me-1"></i>${u.point || "-"} (${u.area || "-"})</p>
            </div>
            <button class="btn-edit" onclick="window.openEditModal('${u.uid}')">
                <i class="fa-solid fa-pen"></i>
            </button>
        `;
        usersContainer.appendChild(div);
    });
}

// 5. Fungsi Search
searchUser.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => 
        (u.nama && u.nama.toLowerCase().includes(term)) ||
        (u.idKaryawan && String(u.idKaryawan).includes(term))
    );
    renderUsers(filtered);
});

// 6. Logic Edit Modal (Global Scope agar bisa diakses onclick HTML)
window.openEditModal = function(uid) {
    const user = allUsers.find(u => u.uid === uid);
    if (!user) return;

    document.getElementById('editUid').value = user.uid;
    document.getElementById('editNama').value = user.nama || "";
    document.getElementById('editIdKaryawan').value = user.idKaryawan || "";
    document.getElementById('editArea').value = user.area || "";
    document.getElementById('editPoint').value = user.point || "";
    
    editModal.show();
};

// 7. Simpan Perubahan
document.getElementById('btnSimpan').addEventListener('click', async () => {
    const uid = document.getElementById('editUid').value;
    const updates = {
        nama: document.getElementById('editNama').value,
        idKaryawan: document.getElementById('editIdKaryawan').value,
        area: document.getElementById('editArea').value,
        point: document.getElementById('editPoint').value
    };

    // Validasi Sederhana
    if(!updates.idKaryawan || !updates.nama) {
        alert("Nama dan ID Karyawan wajib diisi!");
        return;
    }

    try {
        const btn = document.getElementById('btnSimpan');
        const originalText = btn.innerText;
        btn.innerText = "Menyimpan...";
        btn.disabled = true;

        // Update ke Firebase Realtime Database
        await update(ref(db, 'users/' + uid), updates);
        
        alert("Data berhasil diperbarui!");
        editModal.hide();
        
        // Refresh Data
        loadingOverlay.classList.remove('d-none');
        fetchAllUsers();

    } catch (err) {
        alert("Gagal update: " + err.message);
    } finally {
        const btn = document.getElementById('btnSimpan');
        btn.innerText = "Simpan Perubahan";
        btn.disabled = false;
    }
});
