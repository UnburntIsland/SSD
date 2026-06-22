/* main.js — bootstrap + input + game loop. SENXUN.main */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  function err(m) { var e = document.getElementById("err"); if (e) e.textContent = m; }
  window.addEventListener("error", function (e) { err("JS錯誤: " + e.message); });

  window.addEventListener("load", function () {
    if (!window.THREE) { err("three.js 載入失敗(需連到 cdnjs)"); return; }
    var ISL = window.SENXUN_ISLAND;
    if (!ISL) { err("地圖資料未載入"); return; }

    SENXUN.height.init(ISL);
    SENXUN.regions.init(ISL);

    var scene = new THREE.Scene();
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    document.body.appendChild(renderer.domElement);

    SENXUN.lighting.build(THREE, scene);
    SENXUN.terrain.build(THREE, scene);
    SENXUN.vegetation.build(THREE, scene);
    SENXUN.player.build(THREE, scene, ISL.spawn);
    var cam = SENXUN.camera.build(THREE, renderer.domElement);
    SENXUN.ui.build();

    var keys = {};
    window.addEventListener("keydown", function (e) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) >= 0) e.preventDefault();
      keys[e.code] = true;
    });
    window.addEventListener("keyup", function (e) { keys[e.code] = false; });
    window.addEventListener("resize", function () {
      renderer.setSize(window.innerWidth, window.innerHeight);
      cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix();
    });

    var last = performance.now();
    function loop() {
      requestAnimationFrame(loop);
      var t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
      SENXUN.player.update(dt, keys, cam);
      SENXUN.camera.update(SENXUN.player.pos());
      SENXUN.lighting.update(dt);
      SENXUN.ui.update(dt, SENXUN.player);
      renderer.render(scene, cam);
    }
    loop();
    var veg = SENXUN.vegetation.counts || {};
    document.title = SENXUN.config.title || ("TAIWAN3D_OK trees=" + ((veg.tree || 0) + (veg.pine || 0)));
  });
})(typeof window !== "undefined" ? window : globalThis);
