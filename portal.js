(function () {
  const config = window.ALEANDRI_PORTAL_CONFIG;
  if (!config) throw new Error('Portal config not found.');

  const state = {
    authMode: 'client',
    sessionRole: null,
    activeBrandId: config.brands[0].id,
    draggedAsset: null,
    db: loadDB()
  };

  const el = {
    loginView: document.getElementById('loginView'),
    portalView: document.getElementById('portalView'),
    loginForm: document.getElementById('loginForm'),
    loginStatus: document.getElementById('loginStatus'),
    passwordInput: document.getElementById('passwordInput'),
    authTitle: document.getElementById('authTitle'),
    authHint: document.getElementById('authHint'),
    tabBtns: Array.from(document.querySelectorAll('.tab-btn')),
    brandNav: document.getElementById('brandNav'),
    brandHeading: document.getElementById('brandHeading'),
    brandTagline: document.getElementById('brandTagline'),
    sessionBadge: document.getElementById('sessionBadge'),
    adminBadge: document.getElementById('adminBadge'),
    logoutBtn: document.getElementById('logoutBtn'),
    printBrandBtn: document.getElementById('printBrandBtn'),
    poolSections: document.getElementById('poolSections'),
    assetBucket: document.getElementById('assetBucket'),
    assetTitle: document.getElementById('assetTitle'),
    assetDescription: document.getElementById('assetDescription'),
    assetFile: document.getElementById('assetFile'),
    saveAssetBtn: document.getElementById('saveAssetBtn'),
    uploadPanel: document.getElementById('uploadPanel'),
    uploadStatus: document.getElementById('uploadStatus'),
    addLookBtn: document.getElementById('addLookBtn'),
    lookGrid: document.getElementById('lookGrid'),
    lookEmpty: document.getElementById('lookEmpty'),
    projectNotes: document.getElementById('projectNotes'),
    plannerExamples: document.getElementById('plannerExamples'),
    previewModal: document.getElementById('previewModal'),
    previewTitle: document.getElementById('previewTitle'),
    previewMeta: document.getElementById('previewMeta'),
    previewImage: document.getElementById('previewImage'),
    previewDescription: document.getElementById('previewDescription'),
    closePreviewBtn: document.getElementById('closePreviewBtn')
  };

  (async function boot() {
    ensureSeedData();
    await importLocationSeed();
    bindEvents();
    render();
  })();

  function bindEvents() {
    el.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        state.authMode = btn.dataset.authMode;
        el.tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
        el.authTitle.textContent = state.authMode === 'admin' ? 'Enter admin password' : 'Enter client password';
        el.authHint.textContent = state.authMode === 'admin'
          ? 'Admin access unlocks upload controls and asset management.'
          : 'Simple password-only entry for brand/client review. No username required.';
        resetStatus(el.loginStatus);
        el.passwordInput.value = '';
      });
    });

    el.loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const password = el.passwordInput.value.trim();
      const valid = state.authMode === 'admin' ? password === config.adminPassword : password === config.clientPassword;
      if (!valid) {
        setStatus(el.loginStatus, 'Incorrect password.', 'error');
        return;
      }
      state.sessionRole = state.authMode;
      resetStatus(el.loginStatus);
      render();
    });

    el.logoutBtn.addEventListener('click', () => {
      state.sessionRole = null;
      el.passwordInput.value = '';
      closePreview();
      render();
    });

    el.printBrandBtn.addEventListener('click', () => window.print());

    el.saveAssetBtn.addEventListener('click', async () => {
      if (state.sessionRole !== 'admin') return;
      const file = el.assetFile.files[0];
      const title = el.assetTitle.value.trim();
      const description = el.assetDescription.value.trim();
      const bucket = el.assetBucket.value;

      if (!file || !title) {
        setStatus(el.uploadStatus, 'Choose an image and add a title.', 'error');
        return;
      }

      try {
        const dataUrl = await toDataURL(file);
        const brandState = getBrandState(state.activeBrandId);
        brandState.assets[bucket].unshift({
          id: crypto.randomUUID(),
          title,
          description,
          imageData: dataUrl,
          fileName: file.name,
          notes: '',
          createdAt: new Date().toISOString()
        });
        persist();
        el.assetTitle.value = '';
        el.assetDescription.value = '';
        el.assetFile.value = '';
        setStatus(el.uploadStatus, 'Asset saved to the active pool in this browser.', 'success');
        renderPools();
      } catch (error) {
        console.error(error);
        setStatus(el.uploadStatus, 'Failed to read image file.', 'error');
      }
    });

    el.addLookBtn.addEventListener('click', () => {
      const brandState = getBrandState(state.activeBrandId);
      const nextIndex = brandState.looks.length + 1;
      brandState.looks.push(createLook(`Look ${nextIndex}`));
      persist();
      renderPools();
      renderLooks();
    });

    el.projectNotes.addEventListener('input', () => {
      const brandState = getBrandState(state.activeBrandId);
      brandState.projectNotes = el.projectNotes.value;
      persist();
    });

    el.closePreviewBtn.addEventListener('click', closePreview);
    el.previewModal.addEventListener('click', (event) => {
      if (event.target === el.previewModal) closePreview();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePreview();
    });
  }

  function render() {
    const authed = Boolean(state.sessionRole);
    el.loginView.style.display = authed ? 'none' : 'grid';
    el.portalView.classList.toggle('active', authed);
    if (!authed) return;

    el.sessionBadge.textContent = state.sessionRole === 'admin' ? 'Admin session' : 'Client session';
    el.adminBadge.style.display = state.sessionRole === 'admin' ? 'inline-flex' : 'none';
    el.uploadPanel.classList.toggle('active', state.sessionRole === 'admin');
    el.addLookBtn.style.display = state.sessionRole === 'admin' ? 'inline-flex' : 'none';
    renderBrands();
    renderPools();
    renderLooks();
    renderPlanner();
  }

  function renderBrands() {
    el.brandNav.innerHTML = '';
    config.brands.forEach((brand) => {
      const card = document.createElement('button');
      card.className = 'brand-card' + (brand.id === state.activeBrandId ? ' active' : '');
      card.innerHTML = `<div class="pill">${brand.name}</div><h3>${brand.name}</h3><p>${brand.tagline}</p>`;
      card.addEventListener('click', () => {
        state.activeBrandId = brand.id;
        render();
      });
      el.brandNav.appendChild(card);
    });

    const brand = getBrandConfig(state.activeBrandId);
    const brandState = getBrandState(state.activeBrandId);
    el.brandHeading.textContent = brand.name;
    el.brandTagline.textContent = brand.tagline;
    el.projectNotes.value = brandState.projectNotes || '';
  }

  function renderPools() {
    const brandState = getBrandState(state.activeBrandId);
    el.poolSections.innerHTML = '';

    ['outfits', 'locations', 'models'].forEach((bucket) => {
      const assets = brandState.assets[bucket] || [];
      const section = document.createElement('div');
      section.className = 'pool-section';
      section.innerHTML = `<h4>${labelForBucket(bucket)} (${assets.length})</h4>`;
      const grid = document.createElement('div');
      grid.className = 'asset-grid';

      if (!assets.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = `No ${bucket} uploaded yet.`;
        grid.appendChild(empty);
      }

      assets.forEach((asset) => {
        const card = document.createElement('div');
        card.className = 'asset-card';
        card.draggable = true;
        card.dataset.assetId = asset.id;
        card.dataset.bucket = bucket;
        card.innerHTML = `
          <div class="asset-preview">${asset.imageData ? `<img src="${asset.imageData}" alt="${escapeHtml(asset.title)}">` : ''}</div>
          <div class="asset-body">
            <div>
              <div class="asset-title">${escapeHtml(asset.title)}</div>
              <div class="asset-meta">${escapeHtml(asset.fileName || 'Reference asset')}</div>
            </div>
            <div class="hint">${escapeHtml(asset.description || '')}</div>
            <div class="asset-actions"></div>
            <textarea class="asset-notes" placeholder="Asset notes...">${escapeHtml(asset.notes || '')}</textarea>
            ${state.sessionRole === 'admin' ? '<button class="danger-btn delete-asset-btn" type="button">Delete asset</button>' : ''}
          </div>
        `;

        card.addEventListener('dragstart', () => {
          state.draggedAsset = { bucket, assetId: asset.id };
          card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
          state.draggedAsset = null;
          card.classList.remove('dragging');
        });

        const preview = card.querySelector('.asset-preview');
        preview.addEventListener('click', () => openPreview(asset, bucket));

        const notesEl = card.querySelector('.asset-notes');
        notesEl.addEventListener('input', () => {
          asset.notes = notesEl.value;
          persist();
        });

        const actions = card.querySelector('.asset-actions');
        (brandState.looks || []).forEach((look) => {
          const btn = document.createElement('button');
          btn.className = 'ghost-btn';
          btn.type = 'button';
          btn.textContent = `Add to ${look.name}`;
          btn.addEventListener('click', () => {
            look.slots[bucket] = asset.id;
            persist();
            renderLooks();
          });
          actions.appendChild(btn);
        });

        if (state.sessionRole === 'admin') {
          card.querySelector('.delete-asset-btn').addEventListener('click', () => {
            brandState.assets[bucket] = brandState.assets[bucket].filter((item) => item.id !== asset.id);
            brandState.looks.forEach((look) => {
              if (look.slots[bucket] === asset.id) look.slots[bucket] = null;
            });
            persist();
            renderPools();
            renderLooks();
          });
        }

        grid.appendChild(card);
      });

      section.appendChild(grid);
      el.poolSections.appendChild(section);
    });
  }

  function renderLooks() {
    const brandState = getBrandState(state.activeBrandId);
    const looks = brandState.looks || [];
    el.lookGrid.innerHTML = '';
    el.lookEmpty.style.display = looks.length ? 'none' : 'block';

    looks.forEach((look, index) => {
      const card = document.createElement('div');
      card.className = `look-card status-${normalizeStatusClass(look.status)}`;
      card.innerHTML = `
        <div class="look-card-header">
          <div>
            <h4 contenteditable="${state.sessionRole === 'admin'}" spellcheck="false" class="look-name">${escapeHtml(look.name)}</h4>
            <div class="hint">Build this look from the active brand pools.</div>
          </div>
          <div style="display:grid; gap:8px; min-width:160px;">
            <select class="look-status">
              <option value="draft">Draft</option>
              <option value="under review">Under review</option>
              <option value="approved">Approved</option>
              <option value="revise">Revise</option>
            </select>
            ${state.sessionRole === 'admin' ? '<button class="danger-btn delete-look-btn" type="button">Delete look</button>' : ''}
          </div>
        </div>
        <div class="look-slots"></div>
        <div>
          <label class="hint">Presentation sequence</label>
          <div class="sequence-row"></div>
        </div>
        <div>
          <label class="hint">Production notes</label>
          <textarea class="look-notes" placeholder="Shoot order, styling details, deliverable notes...">${escapeHtml(look.notes || '')}</textarea>
        </div>
        <div>
          <label class="hint">Client feedback</label>
          <textarea class="look-feedback" placeholder="Client notes / revision requests / approvals...">${escapeHtml(look.clientFeedback || '')}</textarea>
        </div>
      `;

      const nameEl = card.querySelector('.look-name');
      if (state.sessionRole === 'admin') {
        nameEl.addEventListener('blur', () => {
          look.name = nameEl.textContent.trim() || `Look ${index + 1}`;
          persist();
          renderPools();
        });
      }

      const statusEl = card.querySelector('.look-status');
      statusEl.value = look.status || 'draft';
      statusEl.disabled = state.sessionRole !== 'admin';
      statusEl.addEventListener('change', () => {
        look.status = statusEl.value;
        persist();
        renderLooks();
      });

      const notesEl = card.querySelector('.look-notes');
      notesEl.addEventListener('input', () => {
        look.notes = notesEl.value;
        persist();
      });

      const feedbackEl = card.querySelector('.look-feedback');
      feedbackEl.addEventListener('input', () => {
        look.clientFeedback = feedbackEl.value;
        persist();
      });

      if (state.sessionRole === 'admin') {
        card.querySelector('.delete-look-btn').addEventListener('click', () => {
          brandState.looks.splice(index, 1);
          persist();
          renderPools();
          renderLooks();
        });
      }

      const slotsWrap = card.querySelector('.look-slots');
      ['outfits', 'locations', 'models'].forEach((bucket) => {
        const asset = findAssetById(brandState.assets[bucket], look.slots[bucket]);
        const slot = document.createElement('div');
        slot.className = 'look-slot';
        slot.dataset.bucket = bucket;
        slot.innerHTML = `
          <div class="look-slot-head">
            <span class="slot-label">${labelForBucket(bucket)}</span>
            ${state.sessionRole === 'admin' && asset ? `<button type="button" class="ghost-btn clear-slot-btn">Clear</button>` : ''}
          </div>
          <div class="slot-content"></div>
        `;

        if (state.sessionRole === 'admin') {
          slot.addEventListener('dragover', (event) => {
            if (state.draggedAsset?.bucket !== bucket) return;
            event.preventDefault();
            slot.classList.add('drag-over');
          });
          slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
          slot.addEventListener('drop', (event) => {
            if (state.draggedAsset?.bucket !== bucket) return;
            event.preventDefault();
            look.slots[bucket] = state.draggedAsset.assetId;
            slot.classList.remove('drag-over');
            persist();
            renderLooks();
          });
        }

        const content = slot.querySelector('.slot-content');
        if (asset) {
          content.className = 'slot-asset';
          content.innerHTML = `
            ${asset.imageData ? `<img src="${asset.imageData}" alt="${escapeHtml(asset.title)}">` : ''}
            <div class="asset-title">${escapeHtml(asset.title)}</div>
            <div class="hint">${escapeHtml(asset.description || '')}</div>
          `;
          const img = content.querySelector('img');
          if (img) img.addEventListener('click', () => openPreview(asset, bucket));

          const clearBtn = slot.querySelector('.clear-slot-btn');
          if (clearBtn) {
            clearBtn.addEventListener('click', () => {
              look.slots[bucket] = null;
              persist();
              renderLooks();
            });
          }
        } else {
          content.className = 'slot-empty';
          content.textContent = state.sessionRole === 'admin'
            ? `Drop a ${bucket.slice(0, -1)} here or use Add to Look buttons.`
            : `No ${bucket.slice(0, -1)} selected.`;
        }
        slotsWrap.appendChild(slot);
      });

      const sequenceRow = card.querySelector('.sequence-row');
      (look.sequence || ['outfits', 'locations', 'models']).forEach((bucket, seqIndex) => {
        const asset = findAssetById(brandState.assets[bucket], look.slots[bucket]);
        const seq = document.createElement('div');
        seq.className = 'sequence-cell';
        seq.dataset.seqBucket = bucket;
        seq.draggable = state.sessionRole === 'admin';
        seq.innerHTML = `<div class="sequence-label">Position ${seqIndex + 1}</div>`;

        if (asset) {
          const inner = document.createElement('div');
          inner.innerHTML = `
            ${asset.imageData ? `<img class="sequence-thumb" src="${asset.imageData}" alt="${escapeHtml(asset.title)}">` : ''}
            <div class="asset-title">${escapeHtml(asset.title)}</div>
            <div class="hint">${bucket.slice(0, -1)}</div>
          `;
          seq.appendChild(inner);
          const img = seq.querySelector('.sequence-thumb');
          if (img) img.addEventListener('click', () => openPreview(asset, bucket));
        } else {
          const empty = document.createElement('div');
          empty.className = 'sequence-empty';
          empty.textContent = `${bucket.slice(0, -1)} slot empty`;
          seq.appendChild(empty);
        }

        if (state.sessionRole === 'admin') {
          seq.addEventListener('dragstart', () => {
            state.draggedAsset = { sequenceReorder: true, lookId: look.id, bucket };
          });
          seq.addEventListener('dragend', () => {
            state.draggedAsset = null;
            seq.classList.remove('drag-over');
          });
          seq.addEventListener('dragover', (event) => {
            if (!state.draggedAsset?.sequenceReorder || state.draggedAsset.lookId !== look.id) return;
            event.preventDefault();
            seq.classList.add('drag-over');
          });
          seq.addEventListener('dragleave', () => seq.classList.remove('drag-over'));
          seq.addEventListener('drop', (event) => {
            if (!state.draggedAsset?.sequenceReorder || state.draggedAsset.lookId !== look.id) return;
            event.preventDefault();
            seq.classList.remove('drag-over');
            const fromBucket = state.draggedAsset.bucket;
            const toBucket = bucket;
            const order = look.sequence || ['outfits', 'locations', 'models'];
            const fromIndex = order.indexOf(fromBucket);
            const toIndex = order.indexOf(toBucket);
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
            const next = [...order];
            next.splice(fromIndex, 1);
            next.splice(toIndex, 0, fromBucket);
            look.sequence = next;
            persist();
            renderLooks();
          });
        }

        sequenceRow.appendChild(seq);
      });

      el.lookGrid.appendChild(card);
    });
  }

  function renderPlanner() {
    const brand = getBrandConfig(state.activeBrandId);
    el.plannerExamples.innerHTML = '';
    ['outfits', 'locations', 'models'].forEach((key) => {
      const card = document.createElement('div');
      card.className = 'planner-card';
      card.innerHTML = `
        <h4>${labelForBucket(key)} examples</h4>
        <ul class="example-list">${brand.examples[key].map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      `;
      el.plannerExamples.appendChild(card);
    });
  }

  function openPreview(asset, bucket) {
    if (!asset?.imageData) return;
    el.previewTitle.textContent = asset.title || 'Preview';
    el.previewMeta.textContent = `${labelForBucket(bucket)} • ${asset.fileName || 'uploaded asset'}`;
    el.previewDescription.textContent = asset.description || '';
    el.previewImage.src = asset.imageData;
    el.previewImage.alt = asset.title || 'Preview image';
    el.previewModal.classList.add('active');
    document.body.classList.add('modal-open');
  }

  function closePreview() {
    el.previewModal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  async function importLocationSeed() {
    try {
      if (state.db.locationSeedImported) return;
      const response = await fetch('location-seed.json', { cache: 'no-store' });
      if (!response.ok) return;
      const seed = await response.json();
      for (const [brandId, items] of Object.entries(seed)) {
        const brandState = getBrandState(brandId);
        const existingNames = new Set((brandState.assets.locations || []).map((item) => item.fileName));
        for (const item of items) {
          if (existingNames.has(item.fileName)) continue;
          brandState.assets.locations.push({
            id: crypto.randomUUID(),
            title: item.title,
            description: item.description,
            imageData: item.filePath,
            fileName: item.fileName,
            notes: '',
            createdAt: new Date().toISOString(),
            seeded: true
          });
        }
      }
      state.db.locationSeedImported = true;
      persist();
    } catch (error) {
      console.warn('Location seed import skipped.', error);
    }
  }

  function ensureSeedData() {
    config.brands.forEach((brand) => {
      const brandState = getBrandState(brand.id);
      ['outfits', 'locations', 'models'].forEach((bucket) => {
        brandState.assets[bucket] = brandState.assets[bucket] || [];
      });
      brandState.projectNotes = brandState.projectNotes || '';
      if (!Array.isArray(brandState.looks) || !brandState.looks.length) {
        brandState.looks = [createLook('Look 1'), createLook('Look 2'), createLook('Look 3'), createLook('Look 4')];
      } else {
        brandState.looks = brandState.looks.map(normalizeLook);
      }
    });
    persist();
  }

  function createLook(name) {
    return normalizeLook({
      id: crypto.randomUUID(),
      name,
      status: 'draft',
      slots: { outfits: null, locations: null, models: null },
      notes: '',
      clientFeedback: ''
    });
  }

  function normalizeLook(look) {
    return {
      id: look.id || crypto.randomUUID(),
      name: look.name || 'Untitled look',
      status: look.status || 'draft',
      slots: {
        outfits: look.slots?.outfits || null,
        locations: look.slots?.locations || null,
        models: look.slots?.models || null
      },
      sequence: Array.isArray(look.sequence) && look.sequence.length === 3 ? look.sequence : ['outfits', 'locations', 'models'],
      notes: look.notes || '',
      clientFeedback: look.clientFeedback || ''
    };
  }

  function labelForBucket(bucket) {
    const singular = bucket.endsWith('s') ? bucket.slice(0, -1) : bucket;
    return singular.charAt(0).toUpperCase() + singular.slice(1) + ' Pool';
  }

  function normalizeStatusClass(status) {
    return String(status || 'draft').replace(/\s+/g, '-');
  }

  function getBrandConfig(id) { return config.brands.find((brand) => brand.id === id); }

  function getBrandState(id) {
    if (!state.db.brands[id]) {
      state.db.brands[id] = {
        projectNotes: '',
        assets: { outfits: [], locations: [], models: [] },
        looks: []
      };
    }
    return state.db.brands[id];
  }

  function loadDB() {
    try {
      const raw = localStorage.getItem(config.storageKey);
      return raw ? JSON.parse(raw) : { brands: {} };
    } catch (error) {
      console.warn('Failed to parse portal storage, resetting.', error);
      return { brands: {} };
    }
  }

  function persist() { localStorage.setItem(config.storageKey, JSON.stringify(state.db)); }

  function toDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function findAssetById(list, id) { return (list || []).find((item) => item.id === id) || null; }

  function setStatus(node, text, kind) {
    node.textContent = text;
    node.className = `status ${kind || ''}`.trim();
  }

  function resetStatus(node) {
    node.textContent = '';
    node.className = 'status';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
})();
