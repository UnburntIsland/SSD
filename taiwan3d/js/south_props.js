/* south_props.js — 南部場景的地景道具:石灰岩洞穴入口、峭壁岩塊、山頂石堆。
   只給 south.html 載入;由 main.js 的 `if (SENXUN.props)` 掛鉤呼叫。 SENXUN.props
   全部低多邊形、遊戲化風格,放在地標座標上(灰白珊瑚礁石灰岩質感)。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var Hm = SENXUN.height, S = SENXUN.south;
  var Pr = (SENXUN.props = {});

  Pr.build = function (THREE, scene) {
    var ISL = root.SENXUN_ISLAND, W = ISL.W, MH = ISL.H;
    var rockMat = new THREE.MeshStandardMaterial({ color: 0xcfccc2, roughness: 0.95, flatShading: true }); // 灰白礁岩
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x14110e, roughness: 1.0 });                      // 洞口暗影
    function wx(x) { return x - W / 2; }
    function wz(y) { return y - MH / 2; }
    function gY(x, y) { return Hm.groundY(x, y); }

    // 石灰岩洞穴入口:灰白岩丘 + 朝南(面向鏡頭)的暗色洞口
    function caveEntrance(x, y) {
      var g = new THREE.Group();
      var mound = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 0), rockMat);
      mound.scale.set(1.5, 1.1, 1.2); mound.position.y = 2.4; g.add(mound);
      var mouth = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10), darkMat);
      mouth.scale.set(1.0, 1.2, 0.6); mouth.position.set(0, 2.0, 5.0); g.add(mouth); // +z = 南,面向相機
      // 兩側鐘乳/岩柱暗示
      var p1 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.5, 6), rockMat); p1.position.set(-2.4, 2.2, 5.2); g.add(p1);
      var p2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.8, 6), rockMat); p2.position.set(2.5, 1.9, 5.0); g.add(p2);
      g.position.set(wx(x), gY(x, y), wz(y)); scene.add(g);
    }

    // 峭壁:數塊堆疊的灰白岩板
    function cliff(x, y) {
      var g = new THREE.Group();
      for (var i = 0; i < 4; i++) {
        var b = new THREE.Mesh(new THREE.BoxGeometry(7 - i, 3.2, 5 - i * 0.6), rockMat);
        b.position.set((i % 2 ? 1 : -1) * i * 0.8, 1.6 + i * 2.6, 0);
        b.rotation.y = i * 0.4; g.add(b);
      }
      g.position.set(wx(x), gY(x, y), wz(y)); scene.add(g);
    }

    // 山頂石堆(觀景點地標)
    function cairn(x, y) {
      var g = new THREE.Group();
      var sizes = [2.4, 1.8, 1.3, 0.9], yy = 0;
      for (var i = 0; i < sizes.length; i++) {
        var r = new THREE.Mesh(new THREE.IcosahedronGeometry(sizes[i], 0), rockMat);
        yy += sizes[i]; r.position.y = yy; r.rotation.y = i; g.add(r); yy += sizes[i] * 0.4;
      }
      g.position.set(wx(x), gY(x, y), wz(y)); scene.add(g);
    }

    // 離岸礁岩突出:近岸淺水中的灰白礁石(礁岩海岸特徵)
    function reefStack(x, y) {
      var g = new THREE.Group();
      var nb = 2 + (Math.abs(Math.sin(x * 1.3 + y)) * 2 | 0);
      for (var i = 0; i < nb; i++) {
        var s = 1.0 + (i % 3) * 0.5;
        var r = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), rockMat);
        r.position.set((i - nb / 2) * 1.6, 0.4 + (i % 2) * 0.6, (i % 2) * 1.2);
        r.rotation.y = i; g.add(r);
      }
      g.position.set(wx(x), -0.5, wz(y)); scene.add(g); // 坐落於海平面附近
    }

    var ms = (S && S.markers) || [], n = { cave: 0, cliff: 0, cairn: 0, stack: 0 };
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.kind === "cave") { caveEntrance(m.x, m.y); n.cave++; }
      else if (m.kind === "viewpoint") { cairn(m.x, m.y); n.cairn++; }
    }
    // 西子灣岬角峭壁(SW 礁岩角)
    cliff(70, 250); cliff(58, 270); n.cliff += 2;
    // 離岸礁岩突出:沿南岸/西岸近岸淺水放幾簇礁石
    if (S && S.southShoreY) {
      [120, 165, 215, 268].forEach(function (x) { reefStack(x, S.southShoreY(x) + 6); n.stack++; });
    }
    if (S && S.westShoreX) {
      [120, 175].forEach(function (y) { reefStack(S.westShoreX(y) - 6, y); n.stack++; });
    }
    Pr.counts = n; return n;
  };
})(typeof window !== "undefined" ? window : globalThis);
