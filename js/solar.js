/* 3D solar system — planets revolve around the Sun AND spin on their axes.
   Real texture maps (Solar System Scope, CC-BY 4.0). No orbit lines. */
(function(){
  if (typeof THREE === 'undefined') return;
  var canvas = document.getElementById('scene');
  if (!canvas) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 2000);

  scene.add(new THREE.AmbientLight(0xffffff, 0.34));
  var sunLight = new THREE.PointLight(0xfff0d4, 2.5, 0, 2);
  scene.add(sunLight); // at origin

  var loader = new THREE.TextureLoader();
  function tex(n){ var t = loader.load('images/tex/' + n + '.jpg'); t.anisotropy = 4; t.encoding = THREE.sRGBEncoding; return t; }

  // ---- Sun ----
  var sun = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 48, 48),
    new THREE.MeshBasicMaterial({ map: tex('sun') })
  );
  scene.add(sun);

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
    sp.scale.set(13, 13, 1);
    sun.add(sp);
  })();

  // ---- Planets ---- [name, radius, orbit, revSpeed(rad/s), spinSpeed(rad/s), axialTilt(rad)]
  var defs = [
    ['mercury', 0.26,  3.4, 0.150, 0.30, 0.03],
    ['venus',   0.42,  4.4, 0.115, 0.14, 0.05],
    ['earth',   0.46,  5.4, 0.092, 0.55, 0.41],
    ['mars',    0.34,  6.4, 0.074, 0.52, 0.44],
    ['jupiter', 1.05,  8.0, 0.045, 0.70, 0.05],
    ['saturn',  0.92,  9.8, 0.035, 0.62, 0.47],
    ['uranus',  0.66, 11.3, 0.026, 0.36, 1.71],
    ['neptune', 0.64, 12.6, 0.021, 0.36, 0.49]
  ];
  var planets = [];
  defs.forEach(function(d){
    var name = d[0], size = d[1], R = d[2], rev = d[3], spin = d[4], tilt = d[5];
    var pivot = new THREE.Object3D();
    pivot.rotation.y = Math.random() * Math.PI * 2; // random start angle
    scene.add(pivot);
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
    var wide = (canvas.clientWidth || 1) / (canvas.clientHeight || 1) > 0.9;
    if (wide){ camera.position.set(4, 15, 48); camera.lookAt(-9.5, -1.2, 0); }
    else     { camera.position.set(2, 18, 76); camera.lookAt(-1, -19, 0); }
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

  var clock = new THREE.Clock();
  function frame(){
    var dt = Math.min(clock.getDelta(), 0.05);
    if (!reduce){
      for (var i = 0; i < planets.length; i++){
        planets[i].pivot.rotation.y += planets[i].rev * dt;
        planets[i].mesh.rotation.y  += planets[i].spin * dt;
      }
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
})();
