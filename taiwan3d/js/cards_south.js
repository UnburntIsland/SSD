/* cards_south.js — 南部場景知識卡資料與解鎖狀態。SENXUN.cards
   只給 south.html 載入;內容取材自《南部地圖:西子灣·鼓山·柴山研究與設計》。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var K = (SENXUN.cards = {});

  var DEFS = {
    KC1: {
      id: "KC1", icon: "🐚", title: "隆起珊瑚礁海岸．西子灣",
      body: "柴山是海底珊瑚礁被板塊運動抬升、露出海面而成的石灰岩山。西子灣以夕陽、中山大學與 1879 年啟用的打狗英國領事館聞名;外海的旗津則是一道天然沙洲，圍出高雄港。"
    },
    KC2: {
      id: "KC2", icon: "🐒", title: "台灣獼猴與「恐懼地景」",
      body: "柴山約有 1,000–1,400 隻台灣獼猴。餵食會改變牠們的行為、增加人猴衝突;維持『人不可預測』的恐懼地景，獼猴才會與人保持安全距離。請勿餵食、收好食物與塑膠袋。"
    },
    KC3: {
      id: "KC3", icon: "🕳️", title: "石灰岩溶洞與泰國谷",
      body: "含弱酸的雨水長期溶蝕石灰岩，形成猴洞、天雨洞等溶洞與峽谷地形。泰國谷因林相鬱閉、濕熱如熱帶而得名;洞中可見鐘乳石與滴石，是喀斯特地形的招牌。"
    },
    KC4: {
      id: "KC4", icon: "🌿", title: "柴山森林與環境修復",
      body: "原生白榕(纏勒榕)是石灰岩森林的指標樹種;外來種銀合歡會排擠原生植物。清除入侵種、復育原生樹，加上不餵食、垃圾不落地、步道減量，就是守護這座山的具體行動。"
    }
  };

  var unlocked = [];
  K.init = function () { unlocked = []; };
  K.all = function () { return DEFS; };
  K.get = function (id) { return DEFS[id] || null; };
  K.isUnlocked = function (id) { return unlocked.indexOf(id) >= 0; };
  K.list = function () { return unlocked.slice(); };
  K.unlock = function (id) {
    if (DEFS[id] && unlocked.indexOf(id) < 0) unlocked.push(id);
    return DEFS[id] || null;
  };
})(typeof window !== "undefined" ? window : globalThis);
