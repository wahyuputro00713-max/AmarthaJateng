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
  selectedBpRow: null,
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

async function safeApiPost(action, payload = {}) {
  try {
    return await apiPost(action, payload);
  } catch (error) {
    const msg = String(error?.message || error || "");
    if (/Action tidak dikenal/i.test(msg)) return null;
    throw error;
  }
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
  state.selectedBpRow = null;
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

  const cards = state.bps.map((row, idx) => {
    const bpName = findValue(row, ["last_business_partner", "nama_bp", "bp", "nama", "nama bp"]) || "Tanpa Nama BP";

    return `
      <div class="data-card" data-bp="${escapeAttr(bpName)}" data-bp-index="${idx}">
        <div class="card-title">${bpName}</div>
        ${bpStatsTemplate(row)}
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
      state.selectedBpRow = state.bps[Number(card.dataset.bpIndex)] || null;
      toggleLoading(true);
      try {
        const filters = scopeFilter(state.profile, upper(state.profile.jabatan));
        state.majelisRows = await fetchMajelisRowsBySelectedBp({
          point: state.selectedPoint,
          selectedBp: state.selectedBP,
          selectedBpRow: state.selectedBpRow,
          filters
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

async function fetchMajelisRowsBySelectedBp({ point, selectedBp, selectedBpRow, filters }) {
  const pointCandidate = getPointQueryCandidate(selectedBpRow, point);
  const bpCandidates = getBpQueryCandidates(selectedBpRow, selectedBp);

  const byPointRows = await fetchMajelisByPoint(pointCandidate, filters);
  if (!byPointRows.length) return [];

  const exactBpRows = byPointRows.filter((row) => isSameBpName(row, bpCandidates, { relaxed: false }));
  if (exactBpRows.length) return exactBpRows;

  return byPointRows.filter((row) => isSameBpName(row, bpCandidates, { relaxed: true }));
}

async function fetchMajelisByPoint(point, filters) {
  const payloads = [
    { point, filters },
    { branch: point, filters },
    { point_name: point, filters },
    { nama_point: point, filters },
    { point_code: point, filters }
  ];

  for (const payload of payloads) {
    const rows = await safeApiPost("get_majelis", payload);
    if (Array.isArray(rows) && rows.length) {
      const filteredPointRows = rows.filter((row) => isSamePoint(row, point));
      if (filteredPointRows.length) return filteredPointRows;
    }
  }

  const allMajelisRows = await safeApiPost("get_majelis", { filters });
  if (!Array.isArray(allMajelisRows) || !allMajelisRows.length) return [];
  return allMajelisRows.filter((row) => isSamePoint(row, point));
}

function renderMajelisLevel() {
  state.level = "majelis";
  showView("viewMajelis");
  els.btnBack.classList.remove("d-none");
  els.crumb.textContent = `Level: Majelis • ${state.selectedBP}`;

  const majelisSummary = summarizeMajelisRows(state.majelisRows);
  const rowsHtml = majelisSummary.map((row, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td>${row.lastBusinessPartner}</td>
      <td>${row.groupName}</td>
      <td>${row.groupId}</td>
      <td>${row.hariPelayanan}</td>
      <td>${row.totalNoA}</td>
      <td>${row.noaGL}</td>
      <td>${row.noaModal}</td>
      <td>${row.noaDpd0GL}</td>
      <td>${row.noaDpd1_30GL}</td>
      <td>${row.noaDpd31_60GL}</td>
      <td>${row.noaDpd61_90GL}</td>
      <td>${row.noaDpd90PlusGL}</td>
      <td>${row.noaDpd0Modal}</td>
      <td>${row.noaDpd1_30Modal}</td>
      <td>${row.noaDpd31_60Modal}</td>
      <td>${row.noaDpd61_90Modal}</td>
      <td>${row.noaDpd90PlusModal}</td>
      <td>${row.mitraDpd0}</td>
      <td>${row.persenModal}</td>
      <td>${row.jumlahAnggota}</td>
    </tr>
  `).join("");

  els.summaryText.textContent = `${majelisSummary.length} majelis milik ${state.selectedBP}`;
  els.viewMajelis.innerHTML = `
    <div class="title-row">
      <h5 class="m-0">Detail Majelis - ${state.selectedBP}</h5>
      <button id="btnBoard" class="btn-linkish">Lihat Papan Pelayanan</button>
    </div>
    <div class="table-responsive" style="max-height:62vh">
      <table class="table table-sm table-bordered">
        <thead>
          <tr>
             <th>No</th><th>Last BP</th><th>Nama Majelis</th><th>Group ID</th><th>Hari Pelayanan</th>
            <th>Total NoA</th><th>NoA GL</th><th>NoA Modal</th>
            <th>NoA DPD 0 GL</th><th>NoA DPD 1-30 GL</th><th>NoA DPD 31-60 GL</th><th>NoA DPD 61-90 GL</th><th>NoA DPD 90+ GL</th>
            <th>NoA DPD 0 Modal</th><th>NoA DPD 1-30 Modal</th><th>NoA DPD 31-60 Modal</th><th>NoA DPD 61-90 Modal</th><th>NoA DPD 90+ Modal</th>
            <th>Mitra DPD 0</th><th>% Modal</th><th>Jumlah Anggota</th>
          </tr>
        </thead>
        <tbody>${rowsHtml || '<tr><td class="text-center" colspan="21">Tidak ada data majelis</td></tr>'}</tbody>
      </table>
    </div>
  `;

  document.getElementById("btnBoard").addEventListener("click", renderBoardLevel);
}

function summarizeMajelisRows(rows) {
  const byMajelis = groupBy(rows, (r) => findValue(r, ["group_name", "majelis", "nama_majelis"]) || "Tanpa Majelis");
  return Object.keys(byMajelis).sort().map((groupName) => {
    const list = byMajelis[groupName];
    const first = list[0] || {};
    const sumOf = (keys) => list.reduce((acc, item) => acc + toNum(findValue(item, keys)), 0);

    return {
      groupName,
      lastBusinessPartner: findValue(first, ["last_business_partner", "nama_bp", "bp", "nama", "nama bp"]) || state.selectedBP || "-",
      groupId: findValue(first, ["group_id", "id_group", "id_majelis"]) || "-",
      hariPelayanan: findValue(first, ["hari_pelayanan", "hari", "hari pelayanan"]) || "-",
      totalNoA: sumOf(["total_noa", "total noa"]),
      noaGL: sumOf(["noa_gl", "noa gl"]),
      noaModal: sumOf(["noa_modal", "noa modal"]),
      noaDpd0GL: sumOf(["noa_dpd_0_gl", "noa dpd 0 gl"]),
      noaDpd1_30GL: sumOf(["noa_dpd_1_30_gl", "noa dpd 1-30 gl"]),
      noaDpd31_60GL: sumOf(["noa_dpd_31_60_gl", "noa dpd 31-60 gl"]),
      noaDpd61_90GL: sumOf(["noa_dpd_61_90_gl", "noa dpd 61-90 gl"]),
      noaDpd90PlusGL: sumOf(["noa_dpd_90_gl", "noa_dpd_90_plus_gl", "noa dpd 90+ gl"]),
      noaDpd0Modal: sumOf(["noa_dpd_0_modal", "noa dpd 0 modal"]),
      noaDpd1_30Modal: sumOf(["noa_dpd_1_30_modal", "noa dpd 1-30 modal"]),
      noaDpd31_60Modal: sumOf(["noa_dpd_31_60_modal", "noa dpd 31-60 modal"]),
      noaDpd61_90Modal: sumOf(["noa_dpd_61_90_modal", "noa dpd 61-90 modal"]),
      noaDpd90PlusModal: sumOf(["noa_dpd_90_modal", "noa_dpd_90_plus_modal", "noa dpd 90+ modal"]),
      mitraDpd0: sumOf(["mitra_dpd_0", "mitra dpd 0"]),
      persenModal: findValue(first, ["persen_modal", "%_modal", "%modal", "% modal"]) || "0%",
      jumlahAnggota: sumOf(["jumlah_anggota", "jumlah anggota"])
    };
  });
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
  const stats = [
    ["Area", findValue(row, ["area"]) || "-"],
    ["Branch", findValue(row, ["branch", "point"]) || "-"],
    ["Jumlah Majelis", toNum(findValue(row, ["jumlah_majelis", "jumlah majelis"]))],
    ["Total Mitra Aktif", toNum(findValue(row, ["total_mitra_aktif", "total mitra aktif", "mitra_aktif"]))],
    ["Mitra DPD 0-30", toNum(findValue(row, ["mitra_dpd_0_30", "mitra dpd 0-30"]))],
    ["NoA GL", toNum(findValue(row, ["noa_gl", "noa gl"]))],
    ["NoA Modal", toNum(findValue(row, ["noa_modal", "noa modal"]))],
    ["NoA DPD 0 GL", toNum(findValue(row, ["noa_dpd_0_gl", "noa dpd 0 gl"]))],
    ["NoA DPD 1-30 GL", toNum(findValue(row, ["noa_dpd_1_30_gl", "noa dpd 1-30 gl"]))],
    ["NoA DPD 31-60 GL", toNum(findValue(row, ["noa_dpd_31_60_gl", "noa dpd 31-60 gl"]))],
    ["NoA DPD 61-90 GL", toNum(findValue(row, ["noa_dpd_61_90_gl", "noa dpd 61-90 gl"]))],
    ["NoA DPD 90+ GL", toNum(findValue(row, ["noa_dpd_90_gl", "noa_dpd_90_plus_gl", "noa dpd 90+ gl"]))],
    ["NoA DPD 0 Modal", toNum(findValue(row, ["noa_dpd_0_modal", "noa dpd 0 modal"]))],
    ["NoA DPD 1-30 Modal", toNum(findValue(row, ["noa_dpd_1_30_modal", "noa dpd 1-30 modal"]))],
    ["NoA DPD 61-90 Modal", toNum(findValue(row, ["noa_dpd_61_90_modal", "noa dpd 61-90 modal"]))],
    ["NoA DPD 31-60 Modal", toNum(findValue(row, ["noa_dpd_31_60_modal", "noa dpd 31-60 modal"]))],
    ["NoA DPD 90+ Modal", toNum(findValue(row, ["noa_dpd_90_modal", "noa_dpd_90_plus_modal", "noa dpd 90+ modal"]))],
    ["NoA DPD 90+", toNum(findValue(row, ["noa_dpd_90_plus", "noa dpd 90+"]))],
    ["%NPL", findValue(row, ["npl", "%npl", "persen_npl"]) || "0%"]
  ];
  return statsTemplate(stats);
}

function bpStatsTemplate(row) {
  const stats = [
    ["Area", findValue(row, ["area"]) || "-"],
    ["Branch", findValue(row, ["branch", "point"]) || "-"],
    ["Last Business Partner", findValue(row, ["last_business_partner", "nama_bp"]) || "-"],
    ["Total NoA", toNum(findValue(row, ["total_noa", "total noa"]))],
    ["NoA GL", toNum(findValue(row, ["noa_gl", "noa gl"]))],
    ["Jumlah Majelis", toNum(findValue(row, ["jumlah_majelis", "jumlah majelis"]))],
    ["NoA Modal", toNum(findValue(row, ["noa_modal", "noa modal"]))],
    ["NoA DPD 0 GL", toNum(findValue(row, ["noa_dpd_0_gl", "noa dpd 0 gl"]))],
    ["NoA DPD 1-30 GL", toNum(findValue(row, ["noa_dpd_1_30_gl", "noa dpd 1-30 gl"]))],
    ["NoA DPD 31-60 GL", toNum(findValue(row, ["noa_dpd_31_60_gl", "noa dpd 31-60 gl"]))],
    ["NoA DPD 61-90 GL", toNum(findValue(row, ["noa_dpd_61_90_gl", "noa dpd 61-90 gl"]))],
    ["NoA DPD 0 Modal", toNum(findValue(row, ["noa_dpd_0_modal", "noa dpd 0 modal"]))],
    ["NoA DPD 90+ GL", toNum(findValue(row, ["noa_dpd_90_gl", "noa_dpd_90_plus_gl", "noa dpd 90+ gl"]))],
    ["NoA DPD 1-30 Modal", toNum(findValue(row, ["noa_dpd_1_30_modal", "noa dpd 1-30 modal"]))],
    ["NoA DPD 31-60 Modal", toNum(findValue(row, ["noa_dpd_31_60_modal", "noa dpd 31-60 modal"]))],
    ["NoA DPD 61-90 Modal", toNum(findValue(row, ["noa_dpd_61_90_modal", "noa dpd 61-90 modal"]))],
    ["NoA DPD 90+ Modal", toNum(findValue(row, ["noa_dpd_90_modal", "noa_dpd_90_plus_modal", "noa dpd 90+ modal"]))],
    ["Mitra DPD 0", toNum(findValue(row, ["mitra_dpd_0", "mitra dpd 0"]))],
    ["% Modal", findValue(row, ["persen_modal", "%_modal", "%modal", "% modal"]) || "0%"]
  ];
  return statsTemplate(stats);
}

function statsTemplate(stats) {
  return `
    ${stats.map(([label, value]) => `<div class="statline"><span>${label}</span><b>${value}</b></div>`).join("")}
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

function isSamePoint(row, selectedPoint) {
  const actual = normalizeIdentifier(findValue(row, ["point", "branch", "nama_point", "nama point", "cabang"]));
  const target = normalizeIdentifier(selectedPoint);
  if (!actual || !target) return false;
  if (actual === target) return true;
  return actual.includes(target) || target.includes(actual);
}

function isSameBpName(row, bpCandidates, options = {}) {
  const relaxed = Boolean(options.relaxed);
  const actual = normalizePersonName(findValue(row, [
    "last_business_partner",
    "last_bp",
    "nama_bp",
    "nama bp",
    "last bp"
  ]));

  if (!actual) return false;

  return bpCandidates.some((candidate) => {
    const target = normalizePersonName(candidate);
    if (!target) return false;
    if (target === actual) return true;
    if (!relaxed) return false;
    return target.includes(actual) || actual.includes(target);
  });
}

function normalizeText(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIdentifier(v) {
  return normalizeText(v)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePersonName(v) {
  return normalizeText(v)
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBpQueryCandidates(bpRow, selectedBp) {
  return unique([
    findValue(bpRow, ["last_business_partner", "nama_bp", "last_bp", "nama bp", "last bp"]),
    selectedBp
  ]).map((v) => String(v || "").trim()).filter(Boolean);
}

function getPointQueryCandidate(bpRow, selectedPoint) {
  return String(
    findValue(bpRow, ["point", "branch", "nama_point", "nama point"]) || selectedPoint || ""
  ).trim();
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
