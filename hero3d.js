/* Adaptive 3D hero: a civic network sphere. Loads Three.js only when the hero is visible, motion is allowed and lite mode is off. */
(function () {
  const host = document.getElementById("hero3d"); if (!host) return;
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let started = false, renderer, stopped = false;
  function allowed() { return !root.classList.contains("lite") && !root.classList.contains("senior"); }
  function load(cb) {
    if (window.THREE) return cb();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.onload = cb; s.onerror = () => {}; document.head.appendChild(s);
  }
  function css(v) { return getComputedStyle(root).getPropertyValue(v).trim(); }
  function start() {
    if (started || !allowed()) return; started = true;
    load(() => {
      const T = window.THREE; if (!T) return;
      const w = host.clientWidth, h = host.clientHeight;
      const scene = new T.Scene();
      const cam = new T.PerspectiveCamera(40, w / h, .1, 100); cam.position.set(0, 0, 7.2);
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setSize(w, h);
      host.appendChild(renderer.domElement);
      const fb = host.querySelector(".fallback"); if (fb) fb.style.opacity = "0";
      const blue = new T.Color(css("--blue") || "#1D3FD6"), saffron = new T.Color(css("--saffron") || "#F26A0F"), green = new T.Color(css("--good") || "#0E8F55");
      const g = new T.Group(); scene.add(g);
      // dotted sphere (fibonacci lattice)
      const N = 900, pos = new Float32Array(N * 3), pts = [];
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
        const v = new T.Vector3(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(2);
        pos.set([v.x, v.y, v.z], i * 3); pts.push(v);
      }
      const dg = new T.BufferGeometry(); dg.setAttribute("position", new T.BufferAttribute(pos, 3));
      g.add(new T.Points(dg, new T.PointsMaterial({ color: blue, size: .035, transparent: true, opacity: .55 })));
      // wire shell
      g.add(new T.LineSegments(new T.WireframeGeometry(new T.IcosahedronGeometry(2.02, 2)), new T.LineBasicMaterial({ color: blue, transparent: true, opacity: .12 })));
      // civic nodes + arcs
      const hubs = []; for (let i = 0; i < 14; i++) hubs.push(pts[(i * 131 + 37) % N]);
      hubs.forEach((p, i) => {
        const m = new T.Mesh(new T.SphereGeometry(i % 4 === 0 ? .075 : .05, 12, 12), new T.MeshBasicMaterial({ color: i % 4 === 0 ? saffron : (i % 3 === 0 ? green : blue) }));
        m.position.copy(p).multiplyScalar(1.01); g.add(m);
      });
      for (let i = 0; i < hubs.length; i++) {
        const a = hubs[i], b = hubs[(i * 5 + 3) % hubs.length]; if (a === b) continue;
        const mid = a.clone().add(b).multiplyScalar(.5).normalize().multiplyScalar(2 + a.distanceTo(b) * .35);
        const curve = new T.QuadraticBezierCurve3(a, mid, b);
        g.add(new T.Line(new T.BufferGeometry().setFromPoints(curve.getPoints(40)), new T.LineBasicMaterial({ color: i % 3 === 0 ? saffron : blue, transparent: true, opacity: .55 })));
      }
      // orbit rings
      [2.6, 3.05].forEach((r, i) => {
        const ring = new T.Mesh(new T.TorusGeometry(r, .006, 6, 160), new T.MeshBasicMaterial({ color: i ? saffron : blue, transparent: true, opacity: i ? .35 : .25 }));
        ring.rotation.x = Math.PI / 2.3 + i * .35; ring.rotation.y = i * .5; scene.add(ring);
      });
      g.rotation.z = .35;
      let tx = 0, ty = 0;
      host.addEventListener("pointermove", e => { const r = host.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width - .5) * .5; ty = ((e.clientY - r.top) / r.height - .5) * .3; });
      let vis = true;
      new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(host);
      function frame() {
        if (stopped) return;
        requestAnimationFrame(frame);
        if (!vis || document.hidden) return;
        if (!reduce) g.rotation.y += .0018;
        g.rotation.x += (ty - g.rotation.x) * .04; cam.position.x += (tx - cam.position.x) * .04; cam.lookAt(0, 0, 0);
        renderer.render(scene, cam);
      }
      frame();
      addEventListener("resize", () => { const w2 = host.clientWidth, h2 = host.clientHeight; cam.aspect = w2 / h2; cam.updateProjectionMatrix(); renderer.setSize(w2, h2); });
    });
  }
  document.addEventListener("ngk:pref", e => {
    if (!allowed() && renderer) { stopped = true; renderer.domElement.remove(); renderer.dispose(); renderer = null; started = false; const fb = host.querySelector(".fallback"); if (fb) fb.style.opacity = "1"; }
    else if (allowed() && !started) { stopped = false; start(); }
  });
  if ("IntersectionObserver" in window) new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); ("requestIdleCallback" in window ? requestIdleCallback : setTimeout)(start); } }).observe(host);
})();
