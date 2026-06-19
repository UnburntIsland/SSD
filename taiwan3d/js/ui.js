/* ui.js — HUD: region label, biome/elevation readout, sliders. SENXUN.ui */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var C = SENXUN.config;
  var UI = (SENXUN.ui = {});
  var elRegion, elInfo, hsTimer = null, acc = 0;
  UI.build = function () {
    elRegion = document.getElementById("region");
    elInfo = document.getElementById("info");
    var hs = document.getElementById("hs"), el = document.getElementById("el"),
        dc = document.getElementById("dc");
    if (hs) hs.oninput = function () {
      C.HS = parseFloat(hs.value); document.getElementById("hsv").textContent = C.HS.toFixed(1);
      SENXUN.terrain.rebuildHeights();
      if (hsTimer) clearTimeout(hsTimer);
      hsTimer = setTimeout(function () { SENXUN.terrain.recomputeNormals(); }, 160);
    };
    if (el) el.oninput = function () {
      document.getElementById("elv").textContent = el.value + "°";
      SENXUN.camera.setPitch(parseFloat(el.value));
    };
    if (dc) dc.onchange = function (e) { SENXUN.lighting.setDayCycle(e.target.checked); };
  };
  UI.update = function (dt, player) {
    acc += dt; if (acc < 0.2) return; acc = 0;
    var tl = player.tile(); var r = SENXUN.regions.at(tl.x, tl.y);
    var s = SENXUN.height.at(tl.x, tl.y);
    if (elRegion) elRegion.textContent = r.name + "  (" + r.en + ")";
    if (elInfo) elInfo.textContent = "生態帶 " + s.biome + " · 海拔 " + Math.round(s.elev) + " · 座標 " +
      Math.round(tl.x) + "," + Math.round(tl.y);
  };
})(typeof window !== "undefined" ? window : globalThis);
