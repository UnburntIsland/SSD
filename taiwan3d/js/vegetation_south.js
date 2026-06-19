/* vegetation_south.js — 南部專用植被(取代 vegetation.js,只給 south.html 載入)。SENXUN.vegetation
   重做樹木:樹幹 + 分層樹冠(多塊 Icosahedron)+ 每棵 instanceColor 綠色變化 + 尺寸/傾斜變化。
   3 樹種:海岸低矮灌木 / 山坡闊葉樹 / 老榕大樹;非均勻分布,步道兩側留空+柔邊。
   全部 InstancedMesh(每部位一個 draw call,共用同一組矩陣)。全台版仍用 vegetation.js,互不影響。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var U = SENXUN.util, Hm = SENXUN.height, S = SENXUN.south;
  var V = (SENXUN.vegetation = {});
  var W, MH;

  V.build = function (THREE, scene) {
    var ISL = root.SENXUN_ISLAND; W = ISL.W; MH = ISL.H;
    var C = SENXUN.config;
    var VB = (C && C.vegBounds) || { x0: 30, x1: 374, y0: 2, y1: 398 };

    var trees = [], shrubs = [], coastal = [], banyans = [], reefrocks = [], palms = [];
    // step 2 取樣:控制總三角形數(headless 軟體渲染友善;真機更輕鬆)。樹較大,間距 2 仍成林。
    for (var y = VB.y0; y < VB.y1; y += 2) for (var x = VB.x0; x < VB.x1; x += 2) {
      if (Hm.terrAt(x, y) <= 1) continue;
      var s = Hm.at(x + 0.5, y + 0.5); if (s.sea) continue;
      var h = U.hash2(x * 3 + 1, y * 5 + 2), h2 = U.hash2(x * 7 + 5, y * 3 + 9);
      var b = s.biome, elev = s.elev || 0, d = S.inland(x + 0.5, y + 0.5);
      if (b === "trail") continue;                       // 步道淨空
      if (b === "broadleaf") {
        var tdist = Math.abs((x + 0.5) - S.trailX(d));    // 距步道中心線
        if (d < 16) {                                     // 近海低地 → 稀疏海岸灌木
          if (h < 0.09) coastal.push([x + 0.5, y + 0.5, h, h2]);
        } else if (tdist < 6.5) {                          // 步道兩側過渡帶 → 矮灌木(留可走空間+柔邊)
          if (h < 0.20) shrubs.push([x + 0.5, y + 0.5, h, h2]);
        } else {                                           // 山坡/山谷:越高越密
          var dens = U.clamp(0.18 + elev * 0.013, 0.18, 0.42);
          if (h < dens) trees.push([x + 0.5, y + 0.5, h, h2]);
          else if (h < dens + 0.07) shrubs.push([x + 0.5, y + 0.5, h, h2]);
        }
      } else if (b === "karst") {
        if (h < 0.28) reefrocks.push([x + 0.5, y + 0.5, h, h2]);
        else if (h < 0.32) banyans.push([x + 0.5, y + 0.5, h, h2]);
      } else if (b === "reef") {
        if (h < 0.5) reefrocks.push([x + 0.5, y + 0.5, h, h2]);
      } else if (b === "sand") {
        if (h < 0.03) palms.push([x + 0.5, y + 0.5, h, h2]);
      }
    }

    var M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), Sc = new THREE.Vector3(), col = new THREE.Color();
    // 為一組散佈點算矩陣(位置+尺寸+Y旋轉+輕微傾斜),供同棵樹的多個部位共用
    function matsFor(list, base, rng, tilt) {
      var arr = [];
      for (var i = 0; i < list.length; i++) {
        var o = list[i], sc = base + o[2] * rng;
        E.set((o[3] - 0.5) * tilt, o[2] * 6.28, (o[2] - 0.5) * tilt);
        Q.setFromEuler(E);
        P.set(o[0] - W / 2, Hm.groundY(o[0], o[1]), o[1] - MH / 2);
        M.compose(P, Q, Sc.set(sc, sc, sc));
        arr.push(M.clone());
      }
      return arr;
    }
    function im(geo, mat, mats) {
      if (!mats.length) return null;
      var m = new THREE.InstancedMesh(geo, mat, mats.length);
      for (var i = 0; i < mats.length; i++) m.setMatrixAt(i, mats[i]);
      m.instanceMatrix.needsUpdate = true; scene.add(m); return m;
    }
    function tint(m, list, fn) { // 每棵 instanceColor
      if (!m) return;
      for (var i = 0; i < list.length; i++) { fn(list[i], col); m.setColorAt(i, col); }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    var WHITE = function (c) { return c; };

    var meshes = {}, counts = {};

    /* ---- 山坡闊葉樹:樹幹 + 3 層 Icosahedron 樹冠,每棵綠色/尺寸/傾斜不同 ---- */
    var tMats = matsFor(trees, 0.85, 0.7, 0.16);
    var trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 1, flatShading: true });
    var canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, flatShading: true });
    var trunkGeo = new THREE.CylinderGeometry(0.3, 0.55, 3.3, 5); trunkGeo.translate(0, 1.65, 0);
    var c1 = new THREE.IcosahedronGeometry(2.0, 0); c1.translate(0, 3.7, 0);            // 下層大樹冠
    var c2 = new THREE.IcosahedronGeometry(1.35, 0); c2.scale(1, 0.95, 1); c2.translate(0.35, 5.0, 0.15); // 上層樹冠
    im(trunkGeo, trunkMat, tMats);
    function leafTint(o, c) { c.setHSL(0.26 + (o[3] - 0.5) * 0.05, 0.46 + o[2] * 0.16, 0.30 + o[3] * 0.13); }
    meshes.tree = im(c1, canopyMat, tMats); tint(meshes.tree, trees, leafTint);
    tint(im(c2, canopyMat, tMats), trees, leafTint);
    counts.tree = trees.length;

    /* ---- 山坡/林緣灌木:2 塊壓扁 Icosahedron,橄欖綠 ---- */
    var sMats = matsFor(shrubs, 0.7, 0.6, 0.12);
    var shrubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
    var sg1 = new THREE.IcosahedronGeometry(1.25, 0); sg1.scale(1.1, 0.7, 1.1); sg1.translate(0, 0.9, 0);
    var sg2 = new THREE.IcosahedronGeometry(0.85, 0); sg2.scale(1.1, 0.7, 1.1); sg2.translate(0.5, 1.5, 0.3);
    function shrubTint(o, c) { c.setHSL(0.24 + (o[2] - 0.5) * 0.04, 0.4 + o[3] * 0.15, 0.32 + o[2] * 0.1); }
    tint(im(sg1, shrubMat, sMats), shrubs, shrubTint);
    tint(im(sg2, shrubMat, sMats), shrubs, shrubTint);
    counts.shrub = shrubs.length;

    /* ---- 海岸低矮灌木(海葡萄叢):低、寬、灰綠 ---- */
    var coMats = matsFor(coastal, 0.7, 0.5, 0.1);
    var coMat = new THREE.MeshStandardMaterial({ color: 0x8a9a5a, roughness: 0.95, flatShading: true });
    var cg = new THREE.IcosahedronGeometry(1.3, 0); cg.scale(1.3, 0.55, 1.3); cg.translate(0, 0.7, 0);
    im(cg, coMat, coMats);
    counts.coastal = coastal.length;

    /* ---- 老榕大樹地標:寬樹冠(多塊)+ 多支氣根樹幹,淺綠 ---- */
    var bMats = matsFor(banyans, 1.0, 0.6, 0.06);
    var banyanTrunk = new THREE.MeshStandardMaterial({ color: 0x6e5236, roughness: 1, flatShading: true });
    var banyanLeaf = new THREE.MeshStandardMaterial({ color: 0x8fb27c, roughness: 0.92, flatShading: true });
    var bt = new THREE.CylinderGeometry(0.7, 1.0, 4.2, 6); bt.translate(0, 2.1, 0);
    var bc1 = new THREE.IcosahedronGeometry(3.4, 0); bc1.scale(1.25, 0.7, 1.25); bc1.translate(0, 4.8, 0);
    var bc2 = new THREE.IcosahedronGeometry(2.2, 0); bc2.scale(1.2, 0.7, 1.2); bc2.translate(2.0, 4.2, 0.5);
    var bc3 = new THREE.IcosahedronGeometry(2.0, 0); bc3.scale(1.2, 0.7, 1.2); bc3.translate(-1.8, 4.4, -0.6);
    im(bt, banyanTrunk, bMats); im(bc1, banyanLeaf, bMats); im(bc2, banyanLeaf, bMats); im(bc3, banyanLeaf, bMats);
    counts.banyan = banyans.length;

    /* ---- 灰白珊瑚礁石灰岩塊 ---- */
    var rMats = matsFor(reefrocks, 0.8, 1.6, 0.0);
    var reefMat = new THREE.MeshStandardMaterial({ color: 0xcfccc2, roughness: 0.96, flatShading: true });
    var rg = new THREE.IcosahedronGeometry(1.35, 0); rg.translate(0, 0.6, 0);
    meshes.reefrock = im(rg, reefMat, rMats); counts.reefrock = reefrocks.length;

    /* ---- 棕櫚(沙灘) ---- */
    var pMats = matsFor(palms, 1.0, 0.5, 0.08);
    var palmMat = new THREE.MeshStandardMaterial({ color: 0x6aa24a, roughness: 0.9, flatShading: true });
    var pg = new THREE.ConeGeometry(1.0, 4.5, 6); pg.translate(0, 2.4, 0);
    im(pg, palmMat, pMats); counts.palm = palms.length;

    V.counts = counts; V.meshes = meshes;
    return meshes;
  };
})(typeof window !== "undefined" ? window : globalThis);
