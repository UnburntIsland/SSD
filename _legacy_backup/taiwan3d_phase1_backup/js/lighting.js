/* lighting.js — golden-hour sun + sky + optional slow day cycle. SENXUN.lighting */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var L = (SENXUN.lighting = {});
  var sun, hemi, amb, THREE, t = 0, cycle = false;
  L.build = function (three, scene) {
    THREE = three;
    var sd = (SENXUN.config && SENXUN.config.sun) || null; // 選配夕照(南部場景);未設則用原本黃金時刻
    if (sd) {
      scene.background = new THREE.Color(sd.sky);
      scene.fog = new THREE.Fog(sd.fog, sd.fogNear, sd.fogFar);
      sun = new THREE.DirectionalLight(sd.color, sd.intensity); sun.position.set(sd.dir[0], sd.dir[1], sd.dir[2]); scene.add(sun);
      amb = new THREE.AmbientLight(sd.amb, sd.ambI); scene.add(amb);
      hemi = new THREE.HemisphereLight(sd.hemiSky, sd.hemiGround, sd.hemiI); scene.add(hemi);
    } else {
      scene.background = new THREE.Color(0xbcc6cc);
      scene.fog = new THREE.Fog(0xcabfa6, 300, 1100);
      sun = new THREE.DirectionalLight(0xffdca0, 1.4); sun.position.set(-1.0, 0.62, 0.5); scene.add(sun);
      amb = new THREE.AmbientLight(0x9aa6b0, 0.5); scene.add(amb);
      hemi = new THREE.HemisphereLight(0xe2e6ec, 0x5a4a36, 0.45); scene.add(hemi);
    }
    L.sun = sun;
  };
  L.setDayCycle = function (on) { cycle = on; };
  L.update = function (dt) {
    if (!cycle) return;
    t += dt * 0.02; var a = t % 1;        // 0..1 day
    var ang = a * Math.PI;                 // sunrise->sunset
    sun.position.set(Math.cos(ang) * 1.2, Math.max(0.08, Math.sin(ang)) * 1.2, 0.45);
    var warm = 1 - Math.abs(a - 0.5) * 1.4;
    sun.color.setRGB(1.0, 0.86 + 0.1 * (1 - warm), 0.62 + 0.3 * (1 - warm));
    sun.intensity = 0.7 + Math.sin(ang) * 0.9;
  };
})(typeof window !== "undefined" ? window : globalThis);
