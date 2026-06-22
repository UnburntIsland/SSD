/* ui_south.js — 南部正式場景的精簡 HUD:只顯示「目前地點」銘牌,
   進入新地點時淡入,無 slider/座標/海拔等開發者讀數。 SENXUN.ui
   (取代 ui.js;不動原檔,全台版仍用 ui.js) */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var UI = (SENXUN.ui = {});
  var plate, elRegion, elEn, acc = 0, lastName = "", hideTimer = 0;

  UI.build = function () {
    plate = document.getElementById("nameplate");
    elRegion = document.getElementById("region");
    elEn = document.getElementById("region-en");
    if (plate) plate.classList.add("show"); // 進場先顯示起始地點
    hideTimer = 3.2;
  };

  UI.update = function (dt, player) {
    acc += dt;
    // 一進新地點就淡入,停留數秒後淡出(銘牌不長駐畫面)
    if (hideTimer > 0) { hideTimer -= dt; if (hideTimer <= 0 && plate) plate.classList.remove("show"); }
    if (acc < 0.25) return; acc = 0;
    var tl = player.tile();
    var r = SENXUN.regions.at(tl.x, tl.y);
    if (r.name !== lastName) {
      lastName = r.name;
      if (elRegion) elRegion.textContent = r.name;
      if (elEn) elEn.textContent = r.en || "";
      if (plate) plate.classList.add("show");
      hideTimer = 3.2;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
