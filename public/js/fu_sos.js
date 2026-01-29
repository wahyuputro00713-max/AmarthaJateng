// GANTI URL INI DENGAN URL DEPLOYMENT APPS SCRIPT TERBARU
const API_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

let globalData = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
    
    document.getElementById('filterArea').addEventListener('change', function() {
        const selectedArea = this.value;
        updatePointOptions(selectedArea); 
        filterData(); 
    });

    document.getElementById('filterPoint').addEventListener('change', filterData);
});

async function fetchData() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_data_sosialisasi" })
        });
        const result = await response.json();

        if (result.result === "success") {
            globalData = result.data;
            populateAreaFilter(globalData);
            renderData(globalData);
        } else {
            document.getElementById("loading").innerText = "Gagal memuat data.";
        }
    } catch (error) {
        console.error(error);
        document.getElementById("loading").innerText = "Terjadi kesalahan koneksi.";
    }
}

function populateAreaFilter(data) {
    const areas = [...new Set(data.map(item => item.area))].sort();
    const areaSelect = document.getElementById("filterArea");
    areaSelect.innerHTML = '<option value="all">Semua Area</option>';

    areas.forEach(area => {
        let option = document.createElement("option");
        option.value = area;
        option.text = area;
        areaSelect.appendChild(option);
    });

    updatePointOptions("all");
}

function updatePointOptions(selectedArea) {
    const pointSelect = document.getElementById("filterPoint");
    let relevantData;

    if (selectedArea === "all") {
        relevantData = globalData;
    } else {
        relevantData = globalData.filter(item => item.area === selectedArea);
    }
    
    const filteredPoints = [...new Set(relevantData.map(item => item.point))].sort();
    pointSelect.innerHTML = '<option value="all">Semua Point</option>';

    filteredPoints.forEach(point => {
        let option = document.createElement("option");
        option.value = point;
        option.text = point;
        pointSelect.appendChild(option);
    });
    
    pointSelect.value = "all";
}

function filterData() {
    const selectedArea = document.getElementById("filterArea").value;
    const selectedPoint = document.getElementById("filterPoint").value;

    const filtered = globalData.filter(item => {
        const matchArea = (selectedArea === "all" || item.area === selectedArea);
        const matchPoint = (selectedPoint === "all" || item.point === selectedPoint);
        
        return matchArea && matchPoint;
    });

    renderData(filtered);
}

// --- BAGIAN UTAMA YANG DIPERBAIKI ---
function renderData(data) {
    const container = document.getElementById("dataList");
    container.innerHTML = "";
    document.getElementById("loading").style.display = "none";

    if (data.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>Data tidak ditemukan.</p>";
        return;
    }

    data.forEach(item => {
        // Format Nomor HP
        let rawHp = item.no_hp.replace(/[^0-9]/g, '');
        if (rawHp.startsWith('0')) rawHp = '62' + rawHp.substring(1);

        // Generate Pesan Dinamis (Anti-Blokir)
        const pesan = generateDynamicMessage(item);
        const waLink = `https://wa.me/${rawHp}?text=${encodeURIComponent(pesan)}`;

        // Cek status FU
        const isFu = item.status_fu === "Sudah";
        const cardClass = isFu ? "card already-fu" : "card";
        const btnText = isFu ? "Sudah di-FU" : "Followup (WA)";
        const btnStyle = isFu ? "background-color: #ccc; cursor: default;" : "";

        const card = document.createElement("div");
        card.className = cardClass;
        // Tambahkan style opacity jika sudah FU
        if(isFu) card.style.opacity = "0.7";

        card.innerHTML = `
            <div class="tag">${item.area} - ${item.point}</div>
            <h3>${item.nama_mitra}</h3>
            <p><strong>BP:</strong> ${item.nama_bp}</p>
            <p><strong>No HP:</strong> ${item.no_hp}</p>
            <button class="btn-wa" style="${btnStyle}" 
                onclick="handleFollowUp('${item.nama_mitra}', '${item.no_hp}', '${waLink}', this, ${isFu})">
                ${btnText}
            </button>
        `;
        container.appendChild(card);
    });
}

/**
 * FUNGSI GENERATOR PESAN DINAMIS
 * Fungsi ini mengacak kata-kata agar pesan tidak terdeteksi sebagai broadcast massal.
 */
