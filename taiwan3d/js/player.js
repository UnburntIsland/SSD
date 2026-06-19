/* player.js — 可控 stylized low-poly 人物 + 地形跟隨 + 海岸碰撞 + 走路動畫。SENXUN.player
   人物部位:頭/髮/臉(眼+鼻朝前)/軀幹(上衣)/臀(下身)/雙臂(末端有手)/雙腿/鞋 + 背包。
   走路時擺手擺腿 + 輕微 bobbing;停止回 idle。單一角色(非 instanced),效能無虞。 */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var C = SENXUN.config, Hm = SENXUN.height;
  var P = (SENXUN.player = {});
  var THREE, grp, body, armL, armR, legL, legR, W, MH, px, pz, pdir = 0, maxStep = 999;
  var phase = 0, swing = 0, bob = 0, lastSafe = null, lastSafeHits = 0;

  P.build = function (three, scene, spawn) {
    THREE = three; var ISL = root.SENXUN_ISLAND; W = ISL.W; MH = ISL.H;
    maxStep = C.maxStep || 999;
    grp = new THREE.Group();
    body = new THREE.Group(); grp.add(body); // body 承載擺動/bobbing,grp 只負責定位+面向

    var skin = new THREE.MeshStandardMaterial({ color: 0xf0c79c, roughness: 0.85 });
    var hair = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.95 });
    var shirt = new THREE.MeshStandardMaterial({ color: 0x2f6e8f, roughness: 0.75 }); // 上衣:藍綠(暖色場景中顯眼)
    var pants = new THREE.MeshStandardMaterial({ color: 0x5b4a32, roughness: 0.9 });  // 下身
    var shoe = new THREE.MeshStandardMaterial({ color: 0x242424, roughness: 0.7 });
    var pack = new THREE.MeshStandardMaterial({ color: 0xc25a2e, roughness: 0.85 });  // 背包
    var dark = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.6 });   // 眼

    function add(parent, geo, mat, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; }

    add(body, new THREE.BoxGeometry(0.95, 0.72, 0.6), pants, 0, 1.62, 0);                     // 臀/下身
    add(body, new THREE.CylinderGeometry(0.6, 0.74, 1.3, 8), shirt, 0, 2.6, 0);               // 軀幹/上衣
    add(body, new THREE.BoxGeometry(0.66, 0.9, 0.34), pack, 0, 2.62, -0.52);                  // 背包
    add(body, new THREE.CylinderGeometry(0.17, 0.2, 0.26, 6), skin, 0, 3.26, 0);              // 脖子
    add(body, new THREE.SphereGeometry(0.52, 14, 12), skin, 0, 3.74, 0);                      // 頭
    var hc = add(body, new THREE.SphereGeometry(0.55, 14, 10), hair, 0, 3.92, -0.06); hc.scale.set(1.05, 0.8, 1.05); // 髮(頂後)
    add(body, new THREE.ConeGeometry(0.1, 0.24, 6), skin, 0, 3.7, 0.5).rotation.x = Math.PI / 2; // 鼻(朝 +z=前)
    add(body, new THREE.SphereGeometry(0.075, 8, 6), dark, 0.2, 3.84, 0.44);                  // 眼 R
    add(body, new THREE.SphereGeometry(0.075, 8, 6), dark, -0.2, 3.84, 0.44);                 // 眼 L

    var armGeo = new THREE.CylinderGeometry(0.17, 0.14, 1.32, 6); armGeo.translate(0, -0.62, 0); // 樞紐在肩
    armL = add(body, armGeo, shirt, 0.78, 3.0, 0);
    armR = add(body, armGeo, shirt, -0.78, 3.0, 0);
    add(armL, new THREE.SphereGeometry(0.16, 8, 6), skin, 0, -1.3, 0);                         // 手
    add(armR, new THREE.SphereGeometry(0.16, 8, 6), skin, 0, -1.3, 0);

    var legGeo = new THREE.CylinderGeometry(0.25, 0.2, 1.5, 6); legGeo.translate(0, -0.74, 0);  // 樞紐在臀
    legL = add(body, legGeo, pants, 0.28, 1.35, 0);
    legR = add(body, legGeo, pants, -0.28, 1.35, 0);
    add(legL, new THREE.BoxGeometry(0.35, 0.24, 0.62), shoe, 0, -1.46, 0.16);                  // 鞋(朝前)
    add(legR, new THREE.BoxGeometry(0.35, 0.24, 0.62), shoe, 0, -1.46, 0.16);

    scene.add(grp);
    px = spawn.x + 0.5; pz = spawn.y + 0.5; place();
    lastSafe = { x: px, y: pz };
    P.group = grp; return grp;
  };

  function walkable(fx, fz, curY) {
    if (Hm.terrAt(Math.floor(fx), Math.floor(fz)) <= 1) return false;          // 海/淺海不可走
    if (curY !== undefined && Math.abs(Hm.groundY(fx, fz) - curY) > maxStep) return false; // 太陡擋住
    var Col = SENXUN.collision;
    if (Col) { if (!Col.inBounds(fx, fz)) return false; if (Col.blocked(fx, fz)) return false; } // 關卡邊界 + 實體物件
    return true;
  }
  function place() { grp.position.set(px - W / 2, Hm.groundY(px, pz), pz - MH / 2); grp.rotation.y = pdir; }
  P.pos = function () { return grp.position; };
  P.tile = function () { return { x: px, y: pz }; };
  P.setTile = function (tx, tz) { px = tx; pz = tz; place(); }; // 除錯/截圖用瞬移(不影響玩法)
  P.lastSafeHits = function () { return lastSafeHits; };          // 脫困觸發次數(正常走路應為 0)

  P.update = function (dt, keys, cam) {
    var f = 0, s = 0;
    if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
    if (keys.KeyD || keys.ArrowRight) s += 1; if (keys.KeyA || keys.ArrowLeft) s -= 1;
    var moving = false;
    if (f || s) {
      var fwd = new THREE.Vector3(grp.position.x - cam.position.x, 0, grp.position.z - cam.position.z); fwd.normalize();
      var right = new THREE.Vector3(-fwd.z, 0, fwd.x); // 螢幕右 = cross(forward,up)(修正 A/D 相反)
      var vx = fwd.x * f + right.x * s, vz = fwd.z * f + right.z * s, L = Math.hypot(vx, vz) || 1; vx /= L; vz /= L;
      var nx = px + vx * C.walkSpeed * dt, nz = pz + vz * C.walkSpeed * dt;
      var curY = Hm.groundY(px, pz);
      if (walkable(nx, pz, curY)) px = nx; if (walkable(px, nz, curY)) pz = nz;
      px = Math.max(1, Math.min(W - 2, px)); pz = Math.max(1, Math.min(MH - 2, pz));
      // 脫困:若落入 blocker(極端情況)→ 回上一個安全位置;否則記錄安全位置
      if (SENXUN.collision && SENXUN.collision.blocked(px, pz)) { if (lastSafe) { px = lastSafe.x; pz = lastSafe.y; lastSafeHits++; } }
      else lastSafe = { x: px, y: pz };
      pdir = Math.atan2(vx, vz); moving = true;
    }
    // 走路動畫(擺手擺腿 + bobbing);停止平滑回 idle
    if (moving) phase += dt * 9;
    var k = Math.min(1, dt * 12);
    swing += ((moving ? Math.sin(phase) * 0.5 : 0) - swing) * k;
    bob += ((moving ? Math.abs(Math.sin(phase)) * 0.12 : 0) - bob) * k;
    if (armL) { armL.rotation.x = swing; armR.rotation.x = -swing; legL.rotation.x = -swing; legR.rotation.x = swing; }
    if (body) body.position.y = bob;
    place();
  };
})(typeof window !== "undefined" ? window : globalThis);
