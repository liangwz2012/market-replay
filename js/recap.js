/* 投资大师实战 · 终局复盘
 * 核心分数 / 交易行为分析（六维雷达）/ 大师风格匹配 / 大师轨迹 / 教学点 / 投资人格 / 战绩海报
 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});
  var $ = function (id) { return document.getElementById(id); };
  var H = function () { return MR.UI._helpers; };

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  /* 人格判定：按声明顺序第一个命中的。
   * cond 表达式支持两个命名空间，务必同时绑定：
   *   s.* —— 完整 stats，其中 s.ret / s.alpha / s.maxDD 为百分数（如 s.ret>25）
   *   r.* —— 小数口径，r.ret = s.ret/100（如 r.ret>=0.3 即收益≥30%）
   * 早期只绑定了 s，导致所有用 r.ret 写法的剧本求值抛 ReferenceError 被 catch 吞掉，
   * persona 全被跳过、永远落到兜底「市场幸存者」。两套口径都保留，缺一不可。 */
  function pickPersona(personas, stats) {
    var r = { ret: stats.ret / 100, alpha: stats.alpha / 100, maxDD: stats.maxDD / 100 };
    for (var i = 0; i < (personas || []).length; i++) {
      var p = personas[i];
      try {
        if (!p.cond || new Function('s', 'r', 'return (' + p.cond + ')')(stats, r)) return p;
      } catch (e) { /* 条件写错则跳过 */ }
    }
    return { title: '市场幸存者', desc: '你活着走完了这段行情——这本身就是成绩。' };
  }
  MR.pickPersona = pickPersona;

  /* ---------- 交易行为分析 ---------- */
  var MASTER_STYLES = [
    { id: 'buffett', name: '股神（巴老）', avatar: 'assets/avatars/buffett.webp',
      vec: { turnover: 0.08, hold: 0.85, lev: 0.05, short: 0, research: 0.9, contrarian: 0.7 },
      desc: '低换手 · 高集中 · 长期持有 · 重公司研究',
      train: '《奥马哈来信 · 华盛顿邮报 1973》《废墟上的可乐 · 1988》' },
    { id: 'duanyongping', name: '大道（阿段）', avatar: 'assets/avatars/duanyongping.webp',
      vec: { turnover: 0.05, hold: 0.9, lev: 0.1, short: 0, research: 0.75, contrarian: 0.9 },
      desc: '人弃我取 · 极致集中 · 买股票就是买公司',
      train: '《暗夜独行 · 网易 2002》' },
    { id: 'danbin', name: '老但', avatar: 'assets/avatars/danbin.svg',
      vec: { turnover: 0.05, hold: 0.95, lev: 0.25, short: 0, research: 0.75, contrarian: 0.9 },
      desc: '时间的玫瑰 · 满仓穿越至暗时刻 · 用估值对抗情绪',
      train: '《国酒劫 · 茅台 2013》' },
    { id: 'livermore', name: '投机之王', avatar: 'assets/avatars/livermore.webp',
      vec: { turnover: 0.8, hold: 0.4, lev: 0.8, short: 0.7, research: 0.3, contrarian: 0.3 },
      desc: '顺势而为 · 试仓加码 · 敢于做空',
      train: '《大崩盘 · 1929》' },
    { id: 'soros', name: '狙击巨鳄（老索）', avatar: 'assets/avatars/soros.webp',
      vec: { turnover: 0.55, hold: 0.45, lev: 0.85, short: 0.6, research: 0.8, contrarian: 0.5 },
      desc: '宏观对冲 · 不对称下注 · 重仓出击',
      train: '《狙击英镑 · 1992》《亚洲风暴 · 1997》' },
    { id: 'fuhaitang', name: '傅天师', avatar: 'assets/avatars/fuhaitang.webp',
      vec: { turnover: 0.2, hold: 0.8, lev: 0.85, short: 0.15, research: 0.6, contrarian: 0.8 },
      desc: '供需为纲 · 重仓单品种 · 拿得住大行情',
      train: '《天道 · 棉花 2010》' },
    { id: 'geweidong', name: '葛老大', avatar: 'assets/avatars/geweidong.webp',
      vec: { turnover: 0.6, hold: 0.5, lev: 0.7, short: 0.5, research: 0.55, contrarian: 0.6 },
      desc: '波段为主 · 双向交易 · 盘感与纪律并重',
      train: '《出清 · 螺纹钢 2016》' }
  ];

  function computeBehavior(engine, caseData, stats, opts) {
    var pf = engine.pf;
    var trades = pf.trades || [];
    var series = pf.navSeries || [];
    var days = Math.max(1, series.length);
    var aum0 = caseData.role.aum || 1;
    var avgNav = series.length ? series.reduce(function (s, x) { return s + x.nav; }, 0) / series.length : 1;
    var avgEquity = Math.max(1, avgNav * aum0);

    // 换手：全部成交名义金额 / 平均权益，年化
    var totalNotional = 0, openNotional = 0, shortNotional = 0;
    var perInstr = {};
    trades.forEach(function (t) {
      var mult = engine.isFut(t.instr) ? engine.futParams(t.instr).mult : 1;
      var notional = Math.abs(t.qty) * t.price * mult;
      totalNotional += notional;
      perInstr[t.instr] = (perInstr[t.instr] || 0) + notional;
      if (t.side === 'buy' || t.side === 'short') {
        openNotional += notional;
        if (t.side === 'short') shortNotional += notional;
      }
    });
    var turnAnnual = totalNotional / avgEquity / days * 250;

    // 集中度：单一标的成交占比
    var maxShare = 0;
    for (var k in perInstr) maxShare = Math.max(maxShare, perInstr[k] / Math.max(1, totalNotional));
    if (!totalNotional) maxShare = 0;

    // 在场率：有仓位的交易日占比
    var samples = engine.exposureSamples || [];
    var holdDays = samples.filter(function (s) { return s.exposure > 0.03; }).length;
    var holdRatio = samples.length ? holdDays / samples.length : 0;
    var avgExposure = samples.length ? samples.reduce(function (s, x) { return s + x.exposure; }, 0) / samples.length : 0;

    // 逆向度：开仓动作发生在大跌日的比例
    var benchChg = {};
    var bd = engine.benchmark.candles;
    for (var i = 1; i < bd.length; i++) benchChg[bd[i].date] = bd[i].c / bd[i - 1].c - 1;
    var opens = trades.filter(function (t) { return t.side === 'buy' || t.side === 'short'; });
    var dipBuys = opens.filter(function (t) { return (benchChg[t.date] || 0) < -0.01 && t.side === 'buy'; }).length;
    var contrarian = opens.length ? dipBuys / opens.length : 0;

    // 研究深度（投资流派信号：打开/阅读了哪些信息）
    var rs = (opts && opts.researchStats) || { opens: {} };
    var openCounts = rs.opens || {};
    var totalOpens = 0, finOpens = 0;
    for (var rk in openCounts) {
      totalOpens += openCounts[rk];
      if (rk === 'financial' || rk === 'company' || rk === 'macro') finOpens += openCounts[rk];
    }

    // 六维分数
    var maxLev = stats.maxLeverage || 0;
    var scorePos = clamp(90 - Math.max(0, maxLev - 1) * 50 - (stats.liquidated ? 40 : 0) - (avgExposure < 0.05 ? 30 : 0), 5, 100);
    var scoreCalm = clamp(100 - Math.max(0, turnAnnual - 5) * 7, 15, 100);
    var scoreFocus = clamp(maxShare * 100, 0, 100);
    // 不再依赖预判表单：用「逆向度」「耐心」两个纯交易行为指标替代原「择时/知行合一」
    var scoreContra = clamp(20 + contrarian * 130, 0, 100);   // 越敢在大跌中开仓越高
    var scorePatience = clamp(holdRatio * 110, 0, 100);       // 有仓位的交易日占比
    var scoreRisk = clamp(100 - stats.maxDD * 1.3 - stats.forcedSellCount * 4 - (stats.liquidated ? 30 : 0), 0, 100);

    // 投资流派判定
    var pv = {
      turnover: clamp(turnAnnual / 12, 0, 1),
      hold: holdRatio,
      lev: clamp(maxLev / 3, 0, 1),
      short: openNotional ? shortNotional / openNotional : 0,
      research: clamp(totalOpens / 6, 0, 1),
      contrarian: contrarian
    };
    var school;
    if (pv.research > 0.5 && pv.hold > 0.6 && pv.lev < 0.3 && pv.turnover < 0.3) school = '价值派（Value）';
    else if (pv.contrarian > 0.5 && pv.hold > 0.5) school = '逆向派（Contrarian）';
    else if (pv.lev > 0.5 && pv.research > 0.5) school = '宏观对冲派（Macro）';
    else if (pv.short > 0.4 || (pv.turnover > 0.5 && pv.hold < 0.5)) school = '趋势投机派（Trend）';
    else if (pv.turnover > 0.7) school = '短线客（Scalper）';
    else school = '均衡实战派';

    // 大师风格匹配（归一化欧氏距离）
    var KEYS = ['turnover', 'hold', 'lev', 'short', 'research', 'contrarian'];
    var best = null, bestSim = -1;
    MASTER_STYLES.forEach(function (m) {
      var d2 = 0;
      KEYS.forEach(function (kk) { var d = (pv[kk] || 0) - m.vec[kk]; d2 += d * d; });
      var sim = 1 - Math.sqrt(d2 / KEYS.length);
      if (sim > bestSim) { bestSim = sim; best = m; }
    });

    return {
      turnAnnual: turnAnnual, maxShare: maxShare, holdRatio: holdRatio,
      avgExposure: avgExposure, contrarian: contrarian, totalOpens: totalOpens,
      scores: [
        { label: '仓位管理', v: Math.round(scorePos), note: maxLev > 1.05 ? '杠杆峰值 ' + maxLev.toFixed(1) + '×' : '平均仓位 ' + Math.round(avgExposure * 100) + '%' },
        { label: '操作节制', v: Math.round(scoreCalm), note: '年化换手 ' + (turnAnnual >= 10 ? Math.round(turnAnnual) : turnAnnual.toFixed(1)) + '×' },
        { label: '聚焦度', v: Math.round(scoreFocus), note: '单一标的占 ' + Math.round(maxShare * 100) + '%' },
        { label: '逆向度', v: Math.round(scoreContra), note: '逆向开仓占 ' + Math.round(contrarian * 100) + '%' },
        { label: '耐心', v: Math.round(scorePatience), note: '在场率 ' + Math.round(holdRatio * 100) + '%' },
        { label: '风控', v: Math.round(scoreRisk), note: '最大回撤 -' + stats.maxDD.toFixed(0) + '%' }
      ],
      school: school,
      match: best,
      matchSim: Math.round(clamp(bestSim, 0, 1) * 100)
    };
  }

  /* ---------- 同行排行榜 ----------
   * 每个剧本确定性生成一批模拟同行（围绕基准收益的正态分布 + 清盘/明星两端），
   * 真人按历史最好成绩插入排名；成绩刷新 → 名次上移（打榜闭环）。
   */
  function buildLeaderboard(caseData, stats, save) {
    var rng = MR.seededRng('lb_' + caseData.id);
    function gauss() {
      var u = Math.max(1e-9, rng()), v = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    var n = 42 + Math.floor(rng() * 19);   // 42~60 位同行
    var bench = stats.benchRet || 0;
    var mean = bench * 0.65 - 3;           // 大多数人跑不赢基准
    var sigma = Math.max(9, Math.abs(bench) * 0.7);
    var rows = [];
    for (var i = 0; i < n; i++) {
      var roll = rng(), ret;
      if (roll < 0.07) ret = -55 - rng() * 40;                        // 清盘组
      else if (roll < 0.13) ret = bench + sigma * (1.8 + rng() * 1.6); // 明星组
      else ret = mean + sigma * gauss();
      rows.push({ name: MR.genTraderName(caseData.id + '_' + i), ret: Math.round(ret * 10) / 10 });
    }
    var prev = save.results[caseData.id] || {};
    var best = Math.max(stats.ret, prev.bestRet != null ? prev.bestRet : -1e9);
    best = Math.round(best * 10) / 10;
    rows.push({ name: (save.profile && save.profile.name) || '我', ret: best, me: true });
    rows.sort(function (a, b) { return b.ret - a.ret; });
    var rank = 1;
    for (i = 0; i < rows.length; i++) if (rows[i].me) { rank = i + 1; break; }
    var beat = Math.round((rows.length - rank) / (rows.length - 1) * 100);
    return { rows: rows, rank: rank, total: rows.length, beat: beat, best: best };
  }

  function leaderboardHtml(lb, stats, esc) {
    function row(r, idx) {
      var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1) + '';
      return '<div class="lb-row' + (r.me ? ' me' : '') + '">' +
        '<span class="lb-rank num">' + medal + '</span>' +
        '<span class="lb-name">' + esc(r.name) + (r.me ? '（你）' : '') + '</span>' +
        '<span class="lb-ret num ' + (r.ret >= 0 ? 'u' : 'd') + '">' + (r.ret >= 0 ? '+' : '') + r.ret.toFixed(1) + '%' +
        (r.ret <= -55 ? ' 清盘' : '') + '</span></div>';
    }
    var html = '<div class="recap-sec"><h4>🏆 同行排行榜 · 本剧本 ' + lb.total + ' 人出战</h4>' +
      '<div class="lb-head">你的排名 <b class="num">第 ' + lb.rank + ' 名</b> · 击败了 <b class="num">' + lb.beat + '%</b> 的同行' +
      (Math.abs(lb.best - stats.ret) > 0.05 ? '（榜上取你的历史最好成绩 ' + (lb.best >= 0 ? '+' : '') + lb.best + '%，本局 ' + (stats.ret >= 0 ? '+' : '') + stats.ret.toFixed(1) + '%）' : '') +
      '</div><div class="lb-list">';
    var shown = {};
    // 前三名
    for (var i = 0; i < Math.min(3, lb.rows.length); i++) { html += row(lb.rows[i], i); shown[i] = true; }
    // 你附近 ±2
    var from = Math.max(3, lb.rank - 3), to = Math.min(lb.rows.length - 1, lb.rank + 1);
    if (from > 3) html += '<div class="lb-gap">⋯</div>';
    for (i = from; i <= to; i++) { if (!shown[i]) { html += row(lb.rows[i], i); shown[i] = true; } }
    if (to < lb.rows.length - 1) html += '<div class="lb-gap">⋯ 共 ' + lb.total + ' 人</div>';
    html += '</div>';
    var hook;
    if (lb.rank === 1) hook = '你就是榜一。把海报甩进群里，等人来挑战。';
    else {
      var gap = (lb.rows[lb.rank - 2].ret - lb.best).toFixed(1);
      hook = '离上一名只差 ' + gap + ' 个百分点——复盘下面的行为分析，再战一局冲榜。';
    }
    html += '<div class="lb-hook">' + hook + '</div></div>';
    return html;
  }

  /* 雷达图（六维） */
  function drawRadar(cv, scores) {
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || 300, h = cv.clientHeight || 230;
    cv.width = w * dpr; cv.height = h * dpr;
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    var cx = w / 2, cy = h / 2 + 4, R = Math.min(w, h) / 2 - 34;
    var n = scores.length;
    function pt(i, r) {
      var a = -Math.PI / 2 + (Math.PI * 2 * i) / n;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    }
    // 网格
    ctx.strokeStyle = 'rgba(139,148,158,0.25)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1].forEach(function (f) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var p = pt(i % n, R * f);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    });
    for (var i = 0; i < n; i++) {
      var p = pt(i, R);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p[0], p[1]); ctx.stroke();
    }
    // 数据面
    ctx.beginPath();
    for (i = 0; i <= n; i++) {
      var s = scores[i % n].v / 100;
      var q = pt(i % n, R * Math.max(0.06, s));
      if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
    }
    ctx.fillStyle = 'rgba(240,192,64,0.22)';
    ctx.strokeStyle = '#f0c040';
    ctx.lineWidth = 1.6;
    ctx.fill(); ctx.stroke();
    // 标签
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    for (i = 0; i < n; i++) {
      var lp = pt(i, R + 18);
      ctx.fillText(scores[i].label + ' ' + scores[i].v, lp[0], lp[1] + 3);
    }
  }

  MR.showRecap = function (engine, caseData, opts, callbacks) {
    var esc = H().esc;
    var stats = engine.recapStats();
    var behavior = computeBehavior(engine, caseData, stats, opts);
    var persona = pickPersona(caseData.recap && caseData.recap.personas, stats);
    if (behavior.match) persona.styleTag = '交易风格相近：' + behavior.match.name;
    var layer = $('recap-layer');
    $('terminal-layer').classList.add('hidden');
    $('scene-layer').classList.add('hidden');
    layer.classList.remove('hidden');
    layer.scrollTop = 0;

    var failed = stats.liquidated;
    var bl = opts.blind;   // 行情盲盒：揭晓真身（顶部公布是哪个标的+大师），其余走完整复盘
    var html = '<button class="layer-back" id="rc-back" type="button">‹</button>' +
      '<button class="layer-share" id="rc-share" type="button" aria-label="分享"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f0c040" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" transform="translate(24 0) scale(-1 1)"/></svg></button>' +
      (bl
        ? '<div class="recap-h"><div class="rh-tag">行情盲盒 · 谜底揭晓</div><h2>' + esc(bl.assetName) + '</h2>' +
          '<div style="font-size:12px;color:#8b949e">' + esc(bl.kindLabel) + (bl.year ? ' · ' + esc(bl.year) + ' 年' : '') + '</div></div>' +
          '<div class="reveal-card"><div class="rv-k">你刚才盲判的是</div><div class="rv-name">' + esc(bl.assetName) + '</div>' +
          '<div class="rv-meta">' + esc(bl.kindLabel) + (bl.year ? ' · ' + esc(bl.year) + ' 年' : '') + '</div></div>'
        : '<div class="recap-h"><div class="rh-tag">' + (failed ? '基金清盘 · 复盘报告' : '战役结束 · 复盘报告') + '</div>' +
          '<h2>' + esc(caseData.title) + '</h2>' +
          '<div style="font-size:12px;color:#8b949e">' + esc(caseData.era) + ' · ' + (opts.mode === 'deep' ? '深度研究模式' : '快速体验模式') + '</div></div>') +
      '<div class="fav-tip">★ 记得<b>收藏本页</b>（微信点右上角 ···），下次直接回来继续挑战，别找不到</div>';

    if (failed) {
      html += '<div class="anniv" style="text-align:center">净值触及清盘线，基金被强制清算。<br>' +
        '<b>历史上无数账户就是这样消失的。</b>你不是一个人。</div>';
    }

    // 核心分数
    function sv(v, suffix, goodIsHigh) {
      var cls = v >= 0 ? (goodIsHigh === false ? 'neg' : 'pos') : (goodIsHigh === false ? 'pos' : 'neg');
      return '<span class="sv num ' + cls + '">' + (v >= 0 && suffix === '%' ? '+' : '') + v.toFixed(1) + suffix + '</span>';
    }
    html += '<div class="score-grid">' +
      '<div class="score-item">' + sv(stats.ret, '%') + '<div class="sk">最终收益率</div></div>' +
      '<div class="score-item">' + sv(stats.alpha, '%') + '<div class="sk">跑赢' + (stats.benchLabel || '基准') + '（Alpha）</div></div>' +
      '<div class="score-item"><span class="sv num neg">-' + stats.maxDD.toFixed(1) + '%</span><div class="sk">最大回撤</div></div>' +
      '<div class="score-item"><span class="sv num gold">' + ((engine.pf.trades || []).length) + '</span><div class="sk">操作次数</div></div>' +
      '</div>';

    // 同行排行榜（用历史最好成绩排名；打榜入口）
    var lb = buildLeaderboard(caseData, stats, MR.store.get());
    stats.beatPct = lb.beat;

    // ===== 前20%奖励横幅：收益排名进前20%(击败≥80%同行) → 赠送一个新剧本 + 赠送5位好友 =====
    // 仅网页版（微信合规版去排行/分享诱导，故同样不出此横幅）；清盘局不发奖。
    var top20 = !MR.WECHAT && !failed && lb.beat >= 80;
    if (top20) {
      var gotNew = MR.store.earnReward(caseData.id);     // 该剧本首次进前20%才发券（防刷）
      var vouchers = MR.store.rewardVouchers();
      var giftLeft = MR.store.giftLeft(caseData.id);
      html += '<div class="reward-banner">' +
        '<div class="rb-crown">🏆</div>' +
        '<div class="rb-title">你的收益超过了大多数人</div>' +
        '<div class="rb-sub">收益排名前 <b>20%</b> · 击败了 ' + lb.beat + '% 的同行</div>' +
        '<div class="rb-lead">' + (gotNew
          ? '🎉 系统赠送你 <b>一个新剧本</b>——回大厅任选一个还没解锁的剧本，免费开玩'
          : '前 20% 玩家专属奖励仍在——回大厅任选一个新剧本免费开玩') + '</div>' +
        '<div class="rb-perks">' +
          '<div class="rb-perk"><span class="rb-ic">🎟</span><div><b>回大厅 · 任选一个新剧本免费开玩</b>' +
            (vouchers > 0 ? '<i>当前可用名额 ' + vouchers + ' 个</i>' : '<i>名额已用，再进一次前20%可再得一个</i>') + '</div></div>' +
          '<div class="rb-perk"><span class="rb-ic">🎁</span><div><b>把这一局赠送给 5 位好友</b><i>好友扫码即免费解锁 · 还剩 ' + giftLeft + '/' + MR.store.GIFT_MAX + ' 位</i></div></div>' +
        '</div>' +
        '<div class="rb-btns">' +
          (vouchers > 0 ? '<button class="btn gold" id="rc-reward-pick">🎟 回大厅 · 任选一个新剧本</button>' : '') +
          '<button class="btn ' + (vouchers > 0 ? '' : 'gold ') + 'rb-gift" id="rc-reward-gift">🎁 赠送好友（剩 ' + giftLeft + ' 位）</button>' +
        '</div></div>';
    }

    if (!MR.WECHAT) html += leaderboardHtml(lb, stats, esc);   // 微信版去同行排行（避投资竞赛/晒单诱导）

    // 净值曲线
    html += '<div class="recap-sec"><h4>净值曲线 · 你 vs 基准</h4><canvas id="nav-chart"></canvas>';
    if (caseData.recap && caseData.recap.peers) {
      var peerText = '';
      for (var pi = 0; pi < caseData.recap.peers.length; pi++) {
        if (stats.ret >= caseData.recap.peers[pi].min) { peerText = caseData.recap.peers[pi].text; break; }
      }
      if (peerText) html += '<div style="font-size:12px;color:#8b949e;margin-top:8px">' + esc(peerText) + '</div>';
    }
    html += '</div>';

    // ===== 折叠分隔线：核心分数+净值默认显示，深入分析（六维及以下）默认收起，想读再展开（移植自小程序，治网页复盘冗长）=====
    html += '<div class="rc-fold" id="rc-fold-bar" style="text-align:center;padding:13px;margin:18px 0 6px;border-top:1px dashed rgba(255,255,255,0.15);border-bottom:1px dashed rgba(255,255,255,0.15);color:#8b949e;font-size:13px;cursor:pointer;user-select:none">想继续读这局的完整复盘分析？<b style="color:#f0c040">点击展开 ▽</b></div>';
    html += '<div id="rc-deep" style="display:none">';
    // ===== 交易行为分析（六维） =====
    html += '<div class="recap-sec"><h4>交易行为分析</h4><canvas id="radar-chart"></canvas><div class="bgrid">';
    behavior.scores.forEach(function (s) {
      var col = s.v >= 70 ? '#f0c040' : s.v >= 40 ? '#e6edf3' : '#ff7875';
      html += '<div class="bcell"><div class="bv" style="color:' + col + '">' + s.v + '</div>' +
        '<div class="bk">' + esc(s.label) + '</div><div class="bt">' + esc(s.note) + '</div></div>';
    });
    html += '</div>';
    html += '<div style="font-size:12px;color:#8b949e;margin-top:4px">投资流派：<b style="color:#f0c040">' + esc(behavior.school) + '</b>' +
      '（依据：研究阅读 ' + behavior.totalOpens + ' 次、在场率 ' + Math.round(behavior.holdRatio * 100) + '%、逆向开仓占比 ' + Math.round(behavior.contrarian * 100) + '%）</div>';
    html += '</div>';

    // 大师风格匹配 + 针对性训练
    if (behavior.match) {
      var m2 = behavior.match;
      html += '<div class="style-match"><img src="' + MR.av(m2.avatar) + '" alt="">' +
        '<div><div class="sm-name">你的交易风格最接近：' + esc(m2.name) + '（相似度 ' + behavior.matchSim + '%）</div>' +
        '<div class="sm-desc">' + esc(m2.desc) + '</div>' +
        '<div class="sm-train">🎯 针对性训练：去打 ' + esc(m2.train) + '，跟本尊过过招</div></div></div>';
    }

    // 知行合一卡已移除：不再收集预判，无「观点 vs 操作」可对照

    // 关键抉择回放
    if (engine.decisions && engine.decisions.length) {
      html += '<div class="recap-sec"><h4>关键抉择回放</h4>';
      engine.decisions.forEach(function (d) {
        html += '<div class="cmp-card"><div class="cmp-row"><div class="cr-k num">' + d.date.slice(5) + '</div>' +
          '<div class="cr-v"><b>' + esc(d.title) + '</b><br>你选了：' + esc(d.choice) + '</div></div></div>';
      });
      html += '</div>';
    }

    // 大师轨迹
    if (caseData.master && caseData.master.track && caseData.master.track.length) {
      html += '<div class="recap-sec"><h4>' + esc(caseData.master.name) + ' · 同期在做什么</h4>';
      caseData.master.track.forEach(function (t) {
        html += '<div class="cmp-card"><div class="cmp-row"><div class="cr-k num">' + esc(t.date) + '</div>' +
          '<div class="cr-v">' + esc(t.action) + '</div></div></div>';
      });
      html += '</div>';
    }

    // 教学点
    if (caseData.recap && caseData.recap.lessons) {
      html += '<div class="recap-sec"><h4>这段历史教给你的</h4>';
      caseData.recap.lessons.forEach(function (l) {
        html += '<div class="lesson-card"><h5>' + esc(l.title) + '</h5><p>' + esc(l.body) + '</p></div>';
      });
      html += '</div>';
    }

    // 人格
    html += '<div class="persona-card"><div style="font-size:11px;color:#8b949e;letter-spacing:2px;margin-bottom:6px">你的投资人格</div>' +
      '<div class="pc-title">' + esc(persona.title) + '</div>' +
      '<div class="pc-desc">' + esc(persona.desc) + '</div>' +
      (persona.styleTag ? '<div style="font-size:12px;color:#40a9ff;margin-top:8px">⚔ ' + esc(persona.styleTag) + '</div>' : '') + '</div>';

    // 这段历史的启示（历史叙事视角，不指向真实账户操作）
    var discipline =
      stats.liquidated ? '这段历史里，杠杆在崩盘中加速了清盘——多少账户就这样消失。理解杠杆的双刃，是这段历史最贵的一课。'
      : stats.maxLeverage > 1.3 ? '你这局杠杆峰值 ' + stats.maxLeverage.toFixed(1) + ' 倍。历史反复证明：高杠杆会在市场转向时放大每一个错误。'
      : stats.forcedSellCount > 0 ? '你经历了 ' + stats.forcedSellCount + ' 次被动卖出。流动性枯竭、想卖却卖不掉，是资本市场一再重演的时刻。'
      : stats.maxDD > 25 ? '本局最大回撤 ' + stats.maxDD.toFixed(0) + '%。历史上再优秀的投资者也穿越过深度回撤——区别只在于能否在逆境中保持理性。'
      : (engine.pf.trades || []).length === 0 ? '你这局几乎没出手。看不懂就不下场，也是一种答案——这段历史里，等待的人未必输给出手的人。'
      : '这局打得有章法。复盘这段历史的价值，正在于把「看清楚 → 再决定」内化成自己的判断框架。';
    html += '<div class="lesson-card" style="margin-top:14px;border-color:rgba(64,169,255,0.45)"><h5>📌 这段历史的启示</h5><p>' + esc(discipline) + '</p>' +
      '<p style="margin-top:8px;font-size:12px;color:#8b949e">⭐ 建议收藏本页：战绩已自动存入「个人中心 · 我的战绩」（大厅右下角 👤），随时回来回顾。</p></div>';

    // 错过的研究模块（二周目钩子）；盲盒不适用（无深度模式）
    var read = opts.researchRead || {};
    var missed = bl ? [] : (caseData.research || []).filter(function (m) { return !read[m.id]; });
    if (missed.length) {
      var clueList = missed.map(function (m) {
        var keyCard = (m.cards || []).filter(function (c) { return c.key || c.keyInsight; })[0];
        return esc(m.title) + (keyCard ? '（里面有：' + esc(keyCard.title) + '）' : '');
      }).join('；');
      html += '<div class="skipped-hint">🔍 你跳过了 ' + missed.length + ' 个研究模块：' + clueList +
        '。<br>开<b>深度研究模式</b>再来一局，看看提前知道这些，你能不能改写结局。</div>';
    }

    // 当代映射
    if (caseData.recap && caseData.recap.modernEcho) {
      html += '<div class="lesson-card" style="margin-top:14px"><h5>写给今天</h5><p>' + esc(caseData.recap.modernEcho) + '</p></div>';
    }

    html += '</div>';   // 关闭 #rc-deep 折叠容器（深入分析到此为止，下面留资+按钮始终显示）

    // 留资入口（与个人中心一致）：复盘是情绪高点，趁热打铁
    var rcProf = (MR.store.get().profile) || {};
    html += '<div class="recap-optin">' +
      '<div class="ro-hook">📬 新剧本持续上新——留个联系方式，上线第一时间通知你，兑换码优先发放</div>' +
      '<div class="prof-field"><label>昵称（显示在战绩海报上）</label><input id="rc-pf-name" maxlength="12" placeholder="未来的大师" value="' + esc(rcProf.name || '') + '"></div>' +
      '<div class="prof-field"><label>手机 / 邮箱（跨设备同步战绩 · 预约新剧本）</label><input id="rc-pf-contact" placeholder="手机号或邮箱" value="' + esc(rcProf.contact || '') + '"></div>' +
      '<button class="btn primary block" id="rc-pf-save">保存联系方式</button>' +
      '</div>';

    html += '<div class="btn-row" style="margin-top:22px">' +
      '<button class="btn gold" id="rc-poster">🎴 生成战绩海报</button>' +
      '<button class="btn" id="rc-retry">再战一局 · 冲榜</button></div>' +
      '<button class="btn primary block" id="rc-lobby">' + (MR.WECHAT ? '返回大厅' : '返回大厅 · 解锁更多战役') + '</button>';

    layer.innerHTML = html;

    // 净值图默认可见→直接画；雷达图在折叠容器里→展开时才画（隐藏时 canvas 尺寸为 0，画不出）
    var navChart = new MR.Chart($('nav-chart'));
    setTimeout(function () { navChart.drawNav(engine.pf.navSeries, stats.benchLabel); }, 60);
    var foldBar = $('rc-fold-bar'), deep = $('rc-deep'), radarDrawn = false;
    if (foldBar && deep) foldBar.onclick = function () {
      var show = deep.style.display === 'none';
      deep.style.display = show ? 'block' : 'none';
      foldBar.innerHTML = show ? '收起复盘分析 △' : '想继续读这局的完整复盘分析？<b style="color:#f0c040">点击展开 ▽</b>';
      if (show && !radarDrawn) { radarDrawn = true; setTimeout(function () { drawRadar($('radar-chart'), behavior.scores); }, 30); }
    };

    if (MR.track) MR.track('case_finish', {
      caseId: caseData.id, caseTitle: caseData.title,
      ret: Math.round(stats.ret * 10) / 10,
      bestRet: lb.best, rank: lb.rank, lbTotal: lb.total,
      liquidated: !!stats.liquidated, mode: opts.mode
    });
    // 存档（bestRet 用于排行榜打榜：只升不降）
    MR.store.saveResult(caseData.id, {
      ret: Math.round(stats.ret * 10) / 10,
      bestRet: lb.best,
      rank: lb.rank,
      total: lb.total,
      beat: lb.beat,
      alpha: Math.round(stats.alpha * 10) / 10,
      persona: persona.title,
      styleTag: persona.styleTag || '',
      mode: opts.mode,
      liquidated: stats.liquidated,
      at: new Date().toISOString().slice(0, 10)
    });

    // 海报（底部按钮 + 右上角分享键共用；海报上的昵称实时取个人中心最新值）
    function openPoster() {
      if (MR.track) MR.track('poster', { caseId: caseData.id, caseTitle: caseData.title });
      MR.makePoster(caseData, stats, persona, function (dataUrl) {
        var m = H().modal('<h3>🎴 你的战绩海报</h3>' +
          '<img id="poster-img" src="' + dataUrl + '">' +
          '<div class="save-hint">长按图片保存 → 转发到群或朋友圈<br>每一张海报都是一封挑战书</div>' +
          '<button class="btn block" id="poster-close">关闭</button>');
        m.box.querySelector('#poster-close').onclick = m.close;
      });
    }
    $('rc-poster').onclick = openPoster;
    $('rc-share').onclick = openPoster;
    $('rc-pf-save').onclick = function () {
      MR.store.setProfile({
        name: ($('rc-pf-name').value || '').trim(),
        contact: ($('rc-pf-contact').value || '').trim()
      });
      MR.UI.toast('已保存 ✓ 新剧本上线会第一时间通知你');
    };
    $('rc-retry').onclick = function () { if (callbacks.onRetry) callbacks.onRetry(); };
    $('rc-lobby').onclick = function () { if (callbacks.onLobby) callbacks.onLobby(); };
    $('rc-back').onclick = function () { if (callbacks.onLobby) callbacks.onLobby(); };  // 复盘已结束，直接回大厅

    // 前20%奖励：回大厅领新剧本（进入「免费券模式」） / 赠送好友
    var pickBtn = $('rc-reward-pick');
    if (pickBtn) pickBtn.onclick = function () {
      if (MR.startFreePick) MR.startFreePick();
      else if (callbacks.onLobby) callbacks.onLobby();
    };
    var giftBtn = $('rc-reward-gift');
    if (giftBtn) giftBtn.onclick = function () {
      if (MR.giftCase) MR.giftCase(caseData);
    };
  };
})();
