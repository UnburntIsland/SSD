/* vegetation.js — biome-driven scatter of trees/plants/rocks across Taiwan,
   rendered with InstancedMesh for performance. Namespace: SENXUN.vegetation */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var U = SENXUN.util, Hm = SENXUN.height;
  var V = (SENXUN.vegetation = {});

  // probability + kind by biome (per tile);elev 讓南部森林密度隨高度漸變
  function pick(biome, h, elev) {
    switch (biome) {
      case "broadleaf": {
        // 靠海低地稀疏、山坡山谷較密(0.16→0.46)
        var thr = U.clamp(0.16 + (elev || 0) * 0.011, 0.16, 0.46);
        return h < thr ? "tree" : (h < thr + 0.05 ? "bush" : null);
      }
      case "conifer":   return h < 0.40 ? "pine" : null;
      case "grass":     return h < 0.05 ? "tree" : (h < 0.11 ? "bush" : null);
      case "plain":     return h < 0.018 ? "tree" : (h < 0.05 ? "farm" : null); // 疏樹+農田
      case "limestone": return h < 0.10 ? "tree" : (h < 0.20 ? "rock" : null);  // 柴山林+礁岩
      case "badland":   return h < 0.06 ? "bush" : null;                         // 惡地疏灌叢
      case "beach":     return h < 0.05 ? "palm" : null;
      case "sand":      return h < 0.03 ? "palm" : null;
      case "rock":      return h < 0.03 ? "rock" : null;                          // 高山裸岩
      // --- 南部場景(柴山) ---
      case "reef":      return h < 0.55 ? "reefrock" : null;                       // 礁岩岸密布灰白礁塊
      case "karst":     return h < 0.34 ? "reefrock" : (h < 0.37 ? "banyan" : null); // 石灰岩塊 + 稀有白榕
      case "trail":     return null;                                              // 步道淨空
      default:          return null;                                             // snow/sea 無
    }
  }

  function cone(THREE, r, hh, seg) { var g = new THREE.ConeGeometry(r, hh, seg); g.translate(0, hh / 2, 0); return g; }

  V.build = function (THREE, scene) {
    var ISL = root.SENXUN_ISLAND, W = ISL.W, MH = ISL.H;
    var C = SENXUN.config;
    var VB = (C && C.vegBounds) || { x0: 64, x1: 654, y0: 36, y1: 712 };
    var BX0 = VB.x0, BX1 = VB.x1, BY0 = VB.y0, BY1 = VB.y1;
    var L = { tree: [], pine: [], bush: [], rock: [], palm: [], farm: [], reefrock: [], banyan: [] };
    for (var y = BY0; y < BY1; y++) for (var x = BX0; x < BX1; x++) {
      var tc = Hm.terrAt(x, y); if (tc <= 1) continue;
      var s = Hm.at(x + 0.5, y + 0.5); if (s.sea) continue;
      var hsh = U.hash2(x * 3 + 1, y * 5 + 2);
      var k = pick(s.biome, hsh, s.elev);
      if (!k) continue;
      L[k].push([x + 0.5, y + 0.5, U.hash2(x, y)]);
    }
    var M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
    function inst(geo, color, list, base, rng) {
      if (!list.length) return null;
      var mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9, flatShading: true });
      var im = new THREE.InstancedMesh(geo, mat, list.length);
      for (var i = 0; i < list.length; i++) {
        var o = list[i], sc = base + o[2] * rng;
        Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), o[2] * 6.28);
        P.set(o[0] - W / 2, Hm.groundY(o[0], o[1]), o[1] - MH / 2);
        M.compose(P, Q, S.set(sc, sc, sc)); im.setMatrixAt(i, M);
      }
      im.instanceMatrix.needsUpdate = true; scene.add(im); return im;
    }
    var meshes = {};
    meshes.tree = inst(cone(THREE, 2.0, 5.0, 7), 0x46763a, L.tree, 0.9, 0.9);
    meshes.pine = inst(cone(THREE, 1.5, 6.5, 6), 0x35643f, L.pine, 0.9, 1.0);
    var bs = new THREE.SphereGeometry(1.3, 8, 6); bs.translate(0, 1.0, 0);
    meshes.bush = inst(bs, 0x6f9a52, L.bush, 0.8, 0.7);
    var rk = new THREE.IcosahedronGeometry(1.2, 0); rk.translate(0, 0.7, 0);
    meshes.rock = inst(rk, 0x9a968c, L.rock, 0.9, 1.3);
    meshes.palm = inst(cone(THREE, 1.1, 5.5, 6), 0x6aa24a, L.palm, 1.0, 0.6);
    // farmland: low flat green-gold patch (small box)
    var fb = new THREE.BoxGeometry(1.0, 0.25, 1.0); fb.translate(0, 0.12, 0);
    meshes.farm = inst(fb, 0xc8c86a, L.farm, 1.2, 0.4);
    // 南部:灰白珊瑚礁岩塊(嶙峋)
    var rk2 = new THREE.IcosahedronGeometry(1.35, 0); rk2.translate(0, 0.6, 0);
    meshes.reefrock = inst(rk2, 0xcfccc2, L.reefrock, 0.8, 1.7);
    // 南部:白榕(寬樹冠、淺綠氣根榕)
    var bn = new THREE.SphereGeometry(2.4, 10, 8); bn.scale(1, 0.72, 1); bn.translate(0, 2.4, 0);
    meshes.banyan = inst(bn, 0x90b27c, L.banyan, 1.0, 0.8);
    V.counts = {}; for (var kk in L) V.counts[kk] = L[kk].length;
    V.meshes = meshes;
    return meshes;
  };
})(typeof window !== "undefined" ? window : globalThis);
