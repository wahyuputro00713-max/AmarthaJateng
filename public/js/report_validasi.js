import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// URL Script Apps Script (Pastikan ini benar)
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev";

let userProfile = {
    idKaryawan: "",
    nama: "",
    area: "",
    cabang: ""
};

// 1. Cek Auth & Load Profil
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Load data user dari Firebase
        try {
            const userRef = ref(db, 'users/' + user.uid);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const data = snapshot.val();
                userProfile.idKaryawan = data.idKaryawan || "-";
                userProfile.nama = data.nama || "User";
                userProfile.area = data.area || "-";
                // Isi field otomatis jika ada input yang readonly
                document.getElementById('idKaryawan').value = userProfile.idKaryawan;
                document.getElementById('namaKaryawan').value = userProfile.nama;
            }
        } catch (error) {
            console.error("Gagal load profil:", error);
        }
    } else {
        window.location.replace("index.html");
    }
});

// 2. Handle Submit Form
const formValidasi = document.getElementById('formValidasi');
const btnKirim = document.getElementById('btnKirim');
const btnKembali = document.getElementById('btnKembali');

formValidasi.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah reload halaman

    // Validasi input sederhana
    const namaCalon = document.getElementById('namaCalon').value;
    const nikKTP = document.getElementById('nikKTP').value;
    const statusValidasi = document.getElementById('statusValidasi').value;
    const keterangan = document.getElementById('keterangan').value;

    if (!namaCalon || !nikKTP || !statusValidasi) {
        alert("Mohon lengkapi data wajib (Nama, NIK, Status)!");
        return;
    }

    // Ubah tampilan tombol loading
    const originalBtnText = btnKirim.innerHTML;
    btnKirim.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...`;
    btnKirim.disabled = true;

    try {
        // Siapkan data yang akan dikirim
        const payload = {
            action: "submit_validasi", // Pastikan backend menangani action ini
            jenisLaporan: "ValidasiLapangan", // Penanda jenis laporan
            timestamp: new Date().toISOString(),
            idKaryawan: userProfile.idKaryawan,
            namaKaryawan: userProfile.nama,
            area: userProfile.area,
            namaCalonMitra: namaCalon,
            nik: nikKTP,
            status: statusValidasi,
            keterangan: keterangan
        };

        // Kirim ke Workers/Apps Script
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });

        const result = await response.json();

        if (result.result === 'success') {
            // -- SUKSES --
            alert("✅ Laporan Validasi Berhasil Dikirim!");
            
            // Reset form agar bersih untuk input baru
            formValidasi.reset();
            
            // Kembalikan nilai ID & Nama Karyawan (karena ikut ter-reset)
            document.getElementById('idKaryawan').value = userProfile.idKaryawan;
            document.getElementById('namaKaryawan').value = userProfile.nama;

            // PERUBAHAN UTAMA DI SINI:
            // Tidak ada window.location.href = "home.html";
            // Kita tetap di halaman ini.

        } else {
            throw new Error(result.error || "Gagal menyimpan data.");
        }

    } catch (error) {
        console.error("Error submit:", error);
        alert("❌ Gagal mengirim laporan: " + error.message);
    } finally {
        // Kembalikan tombol seperti semula
        btnKirim.innerHTML = originalBtnText;
        btnKirim.disabled = false;
    }
});

// 3. Handle Tombol Kembali
// Hanya tombol ini yang boleh mengarahkan ke Home
if (btnKembali) {
    btnKembali.addEventListener('click', () => {
        window.location.href = "home.html";
    });
}
