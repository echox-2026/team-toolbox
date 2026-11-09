(function () {
  "use strict";

  var REPO = "https://github.com/echox-2026/team-toolbox";
  var SUBMIT_URL = REPO + "/issues/new?title=" + encodeURIComponent("[投稿] ");
  function updateUrl(id) { return REPO + "/issues/new?title=" + encodeURIComponent("[更新] " + id); }

  var $ = function (id) { return document.getElementById(id); };
  var demoData = Array.isArray(window.ECHOX_DEMO) ? window.ECHOX_DEMO : null;
  var real = [], loadFailed = false;
  var state = { view: "project", q: "", cat: "", tag: "", demo: !!demoData };

  function h(tag, props, kids) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "text") n.textContent = props[k];
      else if (k === "class") n.className = props[k];
      else if (k === "on") Object.keys(props.on).forEach(function (e) { n.addEventListener(e, props.on[e]); });
      else n.setAttribute(k, props[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function https(u) {
    if (typeof u !== "string" || !u) return "";
    try { var p = new URL(u); return p.protocol === "https:" ? p.href : ""; } catch (e) { return ""; }
  }
  function clean(list) {
    return (Array.isArray(list) ? list : []).filter(function (e) {
      return e && /^[a-z0-9-]{1,64}$/.test(e.id || "") && (e.type === "project" || e.type === "tool") && e.title && e.summary && https(e.repoUrl);
    });
  }
  function all() { return state.demo ? clean(demoData) : real; }
  function typeName(t) { return t === "tool" ? "工具" : "项目"; }

  function hash32(s, salt) {
    var x = 2166136261 ^ salt;
    for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
    return x >>> 0;
  }
  function randomart(seed, ghost) {
    var W = 17, H = 9, grid = [], i, x = 8, y = 4, sx = 8, sy = 4;
    for (i = 0; i < W * H; i++) grid.push(0);
    for (var b = 0; b < 30; b++) {
      var v = hash32(seed, b * 2654435);
      for (var s = 0; s < 8; s += 2) {
        var m = (v >>> s) & 3;
        x = Math.max(0, Math.min(W - 1, x + (m & 1 ? 1 : -1)));
        y = Math.max(0, Math.min(H - 1, y + (m & 2 ? 1 : -1)));
        grid[y * W + x]++;
      }
    }
    var angle = hash32(seed, 91) % 90 + 110;
    var gid = "g" + hash32(seed, 7).toString(36);
    var out = '<svg viewBox="0 0 170 95.6" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">';
    if (!ghost) {
      var r = (angle - 90) * Math.PI / 180;
      out += '<defs><linearGradient id="' + gid + '" x1="' + (.5 - Math.cos(r) / 2).toFixed(3) + '" y1="' + (.5 - Math.sin(r) / 2).toFixed(3) + '" x2="' + (.5 + Math.cos(r) / 2).toFixed(3) + '" y2="' + (.5 + Math.sin(r) / 2).toFixed(3) + '">' +
        '<stop offset="0" stop-color="#88919c"/><stop offset=".55" stop-color="#5f6973"/><stop offset="1" stop-color="#3f4a53"/></linearGradient></defs>' +
        '<rect width="170" height="95.6" fill="url(#' + gid + ')"/>';
    }
    var dim = ghost ? "#88919c" : "#ffffff", hot = ghost ? "#5f6973" : "#a6f3df";
    for (var cy = 0; cy < H; cy++) {
      for (var cx = 0; cx < W; cx++) {
        var n = grid[cy * W + cx], px = cx * 10 + 5, py = cy * 10 + 7.8;
        var isEnd = (cx === x && cy === y) || (cx === sx && cy === sy);
        var rad = n === 0 ? .55 : Math.min(3.9, 1.1 + n * .55);
        var fill = n >= 3 || isEnd ? hot : dim, op = n === 0 ? .2 : .92;
        out += '<circle cx="' + px + '" cy="' + py + '" r="' + (isEnd ? 4.2 : rad).toFixed(2) + '" fill="' + fill + '" opacity="' + op + '"/>';
      }
    }
    return out + "</svg>";
  }

  function cover(e, withKind) {
    var c = h("div", { class: "cover" });
    if (e.cover && /^(assets|data)\/[\w\/.-]+$/.test(e.cover)) {
      var img = h("img", { src: e.cover, alt: e.title + " 的封面", loading: "lazy" });
      img.addEventListener("error", function () { img.remove(); c.insertAdjacentHTML("afterbegin", randomart(e.id)); });
      c.appendChild(img);
    } else c.innerHTML = randomart(e.id);
    if (withKind) c.appendChild(h("span", { class: "kind", text: typeName(e.type) }));
    return c;
  }

  function actions(e) {
    var out = [], repo = https(e.repoUrl), asset = https(e.assetUrl), release = https(e.releaseUrl);
    if (e.type === "tool" && asset) out.push({ label: "下载工具", href: asset, primary: true });
    else if (e.type === "tool" && release) out.push({ label: "查看版本", href: release, primary: true });
    out.push({ label: "查看仓库", href: repo, primary: out.length === 0 });
    return out.map(function (a) { return h("a", { class: "btn" + (a.primary ? " primary" : ""), href: a.href, rel: "noopener", text: a.label + " ↗" }); });
  }

  function card(e) {
    var tags = (e.tags || []).slice(0, 4).map(function (t) { return h("span", { text: t }); });
    var by = [e.author, e.updatedAt].filter(Boolean).join(" · ");
    return h("article", { class: "card-lib" }, [
      cover(e, true),
      h("div", { class: "card-body" }, [
        h("h3", {}, [h("a", { href: "#item-" + e.id, text: e.title })]),
        by ? h("div", { class: "byline", text: by }) : h("div"),
        h("p", { class: "summary", text: e.summary }),
        h("div", { class: "tags" }, tags),
        h("div", { class: "acts" }, actions(e).concat([h("a", { class: "btn", href: "#item-" + e.id, text: "详情" })]))
      ])
    ]);
  }

  function matchQ(e) {
    var q = state.q.trim().toLowerCase();
    if (!q) return true;
    return [e.title, e.summary, e.author, e.category].concat(e.tags || []).join(" ").toLowerCase().indexOf(q) >= 0;
  }

  function slots(view) {
    var isTool = view === "tool";
    var heads = isTool ? ["好用的工具，陆续收集。", "这个位置还空着", "这个位置还空着"] : ["第一个项目，正在路上。", "这个位置还空着", "这个位置还空着"];
    var note = isTool ? "暂未提供下载。工具收录后，这里会放上经过检查的发行包。" : "暂未收录项目。成员的公开仓库会以卡片的形式出现在这里。";
    return heads.map(function (t, i) {
      var c = h("div", { class: "cover" }); c.innerHTML = randomart(view + "-slot-" + i, true);
      return h("div", { class: "slot" }, [c, h("div", { class: "slot-body" }, [
        h("span", { class: "slot-id", text: "SLOT 0" + (i + 1) + " · 空" }),
        h("h3", { text: t }),
        i === 0 ? h("p", { text: note }) : h("p", { text: "等待下一位成员。" }),
        i === 0 ? h("a", { class: "btn primary", href: SUBMIT_URL, rel: "noopener", text: "提交项目／工具 ↗" }) : null
      ])]);
    });
  }

  function chip(label, active, cls, fn) {
    return h("button", { type: "button", class: "chip" + (cls ? " " + cls : ""), "aria-pressed": String(active), text: label, on: { click: fn } });
  }

  function render() {
    var list = all(), projects = list.filter(function (e) { return e.type === "project"; }), tools = list.filter(function (e) { return e.type === "tool"; });
    var hc = $("count"); if (hc) hc.textContent = projects.length + " 个项目 · " + tools.length + " 个工具";
    $("n-project").textContent = projects.filter(matchQ).length;
    $("n-tool").textContent = tools.filter(matchQ).length;
    ["project", "tool"].forEach(function (v) { $("v-" + v).setAttribute("aria-pressed", String(state.view === v)); });

    var bar = $("demo-bar");
    bar.hidden = !demoData;
    if (demoData) {
      $("demo-text").textContent = state.demo ? "当前显示演示数据，用于检查布局，不代表真实成员或项目。" : "当前显示真实目录，也就是网站上线时的状态。";
      $("demo-toggle").textContent = state.demo ? "查看真实空状态" : "查看演示数据";
    }

    var inView = state.view === "tool" ? tools : projects;
    $("filters").hidden = list.length === 0;
    var cats = [], tagset = [];
    inView.forEach(function (e) {
      if (e.category && cats.indexOf(e.category) < 0) cats.push(e.category);
      (e.tags || []).forEach(function (t) { if (tagset.indexOf(t) < 0) tagset.push(t); });
    });
    var catBox = $("cats"); catBox.textContent = "";
    if (cats.length) {
      catBox.appendChild(chip("全部分类", !state.cat, "", function () { state.cat = ""; render(); }));
      cats.forEach(function (c) { catBox.appendChild(chip(c, state.cat === c, "", function () { state.cat = state.cat === c ? "" : c; render(); })); });
    }
    var tagBox = $("tagsbox"); tagBox.textContent = "";
    tagset.forEach(function (t) { tagBox.appendChild(chip(t, state.tag === t, "tag", function () { state.tag = state.tag === t ? "" : t; render(); })); });

    var shown = inView.filter(function (e) { return matchQ(e) && (!state.cat || e.category === state.cat) && (!state.tag || (e.tags || []).indexOf(state.tag) >= 0); });
    var grid = $("grid-lib"); grid.textContent = "";
    if (loadFailed && !state.demo) {
      grid.appendChild(h("div", { class: "none", style: "grid-column:1/-1" }, [h("p", { text: "目录暂时读取失败，刷新页面再试一次。" })]));
    } else if (inView.length === 0) {
      slots(state.view).forEach(function (s) { grid.appendChild(s); });
    } else if (shown.length === 0) {
      grid.appendChild(h("div", { class: "none", style: "grid-column:1/-1" }, [
        h("p", { text: "没有找到符合条件的条目。" }),
        h("button", { type: "button", class: "btn", text: "清除筛选", on: { click: function () { state.q = ""; state.cat = ""; state.tag = ""; $("q").value = ""; render(); } } })
      ]));
    } else shown.forEach(function (e) { grid.appendChild(card(e)); });
  }

  var dlg = $("detail");
  function fact(label, value) { return value ? h("div", {}, [h("dt", { text: label }), h("dd", { text: value })]) : null; }
  function openDetail(id) {
    var e = all().filter(function (x) { return x.id === id; })[0];
    dlg.textContent = "";
    var close = h("button", { type: "button", class: "x", text: "关闭", on: { click: function () { dlg.close(); } } });
    if (!e) {
      dlg.appendChild(h("div", { class: "d-body" }, [
        h("div", { class: "d-top" }, [h("h2", { text: "没有找到这个条目" }), close]),
        h("p", { class: "d-text", text: "它可能已经下架，或者链接有误。回到目录可以继续浏览其他项目和工具。" })
      ]));
    } else {
      dlg.appendChild(cover(e, false));
      dlg.appendChild(h("div", { class: "d-body" }, [
        h("div", { class: "d-top" }, [h("h2", { text: e.title }), close]),
        h("p", { class: "d-text", text: e.description || e.summary }),
        h("dl", { class: "d-meta" }, [
          fact("类型", typeName(e.type)), fact("作者", e.author), fact("分类", e.category),
          fact("适用系统", (e.platforms || []).join("、")), fact("版本", e.version), fact("更新时间", e.updatedAt)
        ]),
        (e.tags || []).length ? h("div", { class: "tags" }, e.tags.map(function (t) { return h("span", { text: t }); })) : null,
        h("div", { class: "acts" }, actions(e)),
        h("a", { class: "link-quiet", href: updateUrl(e.id), rel: "noopener", text: "申请更新这个条目 ↗" })
      ]));
    }
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }
  dlg.addEventListener("close", function () { if (location.hash.indexOf("#item-") === 0) location.hash = "library"; });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

  function route() {
    var m = /^#item-([a-z0-9-]{1,64})$/.exec(location.hash);
    if (m) openDetail(m[1]); else if (dlg.open) dlg.close();
  }
  window.addEventListener("hashchange", route);

  ["project", "tool"].forEach(function (v) {
    $("v-" + v).addEventListener("click", function () { state.view = v; state.cat = ""; state.tag = ""; render(); });
  });
  $("q").addEventListener("input", function (e) { state.q = e.target.value; render(); });
  $("demo-toggle").addEventListener("click", function () { state.demo = !state.demo; state.cat = ""; state.tag = ""; state.q = ""; $("q").value = ""; render(); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-submit]"), function (a) { a.href = SUBMIT_URL; });

  render();
  fetch("data/entries.json", { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
    .then(function (d) { real = clean(d.entries); })
    .catch(function () { loadFailed = true; })
    .then(function () { render(); route(); });
})();
