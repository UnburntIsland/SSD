/* heightmap_south.js — 南部「西子灣·柴山」正式場景地形(依山面海的半島)。
   海岸環繞:西側=台灣海峽、南側=高雄港;柴山山體偏東北,西南角為西子灣岬角+海灣;
   高雄港對岸有旗津離岸沙洲(純地景)。依 PDF「從海到山頂」分層:
     海 → 沙灘/海水浴場 → 陡峭礁岩海岸 → 柴山石灰岩森林 → 山頂稜線(眺港)。
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

  // 海岸基準:西側海寬 ~WEST,南側海從 SOUTH 之後
  var WEST = 58, SOUTH = 300;

  // 泰國谷峽谷
  var CANYON = { x: 300, xw: 11, d0: 64, d1: 172, depth: 26 };

  // 地標 / 洞穴入口(給 regions_south 命名、Phase 2 標記用)
  S.markers = [
    { name: "西子灣海灘", en: "Sizihwan Beach", x: 140, y: 286, kind: "beach" },
    { name: "龍泉寺登山口", en: "Longquan Trailhead", x: 178, y: 252, kind: "trailhead" },
    { name: "猴洞", en: "Monkey Cave", x: 82, y: 232, kind: "cave" },
    { name: "天雨洞", en: "Tianyu Cave", x: 300, y: 250, kind: "cave" },
    { name: "泰國谷", en: "Thai Valley", x: 300, y: 110, kind: "canyon" },
    { name: "柴山觀景台", en: "Shoushan Lookout", x: 332, y: 44, kind: "viewpoint" },
    { name: "旗津", en: "Cijin", x: 185, y: 376, kind: "offshore" }
  ];

  // 西子灣海灣(SW 角內凹):把兩側海岸往內陸推
  function coveW(y) { return 24 * Math.exp(-Math.pow((y - 282) / 40, 2)); }
  function coveS(x) { return 24 * Math.exp(-Math.pow((x - 92) / 40, 2)); }

  // 西海岸:傳回該 y 列海岸的 x(海在 x<westShoreX)
  function westShoreX(y) {
    return WEST + (U.fbm(y * 0.012 + 3.1, 4) - 0.5) * 46 + Math.sin(y * 0.05) * 8 - coveW(y);
  }
  // 南海岸:傳回該 x 欄海岸的 y(海在 y>southShoreY)
  function southShoreY(x) {
    return SOUTH + (U.fbm(x * 0.011 + 9.7, 4) - 0.5) * 52 + Math.sin(x * 0.04 + 2) * 10 - coveS(x);
  }
  S.westShoreX = westShoreX; S.southShoreY = southShoreY;

  // 離岸距離:到最近海岸(西或南)的距離;<0 表示在海中
  function inland(x, y) {
    var dw = x - westShoreX(y), ds = southShoreY(x) - y;
    return dw < ds ? dw : ds;
  }
  S.inland = inland;

  // 旗津離岸沙洲(高雄港對岸,純地景):0..1
  function sandbar(x, y) {
    return Math.exp(-Math.pow((y - 378) / 11, 2)) * Math.exp(-Math.pow((x - 185) / 105, 2));
  }

  // 登山步道中心線(沿離岸距離蜿蜒並往東北偏向柴山)
  function trailX(d) { return 150 + Math.sin(d * 0.018 + 0.5) * 44 + d * 0.46; }
  S.trailX = trailX;

  // 縱向分層基底高度
  function baseH(d) {
    if (d <= 0) return 0;
    if (d < BEACH) return U.smoothstep(0, BEACH, d) * beachTop;
    if (d < CLIFF) return beachTop + U.smoothstep(BEACH, CLIFF, d) * (cliffTop - beachTop);
    if (d < FOREST) return cliffTop + U.smoothstep(CLIFF, FOREST, d) * (forestTop - cliffTop);
    if (d < SUMMIT) return forestTop + U.smoothstep(FOREST, SUMMIT, d) * (summitTop - forestTop);
    return summitTop;
  }

  // 細節雜訊(礁岩崎嶇),依分層調整振幅,有界不破碎
  function detailH(x, y, d) {
    if (d <= 2) return 0;
    var rg = U.ridged(x * 0.085, y * 0.085, 4, 2.0, 0.55);
    var fb = U.fbm(x * 0.03, y * 0.03, 3);
    var amp = d < BEACH ? 0.35 : (d < CLIFF ? 4.6 : (d < FOREST ? 3.0 : 2.2));
    return rg * amp + (fb - 0.5) * amp * 0.5;
  }

  function pickBiome(d, x, y, elev) {
    if (d < BEACH) return "sand";
    if (d < CLIFF) return "reef";                 // 灰白礁岩海岸
    if (elev > 54) return "karst";                // 近山頂裸岩冠
    var k = U.noise2(x * 0.06 + 11, y * 0.06 + 7);
    if (k > 0.80) return "karst";                 // 零星灰白礁岩露頭
    return "broadleaf";                           // 石灰岩森林(主體)
  }

  H.init = function (island) {
    W = island.W; MH = island.H; H.W = W;
    // 出生點對齊西子灣南側海灘(避免落在海裡)
    if (island.spawn) {
      island.spawn.y = Math.round(southShoreY(island.spawn.x) - BEACH * 0.5);
    }
  };

  H.terrAt = function (x, y) {
    if (x < 0 || y < 0 || x >= W || y >= MH) return 0;
    var d = inland(x, y);
    if (d < 0) return sandbar(x, y) > 0.5 ? 2 : (d > -7 ? 1 : 0); // 沙洲/淺海/深海
    return 4;
  };

  H.at = function (x, y) {
    var d = inland(x, y);
    if (d < 0) {
      // 海中:檢查旗津沙洲
      var sb = sandbar(x, y);
      if (sb > 0.5) {
        var be = (sb - 0.5) * 5 + 0.3;
        return { land: true, sea: false, y: be * (C.HS || 1), elev: be, biome: "sand", terr: 2 };
      }
      var shallow = d > -7;
      return { land: false, sea: true, y: 0, elev: 0, biome: shallow ? "shallow" : "sea", terr: shallow ? 1 : 0 };
    }
    var elev = baseH(d) + detailH(x, y, d);
    // 柴山稜線/側谷:讓山體有起伏不像平板台地(中上坡生效,有界)
    elev += (U.ridged(x * 0.014 + 5, y * 0.014 + 9, 3) - 0.42) * U.smoothstep(CLIFF * 0.5, SUMMIT, d) * 13;
    // 泰國谷峽谷:刻出深槽(沿長度方向兩端漸收,讀起來是峽谷不是硬塊)
    if (d >= CANYON.d0 && d <= CANYON.d1) {
      var along = U.smoothstep(CANYON.d0, CANYON.d0 + 26, d) * (1 - U.smoothstep(CANYON.d1 - 30, CANYON.d1, d));
      elev -= CANYON.depth * Math.exp(-Math.pow((x - CANYON.x) / CANYON.xw, 2)) * along;
    }
    if (elev < 0) elev = 0;
    // 登山步道:壓平 + 專屬配色(可讀路徑)
    var biome;
    if (d > BEACH * 0.6 && d < SUMMIT - 6 && Math.abs(x - trailX(d)) < 3.2) {
      elev = baseH(d) * 0.96 + 0.3; biome = "trail";
    } else biome = pickBiome(d, x, y, elev);
    return { land: true, sea: false, y: elev * (C.HS || 1), elev: elev, biome: biome, terr: 4 };
  };

  H.groundY = function (x, y) { return H.at(x, y).y; };
})(typeof window !== "undefined" ? window : globalThis);
