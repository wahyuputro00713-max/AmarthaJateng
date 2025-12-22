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

// Data Point (Referensi Area)
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucul"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pengasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// --- DOM ELEMENTS (Pastikan ID ini ada di HTML) ---
const el = {
    nama: document.getElementById('namaInput'),
    jabatan: document.getElementById('jabatanInput'),
    regional: document.getElementById('regionalInput'),
    area: document.getElementById('areaSelect'),
    point: document.getElementById('pointSelect'),
    
    displayNama: document.getElementById('displayName'),
    displayId: document.getElementById('displayId'),
    img: document.getElementById('profileImg'),
    fileInput: document.getElementById('fileInput'),
    
    btnEdit: document.getElementById('btnEdit'),
    btnCamera: document.getElementById('btnCamera'),
    actionButtons: document.getElementById('actionButtons'),
    btnBatal: document.getElementById('btnBatal'),
    form: document.getElementById('profilForm')
};

let currentUserUid = null;
let newPhotoBase64 = null;

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
            
            // Isi Textbox
            if(el.nama) el.nama.value = data.nama || "";
            if(el.jabatan) el.jabatan.value = data.jabatan || "";
            if(el.regional) el.regional.value = data.regional || "";
            
            // Isi Info Header
            if(el.displayNama) el.displayNama.textContent = data.nama || "User";
            if(el.displayId) el.displayId.textContent = "ID: " + (data.idKaryawan || "-");

            // Isi Foto
            if (data.fotoProfil && el.img) {
                el.img.src = data.fotoProfil;
            }

            // Setup Dropdown Area & Point
            if (data.area && el.area) {
                el.area.value = data.area;
                updatePointsDropdown(data.area);
                if (data.point && el.point) el.point.value = data.point;
            }
        }
    });
}

// 2. FUNGSI UPDATE DROPDOWN POINT
function updatePointsDropdown(selectedArea) {
    if(!el.point) return;
    
    const points = dataPoints[selectedArea] || [];
    el.point.innerHTML = '<option value="" selected disabled>Pilih Point...</option>';
    points.forEach(point => {
        const option = document.createElement('option');
        option.value = point;
        option.textContent = point;
        el.point.appendChild(option);
    });
    
    // Buka kunci point jika area tidak terkunci
    if (!el.area.disabled) el.point.disabled = false;
}

if(el.area) {
    el.area.addEventListener('change', function() {
        updatePointsDropdown(this.value);
    });
}

// 3. LOGIKA TOMBOL EDIT (BAGIAN PENTING!)
if(el.btnEdit) {
    el.btnEdit.addEventListener('click', () => {
        console.log("Tombol Edit Diklik - Membuka Kunci Form...");

        // A. BUKA KUNCI INPUT TEXT (Nama, Jabatan, Regional)
        // Kita gunakan property .readOnly = false agar lebih kuat daripada removeAttribute
        const textInputs = [el.nama, el.jabatan, el.regional];
        
        textInputs.forEach(input => {
            if(input) {
                input.readOnly = false;           // Buka Kunci Readonly
                input.disabled = false;           // Buka Kunci Disabled (jaga-jaga)
                input.classList.remove('bg-light'); // Hapus warna abu-abu
                input.classList.add('bg-white');    // Ubah jadi putih
                input.style.border = "1px solid #0d6efd"; // Beri border biru biar terlihat aktif
            }
        });

        // B. BUKA KUNCI DROPDOWN (Area & Point)
        if(el.area) el.area.disabled = false;
        if(el.point && el.area.value) el.point.disabled = false;

        // C. TAMPILKAN TOMBOL SIMPAN & BATAL
        el.btnEdit.style.display = 'none'; // Sembunyikan tombol pensil
        if(el.actionButtons) {
            el.actionButtons.classList.remove('d-none');
            el.actionButtons.classList.add('d-flex');
        }

        // D. TAMPILKAN TOMBOL KAMERA
        if(el.btnCamera) el.btnCamera.style.display = 'flex';

        // E. FOKUS KE NAMA
        if(el.nama) el.nama.focus();
    });
}

// 4. TOMBOL BATAL
if(el.btnBatal) {
    el.btnBatal.addEventListener('click', () => {
        location.reload(); // Refresh halaman untuk reset
    });
}

// 5. PREVIEW FOTO
if(el.fileInput) {
    el.fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("⚠️ Foto terlalu besar! Maksimal 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                if(el.img) el.img.src = e.target.result;
                newPhotoBase64 = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// 6. SIMPAN DATA (KIRIM SEMUA PERUBAHAN)
if(el.form) {
    el.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Ambil semua nilai terbaru dari form
        const updates = {
            nama: el.nama.value,
            jabatan: el.jabatan.value,
            regional: el.regional.value,
            area: el.area.value,
            point: el.point.value
        };

        if (newPhotoBase64) {
            updates.fotoProfil = newPhotoBase64;
        }

        try {
            await update(ref(db, 'users/' + currentUserUid), updates);
            alert("✅ Profil Berhasil Disimpan!");
            location.reload();
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan: " + error.message);
        }
    });
}
