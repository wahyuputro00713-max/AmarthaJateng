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
        
        // Opsional: Jika ingin menyembunyikan yang sudah di-FU, tambahkan logika ini:
        // const notYetFu = item.status_fu !== "Sudah";
        // return matchArea && matchPoint && notYetFu;
        
        return matchArea && matchPoint;
    });

    renderData(filtered);
}

function renderData(data) {
    const container = document.getElementById("dataList");
    container.innerHTML = "";
    document.getElementById("loading").style.display = "none";

    if (data.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>Data tidak ditemukan.</p>";
        return;
    }

    data.forEach(item => {
        let rawHp = item.no_hp.replace(/[^0-9]/g, '');
        if (rawHp.startsWith('0')) rawHp = '62' + rawHp.substring(1);

        const pesan = `Salam Sehat Ibu Calon mitra Amartha. Apakah benar ini ${item.nama_mitra}. Selamat ibu berkesempatan mendapatkan modal dari PT Amartha Mikro Fintek dengan membentuk Kelompok Minimal 6 Orang. Jika bersedia membuat kelompok Silahkan balas WA ini. Terimakasih`;
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

// Fungsi Baru: Menangani Klik Follow Up
async function handleFollowUp(nama, hp, link, btnElement, alreadyFu) {
    // 1. Jika sudah di-FU sebelumnya, buka WA saja, jangan update lagi (atau blok jika mau)
    if (alreadyFu) {
        // Opsional: alert("Mitra ini sudah di-follow up.");
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
        }
    } catch (e) {
        console.error("Error updating status:", e);
        btnElement.innerText = "Error";
    }
}
