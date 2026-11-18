/* Sundan FX (IIFE autocontenida). Mismo comportamiento que index.html:
   (a) mide la barra superior en --hdr; (b) un haz por cada [data-spot] ("l" | "r", o alterna);
   (c) papel picado en dos capas (trasera z -1 y delantera z 120), 6/22 en escritorio y 3/11 en movil;
   (d) guirnalda de Mumi en cada [data-garland], solo se anima en pantalla.
   Movimiento reducido: haces estaticos, sin papel picado y guirnalda estatica.
   Opcional: window.SundanFX expone init() y refresh(). */
(function () {
  'use strict';

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var NS = 'http://www.w3.org/2000/svg';
  var TAU = Math.PI * 2;
  var COLORS = ['#c1121f', '#e9b42f', '#efe3c8', '#1f9e8f'];

  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---- (a) altura de la barra superior en --hdr ---- */
  function measureTopbar() {
    var tb = document.querySelector('.topbar');
    var h = tb ? tb.offsetHeight : 0;
    if (h) document.documentElement.style.setProperty('--hdr', h + 'px');
  }

  /* ---- (b) haces de seccion ---- */
  var secs = [];
  function addSpots() {
    var els = document.querySelectorAll('[data-spot]');
    Array.prototype.forEach.call(els, function (sec, i) {
      if (sec.querySelector(':scope > .sec-spot-wrap')) return;
      var v = (sec.getAttribute('data-spot') || '').trim();
      var side = (v === 'l' || v === 'r') ? v : (i % 2 === 0 ? 'l' : 'r');
      sec.classList.add('has-spot');
      var wrap = document.createElement('span');
      wrap.className = 'sec-spot-wrap';
      wrap.setAttribute('aria-hidden', 'true');
      var stick = document.createElement('span');
      stick.className = 'sec-spot-stick';
      var beam = document.createElement('span');
      beam.className = 'sec-spot spot-' + side;
      beam.style.animationDuration = (10 + (i % 4) * 0.75).toFixed(2) + 's';
      beam.style.animationDelay = (-i * 1.7).toFixed(2) + 's';
      stick.appendChild(beam);
      wrap.appendChild(stick);
      sec.insertBefore(wrap, sec.firstChild);
      secs.push(sec);
    });
  }

  function spotHidden() {
    document.body.classList.toggle('spot-tab-hidden', document.hidden);
  }

  function spotActivate() {
    if (reduce || !secs.length) return;
    requestAnimationFrame(function () {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      secs.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) s.classList.add('spot-on');
      });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { e.target.classList.toggle('spot-on', e.isIntersecting); });
      }, { threshold: [0, 0.05] });
      secs.forEach(function (s) { io.observe(s); });
    } else {
      secs.forEach(function (s) { s.classList.add('spot-on'); });
    }
  }

  /* ---- (d) guirnalda de Mumi ---- */
  var GAR_H = 90, PADX = 6, SAG = 24, YP = 6;
  var gars = [];

  function buildGar(el, idx) {
    var W = Math.round(el.clientWidth);
    if (!W || W === el._w) return;
    el._w = W;
    el.innerHTML = '';
    var svg = mk('svg', { viewBox: '0 0 ' + W + ' ' + GAR_H, 'aria-hidden': 'true' }, el);
    var defs = mk('defs', {}, svg);
    var gid = 'sundanGlow' + idx;
    var rg = mk('radialGradient', { id: gid, cx: '50%', cy: '50%', r: '50%' }, defs);
    mk('stop', { offset: '0%', 'stop-color': '#ffd27a', 'stop-opacity': '.7' }, rg);
    mk('stop', { offset: '40%', 'stop-color': '#ffb347', 'stop-opacity': '.22' }, rg);
    mk('stop', { offset: '100%', 'stop-color': '#ffb347', 'stop-opacity': '0' }, rg);

    var n = Math.max(1, Math.round((W - 2 * PADX) / 360));
    var span = (W - 2 * PADX) / n;
    var ySag = function (u) { return YP + 4 * SAG * u * (1 - u); };
    var s, j, K, x0, x, y, u, slope, ang, g, gb, b = 0, p = 0;
    var curve = ' L' + PADX + ' ' + YP; /* misma curva que los cordones */

    for (s = 0; s < n; s++) {
      x0 = PADX + s * span;
      curve += ' Q' + (x0 + span / 2) + ' ' + (YP + 2 * SAG) + ' ' + (x0 + span) + ' ' + YP;
      mk('path', { d: 'M' + x0 + ' ' + YP + ' Q' + (x0 + span / 2) + ' ' + (YP + 2 * SAG) + ' ' + (x0 + span) + ' ' + YP,
                   fill: 'none', stroke: '#4a3320', 'stroke-width': 1.5 }, svg);
      K = Math.max(4, Math.round(span / 46));
      for (j = 1; j < K; j++) {
        u = j / K; x = x0 + u * span; y = ySag(u);
        slope = 4 * SAG * (1 - 2 * u) / span;
        ang = Math.atan(slope) * 180 / Math.PI;
        g = mk('g', { transform: 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + ang.toFixed(2) + ')' }, svg);
        mk('path', { d: 'M-10 0 L10 0 L0 26 Z', fill: (p % 2) ? '#1f9e8f' : '#c1121f',
                     stroke: '#14060f', 'stroke-width': .6, 'stroke-linejoin': 'round' }, g);
        p++;
      }
      for (j = 0; j < K; j++) {
        u = (j + 0.5) / K; x = x0 + u * span; y = ySag(u) + 4;
        if (b % 4 === 3) {
          mk('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 3, fill: '#6b4a25' }, svg);
        } else {
          gb = mk('g', { 'class': 'sep-garland-b',
                         style: 'animation-duration:' + (2.4 + (b * 0.37) % 1.4).toFixed(2) + 's;animation-delay:-' + ((b * 0.73) % 3).toFixed(2) + 's' }, svg);
          mk('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 9, fill: 'url(#' + gid + ')' }, gb);
          mk('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 3.4, fill: '#f5c35a', stroke: '#8a5a14', 'stroke-width': .5 }, gb);
        }
        b++;
      }
    }
    /* curva de la guirnalda (en coordenadas locales): region sobre ella y region bajo ella */
    curve += ' L' + W + ' ' + YP;
    el._w = W;
    el._upD = 'M0 0 L0 ' + YP + curve + ' L' + W + ' 0 Z';
    el._loD = 'M0 ' + YP + curve + ' L' + W + ' ' + GAR_H + ' L0 ' + GAR_H + ' Z';
    /* nudos dorados donde se unen dos tramos de guirnalda */
    for (s = 1; s < n; s++) {
      x = PADX + s * span;
      mk('circle', { cx: x.toFixed(2), cy: YP, r: 1.5, fill: '#e9b42f' }, svg);
    }
  }

  /* mascara de un .sec-spot-wrap: blanco = luz, negro = oculto en la zona indicada (path en coordenadas de la guirnalda) */
  function setSpotMask(wrap, wr, inner) {
    /* el negro de la mascara interna es transparencia: se usa un <mask> (luminancia) y no el alfa de la imagen */
    var w = Math.round(wr.width), h = Math.round(wr.height);
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h + "'>" +
      "<defs><mask id='gm' maskUnits='userSpaceOnUse' x='0' y='0' width='" + w + "' height='" + h + "'>" +
      "<rect width='" + w + "' height='" + h + "' fill='white'/>" + inner + "</mask></defs>" +
      "<rect width='" + w + "' height='" + h + "' fill='white' mask='url(#gm)'/></svg>";
    var url = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
    wrap.style.maskImage = wrap.style.webkitMaskImage = url;
    wrap.style.maskSize = wrap.style.webkitMaskSize = '100% 100%';
    wrap.style.maskRepeat = wrap.style.webkitMaskRepeat = 'no-repeat';
  }

  /* franja de la guirnalda: color de la seccion de arriba sobre la curva y el de la de abajo bajo ella.
     La capa va dentro de la seccion de arriba (z -1), por debajo de su haz de luz; los haces de ambas
     secciones se extienden hasta la franja y se enmascaran por la curva, asi ningun borde recto queda visible */
  function garSpots(el) {
    if (!el._upD) return;
    var up = el.previousElementSibling, lo = el.nextElementSibling;
    var gr = el.getBoundingClientRect();
    var W = Math.round(el.clientWidth);
    if (up && up.tagName === 'SECTION') {
      var ur = up.getBoundingClientRect();
      if (getComputedStyle(up).position === 'static') up.style.position = 'relative';
      var fill = el._fill;
      if (!fill) {
        fill = document.createElement('div');
        fill.className = 'sep-garland-fill';
        fill.setAttribute('aria-hidden', 'true');
        el._fill = fill;
      }
      if (fill.parentNode !== up) up.appendChild(fill);
      var upC = getComputedStyle(up).backgroundColor;
      var loC = (lo && lo.tagName === 'SECTION') ? getComputedStyle(lo).backgroundColor : 'transparent';
      fill.innerHTML = '';
      fill.style.left = (gr.left - ur.left) + 'px';
      fill.style.top = (gr.top - ur.top) + 'px';
      fill.style.width = W + 'px';
      var fsvg = mk('svg', { viewBox: '0 0 ' + W + ' ' + GAR_H, 'aria-hidden': 'true' }, fill);
      mk('path', { d: el._upD, fill: upC }, fsvg);
      mk('path', { d: el._loD, fill: loC }, fsvg);
      var wu = up.querySelector(':scope > .sec-spot-wrap');
      if (wu) {
        wu.style.bottom = (ur.bottom - gr.bottom) + 'px';   /* se extiende hasta el fondo de la guirnalda */
        var wur = wu.getBoundingClientRect();
        setSpotMask(wu, wur, "<path transform='translate(" + (gr.left - wur.left).toFixed(1) + " " + (gr.top - wur.top).toFixed(1) +
          ")' d='" + el._loD + "' fill='black'/>");
      }
    }
    if (lo && lo.tagName === 'SECTION') {
      var lr = lo.getBoundingClientRect();
      var wl = lo.querySelector(':scope > .sec-spot-wrap');
      if (wl) {
        wl.style.top = (gr.top - lr.top) + 'px';   /* se extiende hasta el inicio de la guirnalda */
        var wlr = wl.getBoundingClientRect();
        setSpotMask(wl, wlr, "<path transform='translate(" + (gr.left - wlr.left).toFixed(1) + " " + (gr.top - wlr.top).toFixed(1) +
          ")' d='" + el._upD + "' fill='black'/>");
      }
    }
  }
  function garSpotsAll() { gars.forEach(garSpots); }

  function watchPause(el) {
    if (reduce || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) {
      el.classList.toggle('sep-paused', !en[0].isIntersecting);
    }).observe(el);
  }

  function buildGars() {
    gars.forEach(function (el, i) { buildGar(el, i); });
  }

  function initGars() {
    var els = document.querySelectorAll('[data-garland]');
    Array.prototype.forEach.call(els, function (el) {
      el.classList.add('sep-garland');
      el.setAttribute('aria-hidden', 'true');
      gars.push(el);
    });
    buildGars();
    garSpotsAll();
    gars.forEach(watchPause);
    /* las secciones vecinas pueden cambiar de altura (imagenes, fuentes, acordeones) */
    window.addEventListener('load', garSpotsAll);
    if ('ResizeObserver' in window) {
      var gro = new ResizeObserver(garSpotsAll);
      gars.forEach(function (el) {
        [el.previousElementSibling, el.nextElementSibling].forEach(function (s) {
          if (s && s.tagName === 'SECTION') gro.observe(s);
        });
      });
    }
  }

  /* ---- (c) papel picado en dos capas ---- */
  var LAYERS = [];
  var W = 0, H = 0, dpr = 1, T = 0, last = 0, rafId = 0, running = false, faded = false, fadeTimer = 0;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function target(L) { return W < 760 ? L.cfg.n[1] : L.cfg.n[0]; }

  function spawn(p, initial, cfg) {
    p.x0 = rnd(0, W);
    p.y = initial ? rnd(0, H) : -rnd(14, 60);
    p.vy = rnd(18, 40) * cfg.speed;
    p.amp = rnd(10, 30);
    p.om = TAU / rnd(3, 6);
    p.ph = rnd(0, TAU);
    p.w = rnd(5, 9) * cfg.size;
    p.h = rnd(8, 12) * cfg.size;
    p.rot = rnd(0, TAU);
    p.vr = rnd(0.15, 0.5) * (Math.random() < 0.5 ? -1 : 1);
    p.fl = rnd(0, TAU);
    p.vf = rnd(1.2, 2.6);
    p.a = rnd(0.55, 0.8) * cfg.alpha;
    p.c = COLORS[(Math.random() * COLORS.length) | 0];
    return p;
  }

  function drawLayer(L, dt) {
    var ctx = L.ctx, pieces = L.pieces;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.fl += p.vf * dt;
      if (p.y > H + 20) spawn(p, false, L.cfg);
      ctx.save();
      ctx.globalAlpha = p.a;
      ctx.translate(p.x0 + p.amp * Math.sin(p.om * T + p.ph), p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.cos(p.fl));
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
  }

  function frame(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    T += dt;
    for (var l = 0; l < LAYERS.length; l++) drawLayer(LAYERS[l], dt);
    rafId = requestAnimationFrame(frame);
  }

  function startConfetti() {
    if (running || faded || document.hidden || !LAYERS.length) return;
    running = true; last = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stopConfetti() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  function sizeConfetti() {
    var w = window.innerWidth, h = window.innerHeight;
    if (w === W && h === H) return;
    var ratio = W ? w / W : 1;
    W = w; H = h;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    LAYERS.forEach(function (L) {
      L.cv.width = Math.round(W * dpr);
      L.cv.height = Math.round(H * dpr);
      L.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      L.pieces.forEach(function (p) { p.x0 *= ratio; });
      var want = target(L);
      while (L.pieces.length < want) L.pieces.push(spawn({}, true, L.cfg));
      if (L.pieces.length > want) L.pieces.length = want;
    });
  }

  function makeLayer(cv, cfg) {
    return { cv: cv, ctx: cv.getContext('2d'), pieces: [], cfg: cfg };
  }

  function initConfetti() {
    if (reduce) return;
    var back = document.querySelector('.confetti-back');
    var front = document.querySelector('.confetti-layer');
    if (!back) {
      back = document.createElement('canvas');
      back.className = 'confetti-back';
      back.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(back, document.body.firstChild);
    }
    if (!front) {
      front = document.createElement('canvas');
      front.className = 'confetti-layer';
      front.setAttribute('aria-hidden', 'true');
      document.body.appendChild(front);
    }
    if (!back.getContext || !front.getContext) return;
    LAYERS.push(makeLayer(back, { n: [22, 11], size: 0.8, alpha: 0.7, speed: 0.75 }));
    LAYERS.push(makeLayer(front, { n: [6, 3], size: 1, alpha: 1, speed: 1 }));
    sizeConfetti();
    startConfetti();

    /* se desvanecen mientras #hero (si existe) ocupa mas de la mitad de la pantalla */
    var hero = document.getElementById('hero');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        setFaded(en[0].intersectionRatio > 0.5);
      }, { threshold: [0, 0.5, 1] }).observe(hero);
    }
  }

  function setFaded(f) {
    if (faded === f) return;
    faded = f;
    LAYERS.forEach(function (L) { L.cv.classList.toggle('is-off', f); });
    clearTimeout(fadeTimer);
    if (f) fadeTimer = setTimeout(stopConfetti, 820); else startConfetti();
  }

  /* ---- ciclo de vida ---- */
  function onVisibility() {
    spotHidden();
    if (document.hidden) stopConfetti(); else startConfetti();
  }

  var resizeTimer = 0;
  function refresh() {
    measureTopbar();
    buildGars();
    garSpotsAll();
    if (!reduce) sizeConfetti();
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refresh, 120);
  }

  var inited = false;
  function init() {
    if (inited) return;
    inited = true;
    measureTopbar();
    addSpots();
    spotHidden();
    initGars();
    spotActivate();
    initConfetti();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', onResize);
  }

  window.SundanFX = { init: init, refresh: refresh };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
