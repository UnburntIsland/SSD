/* environment_art_south.js — Environment Art Pass。SENXUN.envart
   程式生成的環境陳設,讓場景像正式遊戲:石階步道+邊石+灌木、海岸漂流木/卵石/礁岩塊、
   天雨洞層疊石灰岩壁、山頂木棧觀景平台+欄杆+旗、白榕/石灰岩露頭地標、西方夕陽日盤+光暈。
   全部無碰撞,不影響移動/任務。散佈物件用 InstancedMesh 控制效能。由 main.js build 掛鉤。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var U = SENXUN.util, Hm = SENXUN.height, S = SENXUN.south;
  var EA = (SENXUN.envart = {});
  var W, MH, n = 0;
  function wx(x) { return x - W / 2; }
  function wz(y) { return y - MH / 2; }
  function gY(x, y) { return Hm.groundY(x, y); }

  EA.build = function (THREE, scene) {
    var ISL = root.SENXUN_ISLAND; W = ISL.W; MH = ISL.H; n = 0;

    var matLime = new THREE.MeshStandardMaterial({ color: 0xd2cfc6, roughness: 0.96, flatShading: true });
    var matStone = new THREE.MeshStandardMaterial({ color: 0xb8b4a8, roughness: 1, flatShading: true });
    var matWood = new THREE.MeshStandardMaterial({ color: 0x6e4d2c, roughness: 1 });
    var matPlank = new THREE.MeshStandardMaterial({ color: 0x9c7a48, roughness: 1 });
    var matLeaf = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 0.9, flatShading: true });
    var matLeafPale = new THREE.MeshStandardMaterial({ color: 0x8fb27c, roughness: 0.9, flatShading: true });

    var Mx = new THREE.Matrix4(), Qx = new THREE.Quaternion(), Px = new THREE.Vector3(), Sx = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
    // list ent目: [worldX, worldY, worldZ, scale, rotY]
    function instStatic(geo, mat, list) {
      if (!list.length) return;
      var im = new THREE.InstancedMesh(geo, mat, list.length);
      for (var i = 0; i < list.length; i++) {
        var o = list[i]; Qx.setFromAxisAngle(UP, o[4] || 0);
        Px.set(o[0], o[1], o[2]); Mx.compose(Px, Qx, Sx.set(o[3], o[3], o[3])); im.setMatrixAt(i, Mx);
      }
      im.instanceMatrix.needsUpdate = true; scene.add(im); n += list.length;
    }

    /* ---------- 1. 柴山步道:石階 + 兩側邊石 + 灌木(沿上山 polyline) ---------- */
    var path = [[186, 276], [206, 250], [224, 228], [246, 205], [270, 176], [294, 140], [314, 96], [330, 58], [332, 46]];
    var steps = [], edges = [], shrubs = [];
    for (var p = 0; p < path.length - 1; p++) {
      var ax = path[p][0], ay = path[p][1], bx = path[p + 1][0], by = path[p + 1][1];
      var dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, perpx = -uy, perpy = ux;
      var stepN = Math.max(1, Math.round(len / 3.6));
      for (var s = 0; s < stepN; s++) {
        var f = s / stepN, x = ax + dx * f, y = ay + dy * f, h = U.hash2(p * 7 + s, p + 3);
        steps.push([wx(x), gY(x, y) + 0.12, wz(y), 0.95 + h * 0.2, h * 6.28]);
        var e1x = x + perpx * 3.0, e1y = y + perpy * 3.0, e2x = x - perpx * 3.0, e2y = y - perpy * 3.0;
        edges.push([wx(e1x), gY(e1x, e1y) + 0.25, wz(e1y), 0.5 + h * 0.5, h * 6.28]);
        edges.push([wx(e2x), gY(e2x, e2y) + 0.25, wz(e2y), 0.5 + U.hash2(s, p) * 0.5, U.hash2(p, s) * 6.28]);
        if (s % 3 === 0) {
          var sgx = x + perpx * 4.8 * (h > 0.5 ? 1 : -1), sgy = y + perpy * 4.8 * (h > 0.5 ? 1 : -1);
          shrubs.push([wx(sgx), gY(sgx, sgy) + 1.0, wz(sgy), 0.8 + h * 0.7, 0]);
        }
      }
    }
    instStatic(new THREE.BoxGeometry(3.2, 0.4, 3.0), matStone, steps);   // 石階板
    instStatic(new THREE.DodecahedronGeometry(1.0, 0), matLime, edges);  // 灰白邊石
    var bushGeo = new THREE.SphereGeometry(1.4, 8, 6); bushGeo.scale(1, 0.8, 1);
    instStatic(bushGeo, matLeaf, shrubs);

    /* ---------- 2. 海岸:漂流木 + 卵石堆 + 灰白珊瑚礁石灰岩塊 ---------- */
    var drift = [], peb = [], reefs = [];
    for (var cx = 72; cx < 250; cx += 6) {
      var sy = S.southShoreY(cx); if (!isFinite(sy)) continue;
      var by2 = sy - (3 + U.hash2(cx, 1) * 5);
      if (Hm.terrAt(Math.round(cx), Math.round(by2)) >= 2) {
        if (U.hash2(cx, 7) > 0.55) drift.push([wx(cx), gY(cx, by2) + 0.3, wz(by2), 0.9 + U.hash2(cx, 2) * 0.9, U.hash2(cx, 3) * 6.28]);
        for (var k = 0; k < 3; k++) {
          var px2 = cx + (U.hash2(cx, k) - 0.5) * 6, py2 = by2 + (U.hash2(cx, k + 4) - 0.5) * 5;
          if (Hm.terrAt(Math.round(px2), Math.round(py2)) >= 2) peb.push([wx(px2), gY(px2, py2) + 0.1, wz(py2), 0.3 + U.hash2(cx, k + 8) * 0.4, U.hash2(cx, k) * 6.28]);
        }
      }
      var ry = sy - (16 + U.hash2(cx, 5) * 16);  // 礁岩帶
      if (Hm.terrAt(Math.round(cx), Math.round(ry)) >= 3) reefs.push([wx(cx), gY(cx, ry) + 0.4, wz(ry), 1.3 + U.hash2(cx, 6) * 1.7, U.hash2(cx, 7) * 6.28]);
    }
    for (var wy = 120; wy < 245; wy += 7) {        // 西岸漂流木/礁石
      var sx = S.westShoreX(wy); var wxx = sx + (3 + U.hash2(wy, 1) * 5);
      if (Hm.terrAt(Math.round(wxx), Math.round(wy)) >= 2 && U.hash2(wy, 7) > 0.5)
        drift.push([wx(wxx), gY(wxx, wy) + 0.3, wz(wy), 1 + U.hash2(wy, 2) * 0.8, U.hash2(wy, 3) * 6.28]);
    }
    instStatic(new THREE.BoxGeometry(3.6, 0.5, 0.6), matWood, drift);
    instStatic(new THREE.IcosahedronGeometry(1.0, 0), matStone, peb);
    instStatic(new THREE.IcosahedronGeometry(1.5, 0), matLime, reefs);

    /* ---------- 3. 天雨洞:層疊石灰岩壁 + 兩側巨岩 ---------- */
    (function caveDress(x, y) {
      var g = new THREE.Group(), gy = gY(x, y);
      for (var i = 0; i < 5; i++) {
        var slab = new THREE.Mesh(new THREE.BoxGeometry(11 - i * 1.3, 2.2, 5), matLime);
        slab.position.set((U.hash2(x, i) - 0.5) * 3, 2 + i * 1.9, -4 - i * 0.5);
        slab.rotation.y = (U.hash2(i, x) - 0.5) * 0.5; g.add(slab);
      }
      for (var j = 0; j < 3; j++) {
        var b = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4 + j * 0.7, 0), matLime);
        b.position.set((j - 1) * 7.5, 1.8, 2.5); b.rotation.y = j; g.add(b);
      }
      g.position.set(wx(x), gy, wz(y)); scene.add(g); n += 8;
    })(300, 250);

    /* ---------- 4. 山頂觀景平台 + 欄杆 + 旗 ---------- */
    (function platform(x, y) {
      var g = new THREE.Group(), gy = gY(x, y);
      var deck = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 12), matPlank); deck.position.y = 0.5; g.add(deck);
      var postGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.7, 6);
      for (var a = -6; a <= 6; a += 2) {
        [-6, 6].forEach(function (zz) { var q = new THREE.Mesh(postGeo, matWood); q.position.set(a, 1.3, zz); g.add(q); });
        [-6, 6].forEach(function (xx) { var q = new THREE.Mesh(postGeo, matWood); q.position.set(xx, 1.3, a); g.add(q); });
      }
      function rail(w, d, px, pz) { var r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), matWood); r.position.set(px, 2.0, pz); g.add(r); }
      rail(12.4, 0.16, 0, -6); rail(12.4, 0.16, 0, 6); rail(0.16, 12.4, -6, 0); rail(0.16, 12.4, 6, 0);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 9, 6), matWood); pole.position.set(-5, 4.5, -5); g.add(pole);
      var flag = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.8), new THREE.MeshStandardMaterial({ color: 0xff8a3a, side: THREE.DoubleSide, roughness: 0.8 }));
      flag.position.set(-3.2, 8, -5); g.add(flag);
      g.position.set(wx(x), gy, wz(y)); scene.add(g); n += 24;
    })(332, 44);

    /* ---------- 5. 地標:大白榕 + 石灰岩巨岩露頭 ---------- */
    (function banyan(x, y) {
      var g = new THREE.Group();
      for (var t = 0; t < 4; t++) { var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 7, 6), matWood); tr.position.set((U.hash2(x, t) - 0.5) * 3, 3.5, (U.hash2(t, y) - 0.5) * 3); g.add(tr); }
      var crown = new THREE.Mesh(new THREE.SphereGeometry(5.5, 12, 9), matLeafPale); crown.scale.set(1.2, 0.7, 1.2); crown.position.y = 8; g.add(crown);
      g.position.set(wx(x), gY(x, y), wz(y)); scene.add(g); n += 5;
    })(232, 214);
    (function outcrop(x, y) {
      var g = new THREE.Group();
      for (var i = 0; i < 5; i++) { var r = new THREE.Mesh(new THREE.IcosahedronGeometry(2 + i * 0.9, 0), matLime); r.position.set((i % 2 ? 1 : -1) * i * 1.1, 1 + i * 1.6, (U.hash2(i, x) - 0.5) * 3); r.rotation.y = i; g.add(r); }
      g.position.set(wx(x), gY(x, y), wz(y)); scene.add(g); n += 5;
    })(266, 168);

    /* ---------- 6. 西方夕陽:日盤 + 光暈(視覺焦點) ---------- */
    var sun = new THREE.Mesh(new THREE.CircleGeometry(46, 32), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.95 }));
    sun.position.set(-W * 1.7, 78, -MH * 0.05); sun.lookAt(0, 40, 0); scene.add(sun);
    var halo = new THREE.Mesh(new THREE.CircleGeometry(90, 32), new THREE.MeshBasicMaterial({ color: 0xffb35e, transparent: true, opacity: 0.22 }));
    halo.position.copy(sun.position); halo.lookAt(0, 40, 0); scene.add(halo);
    n += 2;

    /* ---------- 7. 森林草叢:打破地表均勻感(只長在闊葉林帶) ---------- */
    var matGrass = new THREE.MeshStandardMaterial({ color: 0x6fa84a, roughness: 0.95, flatShading: true });
    var grass = [];
    for (var gi = 0; gi < 900; gi++) {
      var gx = 120 + U.hash2(gi, 11) * 224, gyt = 38 + U.hash2(gi, 23) * 236;
      var ss = Hm.at(gx, gyt);
      if (ss.biome !== "broadleaf" || ss.sea) continue;
      grass.push([wx(gx), gY(gx, gyt), wz(gyt), 0.7 + U.hash2(gi, 5) * 0.9, U.hash2(gi, 7) * 6.28]);
    }
    var gblade = new THREE.ConeGeometry(0.32, 1.2, 4); gblade.translate(0, 0.6, 0);
    instStatic(gblade, matGrass, grass);

    EA.count = n;
    return n;
  };
})(typeof window !== "undefined" ? window : globalThis);
