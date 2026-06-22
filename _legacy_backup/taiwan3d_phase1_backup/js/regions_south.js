/* regions_south.js — 南部場景地名。SENXUN.regions.at(x,y) -> {name,en}
   依「離岸距離 + 生態帶 + 地標鄰近」命名，供 ui.js HUD 使用。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var Hm = SENXUN.height, S = SENXUN.south;
  var R = (SENXUN.regions = {});

  R.init = function (island) { R.island = island; };

  function nearMarker(x, y) {
    var ms = (S && S.markers) || [], best = null, bd = 22 * 22;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], dx = x - m.x, dy = y - m.y, dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = m; }
    }
    return best;
  }

  R.at = function (x, y) {
    var tc = Hm.terrAt(Math.round(x), Math.round(y));
    if (tc <= 1) return { name: "台灣海峽／高雄港", en: "Strait / Kaohsiung Harbor" };

    var m = nearMarker(x, y);
    if (m) return { name: m.name, en: m.en };

    var s = Hm.at(x, y), elev = s.elev;
    var d = (S && S.inland) ? S.inland(x, y) : 0;
    if (s.biome === "trail") return { name: "柴山登山步道", en: "Shoushan Trail" };
    if (d < 16) return { name: "西子灣海灘", en: "Sizihwan Beach" };
    if (d < 44) return { name: "礁岩海岸", en: "Coral-Reef Coast" };
    if (elev > 56) return { name: "柴山山頂・眺高雄港", en: "Shoushan Summit" };
    if (s.biome === "karst") return { name: "石灰岩礁林", en: "Limestone Karst" };
    return { name: "柴山石灰岩森林", en: "Shoushan Forest" };
  };
})(typeof window !== "undefined" ? window : globalThis);
