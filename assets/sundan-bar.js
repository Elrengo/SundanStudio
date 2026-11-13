/*!
 * Sundan Studio: barra flotante compartida (volver al inicio + contacto).
 * Vanilla JS, sin dependencias, ES5. Idempotente: si ya existe #ss-bar no hace nada.
 *
 * Atributos opcionales en la etiqueta <script> que la carga:
 *   data-pos="bl|br|tl|tr"  esquina (por defecto "bl")
 *   data-compact="1"        empieza en modo compacto (solo iconos)
 *   data-base="/"           base absoluta para las rutas (por defecto "" = relativas)
 *   data-pos-narrow="tl"    esquina por debajo de 600px de ancho (opcional)
 *   data-z="2147483000"     z-index (bajarlo para quedar debajo de los diálogos de la página)
 *   data-autohide="1"       se oculta al bajar con el scroll (desactivado por defecto: siempre visible)
 *   data-hide-hash="#admin" oculta la barra mientras la URL tenga ese hash
 *   data-hash-pos="#admin:tr" con ese hash la barra pasa a otra esquina
 *   data-below=".cabecera"  arriba, se coloca justo debajo de ese elemento fijo
 *   data-raise="#login" data-raise-z="210" sube de capa mientras ese elemento esté visible
 *   data-avoid=".tour"      si ese elemento aparece en su esquina inferior, la barra se coloca encima
 */
