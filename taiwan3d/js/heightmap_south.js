/* heightmap_south.js — 南部「西子灣·柴山」正式場景地形(依山面海的半島)。
   海岸環繞:西=台灣海峽、南=高雄港;岬角/凹灣/西子灣海灣;柴山主峰偏東北。
   PDF「從海到山頂」分層:海 → 沙灘 → 礁岩海岸 → 山坡 → 柴山石灰岩森林 → 山頂稜線。
   石灰岩依「坡度」露出:陡坡/稜線=灰白裸岩,緩坡山谷=綠森林(地質寫實+可讀性)。
   介面同 heightmap.js:SENXUN.height.{init, at, terrAt, groundY, W} */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var U = SENXUN.util, C = SENXUN.config;
  var H = (SENXUN.height = {});
  var S = (SENXUN.south = SENXUN.south || {});

  var W, MH;

  // 分層距離(離岸 tile 數) 與 各層頂高(world 單位)
  var BEACH = 16, CLIFF = 40, FOREST = 150, SUMMIT = 270;
  var beachTop = 1.8, cliffTop = 17, forestTop = 38, summitTop = 64;
  var WEST = 58, SOUTH = 300;                 // 海岸基準

  var CANYON = { x: 300, xw: 11, d0: 64, d1: 172, depth: 26 };  // 泰國谷峽谷
  var PEAK = { x: 330, y: 50, r: 36, h: 11 };                   // 柴山主峰

  S.markers = [
    { name: "西子灣海灘", en: "Sizihwan Beach", x: 140, y: 286, kind: "beach" },
    { name: "龍泉寺登山口", en: "Longquan Trailhead", x: 178, y: 252, kind: "trailhead" },
    { name: "猴洞", en: "Monkey Cave", x: 82, y: 232, kind: "cave" },
    { name: "天雨洞", en: "Tianyu Cave", x: 300, y: 250, kind: "cave" },
    { name: "泰國谷", en: "Thai Valley", x: 300, y: 110, kind: "canyon" },
    { name: "柴山觀景台", en: "Shoushan Lookout", x: 332, y: 44, kind: "viewpoint" },
    { name: "旗津", en: "Cijin", x: 185, y: 376, kind: "offshore" }
  ];

  // 海岸特徵:西子灣海灣 + 西側凹灣 + 南側岬角
  function coveW(y) { return 24 * Math.exp(-Math.pow((y - 282) / 40, 2)); } // 西子灣(SW)
  function coveS(x) { return 24 * Math.exp(-Math.pow((x - 92) / 40, 2)); }
  function westBay(y) { return 26 * Math.exp(-Math.pow((y - 150) / 34, 2)); } // 西岸凹灣(海內凹)
  function southCape(x) { return 30 * Math.exp(-Math.pow((x - 244) / 24, 2)); } // 南岸岬角(陸突出)

  function westShoreX(y) {
    return WEST + (U.fbm(y * 0.012 + 3.1, 4) - 0.5) * 46 + Math.sin(y * 0.05) * 8 - coveW(y) + westBay(y);
  }
  function southShoreY(x) {
    return SOUTH + (U.fbm(x * 0.011 + 9.7, 4) - 0.5) * 52 + Math.sin(x * 0.04 + 2) * 10 - coveS(x) + southCape(x);
  }
  S.westShoreX = westShoreX; S.southShoreY = southShoreY;

  function inland(x, y) {
    var dw = x - westShoreX(y), ds = southShoreY(x) - y;
    return dw < ds ? dw : ds;
  }
  S.inland = inland;

  function sandbar(x, y) { // 旗津離岸沙洲
    return Math.exp(-Math.pow((y - 378) / 11, 2)) * Math.exp(-Math.pow((x - 185) / 105, 2));
  }

  function trailX(d) { return 150 + Math.sin(d * 0.018 + 0.5) * 44 + d * 0.46; }
  S.trailX = trailX;

  function baseH(d) { // 縱向分層基底:沙灘→礁岩→山坡→森林頂→山頂(smoothstep 連續)
    if (d <= 0) return 0;
    if (d < BEACH) return U.smoothstep(0, BEACH, d) * beachTop;
    if (d < CLIFF) return beachTop + U.smoothstep(BEACH, CLIFF, d) * (cliffTop - beachTop);
    if (d < FOREST) return cliffTop + U.smoothstep(CLIFF, FOREST, d) * (forestTop - cliffTop);
    if (d < SUMMIT) return forestTop + U.smoothstep(FOREST, SUMMIT, d) * (summitTop - forestTop);
    return summitTop;
  }

  function detailH(x, y, d) { // 礁岩崎嶇(有界,已收斂避免鋸齒尖塔)
    if (d <= 2) return 0;
    var rg = U.ridged(x * 0.08, y * 0.08, 4, 2.0, 0.55);
    var fb = U.fbm(x * 0.03, y * 0.03, 3);
    var amp = d < BEACH ? 0.3 : (d < CLIFF ? 3.8 : (d < FOREST ? 2.4 : 1.8));
    return rg * amp + (fb - 0.5) * amp * 0.5;
  }

  // 純地形高度(不含 biome/步道壓平):base + 稜線 + 主峰 + 峽谷
  function elevAt(x, y) {
    var d = inland(x, y);
    if (d < 0) return 0;
    var e = baseH(d) + detailH(x, y, d);
    e += (U.ridged(x * 0.014 + 5, y * 0.014 + 9, 3) - 0.42) * U.smoothstep(CLIFF * 0.5, SUMMIT, d) * 13; // 山脊/側谷
    e += PEAK.h * Math.exp(-((x - PEAK.x) * (x - PEAK.x) + (y - PEAK.y) * (y - PEAK.y)) / (2 * PEAK.r * PEAK.r)); // 主峰
    if (d >= CANYON.d0 && d <= CANYON.d1) {
      var along = U.smoothstep(CANYON.d0, CANYON.d0 + 26, d) * (1 - U.smoothstep(CANYON.d1 - 30, CANYON.d1, d));
      e -= CANYON.depth * Math.exp(-Math.pow((x - CANYON.x) / CANYON.xw, 2)) * along;
    }
    return e < 0 ? 0 : e;
  }
  S.elevAt = elevAt;

  function slopeAt(x, y) { // 局部坡度(用純地形,避免遞迴)
    var ex = Math.abs(elevAt(x + 1.2, y) - elevAt(x - 1.2, y));
    var ey = Math.abs(elevAt(x, y + 1.2) - elevAt(x, y - 1.2));
    return (ex > ey ? ex : ey) / 2.4;
  }

  function pickBiome(d, x, y, elev, slope) {
    if (d < BEACH) return "sand";
    if (d < CLIFF) return "reef";              // 灰白礁岩海岸
    if (elev > 52) return "karst";             // 山頂裸岩冠
    if (slope > 1.15) return "karst";          // 陡坡/稜線露出灰白石灰岩
    if (U.noise2(x * 0.06 + 11, y * 0.06 + 7) > 0.85) return "karst"; // 零星露頭
    return "broadleaf";                        // 緩坡/山谷石灰岩森林
  }

  H.init = function (island) {
    W = island.W; MH = island.H; H.W = W;
    if (island.spawn) island.spawn.y = Math.round(southShoreY(island.spawn.x) - BEACH * 0.5);
  };

  H.terrAt = function (x, y) {
    if (x < 0 || y < 0 || x >= W || y >= MH) return 0;
    var d = inland(x, y);
    if (d < 0) return sandbar(x, y) > 0.5 ? 2 : (d > -7 ? 1 : 0);
    return 4;
  };

  H.at = function (x, y) {
    var d = inland(x, y);
    if (d < 0) {
      var sb = sandbar(x, y);
      if (sb > 0.5) { var be = (sb - 0.5) * 5 + 0.3; return { land: true, sea: false, y: be * (C.HS || 1), elev: be, biome: "sand", terr: 2 }; }
      var shallow = d > -7;
      return { land: false, sea: true, y: 0, elev: 0, biome: shallow ? "shallow" : "sea", terr: shallow ? 1 : 0 };
    }
    var elev = elevAt(x, y), biome;
    // 登山步道:壓平 + 專屬配色(可走路徑淨空)
    if (d > BEACH * 0.6 && d < SUMMIT - 6 && Math.abs(x - trailX(d)) < 3.2) {
      elev = baseH(d) * 0.96 + 0.3; biome = "trail";
    } else {
      biome = pickBiome(d, x, y, elev, slopeAt(x, y));
    }
    return { land: true, sea: false, y: elev * (C.HS || 1), elev: elev, biome: biome, terr: 4 };
  };

  H.groundY = function (x, y) { return H.at(x, y).y; };
})(typeof window !== "undefined" ? window : globalThis);
