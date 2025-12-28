<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Tugas Repayment - Amartha</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding-bottom: 80px; }
        .header-bar { background: linear-gradient(135deg, #9b59b6, #8e44ad); padding: 20px 15px; color: white; border-radius: 0 0 20px 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .back-btn { color: white; font-size: 1.2rem; text-decoration: none; margin-right: 15px; }
        
        .filter-card { background: white; border-radius: 12px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .form-select-sm, .form-control-sm { border-radius: 8px; border: 1px solid #eee; background-color: #f9f9f9; font-size: 11px; margin-bottom: 10px; }
        .form-label { font-size: 10px; font-weight: bold; color: #666; margin-bottom: 3px; }

        .accordion-item { border: none; margin-bottom: 10px; border-radius: 10px !important; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .accordion-button { background-color: white; color: #333; font-weight: bold; font-size: 13px; padding: 15px; }
        .accordion-button:not(.collapsed) { background-color: #f3e5f5; color: #8e44ad; box-shadow: none; }
        .accordion-button:focus { box-shadow: none; }
        
        .majelis-badge { background: #9b59b6; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-left: 8px; }
        
        .table-mitra { font-size: 11px; margin-bottom: 0; }
        .table-mitra td { vertical-align: middle; padding: 12px 10px; }
        .btn-kirim { font-size: 10px; padding: 5px 12px; border-radius: 20px; font-weight: bold; }

        .status-pill { font-size: 9px; padding: 3px 8px; border-radius: 10px; font-weight: bold; display: inline-block; }
        .pill-bayar { background: #d4edda; color: #155724; }
        .pill-belum { background: #f8d7da; color: #721c24; }
        
        .mitra-name { font-weight: 700; color: #2c3e50; display: block; }
        .mitra-id { color: #7f8c8d; font-size: 10px; }
        
        /* New Style for Amount */
        .nominal-text { font-weight: 600; color: #2c3e50; font-size: 10px; }
        .nominal-label { font-size: 8px; color: #7f8c8d; display: block; }

        #loadingOverlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); z-index: 9999; display: flex; justify-content: center; align-items: center; flex-direction: column; }
    </style>
</head>
<body>

    <div class="header-bar d-flex align-items-center">
        <a href="home.html" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <div>
            <h5 class="m-0 fw-bold">Tugas Repayment</h5>
            <small style="opacity: 0.9;">Monitoring & Laporan Cepat</small>
        </div>
    </div>

    <div class="container">
        <div class="filter-card">
            <div class="row g-2">
                <div class="col-6">
                    <label class="form-label">Area</label>
                    <select id="filterArea" class="form-select form-select-sm"><option value="">Semua Area</option></select>
                </div>
                <div class="col-6">
                    <label class="form-label">Point</label>
                    <select id="filterPoint" class="form-select form-select-sm"><option value="">Semua Point</option></select>
                </div>
                
                <div class="col-6">
                    <label class="form-label">Nama BP</label>
                    <select id="filterBP" class="form-select form-select-sm"><option value="">Semua BP</option></select>
                </div>

                <div class="col-6">
                    <label class="form-label">Hari</label>
                    <select id="filterHari" class="form-select form-select-sm">
                        <option value="">Semua</option>
                        <option value="Senin">Senin</option>
                        <option value="Selasa">Selasa</option>
                        <option value="Rabu">Rabu</option>
                        <option value="Kamis">Kamis</option>
                        <option value="Jumat">Jumat</option>
                    </select>
                </div>
            </div>
            
            <div class="d-grid mt-2">
                <button id="btnTampilkan" class="btn btn-sm btn-primary fw-bold" style="background-color: #9b59b6; border-color: #9b59b6;">
                    <i class="fa-solid fa-filter me-1"></i> Tampilkan Data
                </button>
            </div>
        </div>

        <div class="d-flex justify-content-between align-items-center mb-2 px-1">
            <span class="text-muted small fw-bold" id="totalMajelis">Total: 0 Majelis</span>
            <span class="text-muted small fw-bold" id="totalMitra">0 Mitra</span>
        </div>

        <div class="accordion" id="majelisContainer"></div>
        
        <div id="emptyState" class="text-center py-5 d-none">
            <img src="https://cdn-icons-png.flaticon.com/512/7486/7486777.png" width="60" style="opacity: 0.5;">
            <p class="text-muted mt-2 small">Data tidak ditemukan<br>Silakan atur filter dan klik Tampilkan</p>
        </div>
    </div>

    <div id="loadingOverlay">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2 small text-muted">Menyiapkan Data...</p>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script type="module" src="./js/majelis.js"></script>
</body>
</html>
