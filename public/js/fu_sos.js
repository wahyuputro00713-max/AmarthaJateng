// GANTI URL INI DENGAN URL DEPLOYMENT APPS SCRIPT ANDA
const API_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
    
    document.getElementById('filterArea').addEventListener('change', filterData);
    document.getElementById('filterPoint').addEventListener('change', filterData);
});

let globalData = [];

async function fetchData() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_data_sosialisasi" })
        });
        const result = await response.json();

        if (result.result === "success") {
            globalData = result.data;
            populateFilters(globalData);
            renderData(globalData);
        } else {
            document.getElementById("loading").innerText = "Gagal memuat data.";
        }
    } catch (error) {
        console.error(error);
        document.getElementById("loading").innerText = "Terjadi kesalahan koneksi.";
    }
}

function populateFilters(data) {
    const areas = [...new Set(data.map(item => item.area))].sort();
    const points = [...new Set(data.map(item => item.point))].sort();

    const areaSelect = document.getElementById("filterArea");
    const pointSelect = document.getElementById("filterPoint");

    areas.forEach(area => {
        let option = document.createElement("option");
        option.value = area;
        option.text = area;
        areaSelect.appendChild(option);
    });

    points.forEach(point => {
        let option = document.createElement("option");
        option.value = point;
        option.text = point;
        pointSelect.appendChild(option);
    });
}

function filterData() {
    const selectedArea = document.getElementById("filterArea").value;
    const selectedPoint = document.getElementById("filterPoint").value;

    const filtered = globalData.filter(item => {
        return (selectedArea === "all" || item.area === selectedArea) &&
               (selectedPoint === "all" || item.point === selectedPoint);
    });

    renderData(filtered);
}

function renderData(data) {
    const container = document.getElementById("dataList");
    container.innerHTML = "";
    document.getElementById("loading").style.display = "none";

    if (data.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:20px;'>Data tidak ditemukan.</p>";
        return;
    }

    data.forEach(item => {
        // Format Nomor HP (Hapus karakter non-digit, pastikan format 62)
        let rawHp = item.no_hp.replace(/[^0-9]/g, '');
        if (rawHp.startsWith('0')) {
            rawHp = '62' + rawHp.substring(1);
        }

        // Pesan WhatsApp sesuai request
        const pesan = `Salam Sehat Ibu Calon mitra Amartha. Apakah benar ini ${item.nama_mitra}. Selamat ibu berkesempatan mendapatkan modal dari PT Amartha Mikro Fintek dengan membentuk Kelompok Minimal 6 Orang. Jika bersedia membuat kelompok Silahkan balas WA ini. Terimakasih`;
        const encodedPesan = encodeURIComponent(pesan);
        const waLink = `https://wa.me/${rawHp}?text=${encodedPesan}`;

        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <div class="tag">${item.area} - ${item.point}</div>
            <h3>${item.nama_mitra}</h3>
            <p><strong>BP:</strong> ${item.nama_bp}</p>
            <p><strong>No HP:</strong> ${item.no_hp}</p>
            <button class="btn-wa" onclick="window.open('${waLink}', '_blank')">
                Followup (WA)
            </button>
        `;
        container.appendChild(card);
    });
}
