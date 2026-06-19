/* terrain.js — builds the Taiwan terrain meshes from SENXUN.height.
   Base mesh (whole island, SUB=2) with a hole over the south; high-res south
   detail patch (SUB=SUB_DETAIL) so 月世界/柴山 ridges read as knife-edges.
   Namespace: SENXUN.terrain */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var U = SENXUN.util, C = SENXUN.config, Hm = SENXUN.height;
  var T = (SENXUN.terrain = {});

  // crop to land bbox + margin, and the south special bbox
  var BX0 = 60, BX1 = 658, BY0 = 30, BY1 = 718;
  var SX0 = 295, SX1 = 455, SY0 = 528, SY1 = 700;
  T.south = { SX0: SX0, SX1: SX1, SY0: SY0, SY1: SY1 };

  var THREE, W, MH;
  var baseGeo, detailGeo, dInfo, baseInfo;

  function colorFor(s) {
    var c = C.COL[s.biome] || C.COL.grass;
    if (C.groundRich) return richColor(s, c);   // 南部:地表交融(patch 混色),全台版維持原樣
    // mild elevation lift + tiny noise for texture
    var sh = 0.86 + 0.04 * Math.min(6, s.elev * 0.02);
    var nz = (U.hash2((s._x * 13) | 0, (s._y * 7) | 0) - 0.5) * 0.05;
    return [
      U.clamp(c[0] / 255 * sh + nz, 0, 1),
      U.clamp(c[1] / 255 * sh + nz, 0, 1),
      U.clamp(c[2] / 255 * sh + nz, 0, 1)
    ];
  }
  // 地表交融:用低頻 patch 噪聲在生態色裡混入泥土/濃綠/落葉/濕沙/苔/碎石,破除均勻色塊
  function richColor(s, base) {
    var x = s._x, y = s._y, elev = s.elev || 0, b = s.biome;
    var p = U.fbm(x * 0.035, y * 0.035, 3);          // 大塊 patch
    var p2 = U.noise2(x * 0.14 + 5, y * 0.14 + 2);    // 細粒
    var mix = base, amt = 0;
    if (b === "broadleaf") {
      if (p < 0.42) { mix = [122, 96, 58]; amt = (0.42 - p) * 0.8; }        // 泥土斑
      else if (p > 0.6) { mix = [40, 74, 38]; amt = (p - 0.6) * 0.9; }      // 濃綠濃林
      if (p2 > 0.82) { mix = [150, 120, 66]; amt = 0.32; }                  // 落葉點
    } else if (b === "sand") {
      if (p < 0.46) { mix = [150, 122, 86]; amt = (0.46 - p) * 0.65; }      // 濕沙
    } else if (b === "reef" || b === "karst") {
      if (p > 0.66) { mix = [112, 140, 92]; amt = (p - 0.66) * 0.55; }      // 苔綠
      else if (p < 0.34) { mix = [152, 150, 142]; amt = (0.34 - p) * 0.45; } // 深淺岩
    } else if (b === "trail") {
      mix = (p > 0.5) ? [152, 130, 98] : [118, 98, 70]; amt = 0.38;          // 泥土/碎石混
    }
    amt = U.clamp(amt, 0, 0.65);
    var sh = 0.80 + 0.06 * Math.min(6, elev * 0.02) + (p - 0.5) * 0.14;     // 大塊明暗起伏
    var nz = (p2 - 0.5) * 0.10;
    return [
      U.clamp((base[0] + (mix[0] - base[0]) * amt) / 255 * sh + nz, 0, 1),
      U.clamp((base[1] + (mix[1] - base[1]) * amt) / 255 * sh + nz, 0, 1),
      U.clamp((base[2] + (mix[2] - base[2]) * amt) / 255 * sh + nz, 0, 1)
    ];
  }

  function buildGrid(x0, x1, y0, y1, sub, holeSouth) {
    var gw = Math.round((x1 - x0) * sub) + 1, gh = Math.round((y1 - y0) * sub) + 1, NV = gw * gh;
    var cullSea = !!C.cullSea;
    var pos = new Float32Array(NV * 3), col = new Float32Array(NV * 3);
    var seaFlag = cullSea ? new Uint8Array(NV) : null, v = 0;
    for (var gy = 0; gy < gh; gy++) for (var gx = 0; gx < gw; gx++) {
      var fx = x0 + gx / sub, fz = y0 + gy / sub;
      var s = Hm.at(fx, fz); s._x = fx; s._y = fz;
      pos[v * 3] = fx - W / 2; pos[v * 3 + 1] = s.y; pos[v * 3 + 2] = fz - MH / 2;
      var c = colorFor(s); col[v * 3] = c[0]; col[v * 3 + 1] = c[1]; col[v * 3 + 2] = c[2];
      if (cullSea) seaFlag[v] = s.sea ? 1 : 0;
      v++;
    }
    var idx = [];
    for (var gy2 = 0; gy2 < gh - 1; gy2++) for (var gx2 = 0; gx2 < gw - 1; gx2++) {
      if (holeSouth) {
        var tx = x0 + gx2 / sub, ty = y0 + gy2 / sub;
        if (tx >= SX0 && tx < SX1 && ty >= SY0 && ty < SY1) continue;
      }
      var a = gy2 * gw + gx2, b = a + 1, cc = a + gw, dd = cc + 1;
      // 裁掉完全在海中的四角(露出海平面，省三角形)
      if (cullSea && seaFlag[a] && seaFlag[b] && seaFlag[cc] && seaFlag[dd]) continue;
      idx.push(a, cc, b, b, cc, dd);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx.length > 65000 ? new THREE.BufferAttribute(new Uint32Array(idx), 1) : idx);
    geo.computeVertexNormals();
    return { geo: geo, pos: pos, gw: gw, gh: gh, x0: x0, y0: y0, sub: sub };
  }

  T.build = function (three, scene) {
    THREE = three;
    var ISL = root.SENXUN_ISLAND; W = ISL.W; MH = ISL.H;
    // bbox/detail/sea-cull 可由 config 覆寫(南部場景)；未設則用全台版預設
    var B = C.bbox || { x0: BX0, x1: BX1, y0: BY0, y1: BY1, sub: 2 };
    var useDetail = (C.detail !== null); // undefined => 沿用全台版南部貼片
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.96, metalness: 0.0 });
    baseInfo = buildGrid(B.x0, B.x1, B.y0, B.y1, B.sub, useDetail);
    baseGeo = baseInfo.geo;
    var base = new THREE.Mesh(baseGeo, mat); scene.add(base);
    var det = null;
    if (useDetail) {
      dInfo = buildGrid(SX0, SX1, SY0, SY1, C.SUB_DETAIL, false);
      detailGeo = dInfo.geo; det = new THREE.Mesh(detailGeo, mat); scene.add(det);
    } else { dInfo = null; detailGeo = null; }
    // sea (材質可由 config 覆寫:南部場景做夕照反光水面;未設則沿用原樣)
    var sm = C.seaMat || { color: 0x276688, opacity: 0.88, roughness: 0.25, metalness: 0.0 };
    var sea = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.4, MH * 2.4),
      new THREE.MeshStandardMaterial({ color: sm.color, transparent: true, opacity: sm.opacity, roughness: sm.roughness, metalness: sm.metalness || 0.0 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = sm.y != null ? sm.y : -0.4; scene.add(sea);
    T.meshes = { base: base, det: det, sea: sea };
    T.vertexCount = baseInfo.gw * baseInfo.gh + (dInfo ? dInfo.gw * dInfo.gh : 0);
    return T.meshes;
  };

  // height-scale slider: re-sample Y on active meshes (debounced normals from caller)
  T.rebuildHeights = function () {
    [baseInfo, dInfo].forEach(function (gi) {
      if (!gi) return;
      var v = 0, pos = gi.pos;
      for (var gy = 0; gy < gi.gh; gy++) for (var gx = 0; gx < gi.gw; gx++, v++) {
        pos[v * 3 + 1] = Hm.at(gi.x0 + gx / gi.sub, gi.y0 + gy / gi.sub).y;
      }
      gi.geo.attributes.position.needsUpdate = true;
    });
  };
  T.recomputeNormals = function () { baseGeo.computeVertexNormals(); if (detailGeo) detailGeo.computeVertexNormals(); };
})(typeof window !== "undefined" ? window : globalThis);