(function () {
  'use strict';

  if (document.getElementById('ss-bar')) { return; }

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) {
      if ((all[i].getAttribute('src') || '').indexOf('sundan-bar.js') !== -1) { script = all[i]; break; }
    }
  }

  function attr(name, def) {
    var v = script ? script.getAttribute(name) : null;
    return (v === null || v === '') ? def : v;
  }

  var pos = attr('data-pos', 'bl');
  if (['bl', 'br', 'tl', 'tr'].indexOf(pos) === -1) { pos = 'bl'; }
  var compact = attr('data-compact', '0') === '1';
  var autohide = attr('data-autohide', '0') === '1';   // off by default: the bar must always stay visible
  var z = String(parseInt(attr('data-z', '2147483000'), 10) || 2147483000);

  var base = attr('data-base', '');
  var homeHref = 'index.html';
  if (base) {
    homeHref = base.charAt(base.length - 1) === '/' ? base : base + '/';
  }
  var contactHref = homeHref + '#contacto';

  /* ---------- estilos (todos bajo #ss-bar) ---------- */
  var css = [
    '#ss-bar{position:fixed;z-index:' + z + ';display:flex;align-items:center;gap:4px;box-sizing:border-box;padding:4px;',
    '  max-width:calc(100vw - 32px);background:rgba(20,6,15,.92);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);',
    '  border:1px solid #e9b42f;border-radius:999px;box-shadow:0 6px 24px rgba(0,0,0,.35);',
    '  font-family:"Instrument Sans",system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;line-height:1;',
    '  transition:transform .25s ease,opacity .25s ease;pointer-events:auto}',
    '#ss-bar.ss-bar--bl{bottom:16px;left:16px;bottom:calc(16px + env(safe-area-inset-bottom));left:calc(16px + env(safe-area-inset-left))}',
    '#ss-bar.ss-bar--br{bottom:16px;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));right:calc(16px + env(safe-area-inset-right))}',
    '#ss-bar.ss-bar--tl{top:16px;left:16px;top:calc(16px + env(safe-area-inset-top));left:calc(16px + env(safe-area-inset-left))}',
    '#ss-bar.ss-bar--tr{top:16px;right:16px;top:calc(16px + env(safe-area-inset-top));right:calc(16px + env(safe-area-inset-right))}',
    '#ss-bar.ss-bar--off{display:none}',
    '#ss-bar.ss-bar--hidden{opacity:0;pointer-events:none}',
    '#ss-bar.ss-bar--hidden.ss-bar--bl,#ss-bar.ss-bar--hidden.ss-bar--br{transform:translateY(calc(100% + 32px))}',
    '#ss-bar.ss-bar--hidden.ss-bar--tl,#ss-bar.ss-bar--hidden.ss-bar--tr{transform:translateY(calc(-100% - 32px))}',
    '#ss-bar a{display:inline-flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;min-height:40px;',
    '  padding:0 14px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;line-height:1;white-space:nowrap;',
    '  -webkit-tap-highlight-color:transparent}',
    '#ss-bar a:focus{outline:none}',
    '#ss-bar a:focus-visible{outline:3px solid #efe3c8;outline-offset:2px}',
    '#ss-bar .ss-bar-home{color:#efe3c8;background:transparent}',
    '#ss-bar .ss-bar-home:hover{background:rgba(233,180,47,.14)}',
    '#ss-bar .ss-bar-brand{font-family:Gloock,Georgia,serif;font-weight:400;font-size:15px;letter-spacing:.01em}',
    '#ss-bar .ss-bar-mark{width:18px;height:18px;flex:none;display:block}',
    '#ss-bar .ss-bar-contact{color:#14060f;background:#e9b42f}',
    '#ss-bar .ss-bar-contact:hover{background:#f2c95a}',
    '#ss-bar .ss-bar-ico{display:none;width:18px;height:18px;flex:none}',
    /* compacto: solo iconos (en pantallas < 600px siempre) */
    '#ss-bar.ss-bar--compact .ss-bar-txt{display:none}',
    '#ss-bar.ss-bar--compact .ss-bar-ico{display:block}',
    '#ss-bar.ss-bar--compact a{width:40px;padding:0}',
    '@media (max-width:599px){',
    '  #ss-bar .ss-bar-txt{display:none}',
    '  #ss-bar .ss-bar-ico{display:block}',
    '  #ss-bar a{width:40px;padding:0}',
    '}',
    '@media (pointer:coarse){#ss-bar a{min-height:44px}}',
    '@media (max-width:599px) and (pointer:coarse){#ss-bar a{width:44px}}',
    '@media (prefers-reduced-motion:reduce){#ss-bar{transition:none}}',
    '@media print{#ss-bar{display:none !important}}'
  ].join('\n');

  var style = document.createElement('style');
  style.id = 'ss-bar-style';
  style.setAttribute('type', 'text/css');
  if (style.styleSheet) { style.styleSheet.cssText = css; } else { style.appendChild(document.createTextNode(css)); }
  (document.head || document.getElementsByTagName('head')[0] || document.body).appendChild(style);

  /* ---------- marcado ---------- */
  var bar = document.createElement('nav');
  bar.id = 'ss-bar';
  bar.setAttribute('aria-label', 'Sundan Studio');
  /* data-pos-narrow: esquina alternativa por debajo de 600px (opcional) */
  var narrowPos = attr('data-pos-narrow', '');
  if (['bl', 'br', 'tl', 'tr'].indexOf(narrowPos) === -1) { narrowPos = ''; }
  var narrowMQ = (narrowPos && window.matchMedia) ? window.matchMedia('(max-width:599px)') : null;
  /* data-hide-hash="#admin": la barra no se muestra en esa vista (panel interno con su propio menú) */
  var hideHash = attr('data-hide-hash', '');
  /* data-hash-pos="#admin:tr": en esa vista la barra cambia de esquina (en vez de ocultarse) */
  var hashPos = attr('data-hash-pos', '').split(':');
  var hashPosHash = hashPos[0] || '', hashPosCorner = ['bl', 'br', 'tl', 'tr'].indexOf(hashPos[1]) !== -1 ? hashPos[1] : '';
  /* data-below=".header": si la barra va arriba, se coloca justo debajo de ese elemento fijo/pegajoso */
  var belowSel = attr('data-below', '');
  var isHidden = false;
  var placeBelow = function (p) {
    bar.style.top = '';
    if (!belowSel || p.charAt(0) !== 't') { return; }
    var el = document.querySelector(belowSel);
    if (!el) { return; }
    var r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.height > 0) { bar.style.top = Math.round(r.bottom + 8) + 'px'; }
  };
  var applyClass = function () {
    var p = (narrowMQ && narrowMQ.matches) ? narrowPos : pos;
    if (hashPosCorner && window.location.hash === hashPosHash) { p = hashPosCorner; }
    var off = !!hideHash && window.location.hash === hideHash;
    bar.className = 'ss-bar--' + p + (compact ? ' ss-bar--compact' : '') + (isHidden ? ' ss-bar--hidden' : '') + (off ? ' ss-bar--off' : '');
    bar.setAttribute('data-pos', p);
    placeBelow(p);
  };
  applyClass();
  if (narrowMQ && narrowMQ.addListener) { narrowMQ.addListener(applyClass); }
  if (hideHash || hashPosHash) { window.addEventListener('hashchange', applyClass, false); }
  if (belowSel) {
    window.addEventListener('resize', applyClass, false);
    window.addEventListener('scroll', function () { placeBelow(bar.getAttribute('data-pos') || pos); }, { passive: true });
  }

  bar.innerHTML =
    '<a class="ss-bar-home" href="' + homeHref + '" aria-label="Volver a Sundan Studio">' +
      '<svg class="ss-bar-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M3 19 12 5l9 14z" fill="none" stroke="#e9b42f" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="13.5" r="2.3" fill="#e9b42f"/>' +
      '</svg>' +
      '<span class="ss-bar-txt ss-bar-brand">Sundan Studio</span>' +
    '</a>' +
    '<a class="ss-bar-contact" href="' + contactHref + '" aria-label="Ir a contacto en Sundan Studio">' +
      '<svg class="ss-bar-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '</svg>' +
      '<span class="ss-bar-txt">Contacto</span>' +
    '</a>';

  /* ---------- no bloquear la página: el bar no pasa eventos a juegos ni a la página ---------- */
  function stop(e) { e.stopPropagation(); }
  bar.addEventListener('pointerdown', stop, false);
  bar.addEventListener('touchstart', stop, false);
  bar.addEventListener('keydown', stop, false);
  bar.addEventListener('keyup', stop, false);

  document.body.appendChild(bar);

  /* data-raise="#login" data-raise-z="210": mientras ese elemento (p. ej. una pantalla de acceso a
     pantalla completa) esté visible, la barra sube de capa para no quedar tapada; al cerrarse vuelve */
  function isShown(el) {
    if (!el || el.hidden) { return false; }
    var cs = window.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05 && el.getClientRects().length > 0;
  }
  function anyShown(sel) {
    var list = document.querySelectorAll(sel);
    for (var k = 0; k < list.length; k++) { if (isShown(list[k])) { return list[k]; } }
    return null;
  }
  var raiseSel = attr('data-raise', '');
  var raiseZ = String(parseInt(attr('data-raise-z', '2147483000'), 10) || 2147483000);
  /* data-avoid=".tour, .toast": if one of these is visible where the bar sits (bottom corners),
     the bar moves up just above it so it is never covered; when it goes away the bar returns */
  var avoidSel = attr('data-avoid', '');
  var checkLayers = function () {
    if (raiseSel) { bar.style.zIndex = anyShown(raiseSel) ? raiseZ : ''; }
    if (avoidSel) {
      var p = bar.getAttribute('data-pos') || pos;
      if (p.charAt(0) !== 'b') { bar.style.bottom = ''; return; }
      bar.style.bottom = '';
      var br = bar.getBoundingClientRect(), lift = 0;
      var list = document.querySelectorAll(avoidSel);
      for (var k = 0; k < list.length; k++) {
        var el = list[k];
        if (!isShown(el) || bar.contains(el)) { continue; }
        var r = el.getBoundingClientRect();
        var overlapX = r.left < br.right && r.right > br.left;
        var nearBottom = r.bottom > window.innerHeight - 4 - br.height - 40;
        if (overlapX && nearBottom) { lift = Math.max(lift, window.innerHeight - r.top + 12); }
      }
      if (lift) { bar.style.bottom = Math.round(lift) + 'px'; }
    }
  };
  if (raiseSel || avoidSel) {
    checkLayers();
    setInterval(checkLayers, 400);
    window.addEventListener('resize', checkLayers, false);
  }

  /* ---------- ocultarse al bajar con el scroll, reaparecer al subir ---------- */
  if (autohide) {
    var lastY = window.pageYOffset || 0;
    var ticking = false;
    var setHidden = function (on) {
      if (on === isHidden) { return; }
      /* no ocultar si el foco está dentro de la barra */
      if (on && bar.contains(document.activeElement)) { return; }
      isHidden = on;
      applyClass();
    };

    var update = function () {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var dy = y - lastY;
      if (Math.abs(dy) < 6) { return; }
      setHidden(dy > 0 && y > 160);
      if (dy < 0) { setHidden(false); }
      lastY = y;
    };

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        if (window.requestAnimationFrame) { window.requestAnimationFrame(update); } else { setTimeout(update, 16); }
      }
    }, { passive: true });
  }
})();
