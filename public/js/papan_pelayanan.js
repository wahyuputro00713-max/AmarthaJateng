import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, get, ref } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getFirebaseApp } from "./firebase-init.js";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9f5EBWR-DqPKMf-_3ds_l1NEnqV4YPEjf2itMSMEOOiOg-wjvZhFp3KzXlWQ80_LW/exec";
const ALLOWED = ["RM", "AM", "BM"];
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HOURS = [9,10,11,12,13,14,15,16,17];

const app = getFirebaseApp();
const auth = getAuth(app);
const db = getDatabase(app);

const state = {
  raw: [],
  profile: null,
  level: "point",
  selectedPoint: "",
  selectedBP: "",
};

const els = {
  loading: document.getElementById('loading'),
  userBadge: document.getElementById('userBadge'),
  crumb: document.getElementById('crumb'),
  summaryText: document.getElementById('summaryText'),
  btnBack: document.getElementById('btnBack'),
  viewPoint: document.getElementById('viewPoint'),
  viewBp: document.getElementById('viewBp'),
  viewMajelis: document.getElementById('viewMajelis'),
  viewBoard: document.getElementById('viewBoard'),
};


const params = new URLSearchParams(window.location.search);
if (params.get('preview') === '1') {
  state.profile = { nama: 'Preview User', jabatan: 'RM' };
  els.userBadge.textContent = 'Preview User (RM)';
  state.raw = buildMockRows();
  renderPointLevel();
} else {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.replace('index.html');
    toggleLoading(true);
    try {
      const snap = await get(ref(db, `users/${user.uid}`));
      if (!snap.exists()) throw new Error('Profil tidak ditemukan');
      const profile = snap.val();
      const jabatan = String(profile.jabatan || '').toUpperCase();
      if (!ALLOWED.includes(jabatan)) {
        alert('Halaman ini hanya untuk RM, AM, dan BM.');
        return window.location.replace('home.html');
      }

      state.profile = profile;
      els.userBadge.textContent = `${profile.nama || '-'} (${jabatan})`;

      state.raw = await fetchData(profile, jabatan);
      renderPointLevel();
    } catch (e) {
      console.error(e);
      els.viewPoint.innerHTML = `<div class="empty">Gagal memuat data: ${e.message || e}</div>`;
    } finally {
      toggleLoading(false);
    }
  });
}


els.btnBack.addEventListener('click', () => {
  if (state.level === 'board') {
    state.level = 'majelis';
    renderMajelisLevel();
  } else if (state.level === 'majelis') {
    state.level = 'bp';
    renderBpLevel();
  } else if (state.level === 'bp') {
    state.level = 'point';
    renderPointLevel();
  }
});

async function fetchData(profile, jabatan) {
  const reqArea = jabatan === 'AM' ? (profile.area || '') : '';
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'get_data_modal', reqArea }),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  const json = await response.json();
  const rows = Array.isArray(json?.data) ? json.data : [];

  if (jabatan === 'BM') {
    const point = String(profile.point || '').toLowerCase();
    return rows.filter(r => String(r.point || '').toLowerCase() === point);
  }
  if (jabatan === 'AM') {
    const area = String(profile.area || '').toLowerCase();
    return rows.filter(r => String(r.area || '').toLowerCase() === area);
  }
  return rows;
}

function getRisk(item) {
  const dpd = toNum(item.dpd || item.dpd_now || item.dpd_noa || item.noa_dpd || 0);
  if (dpd >= 31) return 'high';
  if (dpd > 0) return 'mid';
  return 'low';
}

function sumStats(items) {
  const uniqueMajelis = new Set(items.map(i => String(i.majelis || '-'))).size;
  const s = { majelis: uniqueMajelis, mitra: items.length, dpd0: 0, dpd1_30: 0, dpd31_60: 0, dpd61_90: 0, dpd90: 0 };
  items.forEach(i => {
    const d = toNum(i.dpd || i.dpd_now || i.noa_dpd || 0);
    if (d <= 0) s.dpd0++;
    else if (d <= 30) s.dpd1_30++;
    else if (d <= 60) s.dpd31_60++;
    else if (d <= 90) s.dpd61_90++;
    else s.dpd90++;
  });
  return s;
}

function renderPointLevel() {
  state.level = 'point';
  state.selectedPoint = '';
  state.selectedBP = '';
  showView('viewPoint');
  els.btnBack.classList.add('d-none');
  els.crumb.textContent = 'Level: Point';

  const grouped = groupBy(state.raw, r => String(r.point || 'Tanpa Point'));
  const points = Object.keys(grouped).sort();
  const cards = points.map(point => {
    const stats = sumStats(grouped[point]);
    return `<div class="data-card" data-point="${esc(point)}">
      <div class="card-title">${point}</div>
      ${statsTpl(stats)}
    </div>`;
  }).join('');

  els.summaryText.textContent = `${points.length} point | ${state.raw.length} mitra`;
  els.viewPoint.innerHTML = `<div class="title-row"><h5 class="m-0">Daftar Point</h5></div><div class="grid-cards">${cards || '<div class="empty">Tidak ada data</div>'}</div>`;
  els.viewPoint.querySelectorAll('.data-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedPoint = card.dataset.point;
      renderBpLevel();
    });
  });
}

