/* player.js — controllable avatar with terrain-follow + sea collision. SENXUN.player */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var C = SENXUN.config, Hm = SENXUN.height;
  var P = (SENXUN.player = {});
  var THREE, grp, W, MH, px, pz, pdir = 0, maxStep = 999;
  P.build = function (three, scene, spawn) {
    THREE = three; var ISL = root.SENXUN_ISLAND; W = ISL.W; MH = ISL.H;
    maxStep = C.maxStep || 999; // 坡度上限(未設則不限,全台版不受影響)
    grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.0, 12),
      new THREE.MeshStandardMaterial({ color: 0xff7a33 })).translateY(1.0));
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd9b0 })); head.position.y = 2.5; grp.add(head);
    var nose = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: 0xc94a2a })); nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.4, 1.0); grp.add(nose);
    scene.add(grp);
    px = spawn.x + 0.5; pz = spawn.y + 0.5; place();
    P.group = grp; return grp;
  };
  function walkable(fx, fz, curY) {
    if (Hm.terrAt(Math.floor(fx), Math.floor(fz)) <= 1) return false;        // 海/淺海不可走
    if (curY !== undefined && Math.abs(Hm.groundY(fx, fz) - curY) > maxStep) return false; // 太陡擋住
    return true;
  }
  function place() { grp.position.set(px - W / 2, Hm.groundY(px, pz), pz - MH / 2); grp.rotation.y = pdir; }
  P.pos = function () { return grp.position; };
  P.tile = function () { return { x: px, y: pz }; };
  P.update = function (dt, keys, cam) {
    var f = 0, s = 0;
    if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
    if (keys.KeyD || keys.ArrowRight) s += 1; if (keys.KeyA || keys.ArrowLeft) s -= 1;
    if (f || s) {
      var fwd = new THREE.Vector3(grp.position.x - cam.position.x, 0, grp.position.z - cam.position.z); fwd.normalize();
      var right = new THREE.Vector3(fwd.z, 0, -fwd.x);
      var vx = fwd.x * f + right.x * s, vz = fwd.z * f + right.z * s, L = Math.hypot(vx, vz) || 1; vx /= L; vz /= L;
      var nx = px + vx * C.walkSpeed * dt, nz = pz + vz * C.walkSpeed * dt;
      var curY = Hm.groundY(px, pz);
      if (walkable(nx, pz, curY)) px = nx; if (walkable(px, nz, curY)) pz = nz;
      px = Math.max(1, Math.min(W - 2, px)); pz = Math.max(1, Math.min(MH - 2, pz));
      pdir = Math.atan2(vx, vz);
    }
    place();
  };
})(typeof window !== "undefined" ? window : globalThis);
