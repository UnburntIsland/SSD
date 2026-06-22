/* camera_south.js — 南部正式場景的「固定 diorama 跟隨鏡頭」。
   取代 camera.js(不動原檔)：世界方位/俯角/距離固定,平滑跟隨玩家位移,
   不可拖曳旋轉、不可滾輪縮放;保留對地形的防穿模高度夾擠。 SENXUN.camera */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var C = SENXUN.config;
  var Cam = (SENXUN.camera = {});
  var cam, W = 380, MH = 480;
  var AZ = 0, PITCH, DIST, FOV;          // AZ=0:相機在南(海側)朝北望向柴山
  var cx, cy, cz, inited = false;

  Cam.build = function (THREE, dom) {
    var ISL = root.SENXUN_ISLAND; if (ISL) { W = ISL.W; MH = ISL.H; }
    PITCH = (C.camPitch || 52) * Math.PI / 180;
    DIST = C.camDist || 72;
    FOV = C.fov || 49;
    cam = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.4, 5000);
    // 固定 diorama:刻意不綁 mousedown/mousemove/wheel(無自由檢視)
    Cam.cam = cam; return cam;
  };

  // 相容 ui.js 既有呼叫(固定鏡頭下為 no-op)
  Cam.setPitch = function () {};
  Cam.azimuth = function () { return AZ; };

  Cam.update = function (target) {
    var px = target.x + DIST * Math.cos(PITCH) * Math.sin(AZ);
    var py = target.y + 6 + DIST * Math.sin(PITCH);
    var pz = target.z + DIST * Math.cos(PITCH) * Math.cos(AZ);
    // 平滑跟隨(緩動),只平移不轉向
    if (!inited) { cx = px; cy = py; cz = pz; inited = true; }
    else { cx += (px - cx) * 0.12; cy += (py - cy) * 0.12; cz += (pz - cz) * 0.12; }
    cam.position.set(cx, cy, cz);
    // 防穿模:相機高於其所在地形
    var Hh = SENXUN.height;
    if (Hh && Hh.groundY) {
      var ix = cam.position.x + W / 2, iz = cam.position.z + MH / 2;
      var g = Hh.groundY(ix, iz);
      if (cam.position.y < g + 5) cam.position.y = g + 5;
    }
    cam.lookAt(target.x, target.y + 2.4, target.z);
  };
})(typeof window !== "undefined" ? window : globalThis);
