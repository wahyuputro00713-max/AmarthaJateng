import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, get, ref } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getFirebaseApp } from "./firebase-init.js";

// Ganti URL ini setelah deploy Apps Script baru (kode ada di apps_script/papan_pelayanan.gs)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzNrSmpDed86wRC6f7FjS9bAndBfLhzDPCm9x-j_olVE2Qj4U1DQMu80SGfWQAQ_eV6bA/exec";
const ALLOWED = ["RM", "AM", "BM"];
const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const app = getFirebaseApp();
const auth = getAuth(app);
const db = getDatabase(app);

const state = {
  profile: null,
  level: "point",
  selectedPoint: "",
  selectedBP: "",
  points: [],
  bps: [],
  majelisRows: []
};

const els = {
  loading: document.getElementById("loading"),
  userBadge: document.getElementById("userBadge"),
  crumb: document.getElementById("crumb"),
  summaryText: document.getElementById("summaryText"),
  btnBack: document.getElementById("btnBack"),
  viewPoint: document.getElementById("viewPoint"),
  viewBp: document.getElementById("viewBp"),
  viewMajelis: document.getElementById("viewMajelis"),
  viewBoard: document.getElementById("viewBoard")
};

onAuthStateChanged(auth, async (user) => {
  if (!user) return window.location.replace("index.html");

  toggleLoading(true);
  try {
    const snap = await get(ref(db, `users/${user.uid}`));
    if (!snap.exists()) throw new Error("Profil user tidak ditemukan");

    const profile = snap.val();
    const jabatan = upper(profile.jabatan);
    if (!ALLOWED.includes(jabatan)) {
      alert("Halaman ini hanya dapat diakses RM, AM, dan BM.");
      return window.location.replace("home.html");
    }

    state.profile = profile;
    els.userBadge.textContent = `${profile.nama || "-"} (${jabatan})`;

    state.points = await apiPost("get_points", { filters: scopeFilter(profile, jabatan) });
    renderPointLevel();
  } catch (error) {
    console.error(error);
    showError(els.viewPoint, error);
  } finally {
    toggleLoading(false);
  }
});

els.btnBack.addEventListener("click", () => {
  if (state.level === "board") {
    renderMajelisLevel();
  } else if (state.level === "majelis") {
    renderBpLevel();
  } else if (state.level === "bp") {
    renderPointLevel();
  }
});

async function apiPost(action, payload = {}) {
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  if (json.result !== "success") throw new Error(json.message || "Gagal ambil data");
  return Array.isArray(json.data) ? json.data : [];
}

function scopeFilter(profile, jabatan) {
  const p = {
    area: String(profile.area || ""),
    point: String(profile.point || "")
  };
  if (jabatan === "BM") return { point: p.point };
  if (jabatan === "AM") return { area: p.area };
  return {};
}

function renderPointLevel() {
  state.level = "point";
  state.selectedPoint = "";
  state.selectedBP = "";
  state.bps = [];
  state.majelisRows = [];

  showView("viewPoint");
  els.btnBack.classList.add("d-none");
  els.crumb.textContent = "Level: Point";

  const cards = state.points.map((row) => {
    const pointName = findPointName(row);
    return `
      <div class="data-card" data-point="${escapeAttr(pointName)}">
        <div class="card-title">${pointName}</div>
        ${pointStatsTemplate(row)}
      </div>
    `;
  }).join("");

  els.summaryText.textContent = `${state.points.length} point tersedia`;
  els.viewPoint.innerHTML = `
    <div class="title-row"><h5 class="m-0">Daftar Point</h5></div>
    <div class="grid-cards">${cards || '<div class="empty">Tidak ada data point</div>'}</div>
  `;

  els.viewPoint.querySelectorAll(".data-card").forEach((card) => {
    card.addEventListener("click", async () => {
      state.selectedPoint = card.dataset.point;
      toggleLoading(true);
      try {
        state.bps = await apiPost("get_bp_by_point", {
          point: state.selectedPoint,
          filters: scopeFilter(state.profile, upper(state.profile.jabatan))
        });
        renderBpLevel();
      } catch (error) {
        showError(els.viewBp, error);
      } finally {
        toggleLoading(false);
      }
    });
  });
}

