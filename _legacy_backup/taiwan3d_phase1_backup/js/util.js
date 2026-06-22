/* util.js — math + procedural noise helpers (no deps). Namespace: SENXUN.util */
(function (root) {
  var SENXUN = (root.SENXUN = root.SENXUN || {});
  var U = (SENXUN.util = {});

  U.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.smooth = function (t) { return t * t * (3 - 2 * t); };
  U.smoothstep = function (a, b, x) { var t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  U.mix3 = function (c1, c2, t) {
    return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t];
  };

  // deterministic hash -> [0,1)
  function hash2(x, y) {
    var h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = (h ^ (h >> 16)) >>> 0;
    return h / 4294967296;
  }
  U.hash2 = hash2;

  // value noise with smooth interpolation
  U.noise2 = function (x, y) {
    var x0 = Math.floor(x), y0 = Math.floor(y);
    var fx = U.smooth(x - x0), fy = U.smooth(y - y0);
    var v00 = hash2(x0, y0), v10 = hash2(x0 + 1, y0);
    var v01 = hash2(x0, y0 + 1), v11 = hash2(x0 + 1, y0 + 1);
    var a = v00 + (v10 - v00) * fx, b = v01 + (v11 - v01) * fx;
    return a + (b - a) * fy; // [0,1]
  };

  // fractal Brownian motion (octaves of value noise) -> [0,1]
  U.fbm = function (x, y, oct, lac, gain) {
    oct = oct || 4; lac = lac || 2.0; gain = gain || 0.5;
    var amp = 0.5, freq = 1.0, sum = 0, norm = 0;
    for (var i = 0; i < oct; i++) {
      sum += amp * U.noise2(x * freq, y * freq);
      norm += amp; amp *= gain; freq *= lac;
    }
    return sum / norm;
  };

  // ridged multifractal -> [0,1] (sharp ridges; good for badlands/mountains)
  U.ridged = function (x, y, oct, lac, gain) {
    oct = oct || 4; lac = lac || 2.0; gain = gain || 0.5;
    var amp = 0.5, freq = 1.0, sum = 0, norm = 0;
    for (var i = 0; i < oct; i++) {
      var n = U.noise2(x * freq, y * freq);
      n = 1 - Math.abs(n * 2 - 1); // fold to ridge
      n = n * n;
      sum += amp * n; norm += amp; amp *= gain; freq *= lac;
    }
    return sum / norm;
  };

  // triangle wave [0,1]
  U.tri = function (t) { t = t - Math.floor(t); return 1 - Math.abs(t * 2 - 1); };
})(typeof window !== "undefined" ? window : globalThis);
