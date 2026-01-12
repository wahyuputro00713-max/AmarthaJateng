import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

// GANTI URL INI JIKA ANDA DEPLOY ULANG APPS SCRIPT BARU
const SCRIPT_URL = "https://amarthajateng.wahyuputro00713.workers.dev"; 

let globalData = [];
let userProfile = {};
let modalInstance = null;

const els = {
    filterArea: document.getElementById('filterArea'),
    filterPoint: document.getElementById('filterPoint'),
    filterBP: document.getElementById('filterBP'),
    filterHari: document.getElementById('filterHari'),
    btnTampilkan: document.getElementById('btnTampilkan'),
    container: document.getElementById('collectionContainer'),
    loading: document.getElementById('loadingOverlay'),
    empty: document.getElementById('emptyState'),
    lblMitra: document.getElementById('totalMitra'),
    lblOs: document.getElementById('totalOs'),
    // Modal
    mAmount: document.getElementById('mAmount'),
    mAmountReal: document.getElementById('mAmountReal'),
    mGeotag: document.getElementById('mGeotag'),
    mFoto: document.getElementById('mFoto')
};

// 1. Init
onAuthStateChanged(auth, async (user) => {
    if (user) {
        modalInstance = new bootstrap.Modal(document.getElementById('modalInput'));
        showLoading(true);
        try {
            const snap = await get(ref(db, 'users/' + user.uid));
            if (snap.exists()) userProfile = snap.val();
            
            await fetchData();
            initializeFilters(); 
            setupRupiahInput();

            // Auto render pertama kali
            renderData(globalData);

        } catch (e) {
            console.error(e);
            alert("Gagal memuat data. Periksa koneksi internet.");
        } finally {
            showLoading(false);
        }
    } else {
        window.location.replace("index.html");
    }
});

// 2. Fetch Data
async function fetchData() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "get_daily_collection" }),
            headers: { "Content-Type": "text/plain;charset=utf-8" }
        });
        const result = await response.json();
        
        if (result.result === 'success') {
            globalData = result.data;
            if (globalData.length === 0) {
                console.warn("Data kosong dari Spreadsheet. Pastikan tab 'Data Collection' ada isinya.");
            }
        } else {
            throw new Error(result.error || "Gagal mengambil data dari server.");
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        throw e;
    }
}

// 3. Logic Filter Pintar
function initializeFilters() {
    // A. Isi Area Dropdown
    const areas = [...new Set(globalData.map(d => d.area).filter(a => a))].sort();
    fillSelect(els.filterArea, areas);

    // B. Set Default dari Profil User
    if (userProfile.area && areas.includes(userProfile.area)) {
        els.filterArea.value = userProfile.area;
        updatePointDropdown(); // Trigger update point
    }

    // C. Auto Hari Ini
    const days = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const today = days[new Date().getDay()];
    if([...els.filterHari.options].some(o => o.value === today)) {
        els.filterHari.value = today;
    }

    // D. Event Listeners
    els.filterArea.addEventListener('change', () => {
        updatePointDropdown();
        updateBPDropdown();
    });

    els.filterPoint.addEventListener('change', () => {
        updateBPDropdown();
    });

    els.btnTampilkan.addEventListener('click', () => {
        showLoading(true);
        setTimeout(() => {
            renderData(globalData);
            showLoading(false);
        }, 50);
    });
}

function updatePointDropdown() {
    const selectedArea = els.filterArea.value;
    let relevantData = globalData;
    
    if(selectedArea) {
        relevantData = globalData.filter(d => d.area === selectedArea);
    }

    const points = [...new Set(relevantData.map(d => d.point).filter(p => p))].sort();
    fillSelect(els.filterPoint, points);
    
    // Reset selection
    els.filterPoint.value = "";
    
    // Kalo user profile punya point, auto select
    if(userProfile.point && points.includes(userProfile.point) && (!selectedArea || selectedArea === userProfile.area)) {
        els.filterPoint.value = userProfile.point;
    }
    updateBPDropdown();
}

function updateBPDropdown() {
    const selectedArea = els.filterArea.value;
    const selectedPoint = els.filterPoint.value;
    
    let relevantData = globalData;
    if(selectedArea) relevantData = relevantData.filter(d => d.area === selectedArea);
    if(selectedPoint) relevantData = relevantData.filter(d => d.point === selectedPoint);

    const bps = [...new Set(relevantData.map(d => d.nama_bp).filter(b => b))].sort();
    fillSelect(els.filterBP, bps);
}

function fillSelect(el, items) {
    const defaultOpt = el.options[0];
    el.innerHTML = "";
    el.appendChild(defaultOpt);
    items.forEach(i => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        el.appendChild(opt);
    });
}