function renderBpLevel() {
  state.level = "bp";
  showView("viewBp");
  els.btnBack.classList.remove("d-none");
  els.crumb.textContent = `Level: BP • Point ${state.selectedPoint}`;

  const cards = state.bps.map((row) => {
    const bpName = findValue(row, ["nama_bp", "bp", "nama", "nama bp"]) || "Tanpa Nama BP";
    const totalMajelis = toNum(findValue(row, ["jumlah_majelis", "jumlah majelis", "total_majelis"]));
    const totalMitra = toNum(findValue(row, ["total_mitra_aktif", "total mitra aktif", "total_mitra", "mitra"]));
    const dpd0 = toNum(findValue(row, ["noa_dpd_0", "dpd_0", "dpd0"]));
    const dpd1_30 = toNum(findValue(row, ["noa_dpd_1_30", "dpd_1_30"]));
    const dpd31_60 = toNum(findValue(row, ["noa_dpd_31_60", "dpd_31_60"]));
    const dpd61_90 = toNum(findValue(row, ["noa_dpd_61_90", "dpd_61_90"]));
    const dpd90 = toNum(findValue(row, ["noa_dpd_90", "dpd_90", "dpd_90_plus"]));

    return `
      <div class="data-card" data-bp="${escapeAttr(bpName)}">
        <div class="card-title">${bpName}</div>
        ${statsTemplate({
          majelis: totalMajelis,
          mitra: totalMitra,
          dpd0,
          dpd1_30,
          dpd31_60,
          dpd61_90,
          dpd90
        })}
      </div>
    `;
  }).join("");

  els.summaryText.textContent = `${state.bps.length} BP pada point ${state.selectedPoint}`;
  els.viewBp.innerHTML = `
    <div class="title-row"><h5 class="m-0">Daftar BP - ${state.selectedPoint}</h5></div>
    <div class="grid-cards">${cards || '<div class="empty">Tidak ada data BP</div>'}</div>
  `;

  els.viewBp.querySelectorAll(".data-card").forEach((card) => {
    card.addEventListener("click", async () => {
      state.selectedBP = card.dataset.bp;
      toggleLoading(true);
      try {
        state.majelisRows = await apiPost("get_majelis_by_bp", {
          point: state.selectedPoint,
          bp: state.selectedBP,
          filters: scopeFilter(state.profile, upper(state.profile.jabatan))
        });
        renderMajelisLevel();
      } catch (error) {
        showError(els.viewMajelis, error);
      } finally {
        toggleLoading(false);
      }
    });
  });
}

function renderMajelisLevel() {
  state.level = "majelis";
  showView("viewMajelis");
  els.btnBack.classList.remove("d-none");
  els.crumb.textContent = `Level: Majelis • ${state.selectedBP}`;

  const byMajelis = groupBy(state.majelisRows, (r) => findValue(r, ["majelis", "nama_majelis"]) || "Tanpa Majelis");
  const names = Object.keys(byMajelis).sort();

  const rowsHtml = names.map((name, idx) => {
    const list = byMajelis[name];
    const stats = sumMajelisStats(list);
    const hariMap = DAYS.map((d) => list.some((x) => normalizeDay(findValue(x, ["hari"])) === d) ? d.slice(0, 3) : "-").join(" | ");
    return `<tr>
      <td>${idx + 1}</td>
      <td>${name}</td>
      <td>${hariMap}</td>
      <td>${stats.mitra}</td>
      <td>${stats.dpd0}</td>
      <td>${stats.dpd1_30}</td>
      <td>${stats.dpd31_60}</td>
      <td>${stats.dpd61_90}</td>
      <td>${stats.dpd90}</td>
    </tr>`;
  }).join("");

  els.summaryText.textContent = `${names.length} majelis milik ${state.selectedBP}`;
  els.viewMajelis.innerHTML = `
    <div class="title-row">
      <h5 class="m-0">Detail Majelis - ${state.selectedBP}</h5>
      <button id="btnBoard" class="btn-linkish">Lihat Papan Pelayanan</button>
    </div>
    <div class="table-responsive" style="max-height:62vh">
      <table class="table table-sm table-bordered">
        <thead>
          <tr>
            <th>No</th><th>Majelis</th><th>Hari Aktif</th><th>Total Mitra</th>
            <th>DPD 0</th><th>DPD 1-30</th><th>DPD 31-60</th><th>DPD 61-90</th><th>DPD 90+</th>
          </tr>
        </thead>
        <tbody>${rowsHtml || '<tr><td class="text-center" colspan="9">Tidak ada data majelis</td></tr>'}</tbody>
      </table>
    </div>
  `;

  document.getElementById("btnBoard").addEventListener("click", renderBoardLevel);
}

