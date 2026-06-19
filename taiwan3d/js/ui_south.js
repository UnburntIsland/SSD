/* ui_south.js — 南部正式場景 HUD/UI。SENXUN.ui
   常駐地點 + 目標/進度 + 知識卡數;互動提示、知識卡彈窗、目標完成 toast、
   目標指引 pin、開始畫面、完成畫面。(取代 ui.js;全台版仍用 ui.js) */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var UI = (SENXUN.ui = {});
  var plate, elRegion, elEn, elLoc, elGoal, elProg, elCards, elPrompt, elToast,
    elCard, elCardTag, elCardTitle, elCardBody, elMark, elMarkLab, elStart, elComplete, elCompleteCards;
  var acc = 0, lastName = "", hideTimer = 0, toastTimer = 0;
  var cardShown = false, startShown = true, pendingComplete = false;

  function $(id) { return document.getElementById(id); }

  UI.build = function () {
    plate = $("nameplate"); elRegion = $("region"); elEn = $("region-en");
    elLoc = $("hud-loc"); elGoal = $("hud-goal"); elProg = $("hud-prog"); elCards = $("hud-cards");
    elPrompt = $("prompt"); elToast = $("toast");
    elCard = $("card"); elCardTag = $("card-tag"); elCardTitle = $("card-title"); elCardBody = $("card-body");
    elMark = $("goalmark"); elMarkLab = $("goalmark-lab");
    elStart = $("start"); elComplete = $("complete"); elCompleteCards = $("complete-cards");
    if (elCard) elCard.addEventListener("click", UI.closeCard);
    if (elStart) elStart.addEventListener("click", UI.dismissStart);
    var go = $("complete-go"); if (go) go.addEventListener("click", function () { root.location.reload(); });
    startShown = true;
    if (plate) plate.classList.add("show");
    hideTimer = 3.2;
    refreshHud();
  };

  function objText(s) { return s.need > 1 ? ("進度 " + s.progress + " / " + s.need) : (s.hint || ""); }
  function refreshHud() {
    var Q = SENXUN.quest, K = SENXUN.cards;
    if (Q && elGoal) {
      var s = Q.state();
      if (s.done) { elGoal.textContent = "🏆 全部完成!"; if (elProg) elProg.textContent = ""; }
      else { elGoal.textContent = s.title; if (elProg) elProg.textContent = objText(s); }
    }
    if (K && elCards) elCards.textContent = "📖 知識卡 " + K.list().length + " / 4";
  }

  UI.update = function (dt, player, interactions) {
    acc += dt;
    if (hideTimer > 0) { hideTimer -= dt; if (hideTimer <= 0 && plate) plate.classList.remove("show"); }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0 && elToast) elToast.classList.remove("show"); }

    var tl = player.tile();
    if (interactions && elPrompt) {
      var inR = interactions.inRange(tl.x, tl.y);
      if (inR.length && !cardShown && !startShown) { elPrompt.textContent = "🔍 [E] " + inR[0].label; elPrompt.classList.add("show"); }
      else { elPrompt.classList.remove("show"); }
    }

    if (acc < 0.2) return; acc = 0;
    var r = SENXUN.regions.at(tl.x, tl.y);
    if (elLoc) elLoc.textContent = r.name;
    if (r.name !== lastName) {
      lastName = r.name;
      if (elRegion) elRegion.textContent = r.name;
      if (elEn) elEn.textContent = r.en || "";
      if (plate && !startShown) { plate.classList.add("show"); hideTimer = 3.2; }
    }
  };

  function toast(msg) { if (elToast) { elToast.textContent = msg; elToast.classList.add("show"); toastTimer = 2.8; } }

  UI.onInteract = function (res) {
    if (!res || !res.ok) return;
    if (res.talk) { if (res.dialogue) UI.showPanel("💬 對話", res.dialogue.title, res.dialogue.body); return; }
    var s = res.state || (SENXUN.quest && SENXUN.quest.state());
    refreshHud();
    if (!s) return;
    if (s.event === "all-complete") { toast("🏆 全部目標完成!"); if (s.unlockedCard) UI.showCard(s.unlockedCard); pendingComplete = true; }
    else if (s.event === "objective-complete") { toast("✅ 目標完成!"); if (s.unlockedCard) UI.showCard(s.unlockedCard); }
  };

  UI.showPanel = function (tag, title, body) {
    if (!elCard) return;
    if (elCardTag) elCardTag.textContent = tag;
    if (elCardTitle) elCardTitle.textContent = title;
    if (elCardBody) elCardBody.textContent = body;
    elCard.classList.add("show"); cardShown = true;
    if (elPrompt) elPrompt.classList.remove("show");
  };
  UI.showCard = function (id) {
    var c = SENXUN.cards && SENXUN.cards.get(id);
    if (!c) return;
    UI.showPanel("📖 知識卡", (c.icon ? c.icon + " " : "") + c.title, c.body);
    refreshHud();
  };
  UI.closeCard = function () {
    if (elCard) elCard.classList.remove("show");
    cardShown = false;
    if (pendingComplete) { pendingComplete = false; UI.showComplete(); }
  };
  UI.cardOpen = function () { return cardShown; };

  // 開始畫面
  UI.startOpen = function () { return startShown; };
  UI.dismissStart = function () { if (elStart) elStart.classList.add("hide"); startShown = false; };

  // 目標指引 pin(由 main.js 每幀傳入投影後的螢幕座標;null=隱藏)
  UI.setGuide = function (g) {
    if (!elMark) return;
    if (!g) { elMark.classList.remove("show"); return; }
    elMark.style.left = g.sx + "%"; elMark.style.top = g.sy + "%";
    if (elMarkLab) elMarkLab.textContent = g.label || "";
    elMark.classList.add("show");
  };

  // 完成畫面
  UI.showComplete = function () {
    if (!elComplete) return;
    if (elCompleteCards && SENXUN.cards) {
      var ids = SENXUN.cards.list(), html = "📖 已收集知識卡 " + ids.length + " 張<br>";
      for (var i = 0; i < ids.length; i++) { var c = SENXUN.cards.get(ids[i]); if (c) html += "・" + (c.icon || "") + " " + c.title + "<br>"; }
      elCompleteCards.innerHTML = html;
    }
    elComplete.classList.add("show");
  };
})(typeof window !== "undefined" ? window : globalThis);
