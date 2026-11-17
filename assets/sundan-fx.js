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

    for (s = 0; s < n; s++) {
      x0 = PADX + s * span;
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
    /* nudos dorados donde se unen dos tramos de guirnalda */
    for (s = 1; s < n; s++) {
      x = PADX + s * span;
      mk('circle', { cx: x.toFixed(2), cy: YP, r: 1.5, fill: '#e9b42f' }, svg);
    }
  }

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
    gars.forEach(watchPause);
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
