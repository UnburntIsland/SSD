/* camera.js — orbit-follow camera. SENXUN.camera */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var C = SENXUN.config;
  var Cam = (SENXUN.camera = {});
  var cam, az = Math.PI, el, dist, drag = false, mx = 0, my = 0, W = 760, MH = 760;
  Cam.build = function (THREE, dom) {
    var ISL = root.SENXUN_ISLAND; if (ISL) { W = ISL.W; MH = ISL.H; }
    cam = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.4, 5000);
    el = C.camPitch * Math.PI / 180; dist = C.camDist;
    dom.addEventListener("mousedown", function (e) { drag = true; mx = e.clientX; my = e.clientY; });
    window.addEventListener("mouseup", function () { drag = false; });
    window.addEventListener("mousemove", function (e) {
      if (!drag) return; az -= (e.clientX - mx) * 0.005; el += (e.clientY - my) * 0.004;
      el = Math.max(0.18, Math.min(1.45, el)); mx = e.clientX; my = e.clientY;
    });
    dom.addEventListener("wheel", function (e) {
      dist *= (1 + (e.deltaY > 0 ? 0.09 : -0.09)); dist = Math.max(C.camMin, Math.min(C.camMax, dist));
      e.preventDefault();
    }, { passive: false });
    Cam.cam = cam; return cam;
  };
  Cam.setPitch = function (deg) { el = deg * Math.PI / 180; };
  Cam.azimuth = function () { return az; };
  Cam.update = function (target) {
    var ce = Math.max(0.18, Math.min(1.45, el));
    cam.position.set(
      target.x + dist * Math.cos(ce) * Math.sin(az),
      target.y + 6 + dist * Math.sin(ce),
      target.z + dist * Math.cos(ce) * Math.cos(az)
    );
    // 防穿模:讓攝影機高於其所在地形(保守夾擠)
    var Hh = SENXUN.height;
    if (Hh && Hh.groundY) {
      var ix = cam.position.x + W / 2, iz = cam.position.z + MH / 2;
      var g = Hh.groundY(ix, iz);
      var minY = g + 4.5;
      if (cam.position.y < minY) cam.position.y = minY;
    }
    cam.lookAt(target.x, target.y + 2.4, target.z);
  };
})(typeof window !== "undefined" ? window : globalThis);
