/* 3D solar system — the Sun spins on its axis, planets revolve around it and
   spin on theirs, and the whole system is carried around the galactic centre.
   Real texture maps (Solar System Scope, CC-BY 4.0). No orbit lines. */
(function(){
  if (typeof THREE === 'undefined') return;
  var canvas = document.getElementById('scene');
  if (!canvas) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DEBUG  = /[?&]debug=1/.test(location.search); // ?debug=1 → on-screen readout

  // ---- tunables -------------------------------------------------------
  // Sun rotation. Physically it turns once per ~27 Earth days, which against
  // Earth's 0.55 rad/s here would be 0.020 — about 5 minutes per turn, too slow
  // to read on a hero. 0.060 (~105 s/turn) keeps the granulation visibly drifting.
  var SUN_SPIN = 0.048;                 // ~131 s per turn
  // One trip around the galaxy. Strictly it should be the longest cycle in the
  // scene — slower than Neptune's 0.021 — but at that rate a full swing takes
  // 8+ minutes and nobody sees it. 0.045 (~2.3 min) trades that ordering for
  // motion you can actually read while looking at the hero.
  var GALACTIC_SPIN = 0.045;
  // Inclination of the ecliptic to the galactic plane. This is what makes the
  // galactic rotation visible at all: with no tilt, spinning about the galactic
  // pole is indistinguishable from every planet orbiting slightly faster. Bigger
  // tilt = bigger swing in the disc's apparent inclination. True value is 60.2°,
  // which carries the disc through edge-on and over to the far side.
  var ECLIPTIC_TILT = 32 * Math.PI / 180;
  // Starting phase matters more than speed here. The disc's apparent opening
  // angle follows a cosine of galaxy.rotation.y, so near the extremes it barely
  // changes: starting at 0 meant 35° of rotation moved the disc only ~1.5° and
  // read as "not moving at all". 300° drops us just before the steepest part of
  // the curve, where the opening angle swings at ~1.4°/s straight away.
  var GALACTIC_PHASE = 300 * Math.PI / 180;
  // The Sun sits exactly on the galactic axis, so galaxy.rotation.y can never
  // translate it — it only precesses the ecliptic, and with no orbit lines drawn
  // there is nothing on screen to read that against. Travel has to be shown the
  // way it actually looks from inside a moving frame: the star field sweeps past.
  var STARFIELD_DRIFT = 0.015;          // ~0.86°/s — a star crosses the 24° frame in ~28 s
  var SUN_AXIAL_TILT = 7.25 * Math.PI / 180;  // Sun's tilt to the ecliptic
  // ---------------------------------------------------------------------

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene  = new THREE.Scene();
  // 24° lens, was 42°. A sphere sitting θ off the optical axis projects to an
  // ellipse stretched by 1/cos(θ). The old framing put the Sun 20.5° off-axis
  // → 1/cos(20.5°) = 1.067, a 7% horizontal stretch — visible on the Sun because
  // it is the largest sphere on screen. Narrowing the lens and pulling the camera
  // back by the matching factor (tan21°/tan12° = 1.81) preserves both the framing
  // and the on-screen size while cutting θ to ~12° → 1.023, i.e. 2%.
  var camera = new THREE.PerspectiveCamera(24, 1, 0.1, 2000);

  scene.add(new THREE.AmbientLight(0xffffff, 0.34));
  var sunLight = new THREE.PointLight(0xfff0d4, 2.5, 0, 2);
  scene.add(sunLight); // at origin — stays there however the system is oriented

  // ---- frames ----
  // galaxy : spins about the galactic pole, carrying everything with it
  //   system : the ecliptic, tilted against the galactic plane
  //     sunTilt : the Sun's own 7.25° tilt against the ecliptic
  var galaxy = new THREE.Group();
  galaxy.rotation.y = GALACTIC_PHASE;
  scene.add(galaxy);
  var system = new THREE.Group();
  system.rotation.x = ECLIPTIC_TILT;
  galaxy.add(system);

  // ---- star field: fixed in galactic space, so it streams past as we travel ----
  // Three uniform-colour layers rather than per-vertex colours, which changed
  // meaning across three.js revisions; this works on any of them.
  var starfield = new THREE.Group();
  scene.add(starfield);
  var STAR_TOTAL = 0, starPts = [];   // starPts is only filled when DEBUG — 7.6k
                                      // Vector3s are pure waste for real visitors
  (function(){
    // Counts are high because the 24° frustum only catches ~2% of a surrounding
    // shell: 1170 stars put just 23 on screen, which reads as scattered dots
    // rather than a star field. ~7600 lands ~150 in frame at any moment.
    var layers = [
      { n: 4030, size: 1.3, color: 0xffe9cf, opacity: 0.42 },
      { n: 2470, size: 1.9, color: 0xfff3e2, opacity: 0.60 },
      { n: 1105, size: 2.7, color: 0xffd9a8, opacity: 0.85 }
    ];
    layers.forEach(function(L){
      var pos = new Float32Array(L.n * 3);
      for (var i = 0; i < L.n; i++){
        // Flattened shell — disc-like enough to read as the galactic plane, but
        // thick enough that stars are always somewhere inside the narrow frustum.
        var r = 260 + Math.pow(Math.random(), 0.55) * 700;
        var a = Math.random() * Math.PI * 2;
        var u = Math.random() * 2 - 1;              // cos of polar angle
        var s = Math.sqrt(1 - u * u);
        pos[i*3]     = r * s * Math.cos(a);
        pos[i*3 + 1] = r * u * 0.42;                // squash toward the plane
        pos[i*3 + 2] = r * s * Math.sin(a);
        if (DEBUG) starPts.push(new THREE.Vector3(pos[i*3], pos[i*3+1], pos[i*3+2]));
      }
      STAR_TOTAL += L.n;
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      starfield.add(new THREE.Points(g, new THREE.PointsMaterial({
        size: L.size, color: L.color, sizeAttenuation: false,
        transparent: true, opacity: L.opacity,
        depthWrite: false, blending: THREE.AdditiveBlending
      })));
    });
  })();

  var loader = new THREE.TextureLoader();
  function tex(n){ var t = loader.load('images/tex/' + n + '.jpg'); t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; return t; }

  // ---- Sun ----
  var sunTilt = new THREE.Object3D();
  sunTilt.rotation.z = SUN_AXIAL_TILT;
  system.add(sunTilt);
  var sun = new THREE.Mesh(
    new THREE.SphereGeometry(3.2, 48, 48),
    new THREE.MeshBasicMaterial({ map: tex('sun') })
  );
  sunTilt.add(sun); // spins on sun.rotation.y, about the tilted axis

  // sun glow sprite (soft bloom)
  (function(){
    var s = 128, c = document.createElement('canvas'); c.width = c.height = s;
    var g = c.getContext('2d'), rg = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    rg.addColorStop(0, 'rgba(255,226,160,0.9)');
    rg.addColorStop(0.25, 'rgba(255,180,90,0.55)');
    rg.addColorStop(0.6, 'rgba(255,140,60,0.14)');
    rg.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = rg; g.fillRect(0, 0, s, s);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    }));
    sp.scale.set(17, 17, 1);
    sun.add(sp);
  })();

  // ---- Planets ---- [name, radius, orbit, revSpeed(rad/s), spinSpeed(rad/s), axialTilt(rad)]
  // Speeds derive from real periods, then get compressed: w_shown = w_real^p,
  // anchored on Earth. Straight Kepler (w ∝ a^-1.5) on these already-compressed
  // orbit radii only spans 8× from Mercury to Neptune, which is why every planet
  // used to drift at much the same rate. Real angular speeds span 684× — unusable
  // as-is (Neptune would be frozen solid) — so p=0.55 for orbits and p=0.6 for
  // spin keep the ordering and the Mars→Jupiter gap while landing on 36× and 47×.
  // Negative spin = retrograde, which Venus and Uranus genuinely are.
  var defs = [
    ['mercury', 0.36,  4.7, 0.2013,  0.048, 0.03],
    ['venus',   0.58,  6.3, 0.1202, -0.020, 0.05],
    ['earth',   0.62,  7.9, 0.0920,  0.550, 0.41],
    ['mars',    0.46,  9.5, 0.0650,  0.541, 0.44],
    ['jupiter', 1.32, 11.4, 0.0236,  0.932, 0.05],
    ['saturn',  1.12, 14.2, 0.0143,  0.893, 0.47],
    ['uranus',  0.86, 16.6, 0.0080, -0.670, 1.71],
    ['neptune', 0.82, 18.8, 0.0056,  0.697, 0.49]
  ];
  var planets = [];
  defs.forEach(function(d){
    var name = d[0], size = d[1], R = d[2], rev = d[3], spin = d[4], tilt = d[5];
    var pivot = new THREE.Object3D();
    pivot.rotation.y = Math.random() * Math.PI * 2; // random start angle
    system.add(pivot); // orbits in the ecliptic, which the galaxy carries around
    var holder = new THREE.Object3D();
    holder.position.x = R;
    holder.rotation.z = tilt;
    pivot.add(holder);
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(size, 40, 40),
      new THREE.MeshStandardMaterial({ map: tex(name), roughness: 1, metalness: 0 })
    );
    holder.add(mesh);
    if (name === 'saturn') {
      var inner = size * 1.35, outer = size * 2.35;
      var rg = new THREE.RingGeometry(inner, outer, 80);
      var pos = rg.attributes.position, uv = rg.attributes.uv, v = new THREE.Vector3();
      for (var k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k); uv.setXY(k, (v.length() - inner) / (outer - inner), 0.5); }
      var ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({
        map: loader.load('images/tex/saturn_ring.png'),
        transparent: true, side: THREE.DoubleSide, opacity: 0.92, depthWrite: false
      }));
      ring.rotation.x = Math.PI / 2;
      holder.add(ring); // ring shares the holder's tilt, does not spin with the globe
    }
    planets.push({ pivot: pivot, mesh: mesh, rev: rev, spin: spin });
  });

  // ---- camera framing: system sits in the right portion of the hero ----
  function place(){
    // Positions are the old ones scaled out by 1.81 to match the 42°→24° lens
    // change, with lookAt nudged in so the Sun lands on the same pixel as before.
    var wide = (canvas.clientWidth || 1) / (canvas.clientHeight || 1) > 0.9;
    if (wide){ camera.position.set(5, 83, 137); camera.lookAt(-29, -26, 0); }
    else     { camera.position.set(2, 99, 224); camera.lookAt(-1, -45, 0); }
  }
  function resize(){
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    place();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- optional diagnostics: append ?debug=1 to the URL ----
  var dbg = null;
  if (DEBUG) {
    dbg = document.createElement('div');
    dbg.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:9999;font:12px/1.6 ui-monospace,monospace;' +
      'background:rgba(0,0,0,.78);color:#5f5;padding:10px 12px;border-radius:8px;white-space:pre;pointer-events:none';
    document.body.appendChild(dbg);
  }

  // How many stars actually land inside the (narrow, 24°) frustum. If this reads
  // 0 the field is placed wrong, not merely too dim.
  var _v = new THREE.Vector3(), _inView = 0;
  function starsInView(){ return _inView; }
  function countStars(){
    starfield.updateMatrixWorld();
    var c = 0;
    for (var i = 0; i < starPts.length; i++){
      _v.copy(starPts[i]).applyMatrix4(starfield.matrixWorld).project(camera);
      if (_v.x >= -1 && _v.x <= 1 && _v.y >= -1 && _v.y <= 1 && _v.z >= -1 && _v.z <= 1) c++;
    }
    _inView = c;
  }

  var clock = new THREE.Clock();
  var frames = 0, acc = 0, fps = 0;
  function frame(){
    var dt = Math.min(clock.getDelta(), 0.05);
    if (!reduce){
      sun.rotation.y    += SUN_SPIN * dt;      // Sun turns on its own axis
      galaxy.rotation.y += GALACTIC_SPIN * dt; // ecliptic precesses against the galactic plane
      starfield.rotation.y -= STARFIELD_DRIFT * dt; // stars sweep back = we move forward
      for (var i = 0; i < planets.length; i++){
        planets[i].pivot.rotation.y += planets[i].rev * dt;
        planets[i].mesh.rotation.y  += planets[i].spin * dt;
      }
    }
    renderer.render(scene, camera);
    if (dbg){
      frames++; acc += dt;
      if (acc >= 0.5){ fps = Math.round(frames / acc); frames = 0; acc = 0; countStars(); }
      dbg.textContent =
        'reduce-motion : ' + reduce + (reduce ? '   ← 动画被系统设置关闭了' : '') + '\n' +
        'fps           : ' + fps + '\n' +
        'dt            : ' + dt.toFixed(4) + '\n' +
        'sun.rot.y     : ' + sun.rotation.y.toFixed(3) + ' rad  (' + (sun.rotation.y * 57.2958).toFixed(0) + '°)\n' +
        'galaxy.rot.y  : ' + galaxy.rotation.y.toFixed(3) + ' rad  (' + (galaxy.rotation.y * 57.2958).toFixed(0) + '°)\n' +
        'starfield.y   : ' + starfield.rotation.y.toFixed(3) + ' rad  (' + (starfield.rotation.y * 57.2958).toFixed(0) + '°)\n' +
        'stars visible : ' + starsInView() + ' / ' + STAR_TOTAL + '\n' +
        'earth.orbit   : ' + planets[2].pivot.rotation.y.toFixed(3) + ' rad';
    }
    requestAnimationFrame(frame);
  }
  frame();
})();
