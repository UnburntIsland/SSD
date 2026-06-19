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

    /* ---------- 1. 柴山步道:沿「實際可走步道中心線」鋪土徑+石階+碎石+柔邊草 ----------
       中心線取 x=trailX(d)、y=southShoreY(x)-d(與 heightmap 的 trail 同一套座標)→ 視覺路與可走路合一。 */
    var steps = [], earth = [], edges = [], pgrass = [], litter = [], prev = null;
    for (var d = 12; d < 252; d += 2.6) {
      var tx = S.trailX(d), ty = S.southShoreY(tx) - d;
      if (!isFinite(ty) || ty < 8 || ty > 322 || Hm.terrAt(Math.round(tx), Math.round(ty)) <= 1) { prev = null; continue; }
      var gy = gY(tx, ty), hh = U.hash2((d * 4) | 0, 7);
      var dirx = 0, diry = 1;
      if (prev) { dirx = tx - prev[0]; diry = ty - prev[1]; var L = Math.hypot(dirx, diry) || 1; dirx /= L; diry /= L; }
      var perpx = -diry, perpy = dirx;
      earth.push([wx(tx), gy + 0.05, wz(ty), 1.0 + hh * 0.35, hh * 6.28]);      // 土徑(寬度隨機)
      steps.push([wx(tx), gy + 0.12, wz(ty), 0.9 + hh * 0.3, hh * 6.28]);        // 石階踏石
      var o1 = 2.5 + hh * 0.9;                                                    // 兩側灰白碎石礫(柔邊)
      edges.push([wx(tx + perpx * o1), gY(tx + perpx * o1, ty + perpy * o1) + 0.18, wz(ty + perpy * o1), 0.4 + hh * 0.5, hh * 6.28]);
      edges.push([wx(tx - perpx * o1), gY(tx - perpx * o1, ty - perpy * o1) + 0.18, wz(ty - perpy * o1), 0.4 + U.hash2(d | 0, 3) * 0.5, hh * 3]);
      var o2 = 3.8 + hh * 1.3;                                                    // 路邊草叢(過渡到森林)
      pgrass.push([wx(tx + perpx * o2), gY(tx + perpx * o2, ty + perpy * o2), wz(ty + perpy * o2), 0.7 + hh * 0.7, 0]);
      pgrass.push([wx(tx - perpx * o2), gY(tx - perpx * o2, ty - perpy * o2), wz(ty - perpy * o2), 0.7 + U.hash2(d | 0, 9) * 0.7, 0]);
      if (hh > 0.62) litter.push([wx(tx + perpx * 1.3), gy + 0.03, wz(ty + perpy * 1.3), 1.0 + hh, hh * 6.28]);
      prev = [tx, ty];
    }
    var matEarth = new THREE.MeshStandardMaterial({ color: 0x8a6b46, roughness: 1, flatShading: true });    // 土徑
    var matStepStone = new THREE.MeshStandardMaterial({ color: 0xa9a190, roughness: 1, flatShading: true }); // 石階(灰褐)
    var matLitter = new THREE.MeshStandardMaterial({ color: 0x9a7b42, roughness: 1, flatShading: true });    // 落葉色塊
    instStatic(new THREE.CylinderGeometry(1.9, 2.1, 0.16, 8), matEarth, earth);
    instStatic(new THREE.BoxGeometry(2.4, 0.32, 2.2), matStepStone, steps);
    instStatic(new THREE.DodecahedronGeometry(0.9, 0), matLime, edges);
    var gblade1 = new THREE.ConeGeometry(0.34, 1.25, 4); gblade1.translate(0, 0.62, 0);
    instStatic(gblade1, matLeaf, pgrass);
    instStatic(new THREE.BoxGeometry(2.6, 0.06, 2.6), matLitter, litter);

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
    for (var gi = 0; gi < 480; gi++) {
      var gx = 120 + U.hash2(gi, 11) * 224, gyt = 38 + U.hash2(gi, 23) * 236;
      var ss = Hm.at(gx, gyt);
      if (ss.biome !== "broadleaf" || ss.sea) continue;
      grass.push([wx(gx), gY(gx, gyt), wz(gyt), 0.7 + U.hash2(gi, 5) * 0.9, U.hash2(gi, 7) * 6.28]);
    }
    var gblade = new THREE.ConeGeometry(0.32, 1.2, 4); gblade.translate(0, 0.6, 0);
    instStatic(gblade, matGrass, grass);

    /* ---------- 8. 水岸過渡:淺水色帶 + 雙排泡沫 + 濕沙 + 潮間濕石(沙→礁→海漸變) ---------- */
    var foam = [], shallow = [], wetsand = [], tide = [], wetrock = [];
    function shoreSouth(sx2, yShore) {
      if (!isFinite(yShore)) return;
      var hh = U.hash2((sx2 * 5) | 0, (yShore * 3) | 0);
      foam.push([wx(sx2), -0.08, wz(yShore + (hh - 0.5) * 1.4), 1.5 + hh * 1.6, hh * 6.28]);       // 貼水線泡沫
      foam.push([wx(sx2 + 1.4), -0.08, wz(yShore + 2.2 + hh * 1.6), 1.0 + hh * 1.0, hh * 5]);       // 外海第二排泡沫
      shallow.push([wx(sx2), -0.34, wz(yShore + 5 + hh * 5), 4.6 + hh * 3, hh * 6.28]);             // 淺水色帶(外海側)
      var ws = yShore - 1.4 - hh * 2.6;
      if (Hm.terrAt(Math.round(sx2), Math.round(ws)) >= 2) wetsand.push([wx(sx2), gY(sx2, ws) + 0.04, wz(ws), 1.7 + hh * 1.4, hh * 6.28]); // 濕沙
      if (hh > 0.55) tide.push([wx(sx2), -0.22, wz(yShore + 0.9 + hh), 0.5 + hh * 0.7, hh * 6.28]); // 潮間小石
      if (hh > 0.8) wetrock.push([wx(sx2), -0.12, wz(yShore + 0.4), 1.0 + hh, hh * 4]);              // 濕潤礁石(反光)
    }
    for (var sx2 = 58; sx2 < 262; sx2 += 3.0) shoreSouth(sx2, S.southShoreY(sx2));
    for (var sy2 = 114; sy2 < 250; sy2 += 3.2) {
      var wsx = S.westShoreX(sy2), hw = U.hash2(sy2 | 0, 2);
      foam.push([wx(wsx + (hw - 0.5) * 1.4), -0.08, wz(sy2), 1.4 + hw * 1.4, 0]);
      shallow.push([wx(wsx - 5 - hw * 5), -0.34, wz(sy2), 4.3 + hw * 3, 0]);                         // 西岸外海=x 更小
      if (hw > 0.55) tide.push([wx(wsx - 0.9 - hw), -0.22, wz(sy2), 0.5 + hw * 0.7, hw * 6]);
    }
    var flatGeo = new THREE.CircleGeometry(1, 8); flatGeo.rotateX(-Math.PI / 2);
    instStatic(flatGeo, new THREE.MeshBasicMaterial({ color: 0x9fd8d6, transparent: true, opacity: 0.4, depthWrite: false }), shallow); // 淺水色帶
    instStatic(flatGeo, new THREE.MeshBasicMaterial({ color: 0xeef6f3, transparent: true, opacity: 0.62, depthWrite: false }), foam);   // 泡沫(亮、雙排)
    instStatic(flatGeo, new THREE.MeshStandardMaterial({ color: 0xb6986a, roughness: 0.6, flatShading: true }), wetsand);               // 濕沙
    instStatic(new THREE.IcosahedronGeometry(1.0, 0), matLime, tide);                                                                    // 潮間小石
    instStatic(new THREE.IcosahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0xc2c4bd, roughness: 0.32, flatShading: true }), wetrock); // 濕礁(低粗糙反光)

    /* ---------- 9. 地標接觸陰影(壓住地面) ---------- */
    var lmShadow = new THREE.CircleGeometry(1, 12); lmShadow.rotateX(-Math.PI / 2);
    var matShadow = new THREE.MeshBasicMaterial({ color: 0x100c06, transparent: true, opacity: 0.32, depthWrite: false });
    var lm = [[332, 44, 7.5], [232, 214, 5.2], [266, 168, 4.6], [300, 250, 6.2], [70, 250, 4], [58, 270, 4]];
    instStatic(lmShadow, matShadow, lm.map(function (a) { return [wx(a[0]), gY(a[0], a[1]) + 0.07, wz(a[1]), a[2], 0]; }));

    EA.count = n;
    return n;
  };
})(typeof window !== "undefined" ? window : globalThis);
