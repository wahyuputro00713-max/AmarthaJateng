import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirebaseApp } from "./firebase-init.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- KONFIGURASI FIREBASE ---


const app = getFirebaseApp();
const auth = getAuth(app);
const db = getDatabase(app);

// Data Point (Referensi Area)
const dataPoints = {
    "Klaten": ["01 Wedi", "Karangnongko", "Mojosongo", "Polanharjo", "Trucuk"],
    "Magelang": ["Grabag", "Mungkid", "Pakis", "Salam"],
    "Solo": ["Banjarsari", "Gemolong", "Masaran", "Tangen"],
    "Solo 2": ["Gatak", "Jumantono", "Karanganyar", "Nguter", "Pasar Kliwon"],
    "Yogyakarta": ["01 Sleman", "Kalasan", "Ngaglik", "Umbulharjo"],
    "Yogyakarta 2": ["01 Pandak", "01 Pangasih", "01 Pleret", "Kutoarjo", "Purworejo", "Saptosari"],
    "Wonogiri": ["Jatisrono", "Ngadirojo", "Ngawen 2", "Pracimantoro", "Wonosari"]
};

// --- DOM ELEMENTS ---
const el = {
    nama: document.getElementById('namaInput'),
    email: document.getElementById('emailInput'), // Element baru untuk email
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
        
        // Load Email langsung dari Auth User
        if (el.email) el.email.value = user.email || "-";
        
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
            
            // Isi Textbox (Hanya menampilkan, tidak untuk diedit nanti)
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
    
    // Buka kunci point jika area tidak terkunci (saat mode edit)
    if (!el.area.disabled) el.point.disabled = false;
}

if(el.area) {
    el.area.addEventListener('change', function() {
        updatePointsDropdown(this.value);
    });
}

// 3. LOGIKA TOMBOL EDIT (UPDATE UTAMA DI SINI)
if(el.btnEdit) {
    el.btnEdit.addEventListener('click', () => {
        console.log("Mode Edit Aktif");

        // A. BUKA KUNCI HANYA AREA & POINT
        // Kita TIDAK membuka kunci Nama, Email, Jabatan, Regional sesuai permintaan.
        
        if(el.area) el.area.disabled = false;
        if(el.point && el.area.value) el.point.disabled = false;

        // B. TAMPILKAN TOMBOL KAMERA (Untuk Edit Foto)
        if(el.btnCamera) el.btnCamera.style.display = 'flex';

        // C. UI CHANGES
        el.btnEdit.style.display = 'none'; // Sembunyikan tombol pensil
        
        // Tampilkan tombol Simpan/Batal
        if(el.actionButtons) {
            el.actionButtons.classList.remove('d-none');
            el.actionButtons.classList.add('d-flex');
        }

        // Fokus ke Area select untuk memberi tahu user ini bisa diedit
        if(el.area) el.area.focus();
        
        // Optional: Beri visual cue bahwa form aktif
        el.area.classList.add('border-primary');
        el.point.classList.add('border-primary');
    });
}

// 4. TOMBOL BATAL
if(el.btnBatal) {
    el.btnBatal.addEventListener('click', () => {
        location.reload(); 
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

// 6. SIMPAN DATA
if(el.form) {
    el.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Kita hanya mengambil nilai yang diizinkan untuk diedit
        // Nama, Jabatan, Regional dibiarkan (tidak diupdate ulang untuk keamanan, atau bisa tetap dikirim sebagai data lama)
        
        const updates = {
            area: el.area.value,
            point: el.point.value
        };

        if (newPhotoBase64) {
            updates.fotoProfil = newPhotoBase64;
        }

        try {
            await update(ref(db, 'users/' + currentUserUid), updates);
            alert("✅ Profil Berhasil Diperbarui!");
            location.reload();
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan: " + error.message);
        }
    });
}