function renderBpLevel() {
  state.level = 'bp';
  showView('viewBp');
  els.btnBack.classList.remove('d-none');
  els.crumb.textContent = `Level: BP • Point ${state.selectedPoint}`;

  const rows = state.raw.filter(r => String(r.point || '') === state.selectedPoint);
  const grouped = groupBy(rows, r => String(r.nama_bp || 'Tanpa BP'));
  const names = Object.keys(grouped).sort();
  els.summaryText.textContent = `${names.length} BP | ${rows.length} mitra`;

  const cards = names.map(bp => `<div class="data-card" data-bp="${esc(bp)}"><div class="card-title">${bp}</div>${statsTpl(sumStats(grouped[bp]))}</div>`).join('');
  els.viewBp.innerHTML = `<div class="title-row"><h5 class="m-0">Daftar BP - ${state.selectedPoint}</h5></div><div class="grid-cards">${cards || '<div class="empty">Tidak ada data</div>'}</div>`;
  els.viewBp.querySelectorAll('.data-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedBP = card.dataset.bp;
      renderMajelisLevel();
    });
  });
}

function renderMajelisLevel() {
  state.level = 'majelis';
  showView('viewMajelis');
  els.btnBack.classList.remove('d-none');
  els.crumb.textContent = `Level: Majelis • ${state.selectedBP}`;

  const rows = state.raw.filter(r => String(r.point || '') === state.selectedPoint && String(r.nama_bp || '') === state.selectedBP);
  const grouped = groupBy(rows, r => String(r.majelis || 'Tanpa Majelis'));
  const names = Object.keys(grouped).sort();

  let tableRows = '';
  names.forEach((nm, i) => {
    const stats = sumStats(grouped[nm]);
    const hariMap = DAYS.map(day => grouped[nm].some(r => normalizeDay(r.hari) === day) ? day.slice(0,3) : '-').join(' | ');
    tableRows += `<tr><td>${i+1}</td><td>${nm}</td><td>${hariMap}</td><td>${stats.mitra}</td><td>${stats.dpd0}</td><td>${stats.dpd1_30}</td><td>${stats.dpd31_60}</td><td>${stats.dpd61_90}</td><td>${stats.dpd90}</td></tr>`;
  });

  els.summaryText.textContent = `${names.length} majelis | ${rows.length} mitra`;
  els.viewMajelis.innerHTML = `<div class="title-row"><h5 class="m-0">Detail Majelis - ${state.selectedBP}</h5><button id="btnBoard" class="btn-linkish">Lihat Papan Pelayanan</button></div>
  <div class="table-responsive" style="max-height:62vh"><table class="table table-sm table-bordered"><thead><tr><th>No</th><th>Majelis</th><th>Hari Aktif</th><th>Total Mitra</th><th>DPD 0</th><th>DPD 1-30</th><th>DPD 31-60</th><th>DPD 61-90</th><th>DPD 90+</th></tr></thead><tbody>${tableRows || '<tr><td colspan="9" class="text-center">Tidak ada data</td></tr>'}</tbody></table></div>`;
  document.getElementById('btnBoard').addEventListener('click', renderBoardLevel);
}

