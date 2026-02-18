import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirebaseApp } from "./firebase-init.js";
// UPDATE 1: Menambahkan 'remove' ke dalam import agar bisa hapus data
import { getDatabase, ref, get, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";



const app = getFirebaseApp();
const auth = getAuth(app);
const db = getDatabase(app);

// ID KHUSUS ADMIN
const ADMIN_ID = "17246";

let allUsers = [];
const usersContainer = document.getElementById('usersContainer');
const loadingOverlay = document.getElementById('loadingOverlay');
const searchUser = document.getElementById('searchUser');
// Pastikan Bootstrap sudah terload di HTML
const editModalElement = document.getElementById('editModal');
const editModal = editModalElement ? new bootstrap.Modal(editModalElement) : null;

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
            if(document.getElementById('emptyState')) {
                document.getElementById('emptyState').classList.remove('d-none');
            }
        }
    } catch (err) {
        alert("Gagal mengambil data user: " + err.message);
    } finally {
        if(loadingOverlay) loadingOverlay.classList.add('d-none');
    }
}

// 4. Render User ke Layar
function renderUsers(users) {
    usersContainer.innerHTML = "";
    
    if (users.length === 0) {
        if(document.getElementById('emptyState')) {
            document.getElementById('emptyState').classList.remove('d-none');
        }
        return;
    }
    if(document.getElementById('emptyState')) {
        document.getElementById('emptyState').classList.add('d-none');
    }

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = "user-card";
        
        // UPDATE 2: Menambahkan Tombol Hapus disamping tombol Edit
        // Saya menggunakan d-flex gap-2 untuk merapikan posisi tombol
        div.innerHTML = `
            <div class="user-info">
                <h6>${u.nama || "Tanpa Nama"}</h6>
                <p><i class="fa-regular fa-id-badge me-1"></i>${u.idKaryawan || "-"}</p>
                <p><i class="fa-solid fa-location-dot me-1"></i>${u.point || "-"} (${u.area || "-"})</p>
            </div>
            <div class="d-flex gap-2 align-items-center">
                <button class="btn-edit" onclick="window.openEditModal('${u.uid}')" title="Edit User">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-edit" onclick="window.hapusUser('${u.uid}', '${u.nama}')" style="background: #ffebee; color: #c62828;" title="Hapus User">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        usersContainer.appendChild(div);
    });
}

// 5. Fungsi Search
if(searchUser) {
    searchUser.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => 
            (u.nama && u.nama.toLowerCase().includes(term)) ||
            (u.idKaryawan && String(u.idKaryawan).includes(term))
        );
        renderUsers(filtered);
    });
}

// 6. Logic Edit Modal
window.openEditModal = function(uid) {
    const user = allUsers.find(u => u.uid === uid);
    if (!user) return;

    document.getElementById('editUid').value = user.uid;
    document.getElementById('editNama').value = user.nama || "";
    document.getElementById('editIdKaryawan').value = user.idKaryawan || "";
    document.getElementById('editArea').value = user.area || "";
    document.getElementById('editPoint').value = user.point || "";
    
    if(editModal) editModal.show();
};

// 7. Simpan Perubahan
const btnSimpan = document.getElementById('btnSimpan');
if(btnSimpan) {
    btnSimpan.addEventListener('click', async () => {
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
            const originalText = btnSimpan.innerText;
            btnSimpan.innerText = "Menyimpan...";
            btnSimpan.disabled = true;

            // Update ke Firebase Realtime Database
            await update(ref(db, 'users/' + uid), updates);
            
            alert("Data berhasil diperbarui!");
            if(editModal) editModal.hide();
            
            // Refresh Data
            if(loadingOverlay) loadingOverlay.classList.remove('d-none');
            fetchAllUsers();

        } catch (err) {
            alert("Gagal update: " + err.message);
        } finally {
            btnSimpan.innerText = "Simpan Perubahan";
            btnSimpan.disabled = false;
        }
    });
}

// UPDATE 3: Fungsi Hapus User (Baru)
window.hapusUser = async function(uid, nama) {
    // Konfirmasi keamanan agar tidak salah pencet
    const konfirmasi = confirm(`⚠️ PERINGATAN!\n\nAnda akan menghapus akun: ${nama}\n\nData yang dihapus TIDAK BISA dikembalikan.\nApakah Anda yakin?`);
    
    if (konfirmasi) {
        try {
            if(loadingOverlay) loadingOverlay.classList.remove('d-none'); // Tampilkan loading
            
            // Menghapus data dari path 'users/uid'
            await remove(ref(db, "users/" + uid));
            
            alert("✅ Akun berhasil dihapus.");
            fetchAllUsers(); // Refresh daftar user otomatis

        } catch (error) {
            console.error("Error delete:", error);
            alert("❌ Gagal menghapus: " + error.message + "\n(Pastikan Rules Database sudah diupdate)");
            if(loadingOverlay) loadingOverlay.classList.add('d-none');
        }
    }
};
