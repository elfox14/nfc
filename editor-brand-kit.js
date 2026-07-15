/**
 * MC PRIME NFC — Brand Kit v1.0
 * Saves and reapplies logo, color and typography choices locally.
 */
(function (global) {
    'use strict';

    var document = global.document;
    if (!document || global.EditorBrandKit) return;

    var STORAGE_KEY = 'mcprime-editor-brand-kits-v1';
    var isAr = document.documentElement.lang !== 'en';
    var panel = null;

    var fieldMap = {
        primary: ['primary-color', 'accent-color', 'button-color', 'front-bg-start'],
        secondary: ['secondary-color', 'accent-secondary', 'front-bg-end'],
        text: ['name-color', 'text-color', 'tagline-color'],
        font: ['font-family', 'name-font-family', 'card-font-family'],
        logo: ['logo-url', 'input-logo-url', 'logo-image-url']
    };

    function t(ar, en) { return isAr ? ar : en; }

    function first(ids) {
        return ids.map(function (id) { return document.getElementById(id); }).find(Boolean) || null;
    }

    function read(ids, fallback) {
        var input = first(ids);
        return input && input.value ? input.value : fallback;
    }

    function write(ids, value) {
        if (value === undefined || value === null || value === '') return false;
        var input = first(ids);
        if (!input) return false;
        input.value = value;
        input.dispatchEvent(new global.Event('input', { bubbles: true }));
        input.dispatchEvent(new global.Event('change', { bubbles: true }));
        return true;
    }

    function readLogo() {
        var configured = read(fieldMap.logo, '');
        if (configured) return configured;
        var image = document.querySelector('#card-logo img, #card-logo-img, .card-logo img');
        return image ? (image.currentSrc || image.src || '') : '';
    }

    function capture(name) {
        return {
            id: 'brand-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            name: String(name || '').trim() || t('هوية بدون اسم', 'Untitled brand'),
            primary: read(fieldMap.primary, '#4da6ff'),
            secondary: read(fieldMap.secondary, '#7c3aed'),
            text: read(fieldMap.text, '#ffffff'),
            font: read(fieldMap.font, ''),
            logo: readLogo(),
            updatedAt: new Date().toISOString()
        };
    }

    function load() {
        try {
            var parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function persist(kits) {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(kits));
        document.dispatchEvent(new global.CustomEvent('editor:brandkitschange', { detail: { kits: kits.slice() } }));
        return kits;
    }

    function save(name) {
        var kit = capture(name);
        var kits = load();
        kits.unshift(kit);
        persist(kits);
        renderList();
        return kit;
    }

    function apply(kitOrId) {
        var kit = typeof kitOrId === 'string' ? load().find(function (item) { return item.id === kitOrId; }) : kitOrId;
        if (!kit) return false;
        write(fieldMap.primary, kit.primary);
        write(fieldMap.secondary, kit.secondary);
        write(fieldMap.text, kit.text);
        write(fieldMap.font, kit.font);
        if (kit.logo) {
            if (!write(fieldMap.logo, kit.logo)) {
                var image = document.querySelector('#card-logo img, #card-logo-img, .card-logo img');
                if (image) image.src = kit.logo;
            }
        }
        document.dispatchEvent(new global.CustomEvent('editor:brandkitapplied', { detail: { kit: kit } }));
        return true;
    }

    function remove(id) {
        var before = load();
        var after = before.filter(function (item) { return item.id !== id; });
        if (after.length === before.length) return false;
        persist(after);
        renderList();
        return true;
    }

    function importKits(payload) {
        var incoming = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!Array.isArray(incoming)) throw new TypeError('Brand kit payload must be an array');
        var valid = incoming.filter(function (item) {
            return item && typeof item.name === 'string' && item.name.trim();
        }).map(function (item) {
            return {
                id: item.id || 'brand-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                name: item.name.trim(),
                primary: item.primary || '#4da6ff',
                secondary: item.secondary || '#7c3aed',
                text: item.text || '#ffffff',
                font: item.font || '',
                logo: item.logo || '',
                updatedAt: item.updatedAt || new Date().toISOString()
            };
        });
        var merged = valid.concat(load().filter(function (existing) {
            return !valid.some(function (item) { return item.id === existing.id; });
        }));
        persist(merged);
        renderList();
        return valid.length;
    }

    function exportKits() {
        return JSON.stringify(load(), null, 2);
    }

    function downloadExport() {
        var blob = new global.Blob([exportKits()], { type: 'application/json' });
        var url = global.URL.createObjectURL(blob);
        var anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'mcprime-brand-kits.json';
        anchor.click();
        global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 0);
    }

    function card(kit) {
        return '<article class="ebk-card" data-brand-id="' + kit.id + '">' +
            '<div class="ebk-card-head"><div class="ebk-logo">' + (kit.logo ? '<img src="' + kit.logo + '" alt="">' : '<i class="fas fa-palette"></i>') + '</div><div><strong>' + kit.name + '</strong><span>' + (kit.font || t('خط البطاقة الحالي', 'Current card font')) + '</span></div></div>' +
            '<div class="ebk-swatches"><span style="--swatch:' + kit.primary + '"></span><span style="--swatch:' + kit.secondary + '"></span><span style="--swatch:' + kit.text + '"></span></div>' +
            '<div class="ebk-actions"><button type="button" data-brand-action="apply">' + t('تطبيق', 'Apply') + '</button><button type="button" data-brand-action="delete" aria-label="' + t('حذف الهوية', 'Delete brand') + '"><i class="fas fa-trash"></i></button></div>' +
        '</article>';
    }

    function renderList() {
        if (!panel) return;
        var list = panel.querySelector('#ebk-list');
        var kits = load();
        list.innerHTML = kits.length ? kits.map(card).join('') : '<div class="ebk-empty"><i class="fas fa-swatchbook"></i><span>' + t('احفظ الهوية الحالية لتستخدمها في بطاقات أخرى.', 'Save the current identity to reuse it on other cards.') + '</span></div>';
    }

    function build() {
        if (panel) return panel;
        var host = document.getElementById('tb-settings-panel') || document.getElementById('panel-design') || document.querySelector('.pro-layout');
        if (!host) return null;

        panel = document.createElement('section');
        panel.id = 'editor-brand-kit';
        panel.className = 'editor-brand-kit ed-panel';
        panel.innerHTML = '<div class="ebk-header"><div><span>' + t('الهوية البصرية', 'Brand identity') + '</span><h3>' + t('Brand Kit', 'Brand Kit') + '</h3></div><i class="fas fa-swatchbook"></i></div>' +
            '<label class="ebk-name"><span>' + t('اسم الهوية', 'Brand name') + '</span><input id="ebk-name" type="text" placeholder="' + t('مثال: MC PRIME', 'Example: MC PRIME') + '"></label>' +
            '<button type="button" id="ebk-save" class="ed-button ed-button-primary"><i class="fas fa-plus"></i><span>' + t('حفظ الهوية الحالية', 'Save current brand') + '</span></button>' +
            '<div id="ebk-list" class="ebk-list"></div>' +
            '<div class="ebk-transfer"><button type="button" id="ebk-export" class="ed-button"><i class="fas fa-download"></i>' + t('تصدير', 'Export') + '</button><label class="ed-button"><i class="fas fa-upload"></i>' + t('استيراد', 'Import') + '<input id="ebk-import" type="file" accept="application/json" hidden></label></div>';
        host.appendChild(panel);

        panel.querySelector('#ebk-save').addEventListener('click', function () {
            var input = panel.querySelector('#ebk-name');
            save(input.value);
            input.value = '';
        });
        panel.querySelector('#ebk-export').addEventListener('click', downloadExport);
        panel.querySelector('#ebk-import').addEventListener('change', function (event) {
            var file = event.target.files && event.target.files[0];
            if (!file) return;
            var reader = new global.FileReader();
            reader.onload = function () {
                try { importKits(String(reader.result || '[]')); } catch (error) { console.error('[EditorBrandKit] Import failed', error); }
            };
            reader.readAsText(file);
        });
        panel.addEventListener('click', function (event) {
            var action = event.target.closest('[data-brand-action]');
            if (!action) return;
            var item = action.closest('[data-brand-id]');
            if (!item) return;
            if (action.dataset.brandAction === 'apply') apply(item.dataset.brandId);
            if (action.dataset.brandAction === 'delete') remove(item.dataset.brandId);
        });

        injectStyles();
        renderList();
        return panel;
    }

    function injectStyles() {
        if (document.getElementById('editor-brand-kit-css')) return;
        var style = document.createElement('style');
        style.id = 'editor-brand-kit-css';
        style.textContent = '.editor-brand-kit{margin-top:14px;padding:14px}.ebk-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.ebk-header span{font-size:.68rem;color:var(--ed-color-text-muted,var(--text-secondary))}.ebk-header h3{margin:3px 0 0;font-size:.95rem}.ebk-header>i{color:var(--ed-color-primary,#4da6ff)}.ebk-name{display:grid;gap:6px;font-size:.72rem;color:var(--ed-color-text-muted,var(--text-secondary));margin-bottom:9px}.ebk-name input{width:100%;box-sizing:border-box}.ebk-list{display:grid;gap:9px;margin:12px 0}.ebk-card{border:1px solid var(--ed-color-border,rgba(255,255,255,.1));border-radius:var(--ed-radius-md,12px);padding:10px;background:var(--ed-color-surface-soft,rgba(255,255,255,.035))}.ebk-card-head{display:flex;align-items:center;gap:9px}.ebk-card-head strong,.ebk-card-head span{display:block}.ebk-card-head span{font-size:.65rem;color:var(--ed-color-text-muted,var(--text-secondary));margin-top:2px}.ebk-logo{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;overflow:hidden;background:rgba(255,255,255,.06);color:var(--ed-color-primary,#4da6ff)}.ebk-logo img{width:100%;height:100%;object-fit:contain}.ebk-swatches{display:flex;gap:5px;margin:10px 0}.ebk-swatches span{width:22px;height:22px;border-radius:7px;background:var(--swatch);border:1px solid rgba(255,255,255,.22)}.ebk-actions{display:grid;grid-template-columns:1fr auto;gap:7px}.ebk-actions button{border:1px solid var(--ed-color-border,rgba(255,255,255,.1));border-radius:8px;background:transparent;color:inherit;padding:7px;cursor:pointer;font-family:inherit}.ebk-actions button:first-child{background:rgba(77,166,255,.1);color:var(--ed-color-primary,#4da6ff)}.ebk-empty{display:grid;place-items:center;text-align:center;gap:8px;padding:18px;color:var(--ed-color-text-muted,var(--text-secondary));font-size:.72rem;border:1px dashed var(--ed-color-border,rgba(255,255,255,.1));border-radius:12px}.ebk-empty i{font-size:1.3rem}.ebk-transfer{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ebk-transfer .ed-button{justify-content:center}';
        document.head.appendChild(style);
    }

    function init() {
        if (!build()) global.setTimeout(init, 300);
    }

    global.EditorBrandKit = {
        capture: capture,
        save: save,
        apply: apply,
        remove: remove,
        list: load,
        export: exportKits,
        import: importKits,
        open: build
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
}(typeof window !== 'undefined' ? window : globalThis));
