/* config.js — tunable constants + biome palette. Namespace: SENXUN.config */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  SENXUN.config = {
    // terrain vertical scale (height slider multiplies this)
    HS: 1.0,
    MAXH: 64,            // max mountain elevation (world units) ~ 玉山
    SNOW: 50, ROCK: 38, CONIFER: 22, BROAD: 8,  // biome elevation thresholds
    // mesh
    SUB_DETAIL: 4,       // south detail subdivision
    // camera
    camDist: 60, camPitch: 54, camMin: 12, camMax: 600,
    // movement
    walkSpeed: 26,
    // biome colors (0-255)
    COL: {
      sea:       [34, 70, 110],
      shallow:   [86, 158, 188],
      beach:     [231, 214, 156],
      sand:      [228, 210, 150],
      plain:     [150, 186, 100],   // 西部平原 / 農田
      grass:     [120, 172, 92],
      broadleaf: [72, 138, 64],     // 闊葉林
      conifer:   [52, 104, 70],     // 針葉林(高山)
      rock:      [138, 136, 126],   // 高山裸岩
      snow:      [234, 240, 242],   // 雪線以上
      badland:   [208, 209, 204],   // 月世界(青灰白堊)
      limestone: [158, 164, 142],   // 柴山(珊瑚礁石灰岩)
      volcanic:  [120, 104, 96],    // 大屯火山
      // 南部場景(south.html)專用 — 灰白珊瑚礁石灰岩質感與步道
      reef:      [185, 186, 178],   // 礁岩海岸(灰白濕岩)
      karst:     [212, 210, 201],   // 柴山石灰岩(近灰白嶙峋)
      trail:     [172, 150, 118]    // 登山步道(土黃)
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
