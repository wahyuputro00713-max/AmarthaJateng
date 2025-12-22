import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// CONFIG FIREBASE
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

// Data Point
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
const elements = {
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
            
            // Isi Text Input
            elements.nama.value = data.nama || "";
            elements.jabatan.value = data.jabatan || "";
            elements.regional.value = data.regional || "";
            
            elements.displayNama.textContent = data.nama || "User";
            elements.displayId.textContent = "ID: " + (data.idKaryawan || "-");

            // Isi Foto
            if (data.fotoProfil) {
                elements.img.src = data.fotoProfil;
            }

            // Setup Dropdown
            if (data.area) {
                elements.area.value = data.area;
                updatePointsDropdown(data.area);
                if (data.point) elements.point.value = data.point;
            }
        }
    });
}

// 2. LOGIKA DROPDOWN POINT
function updatePointsDropdown(selectedArea) {
    const points = dataPoints[selectedArea] || [];
    elements.point.innerHTML = '<option value="" selected disabled>Pilih Point...</option>';
    points.forEach(point => {
        const option = document.createElement('option');
        option.value = point;
        option.textContent = point;
        elements.point.appendChild(option);
    });
    // Jika sedang mode edit, buka dropdown point
    if(!elements.area.disabled) {
        elements.point.disabled = false;
    }
}

elements.area.addEventListener('change', function() {
    updatePointsDropdown(this.value);
});

// 3. MODE EDIT (PERBAIKAN UTAMA)
elements.btnEdit.addEventListener('click', () => {
    // A. Buka Kunci SEMUA Textbox (Hapus readonly & background abu-abu)
    [elements.nama, elements.jabatan, elements.regional].forEach(input => {
        input.removeAttribute('readonly');  // Hapus kunci
        input.classList.remove('bg-light'); // Hapus warna abu
        input.classList.add('bg-white');    // Ganti warna putih
    });

    // B. Buka Dropdown Area & Point
    elements.area.disabled = false;
    elements.point.disabled = false;
    
    // C. Tampilkan Tombol Simpan & Kamera
    elements.btnEdit.style.display = 'none';
    elements.actionButtons.classList.remove('d-none');
    elements.actionButtons.classList.add('d-flex');
    elements.btnCamera.style.display = 'flex'; // Munculkan ikon kamera
    
    // D. Fokus ke nama
    elements.nama.focus();
    alert("Mode Edit Aktif. Silakan ubah data.");
});

// 4. BATAL EDIT
elements.btnBatal.addEventListener('click', () => {
    location.reload(); 
});

// 5. PREVIEW FOTO
elements.fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        if (file.size > 2 * 1024 * 1024) {
            alert("⚠️ Ukuran foto terlalu besar! Maksimal 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            elements.img.src = e.target.result; 
            newPhotoBase64 = e.target.result;   
        };
        reader.readAsDataURL(file);
    }
});

// 6. SIMPAN DATA (PERBAIKAN SIMPAN SEMUA)
elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Masukkan data NAMA, JABATAN, REGIONAL ke update
    const updates = {
        nama: elements.nama.value,       // <-- Data Baru
        jabatan: elements.jabatan.value, // <-- Data Baru
        regional: elements.regional.value,// <-- Data Baru
        area: elements.area.value,
        point: elements.point.value
    };

    if (newPhotoBase64) {
        updates.fotoProfil = newPhotoBase64;
    }

    try {
        await update(ref(db, 'users/' + currentUserUid), updates);
        alert("✅ Profil Berhasil Diupdate!");
        location.reload(); // Refresh halaman agar terkunci kembali
    } catch (error) {
        console.error(error);
        alert("Gagal update profil: " + error.message);
    }
});