function renderBoardLevel() {
  state.level = "board";
  showView("viewBoard");
  els.btnBack.classList.remove("d-none");
  els.crumb.textContent = `Level: Papan Pelayanan • ${state.selectedBP}`;

  const groupedSlot = {};
  state.majelisRows.forEach((row) => {
    const day = normalizeDay(findValue(row, ["hari"]));
    const hour = normalizeHour(findValue(row, ["jam", "jam_mulai", "jam pelayanan"]));
    if (!DAYS.includes(day) || !HOURS.includes(hour)) return;
    const key = `${day}|${hour}`;
    if (!groupedSlot[key]) groupedSlot[key] = [];
    groupedSlot[key].push(row);
  });

  const heads = `<div class="time-col">JAM</div>${DAYS.map((d) => `<div class="board-head">${d.toUpperCase()}</div>`).join("")}`;
  const body = HOURS.map((hour) => {
    const cols = DAYS.map((day) => {
      const slotRows = groupedSlot[`${day}|${hour}`] || [];
      if (!slotRows.length) return `<div class="slot"></div>`;

      const byMajelis = groupBy(slotRows, (r) => findValue(r, ["majelis", "nama_majelis"]) || "Tanpa Majelis");
      const slotCards = Object.keys(byMajelis).map((majelisName) => {
        const items = byMajelis[majelisName];
        const stats = sumMajelisStats(items);
        const kecamatan = unique(items.map((i) => findValue(i, ["kecamatan", "kec"]) || "-")).join(", ");
        const riskClass = stats.dpd90 + stats.dpd61_90 > 0 ? "high" : (stats.dpd31_60 + stats.dpd1_30 > 0 ? "mid" : "");

        return `<div class="slot-item ${riskClass}">
          <div class="nm">${majelisName}</div>
          <div class="meta">Total Mitra: ${stats.mitra} | DPD 0: ${stats.dpd0} | 1-30: ${stats.dpd1_30} | 31-60: ${stats.dpd31_60} | 61-90: ${stats.dpd61_90} | 90+: ${stats.dpd90}</div>
          <div class="meta">Kecamatan: ${kecamatan}</div>
        </div>`;
      }).join("");

      return `<div class="slot">${slotCards}</div>`;
    }).join("");

    return `<div class="time-col">${hour}:00</div>${cols}`;
  }).join("");

  els.summaryText.textContent = `Pemetaan hari pelayanan untuk BP ${state.selectedBP}`;
  els.viewBoard.innerHTML = `
    <div class="title-row"><h5 class="m-0">Papan Pelayanan Detail</h5></div>
    <div class="board-grid">${heads}${body}</div>
  `;
}

