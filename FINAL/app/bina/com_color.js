/* BINA shared color palette v1.3.0
 * Contract: BinaColorPalette.open({anchor,type,value,getValue,onChange}), close(),
 * getName(), colors.text/background. HEX is retained as the public color format.
 * Styles: FINAL/css/com_color.css (loaded once).
 */
(function (global) {
  'use strict';
  if (global.BinaColorPalette) return;

  // Six color families × five shades. Keep ordering consistent between palettes.
  const PRESETS = Object.freeze({
    text: Object.freeze([
      // Amber / orange
      ['#D97706', 'Golden Amber'], ['#EA580C', 'Vivid Orange'],
      ['#C2410C', 'Burnt Orange'], ['#F97316', 'Sunset Orange'], ['#EAB308', 'Golden Yellow'],
      // Red / rose
      ['#E11D48', 'Vivid Rose'], ['#DB2777', 'Hot Pink'],
      ['#7F1D1D', 'Dark Garnet'], ['#BE123C', 'Ruby Red'], ['#DC2626', 'Vivid Red'],
      // Cyan / turquoise
      ['#0284C7', 'Sky Blue'], ['#0891B2', 'Vivid Cyan'],
      ['#0D9488', 'Turquoise'], ['#0E7490', 'Deep Cyan'], ['#06B6D4', 'Bright Aqua'],
      // Green / lime
      ['#059669', 'Emerald Green'], ['#16A34A', 'Fresh Green'],
      ['#65A30D', 'Lime Green'], ['#166534', 'Forest Green'], ['#84CC16', 'Bright Lime'],
      // Blue / indigo
      ['#1D4ED8', 'Electric Blue'], ['#2563EB', 'Vivid Blue'],
      ['#4338CA', 'Royal Indigo'], ['#3B82F6', 'Bright Blue'], ['#0F172A', 'Deep Navy'],
      // Violet / fuchsia
      ['#C026D3', 'Fuchsia'], ['#7C3AED', 'Electric Violet'],
      ['#6D28D9', 'Royal Purple'], ['#9333EA', 'Vivid Purple'], ['#4F46E5', 'Vivid Indigo']
    ]),
    background: Object.freeze([
      // Amber / orange
      ['#FEF3C7', 'Amber 100'], ['#FFEDD5', 'Orange 100'],
      ['#FFF7ED', 'Orange Mist'], ['#FED7AA', 'Apricot'], ['#FEF9C3', 'Soft Gold'],
      // Red / rose
      ['#FFE4E6', 'Rose 100'], ['#FCE7F3', 'Pink 100'],
      ['#FEF2F2', 'Red Mist'], ['#FECACA', 'Soft Red'], ['#FECDD3', 'Soft Rose'],
      // Cyan / turquoise / emerald
      ['#CFFAFE', 'Cyan 100'], ['#CCFBF1', 'Teal 100'],
      ['#D1FAE5', 'Emerald 100'], ['#ECFEFF', 'Cyan Mist'], ['#A5F3FC', 'Aqua'],
      // Green / lime
      ['#DCFCE7', 'Green 100'], ['#ECFCCB', 'Lime 100'],
      ['#F0FDF4', 'Green Mist'], ['#BBF7D0', 'Mint Green'], ['#D9F99D', 'Lime'],
      // Blue / indigo / cool slate
      ['#DBEAFE', 'Sky Blue 100'], ['#BFDBFE', 'Blue 200'],
      ['#E0E7FF', 'Indigo 100'], ['#E2E8F0', 'Slate 200'], ['#EFF6FF', 'Blue Mist'],
      // Violet / neutral (includes the original white)
      ['#FAE8FF', 'Fuchsia 100'], ['#EDE9FE', 'Violet 100'],
      ['#FFFFFF', 'Bright White'], ['#DDD6FE', 'Lavender'], ['#C7D2FE', 'Soft Indigo']
    ])
  });

  const TEXT_COLORS = Object.freeze(PRESETS.text.map(([hex]) => hex));
  const BACKGROUND_COLORS = Object.freeze(PRESETS.background.map(([hex]) => hex));
  const CSS_ID = 'bina-common-color-palette-styles';
  const script = document.currentScript || Array.from(document.scripts)
    .reverse().find(item => /(?:^|\/)com_color\.js(?:[?#]|$)/i.test(item.src));
  const cssUrl = new URL('../../css/com_color.css?v=1.3.0-folders', script?.src || document.baseURI).href;

  let popup = null;
  let removeListeners = null;

  const validColor = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
    ? value.toUpperCase() : null;

  function getName(value, type) {
    const hex = validColor(value);
    if (!hex) return null;
    const groups = type === 'text' || type === 'background'
      ? [PRESETS[type]] : [PRESETS.text, PRESETS.background];
    for (const group of groups) {
      const found = group.find(([color]) => color === hex);
      if (found) return found[1];
    }
    return null;
  }

  function ensureStyles() {
    const existing = document.getElementById(CSS_ID) ||
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .find(link => link.href.split('?')[0] === cssUrl.split('?')[0]);
    if (existing) return existing;
    const link = document.createElement('link');
    link.id = CSS_ID;
    link.rel = 'stylesheet';
    link.href = cssUrl;
    document.head.appendChild(link);
    return link;
  }

  function rgbLabel(value) {
    if (!value) return '—';
    return 'RGB(' + [1, 3, 5]
      .map(index => parseInt(value.slice(index, index + 2), 16)).join(', ') + ')';
  }

  function close() {
    if (removeListeners) {
      removeListeners();
      removeListeners = null;
    }
    if (popup) {
      popup.remove();
      popup = null;
    }
  }

  function positionPanel(panel, anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
    const below = rect.bottom + 6;
    const top = below + height <= window.innerHeight - 8
      ? below : Math.max(8, rect.top - height - 6);
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.visibility = '';
  }

  function open(options) {
    const opts = options || {};
    if (!opts.anchor || typeof opts.onChange !== 'function') {
      throw new TypeError('BinaColorPalette.open requires anchor and onChange');
    }

    const type = opts.type === 'background' ? 'background' : 'text';
    const presets = PRESETS[type];
    close();
    const stylesheet = ensureStyles();
    const readCurrent = () => {
      const live = typeof opts.getValue === 'function' ? validColor(opts.getValue()) : null;
      return live || validColor(opts.value);
    };
    let current = readCurrent();

    const panel = document.createElement('div');
    panel.className = 'bina-color-palette';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', type === 'text' ? 'انتخاب رنگ متن' : 'انتخاب رنگ زمینه');
    panel.tabIndex = -1;
    // Prevent an unstyled flash on the very first open (CSS may still be loading).
    panel.style.position = 'fixed';
    panel.style.visibility = 'hidden';
    panel.style.left = '-10000px';
    panel.style.top = '-10000px';

    const grid = document.createElement('div');
    grid.className = 'bina-color-palette-grid';
    for (const [hex, name] of presets) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'bina-color-palette-swatch' +
        (type === 'background' ? ' bina-pale-selected' : '');
      button.style.backgroundColor = hex;
      button.title = name;
      button.setAttribute('aria-label', name);
      button.setAttribute('aria-pressed', String(current === hex));
      button.addEventListener('click', () => {
        current = hex;
        opts.onChange(hex);
        close();
      });
      grid.appendChild(button);
    }
    panel.appendChild(grid);

    const controls = document.createElement('div');
    controls.className = 'bina-color-palette-actions';

    const eyedropper = document.createElement('button');
    eyedropper.type = 'button';
    eyedropper.className = 'bina-color-palette-eyedropper';
    eyedropper.title = 'قطره‌چکان: انتخاب رنگ از روی صفحه';
    eyedropper.setAttribute('aria-label', 'انتخاب رنگ از روی صفحه');
    eyedropper.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '+
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
      '<path d="m3 21 5.5-5.5m-3-3 6 6M12 8.5l3.5-3.5a3 3 0 0 1 4.2 4.2l-3.5 3.5-4.2-4.2z"/>'+
      '<path d="m9 12 5-5"/></svg>';
    controls.appendChild(eyedropper);

    const more = document.createElement('button');
    more.type = 'button';
    more.textContent = 'رنگ دلخواه…';
    more.title = 'باز کردن پالت کامل انتخاب رنگ';
    controls.appendChild(more);
    panel.appendChild(controls);

    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'bina-color-palette-custom-input';
    input.setAttribute('aria-label', 'رنگ دلخواه');
    const initialColor = current || (type === 'text' ? TEXT_COLORS[0] : BACKGROUND_COLORS[0]);
    input.value = initialColor;
    panel.appendChild(input);

    const value = document.createElement('div');
    value.className = 'bina-color-palette-current';
    value.textContent = rgbLabel(current);
    panel.appendChild(value);

    const syncNativeColor = () => {
      current = readCurrent() || current;
      const chosen = current || (type === 'text' ? TEXT_COLORS[0] : BACKGROUND_COLORS[0]);
      input.value = chosen;
      input.defaultValue = chosen;
      return chosen;
    };

    more.addEventListener('click', () => {
      syncNativeColor();
      input.click();
    });
    eyedropper.addEventListener('click', () => {
      if (typeof global.EyeDropper !== 'function') {
        syncNativeColor();
        input.click();
        return;
      }
      try {
        const selection = new global.EyeDropper().open();
        close();
        selection.then(result => {
          const selected = validColor(result && result.sRGBHex);
          if (selected) opts.onChange(selected);
        }).catch(error => {
          if (error && error.name !== 'AbortError') {
            console.warn('[BinaColorPalette] EyeDropper:', error);
          }
        });
      } catch (error) {
        console.warn('[BinaColorPalette] EyeDropper could not open:', error);
      }
    });
    input.addEventListener('input', () => {
      current = validColor(input.value) || current;
      if (current) {
        value.textContent = rgbLabel(current);
        opts.onChange(current);
      }
    });
    input.addEventListener('change', close);

    document.body.appendChild(panel);
    popup = panel;
    const display = () => {
      if (popup === panel) positionPanel(panel, opts.anchor);
    };
    if (stylesheet.tagName === 'STYLE' || stylesheet.sheet) {
      display();
    } else {
      stylesheet.addEventListener('load', display, {once: true});
      stylesheet.addEventListener('error', () => {
        if (popup === panel) close();
        console.warn('[BinaColorPalette] Could not load stylesheet:', cssUrl);
      }, {once: true});
    }

    const onOutside = event => {
      if (!panel.contains(event.target) && !opts.anchor.contains(event.target)) close();
    };
    const onKey = event => { if (event.key === 'Escape') close(); };
    const onMove = () => close();
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    removeListeners = () => {
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
    return panel;
  }

  global.BinaColorPalette = Object.freeze({
    version: '1.3.0',
    colors: Object.freeze({text: TEXT_COLORS, background: BACKGROUND_COLORS}),
    getName, open, close
  });

  // Preload early; opening is still synchronous and preserves the old API.
  ensureStyles();
})(window);
