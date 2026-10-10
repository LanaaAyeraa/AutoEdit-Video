document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    uploadedClips: [],      // Array of { filename, path, duration, is_image, previewUrl }
    audioRef: null,          // { audio_path, title, bpm, duration, beat_times, drop_times }
    selectedTheme: 'tiktok_viral',
    currentStep: 1,
    currentJobId: null,
    pollTimer: null
  };

  // DOM Elements
  const nodes = [1, 2, 3, 4].map(n => document.getElementById(`node${n}`));
  const lines = [1, 2, 3].map(n => document.getElementById(`line${n}`));
  const panels = [1, 2, 3, 4].map(n => document.getElementById(`step${n}`));

  // Step 1 Elements
  const inputClips = document.getElementById('inputClips');
  const dropzoneClips = document.getElementById('dropzoneClips');
  const clipsContainer = document.getElementById('clipsContainer');
  const clipsGrid = document.getElementById('clipsGrid');
  const clipsCountText = document.getElementById('clipsCountText');
  const btnClearClips = document.getElementById('btnClearClips');
  const btnNext1 = document.getElementById('btnNext1');

  // Step 2 Elements
  const tabCapcut = document.getElementById('tabCapcut');
  const tabUrl = document.getElementById('tabUrl');
  const tabUpload = document.getElementById('tabUpload');
  const contentCapcut = document.getElementById('contentCapcut');
  const contentUrl = document.getElementById('contentUrl');
  const contentUpload = document.getElementById('contentUpload');
  const capcutTemplatesGrid = document.getElementById('capcutTemplatesGrid');
  const inputTiktokUrl = document.getElementById('inputTiktokUrl');
  const btnFetchTiktok = document.getElementById('btnFetchTiktok');
  const inputRefFile = document.getElementById('inputRefFile');
  const audioAnalysisCard = document.getElementById('audioAnalysisCard');
  const audioTitle = document.getElementById('audioTitle');
  const statBpm = document.getElementById('statBpm');
  const statDuration = document.getElementById('statDuration');
  const statBeats = document.getElementById('statBeats');
  const beatBar = document.getElementById('beatBar');
  const btnBack2 = document.getElementById('btnBack2');
  const btnNext2 = document.getElementById('btnNext2');

  // Step 3 Elements
  const themeCards = document.querySelectorAll('.theme-card');
  const btnBack3 = document.getElementById('btnBack3');
  const btnStartRender = document.getElementById('btnStartRender');

  // Step 4 Elements
  const renderProcessing = document.getElementById('renderProcessing');
  const renderResult = document.getElementById('renderResult');
  const renderError = document.getElementById('renderError');
  const renderStatusText = document.getElementById('renderStatusText');
  const progressBar = document.getElementById('progressBar');
  const progressPct = document.getElementById('progressPct');
  const finalVideoPlayer = document.getElementById('finalVideoPlayer');
  const btnDownloadVideo = document.getElementById('btnDownloadVideo');
  const btnRestart = document.getElementById('btnRestart');
  const btnRetry = document.getElementById('btnRetry');

  // Modal Elements
  const btnHelp = document.getElementById('btnHelp');
  const btnCloseHelp = document.getElementById('btnCloseHelp');
  const helpModal = document.getElementById('helpModal');

  // --- Step Navigation ---
  function goToStep(step) {
    state.currentStep = step;
    
    // Update nodes & panels
    panels.forEach((p, idx) => {
      p.classList.toggle('active', idx + 1 === step);
    });

    nodes.forEach((n, idx) => {
      const stepIdx = idx + 1;
      n.classList.toggle('active', stepIdx === step);
      n.classList.toggle('completed', stepIdx < step);
    });

    lines.forEach((l, idx) => {
      l.classList.toggle('active', idx + 1 < step);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- STEP 1: IMPORT BAHAN ---
  inputClips.addEventListener('change', (e) => handleClipsSelect(e.target.files));

  // Drag & drop handlers
  dropzoneClips.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzoneClips.classList.add('dragover');
  });

  dropzoneClips.addEventListener('dragleave', () => dropzoneClips.classList.remove('dragover'));

  dropzoneClips.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzoneClips.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleClipsSelect(e.dataTransfer.files);
    }
  });

  async function handleClipsSelect(fileList) {
    if (!fileList || fileList.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    btnNext1.disabled = true;
    btnNext1.innerText = 'Mengunggah bahan...';

    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success && data.items) {
        // Add to state
        data.items.forEach(item => {
          state.uploadedClips.push(item);
        });
        renderClipsGrid();
      } else {
        alert('Gagal mengunggah beberapa file bahan.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan saat mengunggah bahan.');
    } finally {
      btnNext1.innerText = 'Lanjut ke Referensi TikTok ➔';
      updateStep1State();
    }
  }

  function renderClipsGrid() {
    clipsGrid.innerHTML = '';
    state.uploadedClips.forEach((clip, index) => {
      const card = document.createElement('div');
      card.className = 'clip-item';

      if (clip.is_image) {
        card.innerHTML = `
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:#202434;">🖼️</div>
          <span class="clip-duration-tag">Foto</span>
          <button class="clip-remove-btn" data-index="${index}">&times;</button>
        `;
      } else {
        card.innerHTML = `
          <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:#202434;">🎬</div>
          <span class="clip-duration-tag">${clip.duration || 0}s</span>
          <button class="clip-remove-btn" data-index="${index}">&times;</button>
        `;
      }

      card.querySelector('.clip-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        state.uploadedClips.splice(index, 1);
        renderClipsGrid();
        updateStep1State();
      });

      clipsGrid.appendChild(card);
    });

    updateStep1State();
  }

  function updateStep1State() {
    const count = state.uploadedClips.length;
    clipsCountText.innerText = `${count} klip dipilih`;
    if (count > 0) {
      clipsContainer.classList.remove('hidden');
      btnNext1.disabled = false;
    } else {
      clipsContainer.classList.add('hidden');
      btnNext1.disabled = true;
    }
  }

  btnClearClips.addEventListener('click', () => {
    state.uploadedClips = [];
    renderClipsGrid();
  });

  btnNext1.addEventListener('click', () => goToStep(2));

  // --- STEP 2: TEMPLATE CAPCUT & REFERENSI ---
  function switchStep2Tab(tabName) {
    [tabCapcut, tabUrl, tabUpload].forEach(t => t.classList.remove('active'));
    [contentCapcut, contentUrl, contentUpload].forEach(c => c.classList.remove('active'));

    if (tabName === 'capcut') {
      tabCapcut.classList.add('active');
      contentCapcut.classList.add('active');
    } else if (tabName === 'url') {
      tabUrl.classList.add('active');
      contentUrl.classList.add('active');
    } else if (tabName === 'upload') {
      tabUpload.classList.add('active');
      contentUpload.classList.add('active');
    }
  }

  tabCapcut.addEventListener('click', () => switchStep2Tab('capcut'));
  tabUrl.addEventListener('click', () => switchStep2Tab('url'));
  tabUpload.addEventListener('click', () => switchStep2Tab('upload'));

  // Load Katalog Template CapCut dari Backend
  async function loadCapcutTemplates() {
    try {
      const res = await fetch('/api/capcut/templates');
      const data = await res.json();
      
      if (data.templates && data.templates.length > 0) {
        capcutTemplatesGrid.innerHTML = '';
        data.templates.forEach((tmpl, idx) => {
          const card = document.createElement('div');
          card.className = idx === 0 ? 'capcut-card active' : 'capcut-card';
          card.dataset.id = tmpl.id;

          const tagsHtml = (tmpl.effects || []).map(eff => `<span class="capcut-tag">${eff}</span>`).join('');

          card.innerHTML = `
            <div class="capcut-card-top">
              <span class="capcut-badge ${tmpl.badge.includes('Viral') ? 'popular' : ''}">${tmpl.badge}</span>
              <span style="font-size:11px;color:var(--secondary);font-weight:700;">⏱️ ${tmpl.duration}s (${tmpl.bpm} BPM)</span>
            </div>
            <div class="capcut-card-main">
              <div class="capcut-card-icon">${tmpl.icon}</div>
              <div class="capcut-card-details">
                <h4>${tmpl.name}</h4>
                <p>${tmpl.description}</p>
              </div>
            </div>
            <div class="capcut-card-footer">
              <div class="capcut-tags">${tagsHtml}</div>
              <span>${tmpl.recommended_clips}</span>
            </div>
          `;

          card.addEventListener('click', () => selectCapcutTemplate(tmpl.id, card));
          capcutTemplatesGrid.appendChild(card);
        });

        // Otomatis pilih template pertama
        selectCapcutTemplate(data.templates[0].id, capcutTemplatesGrid.children[0]);
      }
    } catch (err) {
      console.error('Gagal memuat template CapCut:', err);
      capcutTemplatesGrid.innerHTML = '<div class="loading-state">Gagal memuat template CapCut.</div>';
    }
  }

  async function selectCapcutTemplate(templateId, cardElement) {
    document.querySelectorAll('.capcut-card').forEach(c => c.classList.remove('active'));
    if (cardElement) cardElement.classList.add('active');

    try {
      const res = await fetch('/api/capcut/select-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId })
      });
      const data = await res.json();

      if (data.success) {
        displayAudioAnalysis(data);

        // Otomatis sesuaikan tema
        if (data.theme_key) {
          state.selectedTheme = data.theme_key;
          themeCards.forEach(c => {
            c.classList.toggle('active', c.dataset.theme === data.theme_key);
          });
        }
      }
    } catch (err) {
      console.error('Gagal memilih template CapCut:', err);
    }
  }

  // URL CapCut / TikTok Fetch
  btnFetchTiktok.addEventListener('click', async () => {
    const url = inputTiktokUrl.value.trim();
    if (!url) {
      alert('Silakan masukkan link URL template CapCut atau TikTok terlebih dahulu.');
      return;
    }

    btnFetchTiktok.disabled = true;
    btnFetchTiktok.innerText = 'Mengunduh Template...';

    try {
      const res = await fetch('/api/reference/tiktok-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();

      if (data.success) {
        displayAudioAnalysis(data);
      } else {
        alert(data.detail || 'Gagal memproses URL. Pastikan link template publik.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi server untuk mengunduh template.');
    } finally {
      btnFetchTiktok.disabled = false;
      btnFetchTiktok.innerText = 'Ambil Template';
    }
  });

  // Upload Audio/Video Manual
  inputRefFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const btnFileSelect = contentUpload.querySelector('button');
    btnFileSelect.innerText = 'Menganalisis audio...';

    try {
      const res = await fetch('/api/reference/upload-file', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        displayAudioAnalysis(data);
      } else {
        alert('Gagal membaca file referensi audio.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengunggah audio.');
    } finally {
      btnFileSelect.innerText = 'Pilih File Musik';
    }
  });

  function displayAudioAnalysis(data) {
    state.audioRef = data;
    audioTitle.innerText = data.title || 'TikTok Audio Track';
    statBpm.innerText = `⚡ ${data.bpm || 120} BPM`;
    statDuration.innerText = `⏱️ ${data.duration || 15}s`;
    statBeats.innerText = `🥁 ${data.total_beats || 0} Beats`;

    // Render Beat visual waveform
    beatBar.innerHTML = '';
    const beats = data.beat_times || [];
    const drops = new Set(data.drop_times || []);
    
    // Tampilkan 25-30 bar representasi beat
    const sampleCount = Math.min(beats.length, 36);
    const step = Math.max(1, Math.floor(beats.length / sampleCount));
    
    for (let i = 0; i < beats.length; i += step) {
      const tick = document.createElement('div');
      const isDrop = drops.has(beats[i]);
      tick.className = isDrop ? 'beat-tick drop' : 'beat-tick';
      beatBar.appendChild(tick);
    }

    audioAnalysisCard.classList.remove('hidden');
    btnNext2.disabled = false;
  }

  btnBack2.addEventListener('click', () => goToStep(1));
  btnNext2.addEventListener('click', () => goToStep(3));

  // --- STEP 3: PILIH TEMA ---
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.selectedTheme = card.dataset.theme;
    });
  });

  btnBack3.addEventListener('click', () => goToStep(2));

  btnStartRender.addEventListener('click', async () => {
    if (!state.uploadedClips.length) {
      alert('Silakan upload klip bahan terlebih dahulu.');
      goToStep(1);
      return;
    }
    if (!state.audioRef) {
      alert('Silakan tentukan referensi musik TikTok terlebih dahulu.');
      goToStep(2);
      return;
    }

    goToStep(4);
    startRenderingProcess();
  });

  // --- STEP 4: PROSES RENDERING ---
  async function startRenderingProcess() {
    renderProcessing.classList.remove('hidden');
    renderResult.classList.add('hidden');
    renderError.classList.add('hidden');
    progressBar.style.width = '10%';
    progressPct.innerText = '10%';
    renderStatusText.innerText = 'Menyiapkan engine FFmpeg...';

    const payload = {
      clip_paths: state.uploadedClips.map(c => c.path),
      audio_path: state.audioRef.audio_path,
      theme: state.selectedTheme
    };

    try {
      const res = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.job_id) {
        state.currentJobId = data.job_id;
        pollJobStatus(data.job_id);
      } else {
        showRenderError('Gagal memulai tugas render.');
      }
    } catch (err) {
      console.error(err);
      showRenderError('Terjadi kesalahan saat memulai proses render.');
    }
  }

  function pollJobStatus(jobId) {
    if (state.pollTimer) clearInterval(state.pollTimer);

    state.pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${jobId}`);
        const data = await res.json();

        if (data.status === 'processing') {
          const pct = data.progress || 15;
          progressBar.style.width = `${pct}%`;
          progressPct.innerText = `${pct}%`;
          renderStatusText.innerText = data.message || 'Sedang memproses video...';
        } else if (data.status === 'completed') {
          clearInterval(state.pollTimer);
          showRenderSuccess(data.result);
        } else if (data.status === 'failed') {
          clearInterval(state.pollTimer);
          showRenderError(data.message || 'Gagal memproses video.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1200);
  }

  function showRenderSuccess(result) {
    renderProcessing.classList.add('hidden');
    renderResult.classList.remove('hidden');

    const videoUrl = `/api/output/${result.output_file}`;
    finalVideoPlayer.src = videoUrl;
    btnDownloadVideo.href = videoUrl;
  }

  function showRenderError(message) {
    renderProcessing.classList.add('hidden');
    renderError.classList.remove('hidden');
    document.getElementById('renderErrorMsg').innerText = message;
  }

  btnRetry.addEventListener('click', () => {
    startRenderingProcess();
  });

  btnRestart.addEventListener('click', () => {
    state.uploadedClips = [];
    state.audioRef = null;
    state.currentJobId = null;
    if (state.pollTimer) clearInterval(state.pollTimer);
    
    renderClipsGrid();
    audioAnalysisCard.classList.add('hidden');
    btnNext2.disabled = true;
    finalVideoPlayer.src = '';
    goToStep(1);
  });

  // Modal Handlers
  btnHelp.addEventListener('click', () => helpModal.classList.remove('hidden'));
  btnCloseHelp.addEventListener('click', () => helpModal.classList.add('hidden'));
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.add('hidden');
  });

  // Inisialisasi: Muat katalog template CapCut
  loadCapcutTemplates();

});

