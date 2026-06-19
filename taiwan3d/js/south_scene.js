/* south_scene.js — 南部「西子灣·柴山」正式場景設定。
   只給 south.html 載入:定義 window.SENXUN_ISLAND,並對 SENXUN.config 做場景覆寫
   (固定鏡頭、夕照光、地形範圍)。全台版(taiwan.html)不載入本檔,設定互不影響。 */
(function (root) {
  var W = 380, H = 480;
  // 場景地圖資料(取代 data_island.js):spawn 在西子灣南側海灘(y 由 heightmap_south 對齊)
  root.SENXUN_ISLAND = { W: W, H: H, spawn: { x: 150, y: 286 }, Y0: 0, Y1: H };

  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var C = SENXUN.config;
  if (C) {
    C.title = "森循島 — 西子灣·柴山";
    // mesh:聚焦陸地+海岸帶(含西側海與旗津沙洲),裁掉開放海面
    C.bbox = { x0: 28, x1: 376, y0: 0, y1: 400, sub: 1.5 };
    C.detail = null;          // 不需要全台版的南部挖洞+貼片
    C.cullSea = true;         // 裁掉海面三角形,露出海平面
    C.vegBounds = { x0: 30, x1: 374, y0: 2, y1: 398 };
    C.maxStep = 3.0;          // 玩家坡度上限(避免陡崖垂直瞬移)
    C.MAXH = 64; C.HS = 1.0;  // 固定高度,不再由 slider 調整
    // 固定 diorama 鏡頭(camera_south.js 使用):放低俯角、拉近 → 較貼身第三人稱,不像俯瞰地圖(F6)
    C.camPitch = 36; C.camDist = 60; C.fov = 52;
    C.walkSpeed = 22;
    // 夕照光(lighting.js 讀取;未設則維持原樣,全台版不變)
    C.sun = {
      dir: [-1.30, 0.30, 0.18],   // 夕陽自西方海面斜射
      color: 0xffad5a, intensity: 1.62,
      amb: 0x6a5a4c, ambI: 0.40,
      hemiSky: 0xf6cf96, hemiGround: 0x46382a, hemiI: 0.46,
      sky: 0xf2c48f,                // 暖色天空
      fog: 0xe9bd86, fogNear: 200, fogFar: 1150   // 拉近近霧增加空氣層次
    };
    // 夕照海面:低粗糙→陽光鏡面反光;metalness 維持 0(無 envMap,金屬度會讓水面變黑)
    C.seaMat = { color: 0x357f97, opacity: 0.92, roughness: 0.2, metalness: 0.0, y: -0.4 };
  }
})(typeof window !== "undefined" ? window : globalThis);
