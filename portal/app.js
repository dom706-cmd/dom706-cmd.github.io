(function () {
    const config = window.PORTAL_CONFIG;
    const seedData = window.PORTAL_DATA;

    const BUCKETS = [
        { id: 'outfits', label: 'Outfits' },
        { id: 'locations', label: 'Locations' },
        { id: 'models', label: 'Models' }
    ];

    const ROADMAP = [
        'Align outfit, location, and cast notes into one approval pass.',
        'Keep clients in review mode while reserving uploads for admin sessions.',
        'Preserve browser-local continuity until shared storage is introduced.'
    ];

    const state = {
        sessionMode: null,
        loginMode: 'client',
        currentBrandId: seedData.brands[0].id,
        currentBucket: 'outfits',
        store: loadStore()
    };

    const elements = {
        loginScreen: document.getElementById('loginScreen'),
        portalApp: document.getElementById('portalApp'),
        modeTabs: document.getElementById('modeTabs'),
        loginTitle: document.getElementById('loginTitle'),
        loginDescription: document.getElementById('loginDescription'),
        loginForm: document.getElementById('loginForm'),
        loginStatus: document.getElementById('loginStatus'),
        portalPassword: document.getElementById('portalPassword'),
        sessionLabel: document.getElementById('sessionLabel'),
        logoutButton: document.getElementById('logoutButton'),
        brandHeader: document.getElementById('brandHeader'),
        brandSwitcher: document.getElementById('brandSwitcher'),
        bucketTabs: document.getElementById('bucketTabs'),
        assetGrid: document.getElementById('assetGrid'),
        statsGrid: document.getElementById('statsGrid'),
        roadmapList: document.getElementById('roadmapList'),
        adminPanel: document.getElementById('adminPanel'),
        adminForm: document.getElementById('adminForm'),
        adminBrand: document.getElementById('adminBrand'),
        adminBucket: document.getElementById('adminBucket'),
        adminStatus: document.getElementById('adminStatus')
    };

    init();

    function init() {
        seedStore();
        renderModeTabs();
        renderBrandOptions();
        bindEvents();
        renderRoadmap();
        renderPortal();
    }

    function bindEvents() {
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.logoutButton.addEventListener('click', handleLogout);
        elements.adminForm.addEventListener('submit', handleAdminUpload);
    }

    function renderModeTabs() {
        elements.modeTabs.innerHTML = '';
        ['client', 'admin'].forEach((mode) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `tab-button${state.loginMode === mode ? ' active' : ''}`;
            button.textContent = config.labels[mode];
            button.addEventListener('click', function () {
                state.loginMode = mode;
                elements.portalPassword.value = '';
                elements.loginStatus.textContent = '';
                elements.loginStatus.className = 'status-message';
                renderModeTabs();
                syncLoginCopy();
            });
            elements.modeTabs.appendChild(button);
        });
        syncLoginCopy();
    }

    function syncLoginCopy() {
        const isAdmin = state.loginMode === 'admin';
        elements.loginTitle.textContent = isAdmin ? config.labels.admin : config.labels.client;
        elements.loginDescription.textContent = isAdmin
            ? 'Enter the admin password to unlock local upload controls and privileged review tools.'
            : 'Enter the client password to review brand project boards and leave notes.';
    }

    function renderBrandOptions() {
        elements.adminBrand.innerHTML = '';
        seedData.brands.forEach((brand) => {
            const option = document.createElement('option');
            option.value = brand.id;
            option.textContent = brand.name;
            elements.adminBrand.appendChild(option);
        });
        elements.adminBrand.value = state.currentBrandId;
    }

    function handleLogin(event) {
        event.preventDefault();
        const submitted = elements.portalPassword.value;
        const expected = config.passwords[state.loginMode];

        if (submitted !== expected) {
            elements.loginStatus.textContent = 'Incorrect password.';
            elements.loginStatus.className = 'status-message error';
            return;
        }

        state.sessionMode = state.loginMode;
        elements.loginScreen.classList.remove('active');
        elements.portalApp.classList.add('active');
        elements.logoutButton.classList.remove('hidden');
        elements.sessionLabel.textContent = `${config.labels[state.sessionMode]} unlocked`;
        elements.loginStatus.textContent = '';
        elements.portalPassword.value = '';
        renderPortal();
    }

    function handleLogout() {
        state.sessionMode = null;
        elements.portalApp.classList.remove('active');
        elements.loginScreen.classList.add('active');
        elements.logoutButton.classList.add('hidden');
        elements.sessionLabel.textContent = 'Locked';
        elements.adminStatus.textContent = '';
        elements.adminStatus.className = 'status-message';
        elements.adminForm.reset();
        renderPortal();
    }

    function renderPortal() {
        const brand = getCurrentBrand();
        renderBrandHeader(brand);
        renderBrandSwitcher();
        renderBucketTabs();
        renderAssets(brand);
        renderStats(brand);
        elements.adminPanel.hidden = state.sessionMode !== 'admin';
        elements.adminBrand.value = state.currentBrandId;
    }

    function renderBrandHeader(brand) {
        const bucketCounts = BUCKETS.map((bucket) => {
            const count = getBucketAssets(brand.id, bucket.id).length;
            return `<div class="stat-card"><span class="stat-value">${count}</span><span class="stat-label">${bucket.label}</span></div>`;
        }).join('');

        elements.brandHeader.innerHTML = `
            <div class="eyebrow">Current Brand</div>
            <h2 style="color: ${brand.accent};">${brand.name}</h2>
            <p class="brand-subtitle">${brand.subtitle}</p>
            <p class="brand-summary">${brand.overview}</p>
            <div class="stats-grid">${bucketCounts}</div>
        `;
    }

    function renderBrandSwitcher() {
        elements.brandSwitcher.innerHTML = '';
        seedData.brands.forEach((brand) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `chip-button${state.currentBrandId === brand.id ? ' active' : ''}`;
            button.textContent = brand.name;
            button.addEventListener('click', function () {
                state.currentBrandId = brand.id;
                elements.adminBrand.value = brand.id;
                renderPortal();
            });
            elements.brandSwitcher.appendChild(button);
        });
    }

    function renderBucketTabs() {
        elements.bucketTabs.innerHTML = '';
        BUCKETS.forEach((bucket) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `tab-button${state.currentBucket === bucket.id ? ' active' : ''}`;
            button.textContent = bucket.label;
            button.addEventListener('click', function () {
                state.currentBucket = bucket.id;
                renderAssets(getCurrentBrand());
            });
            elements.bucketTabs.appendChild(button);
        });
    }

    function renderAssets(brand) {
        const assets = getBucketAssets(brand.id, state.currentBucket);
        if (!assets.length) {
            elements.assetGrid.innerHTML = '<div class="empty-state">No assets in this bucket yet.</div>';
            return;
        }

        elements.assetGrid.innerHTML = '';
        assets.forEach((asset) => {
            const card = document.createElement('article');
            card.className = 'asset-card';
            const comments = getComments(asset.id);
            card.innerHTML = `
                <div class="asset-image"><img src="${asset.image}" alt="${escapeHtml(asset.title)}"></div>
                <div class="asset-body">
                    <div>
                        <div class="asset-meta">${asset.isLocalUpload ? 'Browser-local upload' : 'Suggested direction'}</div>
                        <h4>${escapeHtml(asset.title)}</h4>
                    </div>
                    <p>${escapeHtml(asset.summary)}</p>
                    <div class="comments-list" data-comments-for="${asset.id}">${renderComments(comments)}</div>
                    <form class="comment-form" data-asset-id="${asset.id}">
                        <div class="field-group">
                            <label for="comment-${asset.id}">Add comment</label>
                            <textarea id="comment-${asset.id}" name="comment" placeholder="Fit note, location concern, casting preference, approval request." required></textarea>
                        </div>
                        <button class="ghost-button" type="submit">Save Note</button>
                    </form>
                </div>
            `;

            const form = card.querySelector('.comment-form');
            form.addEventListener('submit', handleCommentSubmit);
            elements.assetGrid.appendChild(card);
        });
    }

    function renderStats(brand) {
        const assetsTotal = BUCKETS.reduce((sum, bucket) => sum + getBucketAssets(brand.id, bucket.id).length, 0);
        const commentTotal = BUCKETS.reduce((sum, bucket) => {
            return sum + getBucketAssets(brand.id, bucket.id).reduce((bucketSum, asset) => bucketSum + getComments(asset.id).length, 0);
        }, 0);
        const localAssetTotal = BUCKETS.reduce((sum, bucket) => {
            return sum + getBucketAssets(brand.id, bucket.id).filter((asset) => asset.isLocalUpload).length;
        }, 0);

        elements.statsGrid.innerHTML = `
            <div class="stat-card"><span class="stat-value">${assetsTotal}</span><span class="stat-label">Total references</span></div>
            <div class="stat-card"><span class="stat-value">${commentTotal}</span><span class="stat-label">Stored comments</span></div>
            <div class="stat-card"><span class="stat-value">${localAssetTotal}</span><span class="stat-label">Admin uploads</span></div>
        `;
    }

    function renderRoadmap() {
        elements.roadmapList.innerHTML = '';
        ROADMAP.forEach((item) => {
            const block = document.createElement('div');
            block.className = 'roadmap-item';
            block.textContent = item;
            elements.roadmapList.appendChild(block);
        });
    }

    function handleCommentSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const assetId = form.getAttribute('data-asset-id');
        const textarea = form.querySelector('textarea');
        const message = textarea.value.trim();

        if (!message) {
            return;
        }

        const store = state.store;
        if (!store.comments[assetId]) {
            store.comments[assetId] = [];
        }

        store.comments[assetId].push({
            id: `comment-${Date.now()}`,
            text: message,
            sessionMode: state.sessionMode,
            createdAt: new Date().toLocaleString()
        });

        persistStore();
        textarea.value = '';
        renderAssets(getCurrentBrand());
        renderStats(getCurrentBrand());
    }

    function handleAdminUpload(event) {
        event.preventDefault();

        if (state.sessionMode !== 'admin') {
            return;
        }

        const formData = new FormData(elements.adminForm);
        const file = formData.get('file');
        if (!(file instanceof File) || !file.size) {
            setAdminStatus('Choose an image file.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function () {
            const brandId = formData.get('brand');
            const bucket = formData.get('bucket');
            const title = String(formData.get('title') || '').trim();
            const summary = String(formData.get('summary') || '').trim();

            state.store.uploads.push({
                id: `upload-${Date.now()}`,
                brandId: brandId,
                bucket: bucket,
                title: title,
                summary: summary,
                image: String(reader.result),
                isLocalUpload: true,
                sourceFileName: file.name
            });

            persistStore();
            elements.adminForm.reset();
            elements.adminBrand.value = brandId;
            state.currentBrandId = brandId;
            state.currentBucket = bucket;
            setAdminStatus(`Added "${title}" to ${bucket}.`, 'success');
            renderPortal();
        };

        reader.onerror = function () {
            setAdminStatus('Could not read that file.', 'error');
        };

        reader.readAsDataURL(file);
    }

    function setAdminStatus(message, kind) {
        elements.adminStatus.textContent = message;
        elements.adminStatus.className = `status-message ${kind}`;
    }

    function getCurrentBrand() {
        return seedData.brands.find((brand) => brand.id === state.currentBrandId) || seedData.brands[0];
    }

    function getBucketAssets(brandId, bucketId) {
        const brand = seedData.brands.find((item) => item.id === brandId);
        const defaults = brand ? brand.buckets[bucketId].map(withDefaultLocalFlag) : [];
        const uploads = state.store.uploads.filter((asset) => asset.brandId === brandId && asset.bucket === bucketId);
        return defaults.concat(uploads);
    }

    function withDefaultLocalFlag(asset) {
        return Object.assign({ isLocalUpload: false }, asset);
    }

    function getComments(assetId) {
        return state.store.comments[assetId] || [];
    }

    function renderComments(comments) {
        if (!comments.length) {
            return '<div class="empty-state">No notes yet.</div>';
        }

        return comments.map((comment) => {
            return `
                <div class="comment-item">
                    <div class="comment-meta">${escapeHtml(comment.sessionMode || 'client')} • ${escapeHtml(comment.createdAt || '')}</div>
                    <p>${escapeHtml(comment.text)}</p>
                </div>
            `;
        }).join('');
    }

    function loadStore() {
        try {
            const raw = window.localStorage.getItem(config.storageKey);
            if (!raw) {
                return { uploads: [], comments: {} };
            }
            const parsed = JSON.parse(raw);
            return {
                uploads: Array.isArray(parsed.uploads) ? parsed.uploads : [],
                comments: parsed.comments && typeof parsed.comments === 'object' ? parsed.comments : {}
            };
        } catch (error) {
            return { uploads: [], comments: {} };
        }
    }

    function seedStore() {
        if (!Array.isArray(state.store.uploads)) {
            state.store.uploads = [];
        }
        if (!state.store.comments || typeof state.store.comments !== 'object') {
            state.store.comments = {};
        }
        persistStore();
    }

    function persistStore() {
        window.localStorage.setItem(config.storageKey, JSON.stringify(state.store));
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