function renderBoardLevel() {
  state.level = 'board';
  showView('viewBoard');
  els.btnBack.classList.remove('d-none');
  els.crumb.textContent = `Level: Papan Pelayanan • ${state.selectedBP}`;

  const rows = state.raw.filter(r => String(r.point || '') === state.selectedPoint && String(r.nama_bp || '') === state.selectedBP);
  const groupedBySlot = {};
  rows.forEach(r => {
    const day = normalizeDay(r.hari);
    const hour = normalizeHour(r.jam);
    if (!DAYS.includes(day) || !HOURS.includes(hour)) return;
    const key = `${day}|${hour}`;
    if (!groupedBySlot[key]) groupedBySlot[key] = [];
    groupedBySlot[key].push(r);
  });

  const heads = `<div class="time-col">Jam</div>${DAYS.map(d=>`<div class="board-head">${d}</div>`).join('')}`;
  const body = HOURS.map(h => {
    const cols = DAYS.map(d => {
      const items = groupedBySlot[`${d}|${h}`] || [];
      if (!items.length) return '<div class="slot"></div>';
      const byMajelis = groupBy(items, x => String(x.majelis || 'Tanpa Majelis'));
      const cards = Object.keys(byMajelis).map(mj => {
        const stats = sumStats(byMajelis[mj]);
        const kec = unique(byMajelis[mj].map(x => x.kecamatan || x.kec || '-')).join(', ');
        const risk = stats.dpd90 + stats.dpd61_90 > 0 ? 'high' : (stats.dpd31_60 + stats.dpd1_30 > 0 ? 'mid' : 'low');
        return `<div class="slot-item ${risk}"><div class="nm">${mj}</div><div class="meta">Mitra: ${stats.mitra} | DPD0: ${stats.dpd0} | 1-30: ${stats.dpd1_30} | 31-60: ${stats.dpd31_60} | 61-90: ${stats.dpd61_90} | 90+: ${stats.dpd90}</div><div class="meta">Kecamatan: ${kec}</div></div>`;
      }).join('');
      return `<div class="slot">${cards}</div>`;
    }).join('');
    return `<div class="time-col">${h}:00</div>${cols}`;
  }).join('');

  els.summaryText.textContent = `Pemetaan hari dan jam pelayanan untuk ${state.selectedBP}`;
  els.viewBoard.innerHTML = `<div class="title-row"><h5 class="m-0">Papan Pelayanan Detail</h5></div><div class="board-grid">${heads}${body}</div>`;
}

function buildMockRows() {
  return [
    { area: 'Klaten', point: '01 Wedi', nama_bp: 'Noviyani Bakti', majelis: 'KDG TELOGOPUCANG SELATAN', hari: 'Senin', jam: '09:00', kecamatan: 'Kandangan', dpd: 0 },
    { area: 'Klaten', point: '01 Wedi', nama_bp: 'Noviyani Bakti', majelis: 'KDG TELOGOPUCANG TENGAH', hari: 'Senin', jam: '10:00', kecamatan: 'Kandangan', dpd: 17 },
    { area: 'Klaten', point: '01 Wedi', nama_bp: 'Noviyani Bakti', majelis: 'KDG BLIMBING JLEGONG', hari: 'Selasa', jam: '10:00', kecamatan: 'Kandangan', dpd: 45 },
    { area: 'Klaten', point: 'Karangnongko', nama_bp: 'Afriska Yudiyanti', majelis: 'BLU PAGERGUNUNG CEPIT', hari: 'Senin', jam: '11:00', kecamatan: 'Bulu', dpd: 0 },
    { area: 'Klaten', point: 'Karangnongko', nama_bp: 'Afriska Yudiyanti', majelis: 'BLU WONOSARI DAYOHAN', hari: 'Selasa', jam: '11:00', kecamatan: 'Bulu', dpd: 8 },
    { area: 'Klaten', point: 'Karangnongko', nama_bp: 'Afriska Yudiyanti', majelis: 'BLU WONOSARI DUKUH', hari: 'Selasa', jam: '12:00', kecamatan: 'Bulu', dpd: 95 }
  ];
}

function statsTpl(stats){
  return `<div class="statline"><span>Majelis</span><b>${stats.majelis}</b></div>
  <div class="statline"><span>Mitra</span><b>${stats.mitra}</b></div>
  <div class="statline"><span>DPD 0</span><b>${stats.dpd0}</b></div>
  <div class="statline"><span>DPD 1-30</span><b>${stats.dpd1_30}</b></div>
  <div class="statline"><span>DPD 31-60</span><b>${stats.dpd31_60}</b></div>
  <div class="statline"><span>DPD 61-90</span><b>${stats.dpd61_90}</b></div>
  <div class="statline"><span>DPD 90+</span><b>${stats.dpd90}</b></div>`;
}

function normalizeDay(hari) {
  const val = String(hari || '').trim().toLowerCase();
  const map = { senin:'Senin', selasa:'Selasa', rabu:'Rabu', kamis:'Kamis', jumat:'Jumat', jum\'at:'Jumat', sabtu:'Sabtu', minggu:'Minggu' };
  return map[val] || 'Senin';
}
function normalizeHour(jam) {
  const str = String(jam || '').trim();
  const m = str.match(/(\d{1,2})/);
  if (!m) return 9;
  const n = Number(m[1]);
  if (n < 0 || n > 23) return 9;
  return n;
}
function toNum(v) { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0; }
function groupBy(arr, keyFn) { return arr.reduce((a,c)=>{ const k=keyFn(c); (a[k]??=[]).push(c); return a;}, {}); }
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }
function esc(str){ return String(str).replace(/"/g,'&quot;'); }
function toggleLoading(show) { els.loading.classList.toggle('d-none', !show); }
function showView(activeId) {
  ['viewPoint','viewBp','viewMajelis','viewBoard'].forEach(id => {
    document.getElementById(id).classList.toggle('d-none', id !== activeId);
  });
}