function pointStatsTemplate(row) {
  const stats = {
    majelis: toNum(findValue(row, ["jumlah_majelis", "jumlah majelis"])),
    mitra: toNum(findValue(row, ["total_mitra_aktif", "total mitra aktif", "mitra_aktif"])),
    dpd0: toNum(findValue(row, ["noa_dpd_0", "dpd_0"])),
    dpd1_30: toNum(findValue(row, ["noa_dpd_1_30", "dpd_1_30"])),
    dpd31_60: toNum(findValue(row, ["noa_dpd_31_60", "dpd_31_60"])),
    dpd61_90: toNum(findValue(row, ["noa_dpd_61_90", "dpd_61_90"])),
    dpd90: toNum(findValue(row, ["noa_dpd_90", "dpd_90", "dpd_90_plus"]))
  };
  return statsTemplate(stats);
}

function statsTemplate(stats) {
  return `
    <div class="statline"><span>Majelis</span><b>${stats.majelis}</b></div>
    <div class="statline"><span>Total Mitra</span><b>${stats.mitra}</b></div>
    <div class="statline"><span>DPD 0</span><b>${stats.dpd0}</b></div>
    <div class="statline"><span>DPD 1-30</span><b>${stats.dpd1_30}</b></div>
    <div class="statline"><span>DPD 31-60</span><b>${stats.dpd31_60}</b></div>
    <div class="statline"><span>DPD 61-90</span><b>${stats.dpd61_90}</b></div>
    <div class="statline"><span>DPD 90+</span><b>${stats.dpd90}</b></div>
  `;
}

function sumMajelisStats(items) {
  const stats = { mitra: items.length, dpd0: 0, dpd1_30: 0, dpd31_60: 0, dpd61_90: 0, dpd90: 0 };
  items.forEach((item) => {
    const d = toNum(findValue(item, ["dpd", "noa_dpd", "dpd_now", "dpd no", "dpd_nasabah"]));
    if (d <= 0) stats.dpd0 += 1;
    else if (d <= 30) stats.dpd1_30 += 1;
    else if (d <= 60) stats.dpd31_60 += 1;
    else if (d <= 90) stats.dpd61_90 += 1;
    else stats.dpd90 += 1;
  });
  return stats;
}

function findPointName(row) {
  return findValue(row, ["point", "branch", "nama_point", "nama point"]) || "Tanpa Point";
}

function findValue(obj, keys) {
  if (!obj) return "";
  const normalized = {};
  Object.keys(obj).forEach((k) => {
    normalized[normalizeKey(k)] = obj[k];
  });
  for (const key of keys) {
    const val = normalized[normalizeKey(key)];
    if (val !== undefined && val !== null && String(val).trim() !== "") return val;
  }
  return "";
}

function normalizeKey(key) {
  return String(key || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function normalizeDay(dayRaw) {
  const val = String(dayRaw || "").trim().toLowerCase();
  const map = {
    senin: "Senin",
    selasa: "Selasa",
    rabu: "Rabu",
    kamis: "Kamis",
    jumat: "Jumat",
    "jumat": "Jumat",
    "jum_at": "Jumat",
    sabtu: "Sabtu",
    minggu: "Minggu"
  };
  return map[val] || "Senin";
}

function normalizeHour(jamRaw) {
  const text = String(jamRaw || "").trim();
  const match = text.match(/(\d{1,2})/);
  if (!match) return 9;
  const hour = Number(match[1]);
  if (!Number.isFinite(hour)) return 9;
  return Math.max(0, Math.min(23, hour));
}

function toNum(v) {
  const n = Number(String(v ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = keyFn(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function upper(v) {
  return String(v || "").toUpperCase();
}

function escapeAttr(text) {
  return String(text || "").replace(/"/g, "&quot;");
}

function toggleLoading(show) {
  els.loading.classList.toggle("d-none", !show);
}

function showView(activeId) {
  ["viewPoint", "viewBp", "viewMajelis", "viewBoard"].forEach((id) => {
    document.getElementById(id).classList.toggle("d-none", id !== activeId);
  });
}

function showError(container, error) {
  showView(container.id);
  container.innerHTML = `<div class="empty">Gagal memuat data: ${error.message || error}</div>`;
}