// 4. Render Data
function renderData(data) {
    const fArea = els.filterArea.value;
    const fPoint = els.filterPoint.value;
    const fBP = els.filterBP.value;
    const fHari = els.filterHari.value;

    let filtered = data.filter(d => {
        let matchArea = fArea === "" || d.area === fArea;
        let matchPoint = fPoint === "" || d.point === fPoint;
        let matchBP = fBP === "" || d.nama_bp === fBP;
        let matchHari = fHari === "" || d.hari === fHari;
        return matchArea && matchPoint && matchBP && matchHari;
    });

    if (filtered.length === 0) {
        els.container.innerHTML = "";
        els.empty.classList.remove('d-none');
        els.lblMitra.innerText = "0 Nasabah";
        els.lblOs.innerText = "Rp 0";
        return;
    }

    els.empty.classList.add('d-none');
    
    let totalOs = 0;
    filtered.forEach(d => totalOs += parseInt(d.tunggakan.replace(/[^0-9]/g,'') || 0));
    els.lblMitra.innerText = `${filtered.length} Nasabah`;
    els.lblOs.innerText = formatRupiah(totalOs);

    // Grouping per Majelis
    const grouped = {};
    filtered.forEach(item => {
        const m = item.majelis || "Lainnya";
        if (!grouped[m]) grouped[m] = [];
        grouped[m].push(item);
    });

    const html = Object.keys(grouped).sort().map((majelis, idx) => {
        const items = grouped[majelis];
        // Ambil info BP dari item pertama
        const bpName = items[0].nama_bp || "-";
        
        const rows = items.map(item => `
            <tr>
                <td>
                    <span class="mitra-name">${item.mitra}</span>
                    <span class="mitra-id"><i class="fa-regular fa-id-card me-1"></i>${item.cust_no}</span>
                </td>
                <td>
                    <div class="nominal-text text-danger">${formatRupiah(item.angsuran)}</div>
                    <span class="d-block small text-muted" style="font-size: 0.7rem;">OS: ${formatRupiah(item.tunggakan)}</span>
                </td>
                <td class="text-end">
                    <button class="btn btn-sm btn-primary shadow-sm" style="background: var(--primary-color); border:none;" 
                        onclick="window.openModalInput('${item.cust_no}')">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Input
                    </button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="accordion-item">
                <h2 class="accordion-header">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#clp${idx}">
                        <div class="d-flex flex-column w-100">
                            <div class="d-flex justify-content-between align-items-center w-100 pe-3">
                                <span class="fw-bold text-dark"><i class="fa-solid fa-users me-2 text-warning"></i>${majelis}</span>
                                <span class="badge bg-light text-dark border">${items.length} Org</span>
                            </div>
                            <small class="text-muted mt-1" style="font-size: 0.7rem;">BP: ${bpName}</small>
                        </div>
                    </button>
                </h2>
                <div id="clp${idx}" class="accordion-collapse collapse" data-bs-parent="#collectionContainer">
                    <div class="accordion-body p-0">
                        <table class="table table-striped table-mitra mb-0 w-100">
                            ${rows}
                        </table>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    els.container.innerHTML = html;
}

// 5. MODAL Logic
window.openModalInput = function(custNo) {
    const data = globalData.find(d => String(d.cust_no) === String(custNo));
    if (!data) return;

    document.getElementById('dispNama').innerText = data.mitra;
    document.getElementById('dispId').innerText = data.cust_no;
    
    document.getElementById('mCustNo').value = data.cust_no;
    document.getElementById('mNamaMitra').value = data.mitra;
    document.getElementById('mArea').value = data.area;
    document.getElementById('mPoint').value = data.point;
    document.getElementById('mIdKaryawan').value = userProfile.idKaryawan || "-";
    document.getElementById('mNamaBP').value = userProfile.nama || data.nama_bp;

    els.mAmount.value = "";
    els.mAmountReal.value = "";
    els.mFoto.value = "";
    
    window.ambilLokasi();
    modalInstance.show();
};

window.ambilLokasi = function() {
    const geoEl = els.mGeotag;
    geoEl.value = "Mencari lokasi...";
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                geoEl.value = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
            },
            (err) => { geoEl.value = "Gagal ambil lokasi"; },
            { enableHighAccuracy: true }
        );
    } else {
        geoEl.value = "Tidak Support";
    }
};

window.submitCollection = async function() {
    const amt = els.mAmountReal.value;
    const geo = els.mGeotag.value;
    const file = els.mFoto.files[0];

    if (!amt || parseInt(amt) < 1000) { alert("Nominal tidak valid!"); return; }
    if (!geo.includes("http")) { alert("Lokasi belum terkunci!"); return; }
    if (!file) { alert("Wajib upload foto!"); return; }

    if(!confirm("Kirim data sekarang?")) return;

    showLoading(true);
    modalInstance.hide();

    try {
        const base64 = await toBase64(file);
        const cleanBase64 = base64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

        const payload = {
            action: "input_laporan",
            jenisLaporan: "Collection",
            tanggal: new Date().toISOString().split('T')[0],
            idKaryawan: document.getElementById('mIdKaryawan').value,
            namaBP: document.getElementById('mNamaBP').value,
            area: document.getElementById('mArea').value,
            point: document.getElementById('mPoint').value,
            idLoan: document.getElementById('mCustNo').value,
            namaMitra: document.getElementById('mNamaMitra').value,
            amountCollect: amt,
            dpd: document.getElementById('mDpd').value,
            keterangan: document.getElementById('mKet').value,
            geotag: geo,
            foto: cleanBase64,
            namaFoto: "DailyColl_" + file.name,
            mimeType: file.type
        };

        const req = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const res = await req.json();

        if (res.result === 'success') {
            alert("✅ Berhasil terkirim!");
        } else {
            throw new Error(res.error || "Gagal simpan");
        }
    } catch (e) {
        alert("Gagal: " + e.message);
        modalInstance.show(); 
    } finally {
        showLoading(false);
    }
};

function setupRupiahInput() {
    els.mAmount.addEventListener('keyup', function(e) {
        els.mAmountReal.value = this.value.replace(/[^0-9]/g, '');
        this.value = formatRupiah(this.value, 'Rp ');
    });
}

function formatRupiah(angka, prefix = 'Rp ') {
    if (!angka || angka == 0) return prefix + "0";
    let number_string = String(angka).replace(/[^,\d]/g, '').toString(),
        split = number_string.split(','),
        sisa = split[0].length % 3,
        rupiah = split[0].substr(0, sisa),
        ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    return prefix + rupiah;
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function showLoading(show) {
    if(show) els.loading.classList.remove('d-none');
    else els.loading.classList.add('d-none');
}
