/*!
 * Sundan Studio: métricas de lectura para Umami (sin cookies, sin datos personales).
 * Vanilla JS, sin dependencias, ES5. Idempotente: si ya está cargado no hace nada.
 *
 * Umami solo calcula la duración de la visita entre el primer y el último evento,
 * así que estos eventos sirven para medir cuánto se lee cada página.
 *
 * Eventos (cada uno se envía como mucho una vez por carga de página):
 *   scroll-25, scroll-50, scroll-75, scroll-90
 *       Al llegar a esa profundidad: (scrollY + altoVentana) / altoDocumento.
 *       En páginas más cortas que 1,3 veces la ventana no se envía nada al cargar.
 *   lectura-30s, lectura-2min, lectura-5min
 *       Tiempo de lectura visible: solo cuenta mientras la pestaña está visible.
 *   seccion  (datos extra: seccion = nombre de la sección)
 *       Sección (section[id] o [data-track-section]) con al menos el 40 % visible
 *       (o el 50 % de la ventana si es más alta) durante 1,5 s seguidos.
 *       Las secciones de menos de 120 px no cuentan.
 *
 * Datos enviados: siempre { pagina: location.pathname } más los campos de cada evento.
 *
 * Atributos opcionales en la etiqueta <script> que la carga:
 *   data-scroll="0"      desactiva los eventos scroll-*
 *   data-sections="0"    desactiva los eventos seccion
 *
 * Atributos opcionales en los elementos:
 *   data-track-section="nombre"  nombre de la sección (si no tiene id, o para cambiarlo)
 *   data-track-exclude           excluye esa sección del seguimiento
 *
 * Los eventos se envían con window.umami.track(nombre, datos). Si Umami todavía no
 * está cargado, se encolan y se envían en cuanto aparece (se comprueba cada 500 ms
 * durante 15 s; después se descartan en silencio).
 */
