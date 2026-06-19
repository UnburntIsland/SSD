/* npc_south.js — 世界中的敘事引導:巡守員嚮導 NPC(可對話) + 各目標解說牌。SENXUN.npc
   滿足「至少一個 NPC 或敘事引導物」並強化方向感/教學。由 main.js build/update 掛鉤。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var Hm = SENXUN.height;
  var N = (SENXUN.npc = {});
  var W, MH, npcGrp, t = 0, count = 0;

  function wx(x) { return x - W / 2; }
  function wz(y) { return y - MH / 2; }

  // 以 canvas 畫字做成木牌貼圖(無外部資產)
  function signTexture(THREE, text) {
    var c = root.document.createElement("canvas"); c.width = 256; c.height = 128;
    var g = c.getContext("2d");
    g.fillStyle = "#5a3d22"; g.fillRect(0, 0, 256, 128);
    g.fillStyle = "#ecdcb6"; g.fillRect(8, 8, 240, 112);
    g.fillStyle = "#3a2a16"; g.textAlign = "center"; g.textBaseline = "middle";
    var lines = text.split("\n");
    g.font = 'bold 34px "Noto Sans TC",system-ui,sans-serif';
    for (var i = 0; i < lines.length; i++) g.fillText(lines[i], 128, 46 + i * 40);
    return new THREE.CanvasTexture(c);
  }

  function signpost(THREE, scene, x, y, text) {
    var g = new THREE.Group();
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 1 }));
    post.position.y = 3; g.add(post);
    var board = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 4.2),
      new THREE.MeshStandardMaterial({ map: signTexture(THREE, text), side: THREE.DoubleSide, roughness: 1 }));
    board.position.y = 6.4; g.add(board); // 預設面向 +z(南/鏡頭),文字正向
    g.position.set(wx(x), Hm.groundY(x, y), wz(y));
    scene.add(g); count++;
  }

  function buildNPC(THREE, scene, x, y) {
    var g = new THREE.Group();
    var bodyMat = new THREE.MeshStandardMaterial({ color: 0x4e7a43 });   // 巡守員綠制服
    var skinMat = new THREE.MeshStandardMaterial({ color: 0xf0c89a });
    var hatMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2a });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 2.3, 10), bodyMat).translateY(1.65));
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), skinMat); head.position.y = 3.2; g.add(head);
    var brim = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.12, 14), hatMat); brim.position.y = 3.75; g.add(brim);
    var top = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.9, 14), hatMat); top.position.y = 4.05; g.add(top);
    g.position.set(wx(x), Hm.groundY(x, y), wz(y));
    scene.add(g); count++;
    return g;
  }

  N.build = function (THREE, scene) {
    var ISL = root.SENXUN_ISLAND; W = ISL.W; MH = ISL.H; count = 0; t = 0;
    var nx = 150, ny = 298;                       // 出生點旁
    npcGrp = buildNPC(THREE, scene, nx, ny);
    if (SENXUN.interactions && SENXUN.interactions.addTalk) {
      SENXUN.interactions.addTalk({
        id: "guide", x: nx, y: ny, label: "與巡守員對話",
        dialogue: {
          title: "🧑‍🌾 柴山巡守員",
          body: "歡迎，調查員！用 WASD／方向鍵移動，靠近發光點按 E 調查。跟著畫面上的 🎯 走:先調查西子灣海岸的 3 個點，再沿步道上山。遇到台灣獼猴請保持距離、別餵食。"
        }
      });
    }
    // 各目標解說牌(敘事引導物)
    signpost(THREE, scene, 150, 283, "① 西子灣海岸\n調查潮間帶");
    signpost(THREE, scene, 180, 270, "② 柴山步道\n循指引上山"); // 置於步道西側空地,不擋走線
    signpost(THREE, scene, 300, 258, "③ 天雨洞\n石灰岩溶洞");
    signpost(THREE, scene, 332, 52, "④ 山頂觀景台\n環境復育");
    N.count = count;
    return count;
  };

  N.update = function (dt) {
    if (!npcGrp) return; t += dt;
    npcGrp.rotation.y = Math.sin(t * 0.6) * 0.35; // 輕微擺動,有生氣
  };
})(typeof window !== "undefined" ? window : globalThis);
