/* regions.js — named Taiwan places; SENXUN.regions.at(x,y) -> {name,en}.
   Mapped by latitude band (t) + east/west (dx) + special terrain codes. */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var Hm = SENXUN.height;
  var R = (SENXUN.regions = {});
  var ISL;
  R.init = function (island) { ISL = island; };

  R.at = function (x, y) {
    var tc = Hm.terrAt(Math.round(x), Math.round(y));
    if (tc === 7) return { name: "月世界惡地", en: "Moon World Badlands" };
    if (tc === 9) return { name: "柴山(壽山)", en: "Chaishan / Shoushan" };
    if (tc === 8) return { name: "西子灣", en: "Sizihwan" };
    if (tc <= 1) return { name: "台灣海峽/太平洋", en: "Sea" };
    var W = ISL.W, MH = ISL.H, Y0 = ISL.Y0, Y1 = ISL.Y1;
    var yi = Math.max(0, Math.min(MH - 1, y | 0));
    var t = (y - Y0) / (Y1 - Y0);
    var cX = ISL.centerX[yi], hw = Math.max(22, ISL.halfW[yi]);
    var dx = (x - (cX + 0.10 * hw)) / hw;
    var s = Hm.at(x, y), elev = s.elev;
    // 高海拔山峰
    if (elev > 50) {
      if (t > 0.50 && t < 0.66) return { name: "玉山", en: "Yushan (3952m)" };
      if (t > 0.22 && t < 0.40) return { name: "雪山", en: "Xueshan" };
      return { name: "高山雪峰", en: "Alpine Peaks" };
    }
    if (elev > 30) return { name: "中央山脈", en: "Central Mountain Range" };
    // 北端
    if (t < 0.14) {
      if (elev > 14) return { name: "大屯火山群/陽明山", en: "Datun Volcanoes" };
      return { name: "台北盆地", en: "Taipei Basin" };
    }
    // 東側縱谷/海岸山脈
    if (dx > 0.62) {
      if (dx > 0.84) return { name: "海岸山脈", en: "Coastal Range" };
      return { name: "花東縱谷", en: "Huadong Rift Valley" };
    }
    // 西側平原
    if (dx < -0.30 && elev < 8) {
      if (t > 0.55) return { name: "嘉南平原", en: "Chianan Plain" };
      return { name: "西部平原", en: "Western Plain" };
    }
    if (t > 0.80) return { name: "恆春半島", en: "Hengchun Peninsula" };
    if (elev > 8) return { name: "丘陵淺山", en: "Foothills" };
    return { name: "台灣", en: "Taiwan" };
  };
})(typeof window !== "undefined" ? window : globalThis);
