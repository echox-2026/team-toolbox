/* EchoX 粒子头图：WebGL 绘制，字形由代码构造。整个页面生命周期只挂载一次。 */
export function mountParticles(hero, canvas, hint) {
  "use strict";
  var gl = canvas.getContext("webgl", { alpha: false, antialias: false });
  if (!gl) { document.documentElement.classList.add("no-gl"); return; }

  var STILL = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (window.matchMedia("(hover: none)").matches) hint.textContent = "点击发出回声";
  if (STILL) hint.textContent = "";

  var UNIT_W = 410, UNIT_H = 100;
  var RAMP = [[255, 255, 255], [232, 237, 240], [166, 243, 223]];
  var EDGE = [166, 243, 223];

  function shader(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function locs(p, names, fn) { var o = {}; names.forEach(function (n) { o[n] = fn.call(gl, p, n); }); return o; }

  var bgP = program(
    "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}",
    [
      "precision highp float;",
      "uniform vec2 uR,uL,uP;uniform float uT,uPA,uFY;",
      "const vec3 BASE=vec3(.373,.412,.451),DEEP=vec3(.27,.31,.35),STEEL=vec3(.533,.569,.612),LIGHT=vec3(.929,.984,.973),MINT=vec3(.443,.718,.671),BRIGHT=vec3(.651,.953,.875);",
      "void main(){",
      "vec2 uv=gl_FragCoord.xy/uR;uv.y=1.-uv.y;float asp=uR.x/uR.y;vec2 p=vec2(uv.x*asp,uv.y);",
      "vec3 c=mix(BASE,DEEP,smoothstep(.55,1.08,uv.y+abs(uv.x-.5)*.3));",
      "c=mix(c,STEEL,exp(-2.6*length(p-vec2(asp*.98,.0)))*.85);",
      "vec2 L=vec2(asp*.015,.015)+uL*vec2(asp*.03,.03);float d=length(p-L);",
      "c=mix(c,LIGHT,clamp(exp(-4.4*d)*1.1,0.,1.));",
      "c=mix(c,BRIGHT,exp(-17.*d)*.4);",
      "vec2 q=vec2((uv.x-.5)/.44,(uv.y-uFY)/.12);c=mix(c,MINT,exp(-dot(q,q)*1.25)*(.34+.05*sin(uT*.5)));",
      "vec2 g=p-uP;c=mix(c,BRIGHT,exp(-dot(g,g)*30.)*.12*uPA);",
      "float n=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);c+=(n-.5)/170.;",
      "gl_FragColor=vec4(c,1.);}"
    ].join("\n")
  );
  var bgU = locs(bgP, ["uR", "uL", "uP", "uT", "uPA", "uFY"], gl.getUniformLocation);
  var bgA = gl.getAttribLocation(bgP, "a");
  var triBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  var ptP = program(
    [
      "attribute vec3 aP;attribute vec4 aC;attribute float aS;",
      "uniform vec2 uR;uniform float uD,uA,uM,uF,uFR;varying vec4 vC;",
      "void main(){vec2 p=aP.xy;float a=aC.a*uA;",
      "if(uM>.5){p.y=2.*uF-p.y;a*=pow(max(0.,1.-(p.y-uF)/uFR),2.)*.3;}",
      "vec3 c=mix(aC.rgb,vec3(.651,.953,.875),aP.z*.85);",
      "vC=vec4(c,min(1.,a+aP.z*.3*(1.-uM)));",
      "vec2 q=p/uR*2.-1.;gl_Position=vec4(q.x,-q.y,0.,1.);",
      "gl_PointSize=aS*uD*(1.+aP.z*.55);}"
    ].join("\n"),
    "precision mediump float;varying vec4 vC;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.34,d);if(a<=0.)discard;gl_FragColor=vec4(vC.rgb,vC.a*a);}"
  );
  var ptU = locs(ptP, ["uR", "uD", "uA", "uM", "uF", "uFR"], gl.getUniformLocation);
  var ptA = locs(ptP, ["aP", "aC", "aS"], gl.getAttribLocation);
  var dynBuf = gl.createBuffer(), staBuf = gl.createBuffer();

  function drawWord(c) {
    function poly(x0, pts) { c.beginPath(); pts.forEach(function (p, i) { c[i ? "lineTo" : "moveTo"](x0 + p[0], p[1]); }); c.closePath(); c.fill(); }
    function ring(x, y, w, h, r, ix, iy, iw, ih, ir) { c.beginPath(); c.roundRect(x, y, w, h, r); c.roundRect(ix, iy, iw, ih, ir); c.fill("evenodd"); }
    function cut(fn) { c.globalCompositeOperation = "destination-out"; fn(); c.globalCompositeOperation = "source-over"; }
    c.fillStyle = "#fff";
    poly(0, [[12, 0], [78, 0], [78, 22], [25, 22], [25, 39], [72, 39], [72, 60], [25, 60], [25, 78], [78, 78], [78, 100], [8, 100], [0, 92], [0, 12]]);
    ring(82, 20, 78, 80, 38, 106, 44, 30, 32, 13);
    cut(function () { c.fillRect(122, 42, 42, 36); });
    c.beginPath(); c.roundRect(164, 20, 74, 80, [34, 34, 0, 0]); c.fill();
    c.fillRect(164, 0, 25, 100);
    cut(function () { c.beginPath(); c.roundRect(189, 44, 25, 60, [12, 12, 0, 0]); c.fill(); });
    ring(242, 20, 80, 80, 38, 266, 44, 32, 32, 14);
    poly(318, [[0, 0], [29, 0], [46, 29], [63, 0], [92, 0], [61, 50], [92, 100], [63, 100], [46, 71], [29, 100], [0, 100], [31, 50]]);
  }

  var W, H, dpr, n = 0, n0 = 0, wordW, wordH, ox, oy, floorY;
  var X, Y, VX, VY, HX, HY, SEED, LAYER, DYN;
  var seedV = 11;
  function rnd() { seedV = (seedV * 1664525 + 1013904223) >>> 0; return seedV / 4294967296; }
  function lerpRamp(t) {
    t = Math.max(0, Math.min(.9999, t)) * (RAMP.length - 1);
    var i = Math.floor(t), f = t - i, a = RAMP[i], b = RAMP[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  function build(scatter) {
    W = hero.clientWidth; H = hero.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    wordW = Math.min(W * (W < 640 ? .9 : .8), 1280, H * 1.9); wordH = wordW * UNIT_H / UNIT_W;
    ox = (W - wordW) / 2; oy = H * .45 - wordH / 2; floorY = oy + wordH;

    var mw = Math.ceil(wordW), mh = Math.ceil(wordH);
    var off = document.createElement("canvas"); off.width = mw; off.height = mh;
    var c = off.getContext("2d", { willReadFrequently: true });
    c.scale(wordW / UNIT_W, wordW / UNIT_W);
    drawWord(c);
    var data = c.getImageData(0, 0, mw, mh).data;
    function on(x, y) { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < mw && y < mh && data[(y * mw + x) * 4 + 3] > 128; }
    function isEdge(x, y, d) {
      return !(on(x - d, y) && on(x + d, y) && on(x, y - d) && on(x, y + d) && on(x - d * .7, y - d * .7) && on(x + d * .7, y - d * .7) && on(x - d * .7, y + d * .7) && on(x + d * .7, y + d * .7));
    }

    seedV = 11;
    var step = Math.max(2.3, wordW / 360), pts = [], sta = [];
    function add(x, y, layer, col, a, size) { pts.push(x, y, layer); sta.push(col[0] / 255, col[1] / 255, col[2] / 255, a, size); }

    var row = 0;
    for (var y = step / 2; y < mh; y += step * .9, row++) {
      for (var x = (row % 2 ? step : step / 2); x < mw; x += step) {
        if (!on(x, y)) continue;
        var edge = isEdge(x, y, step * 1.5);
        var t = x / mw * .92 + y / mh * .08;
        var col = lerpRamp(t), shade = .93 + .07 * (1 - y / mh) + (rnd() - .5) * .08;
        col = [col[0] * shade, col[1] * shade, col[2] * shade];
        if (edge) col = [col[0] + (EDGE[0] - col[0]) * .72, col[1] + (EDGE[1] - col[1]) * .72, col[2] + (EDGE[2] - col[2]) * .72];
        add(ox + x + (rnd() - .5) * step * .36, oy + y + (rnd() - .5) * step * .36, 0, [Math.min(255, col[0]), Math.min(255, col[1]), Math.min(255, col[2])], 1, step * (.86 + rnd() * .3) * (edge ? 1.08 : 1));
      }
    }
    n0 = pts.length / 3;

    [[1, .018, -.235, .986, .62], [2, .036, -.45, .972, .36]].forEach(function (g) {
      var s2 = step * 1.3, dx = g[1] * wordW, dy = g[2] * wordH, k = g[3];
      for (var gy = s2 / 2; gy < mh; gy += s2) {
        for (var gx = s2 / 2; gx < mw; gx += s2) {
          if (!on(gx, gy) || !isEdge(gx, gy, s2 * 1.05)) continue;
          add(ox + wordW / 2 + (gx - wordW / 2) * k + dx, oy + wordH / 2 + (gy - wordH / 2) * k + dy, g[0], EDGE, g[4], step * .78);
        }
      }
    });

    n = pts.length / 3;
    X = new Float32Array(n); Y = new Float32Array(n); VX = new Float32Array(n); VY = new Float32Array(n);
    HX = new Float32Array(n); HY = new Float32Array(n); SEED = new Float32Array(n); LAYER = new Uint8Array(n);
    DYN = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      HX[i] = pts[i * 3]; HY[i] = pts[i * 3 + 1]; LAYER[i] = pts[i * 3 + 2]; SEED[i] = rnd() * 6.283;
      if (scatter) {
        var a = rnd() * 6.283, r = 60 + rnd() * wordW * .42;
        X[i] = HX[i] + Math.cos(a) * r; Y[i] = HY[i] + Math.sin(a) * r * .6;
      } else { X[i] = HX[i]; Y[i] = HY[i]; }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, staBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sta), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
    gl.bufferData(gl.ARRAY_BUFFER, DYN, gl.DYNAMIC_DRAW);
  }

  var PTR = { x: 0, y: 0, on: 0 };
  var PX = [0, 0, 0], PY = [0, 0, 0], PA = [0, 0, 0], FOLLOW = [.38, .09, .05];
  var rings = [], lastTouch = -1e9, nextIdle = 3800, started = 0, lastT = 0, running = true, rafId = 0;

  function echo(x, y, power) {
    var now = performance.now();
    [[0, 1], [240, .56], [480, .3]].forEach(function (e) {
      rings.push({ x: x, y: y, t0: now + e[0], speed: 560, w: 48, life: 1.5, strength: 5.4 * power * e[1] });
    });
    if (rings.length > 9) rings.splice(0, rings.length - 9);
  }
  function touched(now) { lastTouch = now; if (hint.textContent) hint.style.opacity = "0"; }

  function step(now) {
    if (!started) { started = now; lastT = now; }
    var f = Math.min(2.2, (now - lastT) / 16.67) || 1; lastT = now;
    var intro = Math.min(1, (now - started) / 1500);
    var k = .012 + .046 * intro * intro, damp = Math.pow(.85, f);
    var R = wordH * .62, R2 = R * R;

    for (var l = 0; l < 3; l++) {
      PX[l] += (PTR.x - PX[l]) * FOLLOW[l] * f; PY[l] += (PTR.y - PY[l]) * FOLLOW[l] * f;
      PA[l] += (PTR.on - PA[l]) * Math.min(1, .1 * f);
    }
    if (now > started + nextIdle && now - lastTouch > 3500) {
      echo(ox + wordW * (.15 + Math.random() * .7), floorY - wordH * .5, .42);
      nextIdle = now - started + 6500;
    }
    rings = rings.filter(function (r) { return now - r.t0 < (r.life + .3) * 1000; });

    for (var i = 0; i < n; i++) {
      var lay = LAYER[i], x = X[i], y = Y[i], vx = VX[i], vy = VY[i];
      var dx = x - PX[lay], dy = y - PY[lay], d2 = dx * dx + dy * dy;
      if (PA[lay] > .01 && d2 < R2 && d2 > .01) {
        var d = Math.sqrt(d2), q = 1 - d / R, p = q * q * 2.4 * PA[lay] * f / (1 + lay * .5);
        vx += dx / d * p; vy += dy / d * p;
      }
      for (var j = 0; j < rings.length; j++) {
        var r = rings[j], age = (now - r.t0 - lay * 120) / 1000;
        if (age < 0 || age > r.life) continue;
        var ex = x - r.x, ey = y - r.y, ed = Math.sqrt(ex * ex + ey * ey) || 1, off = Math.abs(ed - r.speed * age);
        if (off < r.w) {
          var hit = (1 - off / r.w) * r.strength * (1 - age / r.life) * f / (1 + lay * .6);
          vx += ex / ed * hit; vy += ey / ed * hit;
        }
      }
      var bx = Math.sin(now * .0008 + SEED[i]) * .55, by = Math.cos(now * .001 + SEED[i]) * .55;
      vx += (HX[i] + bx - x) * k * f; vy += (HY[i] + by - y) * k * f;
      vx *= damp; vy *= damp;
      x += vx * f; y += vy * f;
      X[i] = x; Y[i] = y; VX[i] = vx; VY[i] = vy;
      var e = (vx * vx + vy * vy) / 30, m = i * 3;
      DYN[m] = x; DYN[m + 1] = y; DYN[m + 2] = intro < 1 ? 0 : Math.min(1, e);
    }
    render(now, intro);
    if (running) rafId = requestAnimationFrame(step); else rafId = 0;
  }

  function render(now, intro) {
    gl.disable(gl.BLEND);
    gl.useProgram(bgP);
    gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
    gl.enableVertexAttribArray(bgA);
    gl.vertexAttribPointer(bgA, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(bgU.uR, canvas.width, canvas.height);
    gl.uniform2f(bgU.uL, PA[1] * (PX[1] / W - .5), PA[1] * (PY[1] / H - .5));
    gl.uniform2f(bgU.uP, PX[0] / H, PY[0] / H);
    gl.uniform1f(bgU.uPA, PA[0]);
    gl.uniform1f(bgU.uT, now * .001);
    gl.uniform1f(bgU.uFY, (floorY + wordH * .12) / H);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(bgA);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(ptP);
    gl.uniform2f(ptU.uR, W, H);
    gl.uniform1f(ptU.uD, dpr);
    gl.uniform1f(ptU.uF, floorY + wordH * .02);
    gl.uniform1f(ptU.uFR, wordH * .72);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, DYN);
    gl.enableVertexAttribArray(ptA.aP);
    gl.vertexAttribPointer(ptA.aP, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, staBuf);
    gl.enableVertexAttribArray(ptA.aC); gl.enableVertexAttribArray(ptA.aS);
    gl.vertexAttribPointer(ptA.aC, 4, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(ptA.aS, 1, gl.FLOAT, false, 20, 16);

    var g = Math.max(0, (intro - .55) / .45);
    if (n > n0 && g > 0) { gl.uniform1f(ptU.uM, 0); gl.uniform1f(ptU.uA, g); gl.drawArrays(gl.POINTS, n0, n - n0); }
    gl.uniform1f(ptU.uM, 1); gl.uniform1f(ptU.uA, g); gl.drawArrays(gl.POINTS, 0, n0);
    gl.uniform1f(ptU.uM, 0); gl.uniform1f(ptU.uA, 1); gl.drawArrays(gl.POINTS, 0, n0);
    gl.disableVertexAttribArray(ptA.aP); gl.disableVertexAttribArray(ptA.aC); gl.disableVertexAttribArray(ptA.aS);
  }

  function drawStill() {
    for (var i = 0; i < n; i++) { var m = i * 3; DYN[m] = HX[i]; DYN[m + 1] = HY[i]; DYN[m + 2] = 0; }
    render(0, 1);
  }
  function kick() { if (running && !rafId && !STILL) rafId = requestAnimationFrame(step); }

  build(!STILL);
  if (STILL) drawStill(); else kick();

  var resizeT;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { build(false); if (STILL) drawStill(); }, 140);
  });

  if (!STILL) {
    var place = function (e) { var b = canvas.getBoundingClientRect(); PTR.x = e.clientX - b.left; PTR.y = e.clientY - b.top; };
    hero.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      place(e);
      if (!PTR.on) { PX[0] = PX[1] = PX[2] = PTR.x; PY[0] = PY[1] = PY[2] = PTR.y; }
      PTR.on = 1; touched(performance.now());
    });
    hero.addEventListener("pointerleave", function () { PTR.on = 0; });
    canvas.addEventListener("pointerdown", function (e) { place(e); echo(PTR.x, PTR.y, 1); touched(performance.now()); });
    var visible = true;
    var sync = function () { running = visible && !document.hidden; if (running) lastT = 0, kick(); };
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; sync(); }).observe(hero);
    document.addEventListener("visibilitychange", sync);
  }

  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); running = false; });
}
