/* 投资大师实战 · UI 层
 * 报纸开幕 → 终端（K线 + 打字机消息 + 下置持仓/研究）→ 幕间对照
 * 依赖 engine.js / chart.js / audio.js
 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  /* 紧凑金额：1.23亿 / 456万 / 880 */
  function fmtC(x) {
    var abs = Math.abs(x);
    var s;
    if (abs >= 1e8) s = (x / 1e8).toFixed(abs < 10e8 ? 2 : 1) + '亿';
    else if (abs >= 1e4) s = (x / 1e4).toFixed(abs < 100e4 ? 1 : 0) + '万';
    else s = x.toFixed(0);
    return s;
  }
  MR.fmtC = fmtC;

  var UI = (MR.UI = {});

  /* ========== toast ========== */
  var toastTimer = null;
  UI.toast = function (msg, isErr) {
    var t = $('toast');
    t.textContent = msg;
    t.className = isErr ? 'err show' : 'show';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, 2400);
  };

  /* ========== 通用弹窗 ========== */
  /* opts.dismiss: 点遮罩可关闭（信息类弹窗用；流程/决策弹窗禁用） */
  function modal(innerHtml, opts) {
    var mask = el('div', 'modal-mask');
    var box = el('div', 'modal', innerHtml);
    mask.appendChild(box);
    document.body.appendChild(mask);
    var api = { mask: mask, box: box, close: function () { if (mask.parentNode) mask.parentNode.removeChild(mask); } };
    if (opts && opts.dismiss) {
      mask.addEventListener('click', function (ev) { if (ev.target === mask) api.close(); });
    }
    return api;
  }
  UI.modal = modal;

  /* ========== 场景层（开场叙事 · 自动播放） ========== */
  UI.showScene = function (scene, cb) {
    var layer = $('scene-layer');
    layer.classList.remove('hidden');
    $('terminal-layer').classList.add('hidden');
    var bg = layer.querySelector('.scene-era-bg');
    bg.className = 'scene-era-bg' + (scene.mood === 'crash' ? ' crash' : '');
    var body = $('scene-body');
    body.innerHTML = '';
    body.appendChild(el('div', 'scene-date', esc(scene.dateLabel || '')));
    body.appendChild(el('div', 'scene-title', esc(scene.title || '')));
    if (scene.image) {
      var img = el('img', 'scene-img');
      img.src = scene.image;
      body.appendChild(img);
    }
    var lines = (scene.lines || []).slice();
    (scene.dialogue || []).forEach(function (d) {
      lines.push('> ' + (d.who ? d.who + '：' : '') + d.text);
    });
    var shown = 0, timer = null, done = false;
    var foot = $('scene-foot');
    foot.innerHTML = '<div class="tap-hint">自动播放中 · 点击加速 ▼</div>';

    function reveal() {
      if (shown >= lines.length) { finish(); return; }
      var raw = lines[shown++];
      var isQuote = raw.charAt(0) === '>';
      var div = el('div', 'scene-line' + (isQuote ? ' quote' : ''), esc(isQuote ? raw.slice(1).trim() : raw));
      body.appendChild(div);
      requestAnimationFrame(function () { requestAnimationFrame(function () { div.classList.add('show'); }); });
      body.scrollTop = body.scrollHeight;
      if (shown >= lines.length) finish();
    }
    function finish() {
      if (done) return;
      done = true;
      if (timer) clearInterval(timer);
      foot.innerHTML = '<button class="btn primary block">' + esc(scene.cta || '继续') + '</button>';
      foot.querySelector('button').onclick = function (ev) { ev.stopPropagation(); layer.onclick = null; cb(); };
    }
    timer = setInterval(reveal, 1050);   // 自动逐行播放
    layer.onclick = function () { reveal(); };
    reveal();
  };
  UI.hideScene = function () { $('scene-layer').classList.add('hidden'); };

  /* ========== 模式选择 ========== */
  UI.showModeSelect = function (caseData, cb) {
    var totalCards = 0;
    (caseData.research || []).forEach(function (m) { totalCards += (m.cards || []).length; });
    var m = modal(
      '<h3>' + esc(caseData.title) + '</h3>' +
      '<div class="m-sub">' + esc(caseData.era) + ' · 选择你的开局方式</div>' +
      '<div class="mode-card" id="mode-fast"><h4>⚡ 直接进入市场</h4>' +
      '<p>一页简报直接进盘面，凭直觉交易，先体验那段行情的惊心动魄。约 5–8 分钟。复盘时会告诉你错过了哪些关键线索。</p>' +
      '<button class="btn primary block">直接开盘</button></div>' +
      '<div class="mode-card" id="mode-deep"><h4>📚 深度研究模式（可选）</h4>' +
      '<p>开盘前研读当年的研报包（宏观/产业/财报/公司/资金/情绪，共 ' + totalCards + ' 张真实史料卡），像真正的基金经理一样做足功课再上场。内容较长，适合想深挖的人。约 10–15 分钟。</p>' +
      '<button class="btn block">先做足功课再上场</button></div>' +
      '<div class="exit-link" id="mode-exit">‹ 退出，回大厅换一个剧本</div>'
    );
    m.box.querySelector('#mode-deep button').onclick = function () { m.close(); cb('deep'); };
    m.box.querySelector('#mode-fast button').onclick = function () { m.close(); cb('fast'); };
    m.box.querySelector('#mode-exit').onclick = function () { m.close(); if (MR.requestExit) MR.requestExit(true); };
  };

  /* ========== 品种预选（多标的剧本进场先选，后续全程默认） ========== */
  UI.pickInstrument = function (caseData, cb) {
    // 年复盘：行业太多，不强制开局选；直接进盘面，默认停在大盘、行业做标签自由切换
    if (/^(annual|us|comm)_/.test((caseData && caseData.id) || '')) { cb(null); return; }
    var list = (caseData.instruments || []).filter(function (it) { return it.kind !== 'index'; });
    if (list.length <= 1) { cb(list[0] ? list[0].id : null); return; }
    var html = '<h3>选择你的主战品种</h3><div class="m-sub">全程默认操作这个品种；盘中随时可以在品种栏切换</div>';
    list.forEach(function (it, i) {
      html += '<button class="dec-opt" data-id="' + esc(it.id) + '">' + esc(it.name) +
        (it.kind === 'futures' ? '<span class="do-hint">期货 · 可双向交易</span>' : '<span class="do-hint">' + (it.kind === 'etf' ? 'ETF' : it.kind === 'sector' ? '申万一级行业指数' : '股票') + '</span>') + '</button>';
    });
    html += '<div class="exit-link" id="pick-exit">‹ 退出，回大厅换一个剧本</div>';
    var m = modal(html);
    m.box.querySelectorAll('.dec-opt').forEach(function (b) {
      b.onclick = function () { m.close(); cb(b.getAttribute('data-id')); };
    });
    m.box.querySelector('#pick-exit').onclick = function () { m.close(); if (MR.requestExit) MR.requestExit(true); };
  };

  /* ========== 研究系统 ========== */
  var researchRead = {};        // moduleId -> true
  var researchOpens = {};       // moduleId -> 打开次数（投资流派判定用）
  UI.getResearchRead = function () { return researchRead; };
  UI.getResearchStats = function () { return { read: researchRead, opens: researchOpens }; };
  UI.resetResearch = function () { researchRead = {}; researchOpens = {}; };

  /* 全屏阅读器：研究内容全屏查看；盘中打开自动暂停。顶部+底部双返回 */
  function openFullReader(title, bodyHtml, onClose) {
    var layer = $('research-full');
    var wasPlaying = T.engine && T.engine.playing;
    if (wasPlaying) T.engine.pause();
    layer.classList.remove('hidden');
    layer.innerHTML = '<div class="rf-head"><button class="rf-back" type="button">‹ 返回</button>' +
      '<div class="rf-title">' + esc(title) + '</div>' +
      (wasPlaying ? '<div class="rf-pause">⏸ 行情已暂停</div>' : '<div></div>') + '</div>' +
      '<div class="rf-body">' + bodyHtml +
      '<button class="btn block rf-bottom-back" type="button">‹ 返回' + (wasPlaying ? '，继续行情' : '') + '</button></div>';
    layer.scrollTop = 0;
    function back() {
      layer.classList.add('hidden');
      layer.innerHTML = '';
      if (onClose) onClose();
      if (wasPlaying && T.engine && !T.engine.finished) T.engine.play();
    }
    layer.querySelector('.rf-back').onclick = back;
    layer.querySelector('.rf-bottom-back').onclick = back;
  }

  function cardHtml(c) {
    return '<div class="rcard' + ((c.key || c.keyInsight) ? ' key' : '') + '">' +
      '<div class="rc-date">' + esc(c.date || '') + '</div>' +
      '<h5>' + esc(c.title) + '</h5>' +
      '<div class="rc-body">' + esc(c.body) + '</div>' +
      (c.source ? '<div class="rc-src">—— ' + esc(c.source) + '</div>' : '') + '</div>';
  }

  /* 公司研究 + 财报与估值（caseData.profile，可选） */
  function profileResearchHtml(p) {
    var h = '<div class="rcard key"><h5>' + esc(p.title || '这家公司是做什么的') + '</h5>' +
      '<div class="rc-body">' + esc(p.intro || '') + '</div></div>';
    if (p.narrative) {
      h += '<div class="rcard"><h5>当时市场在讲的逻辑</h5><div class="rc-body">' + esc(p.narrative) + '</div></div>';
    }
    if ((p.bull || []).length || (p.bear || []).length) {
      h += '<div class="bb-grid">';
      h += '<div class="bb-col bull"><div class="bb-h">看多观点</div>' +
        (p.bull || []).map(function (x) { return '<div class="bb-item">' + esc(x) + '</div>'; }).join('') + '</div>';
      h += '<div class="bb-col bear"><div class="bb-h">看空观点</div>' +
        (p.bear || []).map(function (x) { return '<div class="bb-item">' + esc(x) + '</div>'; }).join('') + '</div>';
      h += '</div>';
    }
    return h;
  }
  function profileFinHtml(p) {
    var h = '';
    if ((p.metrics || []).length) {
      h += '<table class="fin-table">';
      p.metrics.forEach(function (mt) {
        h += '<tr><td class="fk">' + esc(mt.k) + '</td><td class="fv num">' + esc(mt.v) + '</td></tr>';
      });
      h += '</table>';
    }
    if (p.valuationPctile) {
      h += '<div class="rcard"><h5>估值百分位</h5><div class="rc-body">' + esc(p.valuationPctile) + '</div></div>';
    }
    if (p.metricsNote) {
      h += '<div class="rcard key"><h5>增速与估值是否匹配</h5><div class="rc-body">' + esc(p.metricsNote) + '</div></div>';
    }
    return h || '<div class="m-sub">本剧本暂无结构化财务数据</div>';
  }

  /* 开局（深度模式）：勾选模块，逐模块全屏阅读 */
  UI.showResearchSelect = function (caseData, cb) {
    var mods = caseData.research || [];
    var picked = {};
    mods.forEach(function (mm) { picked[mm.id] = true; });
    var html = '<h3>开盘前 · 研报包</h3><div class="m-sub">勾选你要研读的模块（信息越全，判断越稳——但当年没人能全看完）</div><div class="research-grid">';
    mods.forEach(function (mm) {
      html += '<div class="research-item on" data-id="' + mm.id + '"><div class="ri-icon">' + (mm.icon || '📄') + '</div>' +
        '<div class="ri-name">' + esc(mm.title) + '</div><div class="ri-count">' + (mm.cards || []).length + ' 张史料卡</div></div>';
    });
    html += '</div><button class="btn gold block" id="r-go">开始研读</button>' +
      '<div class="exit-link" id="rs-exit">‹ 退出，回大厅换一个剧本</div>';
    var m = modal(html);
    m.box.querySelectorAll('.research-item').forEach(function (item) {
      item.onclick = function () {
        var id = item.getAttribute('data-id');
        picked[id] = !picked[id];
        item.classList.toggle('on', picked[id]);
      };
    });
    m.box.querySelector('#rs-exit').onclick = function () { m.close(); if (MR.requestExit) MR.requestExit(true); };
    m.box.querySelector('#r-go').onclick = function () {
      m.close();
      var queue = mods.filter(function (mm) { return picked[mm.id]; });
      readModulesFS(caseData, queue, 0, cb);
    };
  };

  function readModulesFS(caseData, queue, i, cb) {
    if (i >= queue.length) { cb(); return; }
    var mod = queue[i];
    researchRead[mod.id] = true;
    researchOpens[mod.id] = (researchOpens[mod.id] || 0) + 1;
    var body = '<div class="m-sub">第 ' + (i + 1) + '/' + queue.length + ' 模块 · 以下全部为当年真实史料</div>' +
      (mod.cards || []).map(cardHtml).join('') +
      '<button class="btn primary block" id="rf-next">' + (i + 1 >= queue.length ? '研读完毕，准备上场' : '下一模块 →') + '</button>';
    // 开局研读：顶部/底部「返回」= 回到研报模块选择页（真正的"上一步"，不再误跳进场）
    openFullReader((mod.icon || '📄') + ' ' + mod.title, body, function () { UI.showResearchSelect(caseData, cb); });
    $('research-full').querySelector('#rf-next').onclick = function () {
      $('research-full').classList.add('hidden');
      $('research-full').innerHTML = '';
      readModulesFS(caseData, queue, i + 1, cb);
    };
  }

  /* 终端内研究 tab：公司研究/财报估值置顶，其余史料模块；点击全屏阅读 */
  /* 行业级可见性：instr 为空（通用/大盘）恒可见；否则仅当等于当前 activeInstr 时可见。
   * 消息流与研报共用同一规则，保证「交易某行业只看该行业资讯」一致。 */
  function instrVisible(instr) {
    return !instr || instr === UI.T.activeInstr;
  }

  function renderResearchTab(caseData, container) {
    container.innerHTML = '';
    var wrap = el('div', 'research-wrap');
    var grid = el('div', 'research-grid compact');
    var p = caseData.profile;
    if (p) {
      var c1 = el('div', 'research-item prof' + (researchRead._prof ? ' read' : ''),
        '<div class="ri-icon">🏢</div><div class="ri-name">' + esc(p.tabTitle || '公司研究') + '</div><div class="ri-count">介绍 · 逻辑 · 多空</div>');
      c1.onclick = function () {
        researchRead._prof = true;
        researchOpens.company = (researchOpens.company || 0) + 1;
        openFullReader('🏢 ' + (p.tabTitle || '公司研究'), profileResearchHtml(p), function () { renderResearchTab(caseData, container); });
      };
      grid.appendChild(c1);
      var c2 = el('div', 'research-item prof' + (researchRead._fin ? ' read' : ''),
        '<div class="ri-icon">📊</div><div class="ri-name">财报与估值</div><div class="ri-count">营收 · 增速 · 估值位</div>');
      c2.onclick = function () {
        researchRead._fin = true;
        researchOpens.financial = (researchOpens.financial || 0) + 1;
        openFullReader('📊 财报与估值', profileFinHtml(p), function () { renderResearchTab(caseData, container); });
      };
      grid.appendChild(c2);
    }
    (caseData.research || []).forEach(function (mod) {
      // 行业级研报：mod.instr / 卡片 c.instr 标了行业则仅在交易该标的时显示；未标=大盘通用恒显示
      if (!instrVisible(mod.instr)) return;
      var cards = (mod.cards || []).filter(function (c) { return instrVisible(c.instr); });
      if (mod.instr == null && !cards.length && (mod.cards || []).length) return;   // 模块本身通用，但卡片全被过滤掉则不显示空模块
      var item = el('div', 'research-item' + (researchRead[mod.id] ? ' read' : ''),
        '<div class="ri-icon">' + (mod.icon || '📄') + '</div><div class="ri-name">' + esc(mod.title) + '</div>' +
        '<div class="ri-count">' + cards.length + ' 张史料卡</div>');
      item.onclick = function () {
        researchRead[mod.id] = true;
        researchOpens[mod.id] = (researchOpens[mod.id] || 0) + 1;
        openFullReader((mod.icon || '📄') + ' ' + mod.title,
          cards.map(cardHtml).join(''),
          function () { renderResearchTab(caseData, container); });
      };
      grid.appendChild(item);
    });
    wrap.appendChild(grid);
    wrap.appendChild(el('div', 'research-foot', '点开任意模块全屏研读 · 行情自动暂停'));
    container.appendChild(wrap);
  }

  /* ========== 报纸开幕（替代逐幕场景+预判弹窗） ========== */
  /* 每幕开始：一张报纸头版（多空交织 · 自动播放），底部一行观点速记，一键开盘 */
  UI.showNewspaper = function (caseData, act, actIdx, cb) {
    var scene = act.scene || {};
    var evs = act.events || [];
    var bulls = evs.filter(function (e) { return e.stance === 'bull' && e.title; }).slice(0, 2);
    var bears = evs.filter(function (e) { return e.stance === 'bear' && e.title; }).slice(0, 2);
    var mask = el('div', 'paper-mask');
    var lines = (scene.lines || []).slice();
    var html = '<div class="paper">' +
      '<button class="paper-back" type="button">‹</button>' +
      '<div class="paper-mast"><span class="pm-name">大师日报</span>' +
      '<span class="pm-date">' + esc((scene.dateLabel || '').replace(/\s*·\s*(?:第[一二三四五六七八九十]+[幕版]|终幕)\s*$/, '')) + '</span></div>' +
      '<div class="paper-rule"></div>' +
      '<h2 class="paper-head">' + esc(scene.title || act.title) + '</h2>' +
      '<div class="paper-body" id="paper-body"></div>';
    if (bulls.length || bears.length) {
      html += '<div class="paper-bb"><div class="pbb-col"><div class="pbb-h">多方声音</div>' +
        bulls.map(function (e) { return '<div class="pbb-i">▲ ' + esc(e.title) + '</div>'; }).join('') + '</div>' +
        '<div class="pbb-col bear"><div class="pbb-h">空方声音</div>' +
        bears.map(function (e) { return '<div class="pbb-i">▼ ' + esc(e.title) + '</div>'; }).join('') + '</div></div>';
    }
    var prompt = act.expectation && act.expectation.prompt;
    // 报纸只承载剧情与多空信息：看完直接进盘面，买卖由玩家在 K 线上自己做
    // （已去掉「看多看空/胜率/赔率/计划仓位」表单——填表太烦，且会挡在玩之前拉低完成率）
    html += (prompt ? '<div class="paper-edit">【编辑部之问】' + esc(prompt) + '</div>' : '') +
      '<div class="paper-foot">' +
      '<button class="btn primary block" id="pf-go">知道了 · 进入盘面 →</button></div></div>';
    mask.innerHTML = html;
    document.body.appendChild(mask);
    var bodyEl = mask.querySelector('#paper-body');
    var shown = 0, timer = null;
    function reveal() {
      if (shown >= lines.length) { if (timer) clearInterval(timer); return; }
      var raw = lines[shown++];
      var isQuote = raw.charAt(0) === '>';
      var div = el('div', 'paper-line' + (isQuote ? ' quote' : ''), esc(isQuote ? raw.slice(1).trim() : raw));
      bodyEl.appendChild(div);
      requestAnimationFrame(function () { requestAnimationFrame(function () { div.classList.add('show'); }); });
    }
    timer = setInterval(reveal, 850);
    reveal();
    mask.onclick = function (ev) { if (ev.target === mask || ev.target === bodyEl) reveal(); };
    mask.querySelector('.paper-back').onclick = function () {
      if (MR.requestExit) MR.requestExit();
    };
    mask.querySelector('#pf-go').onclick = function () {
      if (timer) clearInterval(timer);
      if (mask.parentNode) mask.parentNode.removeChild(mask);
      cb();   // 不再收集预判，直接进盘面
    };
  };

  /* ========== 交易终端 ========== */
  var T = {
    engine: null, caseData: null,
    activeInstr: null, preferredInstr: null, chart: null, ecg: null, hb: null,
    pct: 25, useMargin: false, activeTab: 'pos', tickCount: 0
  };
  UI.T = T;
  UI.setPreferredInstr = function (id) { T.preferredInstr = id; };

  var SVG_ON = '<svg width="17" height="17" viewBox="0 0 24 24"><path d="M3 9.5v5h3.6L12 19V5L6.6 9.5H3z" fill="currentColor"/><path d="M15.5 8.7a4.6 4.6 0 0 1 0 6.6M17.8 6.4a7.8 7.8 0 0 1 0 11.2" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
  var SVG_OFF = '<svg width="17" height="17" viewBox="0 0 24 24"><path d="M3 9.5v5h3.6L12 19V5L6.6 9.5H3z" fill="currentColor"/><line x1="15" y1="9.2" x2="20.6" y2="14.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="20.6" y1="9.2" x2="15" y2="14.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  UI.enterTerminal = function (engine, caseData, hb) {
    T.engine = engine; T.caseData = caseData; T.hb = hb;
    UI.hideScene();
    $('recap-layer').classList.add('hidden');
    $('terminal-layer').classList.remove('hidden');
    if (!T.chart) T.chart = new MR.Chart($('kchart'));
    if (!T.ecg && $('ecg')) T.ecg = new MR.ECG($('ecg'));   // 心率波形图已移除；存在才创建
    T.activeInstr = T.preferredInstr || entryInstr();
    buildInstrTabs();
    // 古典局透明提示：价格据史料锚点重构，不假装是交易所日K
    var rn = $('recon-note');
    if (rn) {
      if (caseData.reconstructed) { rn.textContent = '📐 ' + (caseData.dataNote || '价格据史料锚点重构（锚点真实，锚点间为重构）'); rn.style.display = 'block'; }
      else rn.style.display = 'none';
    }
    bindControls();
    applyLayout();
    applyMsgFilter();   // 进场即按当前标的过滤资讯（沿用上一局的 feed 时也立刻收敛）
    renderResearchTab(caseData, $('tab-research'));
    bSwitch(T.activeTab || 'pos');
    refreshAll();
  };

  /* ---- 板块高度：可拖动分隔条（K线 / 消息 区高度可调，持仓研究区吃剩余空间） ---- */
  var LAYOUT_KEY = 'mr_layout_v1';
  function loadLayout() {
    try { return JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveLayout(l) {
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch (e) {}
  }
  function applyLayout() {
    var l = loadLayout();
    if (l.chart) $('chart-wrap').style.height = l.chart + 'px';
    if (l.msg) $('msg-strip').style.height = l.msg + 'px';
  }
  function initDragHandles() {
    bindDrag($('dh-chart'), $('chart-wrap'), 150, 340, 'chart');
    bindDrag($('dh-msg'), $('msg-strip'), 40, 220, 'msg');
  }
  function bindDrag(handle, target, min, max, key) {
    if (!handle) return;
    var startY = 0, startH = 0, raf = null;
    function move(y) {
      var h = Math.max(min, Math.min(max, startH + (y - startY)));
      target.style.height = h + 'px';
      if (!raf) raf = requestAnimationFrame(function () { raf = null; drawChart(); });
      return h;
    }
    function end(y) {
      var l = loadLayout();
      l[key] = Math.round(parseFloat(target.style.height) || target.clientHeight);
      saveLayout(l);
    }
    handle.addEventListener('touchstart', function (ev) {
      startY = ev.touches[0].clientY; startH = target.clientHeight;
      handle.classList.add('dragging');
      ev.preventDefault();
    }, { passive: false });
    handle.addEventListener('touchmove', function (ev) {
      move(ev.touches[0].clientY);
      ev.preventDefault();
    }, { passive: false });
    handle.addEventListener('touchend', function () { handle.classList.remove('dragging'); end(); });
    // 桌面调试用鼠标
    handle.addEventListener('mousedown', function (ev) {
      startY = ev.clientY; startH = target.clientHeight;
      handle.classList.add('dragging');
      function mm(e2) { move(e2.clientY); }
      function mu() {
        handle.classList.remove('dragging'); end();
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
      }
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);
      ev.preventDefault();
    });
  }

  /* 标的列表：凡有 K 线（价格数据）的标的都可交易，指数(大盘/基准)也能下单。
     轮动局(年复盘/美股)：指数作「大盘」标签置于行业前，进场停在大盘；单标的局：指数(纯基准)补在标的之后。
     仅当基准既非指数标的、也不在可交易列表里（无元数据的纯展示基准）时，才保留只读行。 */
  function instrList() {
    var bench = T.caseData.market.benchmark;
    var isRotation = /^(annual|us|comm)_/.test((T.caseData && T.caseData.id) || '');
    var list = [], indices = [];
    var benchInList = false;
    T.caseData.instruments.forEach(function (it) {
      if (it.kind === 'index') { indices.push({ id: it.id, name: it.name }); return; }
      if (it.id === bench) benchInList = true;
      list.push(it);
    });
    if (indices.length) return isRotation ? indices.concat(list) : list.concat(indices);
    if (!benchInList) list.unshift({ id: bench, name: benchName(), readOnly: true });
    return list;
  }
  function firstTradeable() {
    var l = instrList();
    for (var i = 0; i < l.length; i++) if (!l[i].readOnly) return l[i].id;
    return l[0] && l[0].id;
  }
  // 进场默认标的：轮动局停在大盘（第一个指数标签，现也可交易），行业做标签；其余剧本取首个可交易标的
  function entryInstr() {
    if (/^(annual|us|comm)_/.test((T.caseData && T.caseData.id) || '')) {
      var l = instrList();
      if (l[0]) return l[0].id;
    }
    return firstTradeable();
  }
  function benchName() {
    return T.engine ? T.engine.benchLabel() : '基准';
  }

  function buildInstrTabs() {
    var bar = $('instr-tabs');
    bar.innerHTML = '';
    var list = instrList();
    // 入场预选的标的排到最前面——指标行可能横向滚动，选中的若在末尾会被挤出视野看不到
    if (T.activeInstr) {
      var pick = list.filter(function (x) { return x.id === T.activeInstr; });
      var rest = list.filter(function (x) { return x.id !== T.activeInstr; });
      list = pick.concat(rest);
    }
    // 可交易标的≤1（含「1标的+1基准只读」）：名称与涨跌幅并排一行，不再上下两行占高度
    var tradeable = list.filter(function (x) { return !x.readOnly; }).length;
    bar.classList.toggle('single', tradeable <= 1);
    list.forEach(function (it) {
      var tab = el('button', 'itab' + (it.id === T.activeInstr ? ' on' : ''),
        esc(shortName(it.name)) + '<span class="ichg num" id="ichg-' + it.id + '">—</span>');
      tab.setAttribute('data-id', it.id);
      tab.onclick = function () { UI.onPickInstr(it.id, it.readOnly); };
      bar.appendChild(tab);
    });
    bar.querySelectorAll('.itab').forEach(function (x) {
      x.classList.toggle('on', x.getAttribute('data-id') === T.activeInstr);
    });
    bar.scrollLeft = 0;   // 选中标的已排首位，滚回最左确保可见
  }
  /* 切标的统一入口：更新当前/偏好标的 → 高亮 tab → 刷新下单面板 → 重画 K 线 → 按标的过滤资讯/研究。
   * readOnly（如纯基准只读标的）不写 preferredInstr，避免把只读标的记成入场预选。 */
  UI.onPickInstr = function (id, readOnly) {
    T.activeInstr = id;
    if (!readOnly) T.preferredInstr = id;
    var bar = $('instr-tabs');
    if (bar) bar.querySelectorAll('.itab').forEach(function (x) {
      x.classList.toggle('on', x.getAttribute('data-id') === id);
    });
    updateOrderPanel();
    drawChart();
    applyMsgFilter();
    if (T.activeTab === 'research' && T.caseData) renderResearchTab(T.caseData, $('tab-research'));
  };
  function shortName(n) {
    return String(n || '').replace(/（[^）]*）/, '').slice(0, 7);
  }

  var controlsBound = false;
  function bindControls() {
    updateMuteIcon();
    if (controlsBound) { updateOrderPanel(); return; }
    controlsBound = true;
    initDragHandles();
    (function () {
      var zin = $('zoom-in'), zout = $('zoom-out');
      if (zin) zin.onclick = function () { if (T.chart) { T.chart.setWindow(T.chart.window / 1.6); drawChart(); } };
      if (zout) zout.onclick = function () { if (T.chart) { T.chart.setWindow(T.chart.window * 1.6); drawChart(); } };
      // 双指捏合缩放 K 线：两指张开=放大看细节（K线变少），捏拢=缩小看全局（K线变多）
      var cw = $('chart-wrap'), pd0 = 0, pw0 = 0;
      function pdist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
      if (cw) {
        cw.addEventListener('touchstart', function (ev) {
          if (ev.touches.length === 2 && T.chart) { pd0 = pdist(ev.touches); pw0 = T.chart.window; ev.preventDefault(); }
        }, { passive: false });
        cw.addEventListener('touchmove', function (ev) {
          if (ev.touches.length === 2 && T.chart && pd0 > 0) {
            var ratio = pdist(ev.touches) / pd0;
            if (ratio > 0.05) { T.chart.setWindow(pw0 / ratio); drawChart(); }
            ev.preventDefault();
          }
        }, { passive: false });
        cw.addEventListener('touchend', function (ev) { if (ev.touches.length < 2) pd0 = 0; });
      }
    })();
    $('btn-play').onclick = function () {
      var e = T.engine;
      if (e.playing) e.pause(); else { e.play(); if (T.hb) T.hb.resume(); }
    };
    // 长期持有到底：价值投资"躺着拿复利"——确认后跳到剧本末尾，按当前持仓结算出复盘
    $('btn-hold').onclick = function () {
      var e = T.engine;
      if (!e || e.finished) return;
      e.pause();
      var pf = e.pf;
      var hasPos = false;
      for (var k in pf.positions) { if (pf.positions[k].qty) { hasPos = true; break; } }
      var tip = hasPos
        ? '按你当前的持仓<b>长期持有到底</b>，时间快进到剧本结束，中途不再操作——直接看长期复利的结果。'
        : '你<b>当前空仓</b>。长期持有到底将以空仓状态快进到结束（收益约为 0）。确定要这样跳到结局吗？';
      var m = modal('<h3>🌱 长期持有到底</h3>' +
        '<div style="font-size:13.5px;color:#c6cdd6;line-height:1.6">' + tip +
        '<br><br><span style="color:#8b949e;font-size:12px">价值投资是一件煎熬的事——真正的收益往往属于拿得住的人。</span></div>');
      var go = el('button', 'btn primary block', '确认 · 持有到结局 →');
      var cancel = el('button', 'btn block', '再想想');
      go.onclick = function () { m.close(); if (T.hb) T.hb.setPaused(true); e.holdToEnd(); };
      cancel.onclick = m.close;
      m.box.appendChild(go); m.box.appendChild(cancel);
    };
    document.querySelectorAll('.speed-btn').forEach(function (b) {
      b.onclick = function () {
        document.querySelectorAll('.speed-btn').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        T.engine.setSpeed(parseFloat(b.getAttribute('data-s')));
      };
      // 默认倍速高亮跟随剧本的 defaultSpeed
      b.classList.toggle('on', parseFloat(b.getAttribute('data-s')) === T.engine.speed);
    });
    $('mute-btn').onclick = function () {
      if (!T.hb) return;
      T.hb.setMuted(!T.hb.muted);
      updateMuteIcon();
    };
    document.querySelectorAll('#order-panel .opct .chip').forEach(function (c) {
      c.onclick = function () {
        document.querySelectorAll('#order-panel .opct .chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        T.pct = parseInt(c.getAttribute('data-p'), 10);
      };
    });
    $('btn-buy').onclick = function () { placeOrder('buy'); };
    $('btn-close').onclick = function () { placeOrder('close'); };
    $('btn-short').onclick = function () { placeOrder('short'); };
    $('margin-check').onchange = function () { T.useMargin = $('margin-check').checked; };
    document.querySelectorAll('.btab').forEach(function (t) {
      t.onclick = function () { bSwitch(t.getAttribute('data-t')); };
    });
    updateOrderPanel();
  }
  function updateMuteIcon() {
    $('mute-btn').innerHTML = (T.hb && T.hb.muted) ? SVG_OFF : SVG_ON;
  }

  /* 三键模型：买入开多 / 平仓 / 卖出开空（仅期货类标的） */
  function placeOrder(action) {
    var e = T.engine;
    var isFut = e.isFut(T.activeInstr);
    var allowShort = isFut || !!(e.caseData.market && e.caseData.market.allowShort);
    var realSide = action;
    if (action === 'close') {
      if (isFut) realSide = 'close';
      else {
        var pc = e.pf.positions[T.activeInstr];   // 现货：持空头→买回平空，否则卖出平多
        realSide = (pc && pc.qty < 0) ? 'cover' : 'sell';
      }
    }
    if (action === 'short' && !allowShort) {
      UI.toast('该品种是现货股票，不支持卖空', true);
      return;
    }
    var r = e.order(T.activeInstr, realSide, T.pct, T.useMargin);
    UI.toast(r.msg, !r.ok);
    refreshAll();
  }

  function updateOrderPanel() {
    var its = instrList();
    var it = null;
    its.forEach(function (x) { if (x.id === T.activeInstr) it = x; });
    var readOnly = !it || !!it.readOnly;
    var isFut = T.engine.isFut(T.activeInstr);
    // 大盘只读标签：隐藏档位+买卖键、显示「点行业进去交易」提示（年复盘/美股）
    var wh = $('watch-hint');
    if (wh) wh.style.display = readOnly ? 'block' : 'none';
    var opct = document.querySelector('#order-panel .opct'), orow = document.querySelector('#order-panel .orow');
    if (opct) opct.style.display = readOnly ? 'none' : 'flex';
    if (orow) orow.style.display = readOnly ? 'none' : 'flex';
    $('btn-buy').disabled = readOnly;
    $('btn-close').disabled = readOnly;
    var allowShort = isFut || !!(T.caseData.market && T.caseData.market.allowShort);
    $('btn-short').disabled = readOnly || !allowShort;
    $('btn-buy').textContent = (isFut || allowShort) ? '买入开多' : '买入';
    $('btn-close').textContent = '平仓';
    $('btn-short').textContent = '卖出开空';
    var mr = T.caseData.market.margin;
    var showMr = !!(mr && mr.enabled && !readOnly && !isFut);
    $('margin-row').style.display = showMr ? 'flex' : 'none';
    if (showMr) {
      var mt = T.caseData.market.type, dd;
      if (mt === 'ashare') dd = [1.5, 1.3]; else if (mt === 'us' || mt === 'hk') dd = [1.4, 1.3];
      else if (mt === 'forex' || mt === 'commodity') dd = [1.2, 1.1]; else dd = [1.5, 1.3];
      var fL = mr.forceLine || dd[1], wL = mr.warnLine || Math.max(dd[0], fL + 0.15);
      var rate = mr.annualRate ? ' · 年息' + (mr.annualRate * 100).toFixed(1) + '%' : '';
      var w = $('margin-row').querySelector('.mr-warn');
      if (w) w.textContent = (mr.maxLeverage || 2) + '×杠杆' + rate + ' · 追保' + Math.round(wL * 100) + '% · 平仓' + Math.round(fL * 100) + '%';
    }
  }

  function bSwitch(t) {
    T.activeTab = t;
    document.querySelectorAll('.btab').forEach(function (x) {
      x.classList.toggle('on', x.getAttribute('data-t') === t);
    });
    $('tab-pos').classList.toggle('hidden', t !== 'pos');
    $('tab-research').classList.toggle('hidden', t !== 'research');
    if (t === 'pos') renderPositions();
    if (t === 'research') renderResearchTab(T.caseData, $('tab-research'));
  }

  /* ---- 渲染 ---- */
  function refreshAll() {
    refreshHud();
    refreshTabsPrice();
    drawChart();
    if (T.activeTab === 'pos') renderPositions();
  }

  function refreshHud() {
    var e = T.engine;
    if (!e) return;
    var date = e.currentDate() || e.calendar[0];
    $('t-date').textContent = date;
    var act = e.currentAct();
    /* 幕标签已从 HUD 移除：幕信息由大师日报承载，顶栏寸土寸金不再占位 */
    var nav = e.navNow();
    var navEl = $('t-nav');
    navEl.textContent = nav.toFixed(4);
    var warn = e.caseData.pressure && e.caseData.pressure.redemption;
    navEl.style.color = warn && nav < warn.warn ? '#ff4d4f' : nav >= 1 ? '#ff7875' : '#e6edf3';
    var wl = $('t-warnline');
    if (warn && nav < warn.warn) {
      wl.classList.add('show');
      wl.textContent = '⚠ 净值 ' + nav.toFixed(3) + ' 低于预警线 ' + warn.warn + '，清盘线 ' + warn.liquidation + ' — 客户正在赎回';
    } else wl.classList.remove('show');
    $('btn-play').textContent = e.playing ? '❚❚ 暂停' : '▶ 播放';
    $('btn-play').classList.toggle('playing', e.playing);
  }

  function refreshTabsPrice() {
    var e = T.engine;
    if (!e) return;
    instrList().forEach(function (it) {
      var info = e.priceOf(it.id);
      var span = $('ichg-' + it.id);
      if (!span || !info) return;
      if (info.suspended) { span.textContent = '停牌'; span.className = 'ichg num'; return; }
      var pc = e.prevClose(it.id) || info.price;
      var chg = (info.price / pc - 1) * 100;
      span.textContent = MR.fmtPrice(info.price) + ' ' + (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
      span.className = 'ichg num ' + (chg >= 0 ? 'u' : 'd');
    });
  }

  function drawChart() {
    var e = T.engine;
    if (!e) return;
    var date = e.currentDate() || e.calendar[0];
    if (e.intraday) {
      $('intra-banner').classList.add('show');
      var bsym = e.caseData.market.benchmark;
      var pc = e.prevClose(bsym);
      T.chart.drawIntraday(e.intraday.ticks.slice(), e.intraday.i, pc || e.intraday.ticks[0], date);
      return;
    }
    $('intra-banner').classList.remove('show');
    var book = e.prices[T.activeInstr];
    if (!book) return;
    var info = e.priceOf(T.activeInstr);
    var hist = [];
    for (var i = 0; i < book.dates.length; i++) {
      if (book.dates[i] >= date) break;
      hist.push(book.byDate[book.dates[i]]);
    }
    var forming = null;
    var today = book.at(date);
    if (today && info && !info.suspended) {
      forming = {
        date: date, o: today.o,
        h: Math.max(today.o, info.price), l: Math.min(today.o, info.price),
        c: info.price, volume: today.volume * ((e.frame + 1) / e.framesPerDay)
      };
    }
    T.chart.draw(hist, forming, info ? info.price : null, {
      priceLimit: e.caseData.market.priceLimit,
      suspended: info && info.suspended
    });
  }

  /* 持仓面板：一行一仓 · 万/亿紧凑格式 · 仓位与保证金占用 */
  function renderPositions() {
    var e = T.engine;
    if (!e) return;
    var date = e.currentDate() || e.calendar[0];
    var pf = e.pf;
    var c = $('tab-pos');
    var eq = e.equityNow();
    var totalMargin = 0, hasFut = false;
    for (var idm in pf.positions) {
      if (pf.positions[idm].fut) { hasFut = true; totalMargin += pf.positions[idm].margin || 0; }
    }
    var expo = pf.exposure(e.prices, date);
    var sum = '<div class="acct-line"><span>权益 <b class="num">' + fmtC(eq) + '</b></span>' +
      '<span>现金 <b class="num">' + fmtC(pf.cash) + '</b></span>' +
      '<span>仓位 <b class="num">' + Math.round(expo * 100) + '%</b></span>' +
      (hasFut ? '<span>保证金 <b class="num">' + (eq > 0 ? Math.round(totalMargin / eq * 100) : 0) + '%</b></span>' : '') +
      (pf.debt > 0 ? '<span class="warn">负债 <b class="num">' + fmtC(pf.debt) + '</b></span>' : '') +
      '</div>';
    var rows = '';
    var any = false;
    for (var id in pf.positions) {
      var p = pf.positions[id];
      if (!p.qty) continue;
      any = true;
      var book = e.prices[id];
      var info = e.priceOf(id);
      var cdl = book.lastOnOrBefore(date);
      var cur = info && !info.suspended ? info.price : (cdl ? cdl.c : p.cost);
      var pnl, pnlPct;
      if (p.fut) {
        pnl = (cur - p.cost) * (p.mult || 1) * p.qty;
        // 期货收益率按占用保证金（你的本金）计，杠杆后的浮盈浮亏才是真实体感
        pnlPct = p.margin > 0 ? pnl / p.margin * 100 : 0;
      } else {
        pnl = (cur - p.cost) * p.qty;
        pnlPct = p.cost > 0 ? (cur / p.cost - 1) * 100 * (p.qty < 0 ? -1 : 1) : 0;
      }
      var cls = pnl >= 0 ? 'u' : 'd';
      var qtyStr = p.fut ? (p.qty > 0 ? '多' : '空') + Math.abs(p.qty) + '手'
        : (p.qty < 0 ? '空' : '') + fmtQty(Math.abs(p.qty));
      rows += '<div class="prow">' +
        '<span class="p-name">' + esc(shortName(book.name)) + (info && info.suspended ? '<i class="p-sus">停</i>' : '') + '</span>' +
        '<span class="p-qty num' + (p.qty < 0 ? ' shrt' : (p.fut ? ' lng' : '')) + '">' + qtyStr + '</span>' +
        '<span class="p-px num">' + MR.fmtPrice(p.cost) + '→' + MR.fmtPrice(cur) + '</span>' +
        '<span class="p-pnl num ' + cls + '">' + (pnl >= 0 ? '+' : '') + fmtC(pnl) + ' ' + (pnlPct >= 0 ? '+' : '') + pnlPct.toFixed(1) + '%</span>' +
        '</div>';
    }
    if (!any) rows = '<div class="pos-empty">空仓中 · 在上方盘面亲自下单</div>';
    var pend = e.pendingSells.length ? '<div class="pos-pend">⏳ ' + e.pendingSells.length + ' 笔卖单跌停排队中…</div>' : '';
    c.innerHTML = sum + '<div class="pos-list">' + rows + '</div>' + pend;
  }
  function fmtQty(q) {
    return q >= 10000 ? (q / 10000).toFixed(1) + '万股' : q + '股';
  }

  /* ---- 消息流：打字机模式 ---- */
  var msgQueue = [], msgTyping = false;
  UI.pushMsg = function (e) {
    msgQueue.push(e);
    if (!msgTyping) typeNextMsg();
  };
  function msgIcon(e) {
    if (e.type === 'news') return '📰';
    if (e.type === 'wechat') return '💬';
    if (e.type === 'call') return '📞';
    return '🔔';
  }
  function typeNextMsg() {
    var e = msgQueue.shift();
    if (!e) { msgTyping = false; return; }
    msgTyping = true;
    var feed = $('msg-feed');
    if (!feed) { msgTyping = false; return; }
    var cls = 'tmsg ' + (e.type || 'news') + (e.stance ? ' ' + e.stance : '') + (e.level === 'warn' ? ' warn' : '');
    var head = msgIcon(e) + (e.date ? ' ' + String(e.date).slice(5) : '') +
      (e.from ? ' ' + esc(e.from) : '');
    var div = el('div', cls,
      '<span class="tm-head">' + head + '</span> ' +
      (e.title ? '<b class="tm-title">' + esc(e.title) + '</b> ' : '') +
      '<span class="tm-body"></span>' +
      (e.source ? '<span class="tm-src">——' + esc(e.source) + '</span>' : ''));
    // 行业级事件：标记归属标的（空=大盘通用，任何标的下都显示）。切标的时按此显隐过滤。
    div.setAttribute('data-instr', e.instr || '');
    feed.appendChild(div);
    filterMsgNode(div);   // 新到消息：若不属当前标的且非通用，直接隐藏（仍保留在 feed 中，切回该标的即现）
    while (feed.children.length > 50) feed.removeChild(feed.firstChild);
    var strip = $('msg-strip');
    var span = div.querySelector('.tm-body');
    var txt = String(e.text || e.body || '');
    var i = 0;
    var step = msgQueue.length > 2 ? 8 : 3;   // 积压时加速
    var t = setInterval(function () {
      i += step;
      span.textContent = txt.slice(0, i);
      strip.scrollTop = strip.scrollHeight;
      if (i >= txt.length) {
        clearInterval(t);
        setTimeout(typeNextMsg, 140);
      }
    }, 16);
    strip.scrollTop = strip.scrollHeight;
  }

  /* ---- 行业级资讯过滤：消息按归属标的（data-instr）显隐 ----
   * 规则：data-instr 为空 = 大盘通用，任何标的下恒显示；
   *       非空 = 仅当它等于当前 activeInstr 时显示（交易某行业时只看该行业资讯）。
   * 历史消息全量留在 feed 里，切标的只做显隐、不重放——切回即恢复。 */
  function filterMsgNode(node) {
    var di = node.getAttribute ? (node.getAttribute('data-instr') || '') : '';
    node.style.display = (!di || di === T.activeInstr) ? '' : 'none';
  }
  function applyMsgFilter() {
    var feed = $('msg-feed');
    if (!feed) return;
    var kids = feed.children;
    for (var i = 0; i < kids.length; i++) filterMsgNode(kids[i]);
    var strip = $('msg-strip');
    if (strip) strip.scrollTop = strip.scrollHeight;
  }
  UI.applyMsgFilter = applyMsgFilter;

  /* ---- 决策弹窗：带持仓上下文 + 兜底选项 + 仅记录观点提示 ---- */
  function posContextHtml(engine) {
    var pf = engine.pf;
    var date = engine.currentDate();
    var parts = [];
    for (var id in pf.positions) {
      var p = pf.positions[id];
      if (!p.qty) continue;
      var book = engine.prices[id];
      var info = engine.priceOf(id);
      var cdl = book.lastOnOrBefore(date);
      var cur = info && !info.suspended ? info.price : (cdl ? cdl.c : p.cost);
      var pct;
      if (p.fut) {
        var fpnl = (cur - p.cost) * (p.mult || 1) * p.qty;
        pct = p.margin > 0 ? fpnl / p.margin * 100 : 0;
      } else {
        pct = p.cost > 0 ? (cur / p.cost - 1) * 100 * (p.qty < 0 ? -1 : 1) : 0;
      }
      parts.push(esc(shortName(book.name)) + ' ' + (p.fut ? (p.qty > 0 ? '多' : '空') + Math.abs(p.qty) + '手'
        : (p.qty < 0 ? '空' : '') + fmtQty(Math.abs(p.qty))) +
        ' <span class="' + (pct >= 0 ? 'hit' : 'miss') + '">' + (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%</span>');
    }
    var nav = engine.navNow();
    var head = '净值 ' + nav.toFixed(3) + (parts.length ? ' · ' + parts.join(' · ') : ' · 空仓');
    return '<div class="dec-ctx num">' + head + '</div>';
  }

  /* 大事件只播报、不设选项：怎么操作由玩家在盘面自己决定（选项式态度记录已废弃——
     它无法覆盖空头/满仓等真实持仓状态，记录出来反而是错的） */
  UI.showDecision = function (e, engine, onDone) {
    var html = '<h3>⚡ ' + esc(e.title) + '</h3>' +
      '<div class="m-sub">' + (e.date || '') + ' · 行情已暂停</div>' +
      posContextHtml(engine) +
      '<div style="font-size:13.5px;color:#c6cdd6">' + esc(e.body || e.text || '') + '</div>' +
      '<div class="dec-note">大事件播报 · 接下来怎么做，由你在盘面亲自操作</div>';
    var m = modal(html);
    var spike = e.pressure || 0;
    // 兼容旧剧本：选项里写的压力值取最大档作为事件冲击
    (e.options || []).forEach(function (op) {
      var s = op.pressure || (op.effect && op.effect.pressure) || 0;
      if (s > spike) spike = s;
    });
    var b = el('button', 'btn primary block', '收到 · 回盘面操作');
    b.onclick = function () {
      m.close();
      if (spike > 0) engine.pressure.addSpike(Math.min(spike, 18));
      if (onDone) onDone(null);
    };
    m.box.appendChild(b);
  };

  /* ---- 压力可视化 ---- */
  UI.applyPressure = function (p) {
    if (T.ecg) T.ecg.push(p);
    if (T.hb) T.hb.setPressure(p);
    var bpm = Math.round(60 + 0.9 * p);
    var bpmEl = $('t-bpm');
    bpmEl.textContent = '♥ ' + bpm;
    bpmEl.className = p > 60 ? 'hot' : '';
    $('vignette').style.opacity = Math.max(0, (p - 45) / 55) * 0.85;
  };

  /* 行情 tick 驱动的持仓刷新（跟随K线节奏） */
  UI.onTick = function () {
    drawChart();
    refreshTabsPrice();
    T.tickCount++;
    if (T.tickCount % 2 === 0) {
      refreshHud();
      if (T.activeTab === 'pos') renderPositions();
    }
  };

  UI.refreshAll = refreshAll;
  UI.drawChart = drawChart;
  UI.refreshHud = refreshHud;
  UI.refreshTabsPrice = refreshTabsPrice;
  UI.renderPositions = renderPositions;

  /* ========== 幕间对照 ========== */
  function dirLabel(d) { return d === 'bull' ? '看多 ↑' : d === 'bear' ? '看空 ↓' : '震荡 →'; }
  function marketLabel(ret) {
    return (ret >= 0 ? '+' : '') + ret.toFixed(1) + '%' + (ret > 3 ? '（涨）' : ret < -3 ? '（跌）' : '（震荡）');
  }

  UI.showActInter = function (engine, caseData, actIdx, cb) {
    var act = caseData.acts[actIdx];
    var bench = engine.benchmark;
    var bFrom = bench.lastOnOrBefore(act.dateFrom) || bench.at(act.dateFrom);
    var bTo = bench.lastOnOrBefore(act.dateTo);
    var bRet = bFrom && bTo ? (bTo.c / bFrom.c - 1) * 100 : 0;
    var ns = engine.pf.navSeries.filter(function (s) { return s.date >= act.dateFrom && s.date <= act.dateTo; });
    var navRet = ns.length > 1 ? (ns[ns.length - 1].nav / ns[0].nav - 1) * 100 : 0;
    var exp = null;
    engine.expectations.forEach(function (x) { if (x.actIdx === actIdx) exp = x; });
    var marketDir = bRet > 3 ? 'bull' : bRet < -3 ? 'bear' : 'flat';
    var hit = exp && exp.dir === marketDir;
    var html = '<div class="act-inter">' +
      '<div style="font-size:12px;color:#f0c040;letter-spacing:3px">第' + '一二三四五六七八九'[actIdx] + '幕 · ' + esc(act.title) + ' 完</div>' +
      '<div class="ai-big" style="color:' + (navRet >= 0 ? '#ff4d4f' : '#00b578') + '">' + (navRet >= 0 ? '+' : '') + navRet.toFixed(1) + '%</div>' +
      '<div style="font-size:12px;color:#8b949e">你的净值变化（同期基准 ' + marketLabel(bRet) + '）</div></div>';
    html += '<div class="cmp-card">';
    if (exp) {
      var expLine = dirLabel(exp.dir) + ' · 计划仓位 ' + exp.exposure + '%';
      if (exp.winRate != null) expLine += '<br><span style="font-size:11px;color:#8b949e">你估的胜率 ' + exp.winRate + '% · 赔率 ' + exp.odds + ':1 → 凯利建议 ' + exp.kelly + '%</span>';
      html += '<div class="cmp-row"><div class="cr-k">你的预判</div><div class="cr-v">' + expLine + '</div></div>' +
        '<div class="cmp-row"><div class="cr-k">市场实际</div><div class="cr-v">' + marketLabel(bRet) + '</div></div>' +
        '<div class="cmp-row"><div class="cr-k">判断结果</div><div class="cr-v ' + (hit ? 'hit' : 'miss') + '">' + (hit ? '✓ 方向看对了' : '✗ 方向看错了') + '</div></div>';
    }
    if (act.actRecap && act.actRecap.masterMove) {
      html += '<div class="cmp-row"><div class="cr-k">当时高手</div><div class="cr-v" style="color:#f0c040">' + esc(act.actRecap.masterMove) + '</div></div>';
    }
    html += '</div>';
    if (act.actRecap && act.actRecap.lesson) {
      html += '<div class="lesson-card"><h5>本幕一课</h5><p>' + esc(act.actRecap.lesson) + '</p></div>';
    }
    html += '<button class="btn primary block" id="ai-next">进入下一幕 →</button>';
    var m = modal(html);
    m.box.querySelector('#ai-next').onclick = function () { m.close(); cb(); };
  };

  UI._helpers = { dirLabel: dirLabel, marketLabel: marketLabel, esc: esc, el: el, modal: modal, fmtC: fmtC };
})();