(function () {
  'use strict';

  if (window.__sdTrack) { return; }

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) {
      if ((all[i].getAttribute('src') || '').indexOf('sundan-track.js') !== -1) { script = all[i]; break; }
    }
  }

  function attr(name, def) {
    var v = script ? script.getAttribute(name) : null;
    return (v === null || v === '') ? def : v;
  }

  var scrollOn = attr('data-scroll', '1') !== '0';
  var sectionsOn = attr('data-sections', '1') !== '0';

  var PAGE = location.pathname;
  var sent = {};          // claves ya enviadas, para no repetir nunca un evento
  var queue = [];         // llamadas pendientes mientras umami no está listo
  var pollTimer = null;
  var pollStart = 0;

  function umamiReady() {
    return !!(window.umami && typeof window.umami.track === 'function');
  }

  function drain() {
    while (queue.length) {
      var item = queue.shift();
      try { window.umami.track(item[0], item[1]); } catch (e) { /* se ignora */ }
    }
  }

  // Envía la cola si umami existe; si no, la revisa cada 500 ms durante 15 s
  function flush() {
    try {
      if (!queue.length) { return; }
      if (umamiReady()) { drain(); return; }
      if (pollTimer) { return; }
      pollStart = Date.now();
      pollTimer = setInterval(function () {
        try {
          if (umamiReady()) {
            clearInterval(pollTimer); pollTimer = null; drain();
          } else if (Date.now() - pollStart >= 15000) {
            clearInterval(pollTimer); pollTimer = null; queue.length = 0;
          }
        } catch (e) { /* silencioso */ }
      }, 500);
    } catch (e) { /* silencioso */ }
  }

  // key: clave de deduplicado; name: nombre del evento; extra: campos adicionales
  function send(key, name, extra) {
    try {
      if (sent[key]) { return; }
      sent[key] = true;
      var data = { pagina: PAGE };
      if (extra) {
        for (var k in extra) {
          if (Object.prototype.hasOwnProperty.call(extra, k)) { data[k] = extra[k]; }
        }
      }
      queue.push([name, data]);
      flush();
    } catch (e) { /* silencioso */ }
  }

  /* ---------- profundidad de scroll ---------- */
  var SCROLL_STEPS = [25, 50, 75, 90];

  function scrollInfo() {
    var doc = document.documentElement;
    var h = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    var vh = window.innerHeight || doc.clientHeight || 0;
    var y = window.pageYOffset || doc.scrollTop || 0;
    return { pct: h > 0 ? ((y + vh) / h) * 100 : 0, isShort: h < vh * 1.3 };
  }

  function checkScroll(onLoad) {
    try {
      var s = scrollInfo();
      if (onLoad && s.isShort) { return; }   // páginas cortas: no fingir un 100 % al cargar
      for (var i = 0; i < SCROLL_STEPS.length; i++) {
        if (s.pct >= SCROLL_STEPS[i]) { send('scroll-' + SCROLL_STEPS[i], 'scroll-' + SCROLL_STEPS[i]); }
      }
      if (sent['scroll-90']) { window.removeEventListener('scroll', onScroll); }
    } catch (e) { /* silencioso */ }
  }

  var ticking = false;
  var raf = window.requestAnimationFrame
    ? function (f) { window.requestAnimationFrame(f); }
    : function (f) { setTimeout(f, 16); };

  function onScroll() {
    if (ticking) { return; }
    ticking = true;
    raf(function () { ticking = false; checkScroll(false); });
  }

  /* ---------- tiempo de lectura visible ---------- */
  var READ_STEPS = [
    { ms: 30000, name: 'lectura-30s' },
    { ms: 120000, name: 'lectura-2min' },
    { ms: 300000, name: 'lectura-5min' }
  ];
  var visibleMs = 0;        // tiempo visible acumulado (ms) de las etapas ya cerradas
  var visibleSince = null;  // instante en que empezó el tramo visible actual, o null

  function nowVisibleMs() {
    return visibleMs + (visibleSince !== null ? Date.now() - visibleSince : 0);
  }

  function pauseClock() {
    if (visibleSince !== null) {
      visibleMs += Date.now() - visibleSince;
      visibleSince = null;
    }
  }

  function resumeClock() {
    if (visibleSince === null && document.visibilityState === 'visible') {
      visibleSince = Date.now();
    }
  }

  var clockTimer = null;

  function checkReadSteps() {
    try {
      var t = nowVisibleMs();
      var pending = 0;
      for (var i = 0; i < READ_STEPS.length; i++) {
        if (!sent[READ_STEPS[i].name]) {
          pending++;
          if (t >= READ_STEPS[i].ms) { send(READ_STEPS[i].name, READ_STEPS[i].name); }
        }
      }
      if (!pending && clockTimer) { clearInterval(clockTimer); clockTimer = null; }
    } catch (e) { /* silencioso */ }
  }

  /* ---------- secciones vistas ---------- */
  var SECTION_MIN_PX = 120;
  var SECTION_HOLD_MS = 1500;

  function initSections() {
    if (!('IntersectionObserver' in window)) { return; }

    var nodes = document.querySelectorAll('section[id], [data-track-section]');
    var targets = [];
    var states = [];

    var io = new IntersectionObserver(function (entries) {
      try {
        var vh = window.innerHeight || document.documentElement.clientHeight || 0;
        for (var j = 0; j < entries.length; j++) {
          var entry = entries[j];
          var idx = targets.indexOf(entry.target);
          if (idx === -1) { continue; }
          var st = states[idx];
          if (sent['seccion:' + st.name]) { continue; }

          var h = entry.boundingClientRect.height;
          var need = Math.min(0.4 * h, 0.5 * vh);   // 40 % de la sección, o 50 % de la ventana si es alta
          var ok = h >= SECTION_MIN_PX && entry.isIntersecting && entry.intersectionRect.height >= need;

          if (ok && !st.ok) {
            st.ok = true;
            st.timer = setTimeout(function (s) {
              return function () {
                s.timer = null;
                if (s.ok && document.visibilityState === 'visible') {
                  send('seccion:' + s.name, 'seccion', { seccion: s.name });
                  io.unobserve(s.el);
                }
              };
            }(st), SECTION_HOLD_MS);
          } else if (!ok && st.ok) {
            st.ok = false;
            if (st.timer) { clearTimeout(st.timer); st.timer = null; }
          }
        }
      } catch (e) { /* silencioso */ }
    }, { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1] });

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.hasAttribute('data-track-exclude')) { continue; }
      var name = el.getAttribute('data-track-section') || el.id;
      if (!name) { continue; }
      targets.push(el);
      states.push({ name: name, el: el, ok: false, timer: null });
      io.observe(el);
    }
  }

  /* ---------- arranque ---------- */
  try {
    window.__sdTrack = {
      get visibleMs() { return Math.round(nowVisibleMs()); }
    };

    resumeClock();
    clockTimer = setInterval(checkReadSteps, 1000);

    document.addEventListener('visibilitychange', function () {
      try {
        if (document.visibilityState === 'visible') { resumeClock(); } else { pauseClock(); }
      } catch (e) { /* silencioso */ }
    });

    if (scrollOn) {
      window.addEventListener('scroll', onScroll, { passive: true });
      if (document.readyState === 'complete') {
        checkScroll(true);
      } else {
        window.addEventListener('load', function () { checkScroll(true); });
      }
    }

    if (sectionsOn) { initSections(); }
  } catch (e) { /* silencioso */ }
})();
