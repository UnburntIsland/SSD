/* collision_south.js — 探索碰撞:實體物件 blocker(空間網格) + 關卡邊界。SENXUN.collision
   只擋「實體大物件」(NPC/解說牌/洞口岩丘/峭壁/大露頭/白榕樹幹);平台甲板、步道、小草不擋。
   半徑一律 < 互動半徑(7),確保互動點仍可從外觸發。海/淺海/陡坡仍由 player.walkable 既有規則處理。
   由 main.js 在世界建好後 init();player.walkable 查詢 blocked()/inBounds()。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var Col = (SENXUN.collision = {});
  var CELL = 8, cells = {}, PR = 0.8;             // 網格邊長、玩家半徑
  var BX0 = 44, BX1 = 360, BY0 = 30, BY1 = 402;   // 關卡邊界(設計半島 bbox)

  // 實體 blocker [x, y, r] — 座標對應 npc_south / south_props / environment_art(半徑 < 7)
  var SOLID = [
    [150, 298, 1.2],                                       // 巡守員 NPC
    [150, 283, 0.8], [192, 268, 0.8], [300, 258, 0.8], [332, 52, 0.8], // 解說牌(細柱)
    [82, 232, 4.4], [300, 250, 4.2],                       // 洞口岩丘(猴洞/天雨洞;ip6 仍可從外觸發)
    [70, 250, 4.0], [58, 270, 4.0],                        // 西子灣岬角峭壁
    [266, 168, 4.5],                                       // 石灰岩巨岩露頭
    [232, 214, 2.0]                                        // 白榕地標樹幹
  ];

  function key(cx, cy) { return cx + "," + cy; }
  Col.register = function (x, y, r) {
    var cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), k = key(cx, cy);
    (cells[k] || (cells[k] = [])).push([x, y, r]);
  };
  Col.init = function (custom) {
    cells = {}; var list = custom || SOLID;
    for (var i = 0; i < list.length; i++) Col.register(list[i][0], list[i][1], list[i][2]);
    return list.length;
  };
  // 半徑 < CELL,故只需查 3x3 鄰格
  Col.blocked = function (x, y) {
    var cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (var ax = -1; ax <= 1; ax++) for (var ay = -1; ay <= 1; ay++) {
      var arr = cells[key(cx + ax, cy + ay)]; if (!arr) continue;
      for (var i = 0; i < arr.length; i++) {
        var b = arr[i], dx = x - b[0], dy = y - b[1], rr = b[2] + PR;
        if (dx * dx + dy * dy < rr * rr) return true;
      }
    }
    return false;
  };
  Col.inBounds = function (x, y) { return x >= BX0 && x <= BX1 && y >= BY0 && y <= BY1; };
  Col.bounds = function () { return { x0: BX0, x1: BX1, y0: BY0, y1: BY1 }; };
})(typeof window !== "undefined" ? window : globalThis);
