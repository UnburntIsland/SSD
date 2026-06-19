/* restore_south.js — 環境修復的「環境回饋」(條件8)。SENXUN.restore
   山頂復育點完成前:外來種銀合歡(枯黃綠)叢生;完成互動後:銀合歡縮退、原生白榕長出。
   給玩家明確的「我復育了這片山頂」的可見變化。由 main.js build/update 掛鉤;
   reveal() 由 main 在觸發 kind==='restore' 互動點時呼叫。無碰撞,不影響玩法。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var Hm = SENXUN.height;
  var R = (SENXUN.restore = {});
  var W, MH, invasive = [], natives = [], applied = false, anim = 0, revealing = false;
  function wx(x) { return x - W / 2; }
  function wz(y) { return y - MH / 2; }

  R.build = function (THREE, scene) {
    var ISL = root.SENXUN_ISLAND; W = ISL.W; MH = ISL.H;
    applied = false; anim = 0; revealing = false; invasive = []; natives = [];
    var invMat = new THREE.MeshStandardMaterial({ color: 0xa6a358, roughness: 1, flatShading: true });   // 外來種:枯黃綠
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 1 });
    var leafMat = new THREE.MeshStandardMaterial({ color: 0x4e9a4e, roughness: 0.9, flatShading: true }); // 原生:健康綠
    var spots = [[330, 48], [335, 46], [328, 42], [336, 52], [331, 40], [339, 48], [326, 50], [338, 41]];
    for (var i = 0; i < spots.length; i++) {
      var x = spots[i][0], y = spots[i][1], gy = Hm.groundY(x, y);
      // 修復前:銀合歡(枯黃灌叢) — 一開始就看得到
      var inv = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.4, 6), invMat);
      inv.position.set(wx(x), gy + 1.5, wz(y)); inv.rotation.y = i; scene.add(inv); invasive.push(inv);
      // 修復後:原生白榕(初始隱藏,reveal 時長出)
      var g = new THREE.Group();
      var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 3, 6), trunkMat); tr.position.y = 1.5; g.add(tr);
      var crown = new THREE.Mesh(new THREE.SphereGeometry(2.3, 10, 8), leafMat); crown.scale.set(1.1, 0.85, 1.1); crown.position.y = 3.9; g.add(crown);
      g.position.set(wx(x + 1.6), gy, wz(y + 1.6)); g.scale.setScalar(0.001); g.visible = false; scene.add(g); natives.push(g);
    }
    return invasive.length;
  };

  R.reveal = function () { if (applied) return; applied = true; revealing = true; for (var i = 0; i < natives.length; i++) natives[i].visible = true; };
  R.applied = function () { return applied; };

  R.update = function (dt) {
    if (!revealing) return;
    anim = Math.min(1, anim + dt * 0.7);
    for (var i = 0; i < natives.length; i++) natives[i].scale.setScalar(Math.max(0.001, anim));
    for (var j = 0; j < invasive.length; j++) {
      invasive[j].scale.setScalar(Math.max(0.001, 1 - anim));
      if (anim >= 1) invasive[j].visible = false;
    }
    if (anim >= 1) revealing = false;
  };
})(typeof window !== "undefined" ? window : globalThis);
