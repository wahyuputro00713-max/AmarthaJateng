// GANTI URL INI DENGAN URL DEPLOYMENT APPS SCRIPT ANDA
const API_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

let globalData = [];

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
    
    // Event Listener: Saat Area dipilih, update opsi Point & filter data
    document.getElementById('filterArea').addEventListener('change', function() {
        const selectedArea = this.value;
        updatePointOptions(selectedArea); 
        filterData(); 
    });

    // Event Listener: Saat Point dipilih, langsung filter data
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
            populateAreaFilter(globalData); // Setup awal filter Area
            renderData(globalData);         // Tampilkan semua data awal
        } else {
            document.getElementById("loading").innerText = "Gagal memuat data.";
        }
    } catch (error) {
        console.error(error);
        document.getElementById("loading").innerText = "Terjadi kesalahan koneksi.";
    }
}

// 1. Fungsi Mengisi Dropdown Area (Hanya dipanggil sekali saat data load)
function populateAreaFilter(data) {
    const areas = [...new Set(data.map(item => item.area))].sort();
    const areaSelect = document.getElementById("filterArea");

    // Reset opsi area
    areaSelect.innerHTML = '<option value="all">Semua Area</option>';

    areas.forEach(area => {
        let option = document.createElement("option");
        option.value = area;
        option.text = area;
        areaSelect.appendChild(option);
    });

    // Inisialisasi Point (Tampilkan semua point karena default Area = All)
    updatePointOptions("all");
}

// 2. Fungsi Update Opsi Point (Dipanggil setiap kali Area berubah)
function updatePointOptions(selectedArea) {
    const pointSelect = document.getElementById("filterPoint");
    
    // Cari point yang relevan
    let relevantData;
    if (selectedArea === "all") {
        // Jika pilih semua area, ambil semua point yang ada di data
        relevantData = globalData;
    } else {
        // Jika pilih area tertentu, filter data hanya untuk area itu
        relevantData = globalData.filter(item => item.area === selectedArea);
    }
    
    // Ambil list point unik dari data yang sudah difilter
    const filteredPoints = [...new Set(relevantData.map(item => item.point))].sort();

    // Simpan nilai point saat ini (jika user mau ganti area tapi point namanya sama)
    // atau reset ke 'all' (lebih aman reset ke all agar tidak error)
    pointSelect.innerHTML = '<option value="all">Semua Point</option>';

    // Masukkan opsi point baru
    filteredPoints.forEach(point => {
        let option = document.createElement("option");
        option.value = point;
        option.text = point;
        pointSelect.appendChild(option);
    });
    
    // Kembalikan pilihan point ke "Semua Point" agar user memilih ulang
    pointSelect.value = "all";
}

function filterData() {
    const selectedArea = document.getElementById("filterArea").value;
    const selectedPoint = document.getElementById("filterPoint").value;

    const filtered = globalData.filter(item => {
        // Logika Filter:
        // 1. Jika Area 'all', lolos. Jika tidak, harus sama dengan item.area
        const matchArea = (selectedArea === "all" || item.area === selectedArea);
        
        // 2. Jika Point 'all', lolos. Jika tidak, harus sama dengan item.point
        const matchPoint = (selectedPoint === "all" || item.point === selectedPoint);
        
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
        // Format Nomor HP (62xxx)
        let rawHp = item.no_hp.replace(/[^0-9]/g, '');
        if (rawHp.startsWith('0')) {
            rawHp = '62' + rawHp.substring(1);
        }

        // Pesan WhatsApp
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
            <a href="${waLink}" class="btn-wa" target="_blank">
                Followup (WA)
            </a>
        `;
        container.appendChild(card);
    });
}
