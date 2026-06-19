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
    if (SENXUN.cards) SENXUN.cards.init();
    if (SENXUN.quest) SENXUN.quest.init();
    if (SENXUN.interactions) SENXUN.interactions.init();

    var scene = new THREE.Scene();
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    document.body.appendChild(renderer.domElement);

    SENXUN.lighting.build(THREE, scene);
    SENXUN.terrain.build(THREE, scene);
    SENXUN.vegetation.build(THREE, scene);
    if (SENXUN.props && SENXUN.props.build) SENXUN.props.build(THREE, scene); // 場景道具(洞穴/峭壁),南部專用
    if (SENXUN.envart && SENXUN.envart.build) SENXUN.envart.build(THREE, scene); // 環境美術陳設(步道/海岸/平台/地標/夕陽)
    if (SENXUN.markers && SENXUN.markers.build) SENXUN.markers.build(THREE, scene); // 互動點發光標記
    if (SENXUN.npc && SENXUN.npc.build) SENXUN.npc.build(THREE, scene); // 嚮導 NPC + 解說牌(敘事引導)
    SENXUN.player.build(THREE, scene, ISL.spawn);
    var cam = SENXUN.camera.build(THREE, renderer.domElement);
    SENXUN.ui.build();

    var keys = {};
    function onInteract() {
      if (SENXUN.ui.cardOpen && SENXUN.ui.cardOpen()) { SENXUN.ui.closeCard(); return; }
      if (!SENXUN.interactions) return;
      var t = SENXUN.player.tile();
      var r = SENXUN.interactions.tryInteract(t.x, t.y);
      if (r.ok && SENXUN.ui.onInteract) SENXUN.ui.onInteract(r);
    }
    window.addEventListener("keydown", function (e) {
      if (SENXUN.ui.startOpen && SENXUN.ui.startOpen()) SENXUN.ui.dismissStart(); // 任意鍵開始
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.key) >= 0) e.preventDefault();
      if (e.code === "KeyE" && !keys.KeyE) { e.preventDefault(); onInteract(); } // 互動(edge-trigger)
      keys[e.code] = true;
    });
    window.addEventListener("keyup", function (e) { keys[e.code] = false; });
    window.addEventListener("resize", function () {
      renderer.setSize(window.innerWidth, window.innerHeight);
      cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix();
    });

    // 目標指引 pin:把當前目標的下個互動點投影到螢幕,交給 UI 顯示(解 F1 迷路)
    function updateGuide() {
      if (!SENXUN.ui.setGuide) return;
      var st = SENXUN.quest.state();
      if (st.done || (SENXUN.ui.startOpen && SENXUN.ui.startOpen()) || (SENXUN.ui.cardOpen && SENXUN.ui.cardOpen())) { SENXUN.ui.setGuide(null); return; }
      var t = SENXUN.player.tile();
      var nt = SENXUN.interactions.nextTarget(t.x, t.y);
      if (!nt) { SENXUN.ui.setGuide(null); return; }
      var wy = SENXUN.height.groundY(nt.x, nt.y) + 3;
      var v = new THREE.Vector3(nt.x - ISL.W / 2, wy, nt.y - ISL.H / 2);
      v.project(cam);
      var behind = v.z > 1;
      var nx = behind ? -v.x : v.x, ny = behind ? -v.y : v.y;
      var onScreen = !behind && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
      var sx = Math.max(6, Math.min(94, (nx * 0.5 + 0.5) * 100));
      var sy = Math.max(8, Math.min(92, (-ny * 0.5 + 0.5) * 100));
      SENXUN.ui.setGuide({ sx: sx, sy: sy, label: nt.label, onScreen: onScreen });
    }

    // 測試掛鉤(供 Playwright Tier 2 讀狀態;見 PLAYTEST_SPEC.md §5.5)
    SENXUN.debug = {
      tile: function () { return SENXUN.player.tile(); },
      region: function () { var t = SENXUN.player.tile(); return SENXUN.regions.at(t.x, t.y).name; },
      quest: function () { return SENXUN.quest.state(); },
      interactablesInRange: function () { var t = SENXUN.player.tile(); return SENXUN.interactions.inRange(t.x, t.y); },
      cards: function () { return SENXUN.cards.list(); },
      markersActive: function () { return SENXUN.markers ? SENXUN.markers.activeCount() : 0; },
      npcCount: function () { return SENXUN.npc ? (SENXUN.npc.count || 0) : 0; },
      envCount: function () { return SENXUN.envart ? (SENXUN.envart.count || 0) : 0; },
      warp: function (x, y) { SENXUN.player.setTile(x, y); return SENXUN.player.tile(); },
      talk: function () { var ts = SENXUN.interactions.talks(); if (ts[0] && ts[0].dialogue) { SENXUN.ui.showPanel("💬 對話", ts[0].dialogue.title, ts[0].dialogue.body); return true; } return false; },
      interact: function () { onInteract(); return SENXUN.quest.state(); }
    };

    var last = performance.now();
    function loop() {
      requestAnimationFrame(loop);
      var t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
      SENXUN.player.update(dt, keys, cam);
      SENXUN.camera.update(SENXUN.player.pos());
      SENXUN.lighting.update(dt);
      SENXUN.ui.update(dt, SENXUN.player, SENXUN.interactions);
      if (SENXUN.markers) SENXUN.markers.update(dt);
      if (SENXUN.npc) SENXUN.npc.update(dt);
      updateGuide();
      renderer.render(scene, cam);
    }
    loop();
    var veg = SENXUN.vegetation.counts || {};
    document.title = SENXUN.config.title || ("TAIWAN3D_OK trees=" + ((veg.tree || 0) + (veg.pine || 0)));
  });
})(typeof window !== "undefined" ? window : globalThis);
