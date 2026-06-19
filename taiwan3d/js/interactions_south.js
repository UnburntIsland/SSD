/* interactions_south.js — 南部場景互動點:接近偵測 + 觸發。SENXUN.interactions
   每幀以玩家 tile 座標算範圍內互動點(供 UI 顯示「按 E」提示);
   按 E 時 tryInteract 觸發最近的未觸發點，並把事件派發給 quest。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var I = (SENXUN.interactions = {});
  var RADIUS = 7; // tile
  I.radius = RADIUS;

  // 互動點(座標皆已驗證落在可走地形;目標 2 兩點落在實際 trail 格 → 解 F2)
  function defaults() {
    return [
      // 目標 1:調查西子灣海岸(海灘)
      { id: "ip1", x: 150, y: 288, objective: 1, kind: "inspect", label: "調查潮間帶", triggered: false },
      { id: "ip2", x: 160, y: 290, objective: 1, kind: "inspect", label: "檢視海漂垃圾", triggered: false },
      { id: "ip3", x: 140, y: 290, objective: 1, kind: "inspect", label: "觀察礁岩", triggered: false },
      // 目標 2:沿柴山步道上山(點落在 biome==='trail' 的格上)
      { id: "ip4", x: 186, y: 276, objective: 2, kind: "trailhead", label: "踏上柴山步道", triggered: false },
      { id: "ip5", x: 216, y: 240, objective: 2, kind: "monkey", label: "觀察台灣獼猴", triggered: false },
      // 目標 3:找到石灰岩洞穴(天雨洞,有洞口道具)
      { id: "ip6", x: 300, y: 250, objective: 3, kind: "cave", label: "探查天雨洞", triggered: false },
      // 目標 4:山頂環境修復(觀景台)
      { id: "ip7", x: 332, y: 44, objective: 4, kind: "restore", label: "復育柴山森林", triggered: false }
    ];
  }

  var pts = [];
  I.init = function (custom) { pts = custom || defaults(); };
  I.points = function () { return pts; };

  // 只考慮「當前目標」的點(避免越級觸發,也讓導引只指向當前目標)
  function curObj() { return SENXUN.quest ? SENXUN.quest.state().objectiveId : null; }
  function active(p) { return !p.triggered && (!p.objective || p.objective === curObj()); }

  function d2(p, x, y) { var dx = p.x - x, dy = p.y - y; return dx * dx + dy * dy; }

  I.inRange = function (x, y) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      if (!active(pts[i])) continue;
      var dd = d2(pts[i], x, y);
      if (dd <= RADIUS * RADIUS) out.push({ id: pts[i].id, label: pts[i].label, dist: Math.sqrt(dd) });
    }
    out.sort(function (a, b) { return a.dist - b.dist; });
    return out;
  };

  I.nearestInRange = function (x, y) {
    var best = null, bd = RADIUS * RADIUS;
    for (var i = 0; i < pts.length; i++) {
      if (!active(pts[i])) continue;
      var dd = d2(pts[i], x, y);
      if (dd <= bd) { bd = dd; best = pts[i]; }
    }
    return best;
  };

  // 導引用:當前目標尚未觸發、離玩家最近的點(供箭頭指向)
  I.nextTarget = function (x, y) {
    var best = null, bd = Infinity;
    for (var i = 0; i < pts.length; i++) {
      if (!active(pts[i])) continue;
      var dd = (x == null) ? 0 : d2(pts[i], x, y);
      if (dd < bd) { bd = dd; best = pts[i]; }
    }
    return best ? { id: best.id, x: best.x, y: best.y, label: best.label } : null;
  };

  // 觸發最近的未觸發互動點;回傳 {ok, point, state}
  I.tryInteract = function (x, y) {
    var p = I.nearestInRange(x, y);
    if (!p) return { ok: false };
    p.triggered = true;
    var state = SENXUN.quest ? SENXUN.quest.onInspect(p) : null;
    return { ok: true, point: p, state: state };
  };
})(typeof window !== "undefined" ? window : globalThis);