function generateDynamicMessage(item) {
    // 1. Variasi Salam Berdasarkan Waktu
    const jam = new Date().getHours();
    let salamWaktu = "Pagi";
    if (jam >= 10 && jam < 15) salamWaktu = "Siang";
    else if (jam >= 15 && jam < 18) salamWaktu = "Sore";
    else if (jam >= 18) salamWaktu = "Malam";

    const listSalam = [
        `Selamat ${salamWaktu} Ibu,`,
        `Halo Ibu, selamat ${salamWaktu}.`,
        `Assalamualaikum Ibu,`,
        `Salam sejahtera Bu,`,
        `Permisi Ibu, selamat ${salamWaktu}.`
    ];

    // 2. Variasi Pembuka
    const listPembuka = [
        `Apa benar ini nomor Ibu ${item.nama_mitra}?`,
        `Mohon maaf mengganggu waktunya, apakah benar dengan Ibu ${item.nama_mitra}?`,
        `Saya ingin konfirmasi, benar ini dengan Ibu ${item.nama_mitra}?`,
        `Semoga Ibu ${item.nama_mitra} sehat selalu ya.`
    ];

    // 3. Variasi Isi Pesan (Inti sama, kalimat beda)
    const listIsi = [
        `Selamat! Ibu terpilih mendapatkan kesempatan pengajuan modal usaha dari PT Amartha (sistem kelompok min. 6 orang).`,
        `Kami dari Amartha menginfokan bahwa Ibu berpeluang mendapatkan modal usaha dengan membentuk kelompok minimal 6 orang.`,
        `Ibu masuk dalam daftar prioritas kami untuk bantuan modal usaha Amartha. Syaratnya cukup bentuk kelompok 6 orang.`,
        `Ada kabar baik, Ibu bisa ajukan modal usaha di Amartha sekarang. Caranya mudah, cukup buat kelompok 6 orang.`
    ];

    // 4. Variasi Kalimat Penutup/Call to Action
    const listCTA = [
        `Jika Ibu bersedia, silakan balas WA ini ya.`,
        `Bila berminat, mohon respon pesan ini Bu.`,
        `Silakan balas pesan ini jika Ibu tertarik mengambil kesempatannya.`,
        `Info lebih lanjut bisa balas chat ini ya Bu.`
    ];

    // 5. Variasi Link (Link sama, pengantar beda)
    // Link dipecah agar tidak selalu menjadi preview image yang sama persis
    const linkApp = "https://play.google.com/store/apps/details?id=com.amarthaplus.amarthabeyond";
    const listLink = [
        `Detail aplikasi bisa dilihat disini: ${linkApp}`,
        `Download aplikasi resmi kami: ${linkApp}`,
        `Klik link berikut untuk info aplikasi: ${linkApp}`
    ];

    // 6. Footer & ID Unik (PENTING untuk anti-spam)
    // Random ID membuat setiap pesan memiliki "sidik jari" berbeda bagi sistem WA
    const randomID = Math.floor(Math.random() * 10000);
    const footer = `\nPetugas: ${item.nama_bp} (${item.point})\nRef ID: #${randomID}`;

    // Fungsi pengacak array
    const acak = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Gabungkan semua komponen
    return `${acak(listSalam)} ${acak(listPembuka)}\n\n${acak(listIsi)} ${acak(listCTA)}\n\n${acak(listLink)}\n${footer}`;
}

async function handleFollowUp(nama, hp, link, btnElement, alreadyFu) {
    // 1. Jika sudah di-FU sebelumnya, buka WA saja, jangan update database
    if (alreadyFu) {
        window.open(link, '_blank');
        return; 
    }

    // 2. Buka WhatsApp di tab baru
    window.open(link, '_blank');

    // 3. Update Tampilan Button langsung (Feedback Instant)
    btnElement.innerText = "Memproses...";
    btnElement.style.backgroundColor = "#ccc";
    btnElement.disabled = true;

    // 4. Kirim data ke Spreadsheet (Backend)
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: "update_status_fu",
                namaMitra: nama,
                noHp: hp
            })
        });
        
        const result = await response.json();
        
        if (result.result === "success") {
            btnElement.innerText = "Sudah di-FU";
            // Update data lokal agar kalau difilter ulang statusnya tetap 'Sudah'
            const item = globalData.find(d => d.nama_mitra === nama && d.no_hp === hp);
            if (item) item.status_fu = "Sudah";
        } else {
            btnElement.innerText = "Gagal Update";
            btnElement.style.backgroundColor = "red";
            console.error(result.message);
            // Re-enable button jika gagal, agar bisa dicoba lagi
            btnElement.disabled = false;
        }
    } catch (e) {
        console.error("Error updating status:", e);
        btnElement.innerText = "Error";
        btnElement.disabled = false;
    }
}
