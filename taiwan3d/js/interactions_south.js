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
  I.init = function (custom) { pts = (custom || defaults()).slice(); };
  I.points = function () { return pts; };
  // 加入常駐對話點(NPC/嚮導):永遠可互動、不消耗、不推進任務
  I.addTalk = function (p) {
    pts.push({ id: p.id, x: p.x, y: p.y, kind: "talk", label: p.label || "對話",
      dialogue: p.dialogue || null, persistent: true, triggered: false });
  };
  I.talks = function () { return pts.filter(function (p) { return p.persistent; }); };

  function curObj() { return SENXUN.quest ? SENXUN.quest.state().objectiveId : null; }
  // talk 點永遠可互動;任務點依「當前目標、未觸發」
  function active(p) {
    if (p.persistent) return true;
    if (p.triggered) return false;
    return !p.objective || p.objective === curObj();
  }
  function notTalk(p) { return !p.persistent; }
  function isTalk(p) { return !!p.persistent; }
  function d2(p, x, y) { var dx = p.x - x, dy = p.y - y; return dx * dx + dy * dy; }

  function collect(x, y, pred) {
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!active(p) || !pred(p)) continue;
      var dd = d2(p, x, y);
      if (dd <= RADIUS * RADIUS) out.push({ id: p.id, label: p.label, dist: Math.sqrt(dd) });
    }
    out.sort(function (a, b) { return a.dist - b.dist; });
    return out;
  }
  function nearest(x, y, pred) {
    var best = null, bd = RADIUS * RADIUS;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!active(p) || !pred(p)) continue;
      var dd = d2(p, x, y);
      if (dd <= bd) { bd = dd; best = p; }
    }
    return best;
  }

  // 任務點優先;沒有任務點在範圍才回 talk 點
  I.inRange = function (x, y) {
    var q = collect(x, y, notTalk);
    return q.length ? q : collect(x, y, isTalk);
  };
  I.nearestInRange = function (x, y) { return nearest(x, y, notTalk) || nearest(x, y, isTalk); };

  // 導引:只指向當前任務點(排除 talk)
  I.nextTarget = function (x, y) {
    var best = null, bd = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!active(p) || p.persistent) continue;
      var dd = (x == null) ? 0 : d2(p, x, y);
      if (dd < bd) { bd = dd; best = p; }
    }
    return best ? { id: best.id, x: best.x, y: best.y, label: best.label } : null;
  };

  // 觸發:任務點優先(消耗+推進);否則 talk 點(顯示對話、不消耗)
  I.tryInteract = function (x, y) {
    var q = nearest(x, y, notTalk);
    if (q) { q.triggered = true; var s = SENXUN.quest ? SENXUN.quest.onInspect(q) : null; return { ok: true, point: q, state: s }; }
    var t = nearest(x, y, isTalk);
    if (t) return { ok: true, talk: true, point: t, dialogue: t.dialogue };
    return { ok: false };
  };
})(typeof window !== "undefined" ? window : globalThis);
