/* markers_south.js — 互動點的「世界中發光標記」(光柱 + 浮動光球)。SENXUN.markers
   只顯示「當前目標、尚未觸發」的點 → 玩家遠遠就看得到該去哪(解決「發光點」名實不符)。
   由 main.js build/update 掛鉤呼叫。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var Hm = SENXUN.height;
  var M = (SENXUN.markers = {});
  var THREE, items = [], W, MH, t = 0;

  M.build = function (three, scene) {
    THREE = three;
    var ISL = root.SENXUN_ISLAND; W = ISL.W; MH = ISL.H;
    var pts = (SENXUN.interactions && SENXUN.interactions.points && SENXUN.interactions.points()) || [];
    var orbGeo = new THREE.SphereGeometry(1.1, 14, 12);
    var beamGeo = new THREE.CylinderGeometry(0.32, 0.32, 16, 8);
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p.persistent) continue; // 對話/NPC 點不放任務發光標記(NPC 有自己的外觀)
      var g = new THREE.Group();
      var orb = new THREE.Mesh(orbGeo, new THREE.MeshStandardMaterial(
        { color: 0xbdf4ff, emissive: 0x4ad6ff, emissiveIntensity: 1.5, roughness: 0.35, metalness: 0.0 }));
      orb.position.y = 4.4; g.add(orb);
      var beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial(
        { color: 0x7fe6ff, transparent: true, opacity: 0.26, depthWrite: false }));
      beam.position.y = 8; g.add(beam);
      g.position.set(p.x - W / 2, Hm.groundY(p.x, p.y), p.y - MH / 2);
      scene.add(g);
      items.push({ g: g, orb: orb, point: p });
    }
    return items.length;
  };

  function isActive(p) {
    if (p.triggered) return false;
    var cur = SENXUN.quest ? SENXUN.quest.state().objectiveId : null;
    return !p.objective || p.objective === cur;
  }
  M.activeCount = function () { var n = 0; for (var i = 0; i < items.length; i++) if (isActive(items[i].point)) n++; return n; };

  M.update = function (dt) {
    t += dt;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], on = isActive(it.point);
      it.g.visible = on;
      if (on) { it.orb.position.y = 4.4 + Math.sin(t * 2.2 + i) * 0.5; it.g.rotation.y += dt * 1.1; }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
