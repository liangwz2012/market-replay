/* 蒙眼实战（盲盘）：随机抽一个历史行情，隐藏标的名称，只给匿名的宏观/产业/资金/情绪简报 +
 * 真实 K 线。玩家凭判断做多/做空，结束后揭晓真实品种、标的、哪位大师当年怎么做。
 * 数据源：blind/*.json（由旧项目 46 个剧本脱敏而来），blind/manifest.json 为索引。 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});
  var H = function () { return MR.UI._helpers; };
  var manifest = null;
  var recent = [];   // 最近玩过的 id，避免短期重复

  MR.startBlind = function () {
    if (manifest) { pickOne(); return; }
    fetchJSON('blind/manifest.json', function (m) {
      manifest = m; pickOne();
    }, function () { MR.UI.toast('盲盘库加载失败', true); });
  };

  function pickOne() {
    var all = (manifest && manifest.cases) || [];
    if (!all.length) { MR.UI.toast('盲盘库为空', true); return; }
    var pool = all.filter(function (c) { return recent.indexOf(c.id) < 0; });
    if (!pool.length) { recent = []; pool = all; }
    var c = pool[Math.floor(Math.random() * pool.length)];
    recent.push(c.id); if (recent.length > 24) recent.shift();
    MR.UI.toast('正在抽取一局神秘行情…');
    fetchJSON('blind/' + c.id + '.json', function (g) { bootBlind(g); },
      function () { MR.UI.toast('盲盘数据加载失败', true); });
  }

  /* 把脱敏数据构造成引擎可跑的「匿名剧本」 */
  function bootBlind(g) {
    var candles = g.candles || [];
    if (candles.length < 10) { MR.UI.toast('该局数据不足', true); return; }
    var bb = g.blindBriefing || {};
    var ep = g.epilogue || {};
    var rb = g.researchBriefing || {};
    var cards = (bb.cards || []).map(function (c) {
      return { title: (c.label ? c.label + ' · ' : '') + (c.title || ''), body: c.body || '' };
    });
    // 根据品种类型动态配置交易规则
    // 期货/外汇/商品 → 保证金交易（market.type='futures' 触发 isFut()），股票 → 现货
    var isMarginKind = g.kind === 'futures' || g.kind === 'forex' || g.kind === 'commodity';
    var marginRate = g.marginRatio != null ? g.marginRatio : (isMarginKind ? 0.1 : 1);
    var mult = g.kind === 'forex' ? 1 : (isMarginKind ? 5 : 1);
    var mk = isMarginKind
      ? { type: 'futures', benchmark: 'x', allowShort: true, marginRate: marginRate, multiplier: mult }
      : { type: 'us', benchmark: 'x', allowShort: true };
    var instKind = isMarginKind ? 'futures' : 'stock';
    var caseData = {
      id: 'blind_' + g.id,
      title: '行情盲盒',
      era: (g.kindLabel || '神秘品种') + ' · 年代隐藏',
      access: 'free',
      priceFiles: [],
      role: { name: '盲盘交易员', aum: 100000000, desc: '只有行情和匿名情报，没有名字。凭你的判断下注。' },
      market: mk,
      instruments: [{ id: 'x', name: '神秘标的', kind: instKind }],
      acts: [{
        id: 'a1', title: '神秘行情',
        dateFrom: candles[0].date, dateTo: candles[candles.length - 1].date,
        scene: {
          dateLabel: '匿名研究简报 · ' + (g.kindLabel || ''),
          title: bb.title || '一段被隐去名字的真实行情',
          lines: [bb.summary || '', bb.objective || ''].filter(Boolean)
        },
        events: buildBlindNews(g, candles)   // 盘中脱敏快讯（宏观/产业/资金/情绪，不提个股名）
      }],
      // 研究 tab 复用：把盲盘四要素卡塞进一个匿名研究模块（不泄露名称）
      research: cards.length ? [{ id: 'macro', title: '匿名情报（宏观 · 产业 · 资金 · 情绪）', cards: cards }] : [],
      pressure: { base: 16 },
      posterTitle: '行情盲盒', posterQuote: '不看名字，只看本质。',
      // 大师轨迹（揭晓后复盘显示，盘中不暴露）：从 epilogue 构造
      master: { name: MR.blindMasterName(ep.masterName || g.masterId || ''), track: epTrack(g) },
      // 复盘所需：通用投资人格 + 揭晓教训
      recap: {
        personas: BLIND_PERSONAS,
        lessons: [{ title: '这一课', body: (ep.lesson || '不靠名字，靠对宏观、产业、资金、情绪的判断。') }]
          .concat((rb.cards || []).slice(0, 2).map(function (c) {
            return { title: (c.label ? c.label + ' · ' : '') + (c.title || ''), body: c.body || '' };
          })),
        modernEcho: ''
      },
      // 揭晓数据（盘中不可见，结束才亮）
      blind: {
        assetName: g.assetName || '神秘标的', year: g.year || '', kindLabel: g.kindLabel || '',
        epilogue: ep, researchBriefing: rb
      }
    };
    var priceJsons = [{ symbol: 'x', name: '神秘标的', candles: candles }];
    MR.bootBlindCase(caseData, priceJsons);
  }

  // 盘中脱敏快讯：把已脱敏的四要素卡分散到行情时间轴推送，让盘面有情报演进、不是纯 K 线
  function buildBlindNews(g, candles) {
    var bb = g.blindBriefing || {};
    var cards = (bb.cards || []).slice();
    var n = candles.length;
    if (!cards.length || n < 8) return [];
    var toneMap = { bull: 'bull', bear: 'bear', risk: 'bear', pressure: 'neutral' };
    var slots = [0.14, 0.34, 0.54, 0.74, 0.88];
    var evs = [];
    cards.forEach(function (c, i) {
      var idx = Math.min(n - 1, Math.max(1, Math.floor(n * (slots[i] != null ? slots[i] : 0.14 + i * 0.18))));
      evs.push({
        date: candles[idx].date, type: 'news',
        stance: toneMap[c.tone] || 'neutral',
        title: (c.label ? '【' + c.label + '】' : '') + (c.title || ''),
        text: c.body || ''
      });
    });
    return evs;
  }

  function epTrack(g) {
    var ep = g.epilogue || {};
    var t = [];
    if (ep.masterMove) t.push({ date: g.year || '当年', action: ep.masterMove, note: ep.lesson || '' });
    return t;
  }
  // 盲盘通用投资人格（cond 基于交易结果，不依赖任何标的信息）
  var BLIND_PERSONAS = [
    { cond: 's.liquidated', title: '盲盒翻车', desc: '盲判失手、爆仓离场——没有名字的市场，最考验仓位和风控。' },
    { cond: 's.ret>=200', title: '盲盒之王', desc: '隔着信息迷雾也精准下注，你读懂了行情的本质，而不是名字。' },
    { cond: 's.ret>=50', title: '敏锐猎手', desc: '只凭宏观与盘面就抓住了大方向——不靠名字，照样赚。' },
    { cond: 's.ret>=0', title: '稳健盲判', desc: '保住了本金。盲盒里活下来，已经赢过一半人。' },
    { cond: 's.ret>=-20', title: '轻微误判', desc: '方向有偏差，但没酿成大错。复盘看看错在哪一环。' },
    { cond: '', title: '雾里看花', desc: '信息不足时下了重注——盲盒教你的，正是「看不懂就别重仓」。' }
  ];

  /* 开场匿名简报弹窗（看完进盘面） */
  MR.showBlindBriefing = function (caseData, cb) {
    var b = caseData.blind, esc = H().esc;
    var scene = caseData.acts[0].scene;
    var cards = (caseData.research[0] && caseData.research[0].cards) || [];
    var html = '<div class="blind-brief">' +
      '<div class="bb-kicker">🎁 行情盲盒 · 匿名研究简报</div>' +
      '<div class="bb-kind">品种类型：<b>' + esc(b.kindLabel || '未知') + '</b>（具体名称结束后揭晓）</div>' +
      '<h3 class="bb-title">' + esc(scene.title) + '</h3>' +
      '<div class="bb-summary">' + scene.lines.map(function (l) { return esc(l); }).join('<br>') + '</div>' +
      '<div class="bb-cards">' +
      cards.map(function (c) {
        return '<div class="bb-card"><div class="bbc-t">' + esc(c.title) + '</div><div class="bbc-b">' + esc(c.body) + '</div></div>';
      }).join('') + '</div>' +
      '<div class="bb-note">没有名字、没有个股新闻——只读宏观、产业、资金、情绪，再把判断交给盘面。</div>' +
      '<button class="btn primary block" id="bb-go">开始交易 →</button></div>';
    var m = H().modal(html, { dismiss: false });
    m.box.querySelector('#bb-go').onclick = function () { m.close(); if (cb) cb(); };
  };

  /* 结束揭晓：你的成绩 + 真实身份 + 大师当年怎么做 */
  MR.showBlindReveal = function (engine, caseData, callbacks) {
    var b = caseData.blind, esc = H().esc;
    var stats = engine.recapStats();
    var ret = stats.ret;
    var ep = b.epilogue || {};
    var rb = b.researchBriefing || {};
    var masterName = MR.blindMasterName(ep.masterName || b.masterId || '');
    var retCls = ret >= 0 ? 'pos' : 'neg';
    var layer = document.getElementById('recap-layer');
    document.getElementById('terminal-layer').classList.add('hidden');
    layer.classList.remove('hidden');
    layer.scrollTop = 0;
    var rbCards = (rb.cards || []).map(function (c) {
      return '<div class="lesson-card"><h5>' + esc((c.label ? c.label + ' · ' : '') + (c.title || '')) + '</h5><p>' + esc(c.body || '') + '</p></div>';
    }).join('');
    layer.innerHTML =
      '<button class="layer-back" id="bl-back" type="button">‹</button>' +
      '<div class="recap-h"><div class="rh-tag">蒙眼实战 · 揭晓</div><h2>谜底揭晓</h2></div>' +
      '<div class="score-grid"><div class="score-item"><span class="sv num ' + retCls + '">' +
        (ret >= 0 ? '+' : '') + ret.toFixed(1) + '%</span><div class="sk">你的盲盘收益</div></div>' +
        '<div class="score-item"><span class="sv num neg">-' + stats.maxDD.toFixed(1) + '%</span><div class="sk">最大回撤</div></div></div>' +
      '<div class="reveal-card">' +
        '<div class="rv-k">真实身份</div>' +
        '<div class="rv-name">' + esc(b.assetName) + '</div>' +
        '<div class="rv-meta">' + esc(b.kindLabel) + (b.year ? ' · ' + esc(b.year) + ' 年' : '') + '</div></div>' +
      (ep.masterName || ep.masterMove ? '<div class="recap-sec"><h4>' + esc(masterName) + ' · 当年怎么做</h4>' +
        '<div class="cmp-card"><div class="cr-v">' + esc(ep.masterMove || '') + '</div></div>' +
        (ep.lesson ? '<div class="lesson-card" style="border-color:rgba(64,169,255,0.45)"><h5>📌 这一课</h5><p>' + esc(ep.lesson) + '</p></div>' : '') +
        '</div>' : '') +
      (rbCards ? '<div class="recap-sec"><h4>揭晓版完整情报</h4>' + rbCards + '</div>' : '') +
      '<div class="btn-row" style="margin-top:22px">' +
        '<button class="btn gold" id="bl-again">再来一盘 🎲</button>' +
        '<button class="btn primary block" id="bl-lobby">回大厅</button></div>';
    layer.querySelector('#bl-again').onclick = function () { layer.classList.add('hidden'); MR.startBlind(); };
    layer.querySelector('#bl-lobby').onclick = function () { if (callbacks && callbacks.onLobby) callbacks.onLobby(); };
    layer.querySelector('#bl-back').onclick = function () { if (callbacks && callbacks.onLobby) callbacks.onLobby(); };
    if (MR.track) MR.track('blind_finish', { caseId: caseData.id, ret: Math.round(ret * 10) / 10 });
  };

  /* 揭晓时把大师 id/真名转成市场称谓（与正式剧本一致） */
  var MNAME = {
    buffett: '股神', duanyongping: '大道', soros: '狙击巨鳄', fuhaitang: '傅天师',
    geweidong: '葛老大', livermore: '投机之王', danbin: '老但', lynch: '老林',
    dalio: '全天候', graham: '祖师爷', templeton: '爵士', druckenmiller: '老德', burry: '老博',
    '巴菲特': '股神', '段永平': '大道', '索罗斯': '狙击巨鳄', '彼得·林奇': '老林', '林奇': '老林',
    '达利欧': '全天候', '达里奥': '全天候', '格雷厄姆': '祖师爷', '邓普顿': '爵士',
    '德鲁肯米勒': '老德', '伯里': '老博', '利弗莫尔': '投机之王'
  };
  MR.blindMasterName = function (raw) {
    if (!raw) return '当年的大师';
    if (MNAME[raw]) return MNAME[raw];
    for (var k in MNAME) { if (raw.indexOf(k) >= 0) return MNAME[k]; }
    return raw;
  };

  function fetchJSON(url, cb, onerr) {
    var x = new XMLHttpRequest();
    x.open('GET', url + (url.indexOf('?') < 0 ? '?v=' + (window.MR_V || '1') : ''), true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300) {
        try { cb(JSON.parse(x.responseText)); } catch (e) { if (onerr) onerr(); }
      } else if (onerr) onerr();
    };
    x.send();
  }
})();
