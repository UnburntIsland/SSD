/* heightmap.js — Taiwan-like terrain model.
   SENXUN.height.at(x,y) -> { land, sea, y(worldY), elev, biome, terr }
   Macro: 中央山脈縱脊(略偏東) + 西部平原(緩) + 東部陡降 + 海岸山脈/花東縱谷
          + 玉山(central-south最高) + 雪山 + 北部大屯火山群 + 雪線雪峰。
   南部沿用原資料的特殊區:7 月世界惡地、9 柴山石灰岩、8 西子灣沙灘。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var U = SENXUN.util, C = SENXUN.config;
  var H = (SENXUN.height = {});

  var ISL, W, MH, Y0, Y1, terr, cxArr, hwArr;

  H.init = function (island) {
    ISL = island; W = island.W; MH = island.H;
    Y0 = island.Y0; Y1 = island.Y1; terr = island.terr;
    cxArr = island.centerX; hwArr = island.halfW;
  };

  function tcode(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= MH) return 0;
    return terr.charCodeAt(y * W + x) - 48;
  }
  H.terrAt = tcode;

  // 主山脈縱向高度剖面(0=北 1=南):central-south 最高,雙峰(玉山/雪山),兩端低
  function ridgeProfile(t) {
    var yushan = Math.exp(-Math.pow((t - 0.57) / 0.27, 2));        // 玉山/中央南段
    var xueshan = 0.72 * Math.exp(-Math.pow((t - 0.30) / 0.15, 2)); // 雪山/北中段
    var hengchun = 0.30 * Math.exp(-Math.pow((t - 0.86) / 0.10, 2)); // 恆春丘陵(低)
    return U.clamp(yushan + xueshan + hengchun, 0, 1.25);
  }

  // 月世界惡地:低基底 + 尖銳縱向雨蝕稜脊
  function moonRidge(x, y) {
    var r1 = U.tri(x * 0.92 + y * 0.10), r2 = U.tri(x * 1.9 + y * 0.04 + 0.3), r3 = U.tri(y * 0.5 + x * 0.08 + 0.7);
    var r = r1 * 0.55 + r2 * 0.30 + r3 * 0.15;
    return Math.pow(r, 1.7);
  }
  H.moonRidge = moonRidge;

  // 北部大屯火山群(七星山/大屯山):北端幾座圓錐峰
  function volcano(x, y, t) {
    if (t > 0.16) return 0;
    var cx = cxArr[Math.max(0, Math.min(MH - 1, y | 0))];
    var peaks = [[cx - 18, Y0 + 26], [cx + 14, Y0 + 40], [cx - 4, Y0 + 58]];
    var v = 0;
    for (var i = 0; i < peaks.length; i++) {
      var dx = (x - peaks[i][0]) / 16, dy = (y - peaks[i][1]) / 16;
      v += Math.exp(-(dx * dx + dy * dy));
    }
    return Math.min(1, v);
  }

  // 主查詢
  H.at = function (x, y) {
    var tc = tcode(Math.round(x), Math.round(y));
    if (tc <= 1) return { land: false, sea: true, y: 0, elev: 0, biome: tc === 1 ? "shallow" : "sea", terr: tc };

    var yi = Math.max(0, Math.min(MH - 1, y | 0));
    var t = U.clamp((y - Y0) / (Y1 - Y0), 0, 1);
    var cX = cxArr[yi], hw = Math.max(22, hwArr[yi]);
    var spineX = cX + 0.10 * hw;
    var dx = (x - spineX) / hw;                 // <0 西(平原側) >0 東(陡降側)

    // 南部特殊地形優先
    if (tc === 7) { // 月世界惡地
      var mb = 5 + (moonRidge(x, y) - 0.35) * 14;
      mb = Math.max(1.5, mb);
      return finalize(x, y, mb, "badland", tc, dx, t);
    }
    if (tc === 9) { // 柴山:高位珊瑚礁石灰岩(灰白嶙峋,中等高度、崎嶇)
      var lj = U.ridged(x * 0.16, y * 0.16, 4) ;
      var lb = 8 + lj * 16;
      return finalize(x, y, lb, "limestone", tc, dx, t);
    }
    if (tc === 8) { // 西子灣沙灘
      return finalize(x, y, 0.6, "beach", tc, dx, t);
    }

    // 主山脈 macro
    var prof = ridgeProfile(t);
    var west = U.clamp(1 + dx / 0.95, 0, 1);     // 緩長西坡到平原
    var east = U.clamp(1 - dx / 0.55, 0, 1);     // 陡短東坡
    var f = dx < 0 ? west : east;
    var elevBase = C.MAXH * prof * f;

    // 崎嶇:山越高越崎嶇
    var rough = U.ridged(x * 0.022, y * 0.022, 5, 2.0, 0.55);
    var elev = elevBase * 0.5 + elevBase * rough * 0.62;

    // 西部平原微起伏
    if (f < 0.25) elev += U.fbm(x * 0.02, y * 0.02, 3) * 2.2;

    // 海岸山脈 + 花東縱谷(東側遠岸一條低脊,中段)
    if (dx > 0.62 && t > 0.30 && t < 0.66) {
      var cr = U.smoothstep(0.62, 0.82, dx) * (1 - U.smoothstep(0.92, 1.05, dx));
      var crLat = Math.exp(-Math.pow((t - 0.48) / 0.16, 2));
      elev += C.MAXH * 0.16 * cr * crLat * (0.6 + 0.5 * U.ridged(x * 0.05, y * 0.05, 3));
    }

    // 北部火山
    var vc = volcano(x, y, t);
    if (vc > 0) elev = Math.max(elev, 6 + vc * (C.MAXH * 0.34));

    var biome = pickBiome(elev, dx, f);
    return finalize(x, y, elev, biome, tc, dx, t);
  };

  function pickBiome(elev, dx, f) {
    if (elev > C.SNOW) return "snow";
    if (elev > C.ROCK) return "rock";
    if (elev > C.CONIFER) return "conifer";
    if (elev > C.BROAD) return "broadleaf";
    if (dx < -0.25 && f < 0.32) return "plain";   // 西部平原/農田
    return "grass";
  }

  // 海岸帶降到 0(沙灘),回傳世界 Y(含 HS)
  function finalize(x, y, elev, biome, tc, dx, t) {
    var yi = Math.max(0, Math.min(MH - 1, y | 0));
    var cX = cxArr[yi], hw = Math.max(22, hwArr[yi]);
    var edge = U.clamp((1 - Math.abs(x - cX) / (hw + 1)) * 7, 0, 1); // 近岸→0
    var e = elev * edge;
    if (biome !== "beach" && biome !== "sand" && e < 0.8 && tc >= 2) biome = "sand"; // 低平近岸=沙
    return { land: true, sea: false, y: e * SENXUN.config.HS, elev: e, biome: biome, terr: tc };
  }

  // 給植被/玩家用的純高度
  H.groundY = function (x, y) { return H.at(x, y).y; };
})(typeof window !== "undefined" ? window : globalThis);
