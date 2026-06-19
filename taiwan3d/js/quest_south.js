/* quest_south.js — 南部場景任務狀態機。SENXUN.quest
   4 個目標(增量 1 只有目標 1=調查海岸 3 點有互動點;2-4 先佔位,後續增量補)。
   互動點被觸發時由 interactions 呼叫 onInspect;完成目標即解鎖對應知識卡並推進。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var Q = (SENXUN.quest = {});

  var OBJ = [
    { id: 1, title: "調查西子灣海岸", hint: "沿海灘找出 3 處調查點，走近按 E 調查", need: 3, card: "KC1" },
    { id: 2, title: "沿柴山步道上山", hint: "踏上步道、沿路觀察(共 2 點)", need: 2, card: "KC2" },
    { id: 3, title: "找到石灰岩洞穴／泰國谷", hint: "循指引抵達洞口或峽谷，按 E 調查", need: 1, card: "KC3" },
    { id: 4, title: "完成環境修復", hint: "在山頂復育點清除外來種、復育原生樹", need: 1, card: "KC4" }
  ];

  var index = 0, progress = 0, done = false, lastEvent = null, justUnlocked = null;

  Q.init = function () { index = 0; progress = 0; done = false; lastEvent = null; justUnlocked = null; };
  Q.objectives = function () { return OBJ; };
  Q.state = function () {
    var o = OBJ[index] || OBJ[OBJ.length - 1];
    return {
      index: index, total: OBJ.length,
      objectiveId: o.id, title: o.title, hint: o.hint,
      progress: progress, need: o.need, done: done,
      event: lastEvent,          // 'progress' | 'objective-complete' | 'all-complete'
      unlockedCard: justUnlocked  // 本次互動剛解鎖的知識卡 id(沒有則 null)
    };
  };

  // 由 interactions.tryInteract 呼叫;point.objective 指該點屬於哪個目標
  Q.onInspect = function (point) {
    lastEvent = null; justUnlocked = null;
    if (done) return Q.state();
    var o = OBJ[index];
    if (!o) return Q.state();
    if (point && point.objective && point.objective !== o.id) return Q.state(); // 不屬當前目標
    progress++;
    lastEvent = "progress";
    if (progress >= o.need) {
      if (o.card && SENXUN.cards) { SENXUN.cards.unlock(o.card); justUnlocked = o.card; }
      if (index < OBJ.length - 1) { index++; progress = 0; lastEvent = "objective-complete"; }
      else { done = true; lastEvent = "all-complete"; }
    }
    return Q.state();
  };
})(typeof window !== "undefined" ? window : globalThis);
