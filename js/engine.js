/* 投资大师实战 · 核心引擎
 * 行情播放 + 撮合规则（T+1/涨跌停/跌停排队/停牌/融资强平/期货保证金）+ 组合 + 压力模型
 * 全局命名空间 MR（Master Replay），无模块系统（微信 XWEB 兼容）
 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});

  /* ---------- 确定性随机（可复现） ---------- */
  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededRng(key) { return mulberry32(xmur3(key)()); }
  MR.seededRng = seededRng;

  /* ---------- 价格数据 ---------- */
  function PriceBook(json) {
    this.symbol = json.symbol;
    this.name = json.name;
    this.candles = json.candles;
    this.byDate = {};
    this.dates = [];
    for (var i = 0; i < json.candles.length; i++) {
      var c = json.candles[i];
      this.byDate[c.date] = c;
      this.dates.push(c.date);
    }
  }
  PriceBook.prototype.at = function (date) { return this.byDate[date] || null; };
  PriceBook.prototype.lastOnOrBefore = function (date) {
    var last = null;
    for (var i = 0; i < this.dates.length; i++) {
      if (this.dates[i] > date) break;
      last = this.byDate[this.dates[i]];
    }
    return last;
  };

  /* ---------- 日内路径：由 OHLC 生成确定性分时（布朗桥贴合高低点） ---------- */
  function intradayPath(candle, n, key) {
    var rng = seededRng(key + candle.date);
    var pts = [candle.o];
    for (var i = 1; i < n - 1; i++) pts.push(0);
    pts.push(candle.c);
    // 随机游走再线性校正回收盘
    var cur = candle.o;
    var vol = Math.max((candle.h - candle.l) * 0.35, candle.o * 0.0005);
    for (i = 1; i < n - 1; i++) {
      cur += (rng() - 0.5) * vol;
      pts[i] = cur;
    }
    var drift = (candle.c - cur) ;
    for (i = 1; i < n - 1; i++) pts[i] += (drift * i) / (n - 1);
    // 压缩进 [l,h] 并保证触及高低点
    var mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts);
    var scale = (candle.h - candle.l) / Math.max(mx - mn, 1e-9);
    if (scale < 1) {
      for (i = 0; i < n; i++) pts[i] = candle.l + (pts[i] - mn) * scale;
      // 端点复位
      pts[0] = candle.o; pts[n - 1] = candle.c;
    }
    var hiIdx = 1 + Math.floor(rng() * (n - 2));
    var loIdx = 1 + Math.floor(rng() * (n - 2));
    if (hiIdx === loIdx) loIdx = (loIdx + 7) % (n - 2) + 1;
    pts[hiIdx] = candle.h;
    pts[loIdx] = candle.l;
    for (i = 0; i < n; i++) pts[i] = Math.min(candle.h, Math.max(candle.l, pts[i]));
    return pts;
  }

  /* ---------- 组合 ---------- */
  function Portfolio(caseData) {
    var m = caseData.market;
    this.market = m;
    this.cash = caseData.role.aum;
    this.shares = caseData.role.aum; // 份额（净值=权益/份额）
    this.debt = 0;                   // 融资负债
    this.positions = {};             // id -> {qty, cost, buyDate, frozenTillNext} 期货: {qty(+多-空), cost, margin}
    this.navSeries = [];             // {date, nav, bench}
    this.trades = [];
    this.peakNav = 1;
    this.redeemedTotal = 0;
    this.interestPaid = 0;
  }
  Portfolio.prototype.marketValue = function (prices, date) {
    var v = 0;
    for (var id in this.positions) {
      var p = this.positions[id];
      if (!p.qty) continue;
      var book = prices[id];
      var c = book && book.lastOnOrBefore(date);
      if (!c) continue;
      if (p.fut) {
        // 期货逐日盯市：浮盈每日结算进现金，这里只剩保证金 + 距上次结算价的当日浮动
        v += p.margin + p.qty * (c.c - (p.mark != null ? p.mark : p.cost)) * (p.mult || 1);
      } else {
        v += p.qty * c.c;
      }
    }
    return v;
  };
  /* 用任意现价表（id->price）计算市值：供盘中实时净值用 */
  Portfolio.prototype.marketValueLive = function (livePrices, prices, date) {
    var v = 0;
    for (var id in this.positions) {
      var p = this.positions[id];
      if (!p.qty) continue;
      var px = livePrices[id];
      if (px == null) {
        var c = prices[id] && prices[id].lastOnOrBefore(date);
        if (!c) continue;
        px = c.c;
      }
      if (p.fut) {
        v += p.margin + p.qty * (px - (p.mark != null ? p.mark : p.cost)) * (p.mult || 1);
      } else {
        v += p.qty * px;
      }
    }
    return v;
  };
  Portfolio.prototype.equity = function (prices, date) {
    return this.cash + this.marketValue(prices, date) - this.debt;
  };
  Portfolio.prototype.nav = function (prices, date) {
    // 净值下限兜底为 0：高杠杆爆仓是 -100% 全损，不会出现负净值。
    // 不封上限——真实高收益如实呈现。历史上的 +26亿% 是赎回在权益≤0时 amt/nav 除零破坏 shares 等根因 bug 产生（已治本修复），而非靠封顶掩盖。
    return Math.max(0, this.equity(prices, date) / this.shares);
  };
  Portfolio.prototype.exposure = function (prices, date) {
    var eq = this.equity(prices, date);
    if (eq <= 0) return 0;
    var notional = 0;
    for (var id in this.positions) {
      var p = this.positions[id];
      if (!p.qty) continue;
      var c = prices[id] && prices[id].lastOnOrBefore(date);
      if (!c) continue;
      notional += p.fut ? Math.abs(p.qty) * c.c * (p.mult || 1) : Math.abs(p.qty) * c.c;
    }
    return notional / eq;
  };

  /* ---------- 压力模型 ---------- */
  function PressureModel(cfg) {
    this.cfg = cfg || {};
    this.base = (cfg && cfg.base) || 10;
    this.spike = 0;       // 事件脉冲，逐日衰减
    this.lossStreak = 0;
    this.value = this.base;
  }
  PressureModel.prototype.update = function (pf, prices, date) {
    var nav = pf.nav(prices, date);
    pf.peakNav = Math.max(pf.peakNav, nav);
    var dd = Math.max(0, (pf.peakNav - nav) / pf.peakNav);   // 回撤
    var exp = pf.exposure(prices, date);                     // 仓位占权益比例：1.0=满仓，>1=杠杆
    var ret = nav - 1;                                       // 累计收益（相对起点 1.0）
    // 仓位压力：七成仓以下几乎无感；超过 70% 才明显加速（满仓≈+18，2× 杠杆≈+78）
    var posStress = exp > 0.7 ? (exp - 0.7) * 60 : 0;
    // 亏损压力：回撤越深 + 绝对亏损越大越慌——与仓位无关（轻仓巨亏照样心慌）
    var lossStress = 55 * Math.min(dd, 1) + (ret < 0 ? Math.min(-ret, 0.5) * 70 : 0);
    // 盈利镇定：赚得越多越从容，往下压心率
    var profitCalm = ret > 0 ? Math.min(ret, 0.4) * 45 : 0;
    var warn = this.cfg.redemption ? this.cfg.redemption.warn : 0.85;
    var redemption = nav < warn ? (warn - nav) * 220 : 0;    // 逼近赎回线的额外恐慌
    var p = this.base + posStress + lossStress - profitCalm + redemption + 3 * Math.min(this.lossStreak, 5) + this.spike;
    this.spike *= 0.82;
    this.value = Math.max(0, Math.min(100, p));
    return this.value;
  };
  PressureModel.prototype.addSpike = function (x) { this.spike = Math.min(60, this.spike + x); };

  /* ---------- 引擎主体 ---------- */
  function Engine(caseData, priceJsons, opts) {
    this.caseData = caseData;
    this.opts = opts || {};
    this.prices = {};
    for (var i = 0; i < priceJsons.length; i++) {
      var pb = new PriceBook(priceJsons[i]);
      this.prices[pb.symbol] = pb;
    }
    // 标的表：支持同一账户内股票与期货混合（如 2015 旗舰：ETF + 股指期货）
    this.instrMap = {};
    var instrs = caseData.instruments || [];
    for (i = 0; i < instrs.length; i++) this.instrMap[instrs[i].id] = instrs[i];
    this.benchmark = this.prices[caseData.market.benchmark];
    // 交易日历 = 基准指数日期 ∩ 剧本范围
    var from = caseData.acts[0].dateFrom;
    var to = caseData.acts[caseData.acts.length - 1].dateTo;
    this.calendar = this.benchmark.dates.filter(function (d) { return d >= from && d <= to; });
    this.pf = new Portfolio(caseData);
    this.pressure = new PressureModel(caseData.pressure);
    this.dayIdx = -1;
    this.frame = 0;
    this.framesPerDay = 4;         // 每天 4 帧（原 8，提速一倍，配合控制单局时长）
    this.intraday = null;          // {ticks, i}
    this.playing = false;
    // 默认倍速：按 K 线数反算，使任意剧本单局控制在 ~7.5 分钟内（短剧本保持 1× 不过快）。
    // 时长 = days × framesPerDay(4) × 400ms / speed；令其 ≈ 280 个"单位"→ 恒定约 7.5 分钟。
    var _days = this.calendar.length;
    this.speed = caseData.defaultSpeed || Math.max(1, Math.round(_days / 280 * 2) / 2);
    this.timer = null;
    this.actIdx = 0;
    this.pendingSells = [];        // 跌停排队 {instr, qty, reason}
    this.expectations = [];        // 每幕预判
    this.exposureSamples = [];     // {act, exposure}
    this.eventsFired = {};
    this.liquidated = false;
    this.finished = false;
    this.benchStart = null;
    this.listeners = {};
    this.dailyLog = [];            // 复盘用
    this._buildEventIndex();
  }

  Engine.prototype._buildEventIndex = function () {
    this.eventsByDate = {};
    var acts = this.caseData.acts;
    for (var a = 0; a < acts.length; a++) {
      var evs = acts[a].events || [];
      for (var i = 0; i < evs.length; i++) {
        var e = evs[i];
        (this.eventsByDate[e.date] = this.eventsByDate[e.date] || []).push(e);
      }
    }
  };

  Engine.prototype.on = function (ev, fn) {
    (this.listeners[ev] = this.listeners[ev] || []).push(fn);
  };
  Engine.prototype.emit = function (ev, payload) {
    var fns = this.listeners[ev] || [];
    for (var i = 0; i < fns.length; i++) fns[i](payload);
  };

  Engine.prototype.currentDate = function () {
    return this.calendar[Math.max(0, this.dayIdx)];
  };
  /* 实时净值/权益：用盘中播放价（K线同步），消除「持仓市值迟钝」 */
  Engine.prototype.livePrices = function () {
    var live = {};
    for (var id in this.pf.positions) {
      if (!this.pf.positions[id].qty) continue;
      var info = this.priceOf(id);
      if (info && !info.suspended) live[id] = info.price;
    }
    return live;
  };
  Engine.prototype.equityNow = function () {
    var date = this.currentDate();
    return this.pf.cash + this.pf.marketValueLive(this.livePrices(), this.prices, date) - this.pf.debt;
  };
  Engine.prototype.navNow = function () {
    return Math.max(0, this.equityNow() / this.pf.shares);
  };
  Engine.prototype.currentAct = function () { return this.caseData.acts[this.actIdx]; };

  /* 该标的是否按期货规则交易（整场期货市场，或股票市场中的期指类标的） */
  Engine.prototype.isFut = function (instrId) {
    var it = this.instrMap[instrId];
    return this.caseData.market.type === 'futures' || !!(it && it.kind === 'futures');
  };
  Engine.prototype.futParams = function (instrId) {
    var it = this.instrMap[instrId] || {};
    var m = this.caseData.market;
    var mr = it.marginRate || m.marginRate || 0.1;
    // 时变保证金：按真实时点逐步抬高（如 2015 股指期货中金所一路提保证金压投机）；取当前播放日生效的最后一档
    var sched = it.marginSchedule || m.marginSchedule;
    if (sched && sched.length) {
      var date = this.currentDate();
      if (date) for (var i = 0; i < sched.length; i++) { if (sched[i].from && date >= sched[i].from) mr = sched[i].rate; }
    }
    return {
      mult: it.multiplier || m.multiplier || 5,
      mr: mr
    };
  };

  /* 当前播放价（带日内帧） */
  Engine.prototype.priceOf = function (instrId) {
    var date = this.currentDate();
    var book = this.prices[instrId];
    if (!book) return null;
    var c = book.at(date);
    if (!c) {
      var last = book.lastOnOrBefore(date);
      return last ? { price: last.c, candle: null, suspended: true } : null;
    }
    var pts;
    if (this.intraday && this.intraday.instr === instrId) {
      pts = this.intraday.ticks;
      return { price: pts[Math.min(this.intraday.i, pts.length - 1)], candle: c, suspended: false };
    }
    pts = this._framePath(instrId, c);
    return { price: pts[Math.min(this.frame, pts.length - 1)], candle: c, suspended: false };
  };
  Engine.prototype._framePath = function (instrId, candle) {
    if (!this._fp) this._fp = {};
    var key = instrId + candle.date;
    if (!this._fp[key]) {
      this._fp = {}; // 只缓存当日
      this._fp[key] = intradayPath(candle, this.framesPerDay, 'f' + instrId);
    }
    return this._fp[key];
  };

  Engine.prototype.prevClose = function (instrId) {
    var book = this.prices[instrId];
    var date = this.currentDate();
    var prev = null;
    for (var i = 0; i < book.dates.length; i++) {
      if (book.dates[i] >= date) break;
      prev = book.byDate[book.dates[i]];
    }
    return prev ? prev.c : null;
  };

  Engine.prototype.limits = function (instrId) {
    var pl = this.caseData.market.priceLimit;
    if (!pl) return null;
    var pc = this.prevClose(instrId);
    if (!pc) return null;
    var digits = pc < 10 ? 3 : 2;
    var f = Math.pow(10, digits);
    return {
      up: Math.round(pc * (1 + pl) * f) / f,
      down: Math.round(pc * (1 - pl) * f) / f,
      prevClose: pc
    };
  };

  /* ---------- 播放控制 ---------- */
  Engine.prototype.play = function () {
    if (this.finished) return;
    this.playing = true;
    this._schedule();
    this.emit('playstate', true);
  };
  Engine.prototype.pause = function () {
    this.playing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.emit('playstate', false);
  };
  Engine.prototype.setSpeed = function (s) { this.speed = s; this.emit('speed', s); };

  /* 长期持有到底：进入高速快进模式——行情飞速逐帧播放（看得见 K 线一路涨/跌），
     跳过剧情弹窗与分时慢镜头，盯市/利息/赎回/强平/分红照常，一路拿到剧本终点出复盘。 */
  Engine.prototype.holdToEnd = function () {
    if (this.finished) return;
    this._holdMode = true;       // 快进标志：跳过 decision 暂停 + intraday 慢镜头
    this.intraday = null;
    this.setSpeed(40);           // 高速但仍逐帧播放（保留"时光飞逝"的动画感）
    if (!this.playing) { this.play(); }
    else { this.emit('playstate', true); this._schedule(); }
  };
  Engine.prototype._schedule = function () {
    var self = this;
    if (this.timer) clearTimeout(this.timer);
    if (!this.playing) return;
    var ms = this.intraday ? 460 / this.speed : 400 / this.speed;
    this.timer = setTimeout(function () { self._step(); }, ms);
  };

  Engine.prototype._step = function () {
    if (!this.playing) return;
    if (this.intraday) {
      this.intraday.i++;
      if (this.intraday.i >= this.intraday.ticks.length) {
        this.intraday = null;
        this._endOfDay();
      } else {
        this.emit('tick');
      }
      this._schedule();
      return;
    }
    if (this.dayIdx >= 0 && this.frame < this.framesPerDay - 1) {
      this.frame++;
      this.emit('tick');
      this._schedule();
      return;
    }
    // 收盘结算上一日
    if (this.dayIdx >= 0) this._endOfDay();
    if (!this.playing) return; // 结算可能触发暂停（决策/幕末/清盘）
    this._advanceDay();
    this._schedule();
  };

  Engine.prototype._advanceDay = function () {
    this.dayIdx++;
    this.frame = 0;
    this._fp = null;
    if (this.dayIdx >= this.calendar.length) { this._finish('end'); return; }
    var date = this.currentDate();
    var act = this.currentAct();
    // 日内慢镜头日（长持快进模式下跳过，避免拖慢"时光飞逝"）
    var slow = !this._holdMode && (act.intradayDates || []).indexOf(date) >= 0;
    if (slow) {
      var main = this.caseData.market.benchmark;
      var c = this.prices[main].at(date);
      if (c) this.intraday = { instr: main, ticks: intradayPath(c, 48, 'intra'), i: 0 };
    }
    this.emit('day', { date: date });
    // 事件投递
    var evs = this.eventsByDate[date] || [];
    for (var i = 0; i < evs.length; i++) this._fireEvent(evs[i]);
  };

  Engine.prototype._fireEvent = function (e) {
    var key = e.date + '|' + (e.title || e.text || '').slice(0, 18);
    if (this.eventsFired[key]) return;
    // 条件事件：按当前净值决定是否触发（如净值健康就不发赎回潮）
    if (e.cond) {
      var navNow = this.pf.nav(this.prices, this.currentDate());
      if (e.cond.navBelow != null && !(navNow < e.cond.navBelow)) return;
      if (e.cond.navAbove != null && !(navNow > e.cond.navAbove)) return;
    }
    this.eventsFired[key] = true;
    if (e.pressure) this.pressure.addSpike(e.pressure);
    if (e.type === 'decision' && !this._holdMode) this.pause();   // 长持快进不被剧情暂停
    if (e.type === 'redeem') { this._redeem(e.frac || 0.05, e.text); return; }
    this.emit('event', e);
  };

  /* 赎回：抽走现金，现金不够则排队强卖 */
  Engine.prototype._redeem = function (frac, text) {
    var date = this.currentDate();
    var eq = this.pf.equity(this.prices, date);
    var amt = eq * frac;
    var nav = this.pf.nav(this.prices, date);
    var sharesOut = this.pf.shares * frac;
    this.pf.shares -= sharesOut;
    this.pf.redeemedTotal += amt;
    if (this.pf.cash >= amt) {
      this.pf.cash -= amt;
    } else {
      var need = amt - this.pf.cash;
      this.pf.cash = 0;
      this._queueForcedSells(need, '赎回挤兑');
    }
    this.pressure.addSpike(18);
    this.emit('event', { type: 'system', level: 'danger', date: date,
      title: '赎回 ' + Math.round(frac * 100) + '% 份额',
      text: text || ('客户赎回 ' + MR.fmtMoney(amt) + '。' + (this.pf.cash <= 0 ? '现金不足，持仓将被强制卖出！' : '')) });
  };

  Engine.prototype._queueForcedSells = function (cashNeed, reason) {
    var date = this.currentDate();
    var ids = Object.keys(this.pf.positions);
    for (var i = 0; i < ids.length && cashNeed > 0; i++) {
      var id = ids[i];
      var p = this.pf.positions[id];
      if (!p.qty) continue;
      var book = this.prices[id];
      var c = book.lastOnOrBefore(date);
      var qty = Math.min(p.qty, Math.ceil(cashNeed / c.c / 100) * 100);
      this.pendingSells.push({ instr: id, qty: qty, reason: reason, forced: true });
      cashNeed -= qty * c.c;
    }
  };

  /* ---------- 下单 ---------- */
  // side: 'buy'|'sell'（期货另有 'short'|'cover'），amountPct 按可用资金/持仓百分比
  Engine.prototype.order = function (instrId, side, amountPct, useMargin) {
    var date = this.currentDate();
    var m = this.caseData.market;
    var info = this.priceOf(instrId);
    if (!info) return { ok: false, msg: '无行情' };
    if (info.suspended) return { ok: false, msg: this.prices[instrId].name + ' 停牌中，无法交易' };
    var price = info.price;
    var lim = this.limits(instrId);
    var pf = this.pf;
    var fee = m.feeRate || 0.001;
    var book = this.prices[instrId];

    if (this.isFut(instrId)) return this._orderFutures(instrId, side, amountPct, price, info);

    if (side === 'buy') {
      // 持有现货空头时，买入 = 先一键全平空头（反向自动平仓，免手动）
      var posShort = pf.positions[instrId];
      if (posShort && posShort.qty < 0) {
        var cv = this._coverShortSpot(instrId, Math.abs(posShort.qty), price);
        if (cv.ok) cv.msg = '已平掉空头，再点「买入」即可开多';
        return cv;
      }
      if (lim && price >= lim.up - 1e-9 && info.candle.l >= lim.up - 1e-9) {
        return { ok: false, msg: '一字涨停，买单排队无法成交' };
      }
      // 仓位档按整体权益的比例（不是剩余资金）：10% = 拿总资产的一成去买
      var eq = pf.equity(this.prices, date);
      var desired = Math.max(0, eq) * (amountPct / 100);
      if (useMargin && m.margin && m.margin.enabled && desired > pf.cash) {
        var maxDebt = eq * (m.margin.maxLeverage - 1);
        var addDebt = Math.min(Math.max(0, maxDebt - pf.debt), desired - pf.cash);
        if (addDebt > 0) { pf.debt += addDebt; pf.cash += addDebt; }
      }
      var budget = Math.min(desired, pf.cash);
      var qty = Math.floor(budget / (price * (1 + fee)) / (m.lot || 100)) * (m.lot || 100);
      if (qty <= 0) return { ok: false, msg: '可用资金不足一手' };
      var cost = qty * price * (1 + fee);
      pf.cash -= cost;
      var pos = pf.positions[instrId] || (pf.positions[instrId] = { qty: 0, cost: 0, lastBuyDate: null });
      pos.cost = (pos.cost * pos.qty + price * qty) / (pos.qty + qty);
      pos.qty += qty;
      pos.lastBuyDate = date;
      var tr = { date: date, instr: instrId, name: book.name, side: 'buy', qty: qty, price: price,
                 nav: pf.nav(this.prices, date), margin: !!useMargin };
      pf.trades.push(tr);
      this.emit('trade', tr);
      return { ok: true, msg: '买入 ' + book.name + ' ' + qty + ' 股 @' + MR.fmtPrice(price) };
    }

    if (side === 'sell') {
      var pos2 = pf.positions[instrId];
      if (!pos2 || pos2.qty <= 0) return { ok: false, msg: '无持仓' };
      if (m.tplus === 1 && pos2.lastBuyDate === date) {
        return { ok: false, msg: 'T+1：今日买入的股票明天才能卖出' };
      }
      var sellQty = Math.max(m.lot || 100, Math.floor(pos2.qty * (amountPct / 100) / (m.lot || 100)) * (m.lot || 100));
      sellQty = Math.min(sellQty, pos2.qty);
      // 跌停流动性
      if (lim && price <= lim.down + 1e-9) {
        var sealed = info.candle.h - info.candle.l < 1e-9 && info.candle.c <= lim.down + 1e-9;
        if (sealed) {
          this.pendingSells.push({ instr: instrId, qty: sellQty, reason: '跌停排队' });
          this.pressure.addSpike(12);
          this.emit('event', { type: 'system', level: 'danger', date: date,
            title: '跌停封死 · 卖单排队', text: book.name + ' 封单如山，' + sellQty + ' 股卖单进入队列，今日成交概率很低。' });
          return { ok: true, queued: true, msg: '跌停封死，卖单排队中…' };
        }
      }
      return { ok: true, msg: this._fillSell(instrId, sellQty, price, false) };
    }

    if (side === 'short') {   // 现货卖空（仅 allowShort 的剧本）
      if (!m.allowShort) return { ok: false, msg: '该品种是现货股票，不支持卖空' };
      var posL = pf.positions[instrId];
      // 持有多头时，卖出开空 = 先一键全平多头（反向自动平仓）
      if (posL && posL.qty > 0) {
        if (m.tplus === 1 && posL.lastBuyDate === date) return { ok: false, msg: 'T+1：今日买入的明天才能卖出' };
        var r2 = { ok: true, msg: this._fillSell(instrId, posL.qty, price, false) };
        r2.msg = '已平掉多头，再点「卖出开空」即可开空';
        return r2;
      }
      var eqS = pf.equity(this.prices, date);
      var desiredS = Math.max(0, eqS) * (amountPct / 100);
      // 名义敞口硬顶（与买入端同口径）：现货多空总名义市值不得超过 权益 × 最高杠杆（不融券=1×）。
      // 缺这道闸时，连点「卖空」会把空头敞口无限叠加 → 杠杆与收益爆炸（无杠杆剧本也能刷出天文收益）。
      var levCapS = (m.margin && m.margin.enabled) ? (m.margin.maxLeverage || 2) : 1;
      var curNotionalS = 0;
      for (var _sk in pf.positions) {
        var _sp = pf.positions[_sk];
        if (!_sp.qty || _sp.fut) continue;                 // 期货敞口走保证金占用口径，不并入现货名义顶
        var _sc = this.prices[_sk] && this.prices[_sk].lastOnOrBefore(date);
        if (_sc) curNotionalS += Math.abs(_sp.qty) * _sc.c;
      }
      var roomS = Math.max(0, eqS * levCapS - curNotionalS);
      if (roomS <= 0) return { ok: false, msg: levCapS > 1 ? ('已达最高杠杆（' + levCapS + '×），无法继续加空') : '已达最高敞口，无法继续加空' };
      desiredS = Math.min(desiredS, roomS);
      var qtyS = Math.floor(desiredS / (price * (1 + fee)) / (m.lot || 100)) * (m.lot || 100);
      if (qtyS <= 0) return { ok: false, msg: '可用资金不足一手' };
      var posS = pf.positions[instrId] || (pf.positions[instrId] = { qty: 0, cost: 0, lastBuyDate: null });
      posS.cost = (posS.cost * Math.abs(posS.qty) + price * qtyS) / (Math.abs(posS.qty) + qtyS);
      posS.qty -= qtyS;                       // 负持仓 = 空头
      pf.cash += qtyS * price * (1 - fee);     // 卖空收到现金（marketValue 的负市值会抵消，equity 不虚增）
      var trS = { date: date, instr: instrId, name: book.name, side: 'short', qty: qtyS, price: price,
                  nav: pf.nav(this.prices, date) };
      pf.trades.push(trS); this.emit('trade', trS);
      return { ok: true, msg: '卖空 ' + book.name + ' ' + qtyS + ' 股 @' + MR.fmtPrice(price) };
    }

    if (side === 'cover') {   // 现货平空（买回）
      var posC = pf.positions[instrId];
      if (!posC || posC.qty >= 0) return { ok: false, msg: '无空头持仓' };
      var coverQty = Math.max(m.lot || 100, Math.floor(Math.abs(posC.qty) * (amountPct / 100) / (m.lot || 100)) * (m.lot || 100));
      coverQty = Math.min(coverQty, Math.abs(posC.qty));
      return this._coverShortSpot(instrId, coverQty, price);
    }
    return { ok: false, msg: '未知指令' };
  };

  Engine.prototype._coverShortSpot = function (instrId, qty, price) {
    var pf = this.pf, m = this.caseData.market, fee = m.feeRate || 0.001;
    var pos = pf.positions[instrId];
    qty = Math.min(qty, Math.abs(pos.qty));
    var pnl = (pos.cost - price) * qty;       // 开空均价 − 买回价
    pf.cash -= qty * price * (1 + fee);        // 买回付现金
    pos.qty += qty;
    if (pos.qty === 0) pos.cost = 0;
    var book = this.prices[instrId];
    var tr = { date: this.currentDate(), instr: instrId, name: book.name, side: 'cover', qty: qty, price: price,
               pnl: pnl, nav: pf.nav(this.prices, this.currentDate()) };
    pf.trades.push(tr); this.emit('trade', tr);
    return { ok: true, msg: '平空 ' + book.name + ' ' + qty + ' 股，盈亏 ' + MR.fmtMoney(pnl) };
  };

  Engine.prototype._fillSell = function (instrId, qty, price, forced) {
    var pf = this.pf, m = this.caseData.market;
    var fee = m.feeRate || 0.001;
    var pos = pf.positions[instrId];
    qty = Math.min(qty, pos.qty);
    pos.qty -= qty;
    var proceeds = qty * price * (1 - fee);
    pf.cash += proceeds;
    // 优先还融资
    if (pf.debt > 0) {
      var repay = Math.min(pf.debt, Math.max(0, pf.cash - 0));
      if (forced) { repay = Math.min(pf.debt, proceeds); }
      pf.debt -= repay; pf.cash -= repay;
    }
    var book = this.prices[instrId];
    var tr = { date: this.currentDate(), instr: instrId, name: book.name, side: 'sell', qty: qty,
               price: price, nav: pf.nav(this.prices, this.currentDate()), forced: !!forced };
    pf.trades.push(tr);
    this.emit('trade', tr);
    return (forced ? '【强制】' : '') + '卖出 ' + book.name + ' ' + qty + ' 股 @' + MR.fmtPrice(price);
  };

  /* 期货：qty 按手；乘数/保证金率按标的解析（instrument 覆盖 market 默认） */
  Engine.prototype._orderFutures = function (instrId, side, amountPct, price, info) {
    var pf = this.pf;
    var fp = this.futParams(instrId);
    var mult = fp.mult, mr = fp.mr;
    var date = this.currentDate();
    var book = this.prices[instrId];
    var pos = pf.positions[instrId] || (pf.positions[instrId] = { qty: 0, cost: 0, margin: 0 });
    pos.fut = true; pos.mult = mult;
    var perLotMargin = price * mult * mr;
    if (side === 'buy' || side === 'short') {
      // 盯市制下浮盈已逐日进现金；盘中再叠加当日浮动，支持浮盈加仓
      var floatPnl = 0;
      for (var fid in pf.positions) {
        var fp2 = pf.positions[fid];
        if (fp2.fut && fp2.qty) {
          var finfo = this.priceOf(fid);
          if (finfo && !finfo.suspended) floatPnl += fp2.qty * (finfo.price - (fp2.mark != null ? fp2.mark : fp2.cost)) * (fp2.mult || 1);
        }
      }
      var avail = Math.max(0, pf.cash + floatPnl);
      // 仓位档按整体权益的比例：50% = 新增保证金占用达到总权益的一半（满仓=100% 权益做保证金）
      var eqNow = Math.max(0, this.equityNow());
      var budget = Math.min(eqNow * (amountPct / 100), avail);
      var lots = Math.floor(budget / perLotMargin);
      if (lots <= 0) return { ok: false, msg: '保证金不足一手' };
      var dir = side === 'buy' ? 1 : -1;
      // 反向开仓 = 先一键全平反向持仓（免去手动平仓的麻烦）；平光后再点该方向才真正开新仓
      if (pos.qty !== 0 && (pos.qty > 0) !== (dir > 0)) {
        var rev = this._orderFutures(instrId, 'close', 100, price, info);
        if (rev.ok) rev.msg = (dir > 0 ? '已平掉空头，再点「买入开多」即可开多' : '已平掉多头，再点「卖出开空」即可开空');
        return rev;
      }
      var newQty = pos.qty + dir * lots;
      pos.cost = (Math.abs(pos.qty) * pos.cost + lots * price) / Math.abs(newQty);
      pos.mark = (Math.abs(pos.qty) * (pos.mark != null ? pos.mark : pos.cost) + lots * price) / Math.abs(newQty);
      pos.qty = newQty;
      var addMargin = lots * perLotMargin;
      pos.margin += addMargin; pf.cash -= addMargin;
      var tr = { date: date, instr: instrId, name: book.name, side: side, qty: lots, price: price, nav: pf.nav(this.prices, date) };
      pf.trades.push(tr); this.emit('trade', tr);
      return { ok: true, msg: (dir > 0 ? '开多 ' : '开空 ') + lots + ' 手 @' + MR.fmtPrice(price) };
    }
    // 平仓：现金按盯市口径（已结算部分不重复计），战报按开仓均价口径
    if (pos.qty === 0) return { ok: false, msg: '无持仓' };
    var closeLots = Math.max(1, Math.floor(Math.abs(pos.qty) * (amountPct / 100)));
    closeLots = Math.min(closeLots, Math.abs(pos.qty));
    var dirSign = pos.qty > 0 ? 1 : -1;
    var mark = pos.mark != null ? pos.mark : pos.cost;
    var cashPnl = (price - mark) * mult * closeLots * dirSign;
    var pnl = (price - pos.cost) * mult * closeLots * dirSign;
    var releaseMargin = pos.margin * (closeLots / Math.abs(pos.qty));
    pos.margin -= releaseMargin;
    pf.cash += releaseMargin + cashPnl;
    pos.qty += -dirSign * closeLots;
    if (pos.qty === 0) { pos.cost = 0; pos.mark = null; }
    var tr2 = { date: date, instr: instrId, name: book.name, side: 'close', qty: closeLots, price: price,
                pnl: pnl, nav: pf.nav(this.prices, date) };
    pf.trades.push(tr2); this.emit('trade', tr2);
    return { ok: true, msg: '平仓 ' + closeLots + ' 手，盈亏 ' + MR.fmtMoney(pnl) };
  };

  // 各市场维持担保比例阈值（追保线 warn / 平仓线 force / 强平后恢复目标 target）；case.market.margin 可覆盖
  // A股两融 150/130；美股·港股(T条例2倍,维持~25%)≈140/130；外汇·商品(高杠杆)120/110
  Engine.prototype._marginLines = function () {
    var m = this.caseData.market, mg = m.margin || {}, d;
    switch (m.type) {
      case 'ashare': d = { warn: 1.5, force: 1.3, target: 1.5 }; break;
      case 'us': case 'hk': d = { warn: 1.4, force: 1.3, target: 1.4 }; break;
      case 'forex': d = { warn: 1.2, force: 1.1, target: 1.2 }; break;
      case 'commodity': d = { warn: 1.2, force: 1.1, target: 1.2 }; break;
      default: d = { warn: 1.5, force: 1.3, target: 1.5 };
    }
    var force = mg.forceLine || d.force;
    var warn = mg.warnLine || Math.max(d.warn, force + 0.15);
    return { warn: warn, force: force, target: mg.targetLine || warn };
  };

  /* ---------- 收盘结算 ---------- */
  Engine.prototype._endOfDay = function () {
    var date = this.currentDate();
    var m = this.caseData.market;
    var pf = this.pf;
    // 分红复利：持有的股票多头按年化股息率逐日计提现金分红（长期持有的复利来源）
    var divY = m.dividendYield || 0;
    if (divY > 0) {
      for (var did in pf.positions) {
        var dp = pf.positions[did];
        if (dp.fut || !dp.qty || dp.qty < 0) continue;   // 期货/空头/空仓不分红
        var dc = this.prices[did] && (this.prices[did].at(date) || this.prices[did].lastOnOrBefore(date));
        if (dc) { pf.cash += dp.qty * dc.c * (divY / 250); pf.divReceived = (pf.divReceived || 0) + dp.qty * dc.c * (divY / 250); }
      }
    }
    // 期货逐日盯市：当日盈亏按结算价划入/划出现金（浮盈可加仓的制度基础）
    for (var fid in pf.positions) {
      var fpos = pf.positions[fid];
      if (!fpos.fut || !fpos.qty) continue;
      var fc = this.prices[fid] && this.prices[fid].at(date);
      if (!fc) continue;
      var mk = fpos.mark != null ? fpos.mark : fpos.cost;
      pf.cash += fpos.qty * (fc.c - mk) * (fpos.mult || 1);
      fpos.mark = fc.c;
    }
    // 融资利息
    if (pf.debt > 0 && m.margin) {
      var interest = pf.debt * m.margin.annualRate / 250;
      pf.cash -= interest; pf.interestPaid += interest;
    }
    // 跌停排队尝试成交
    if (this.pendingSells.length) {
      var remain = [];
      for (var i = 0; i < this.pendingSells.length; i++) {
        var o = this.pendingSells[i];
        var book = this.prices[o.instr];
        var c = book.at(date);
        var lim = this.limits(o.instr);
        if (!c) { remain.push(o); continue; }
        var sealed = lim && c.h - c.l < 1e-9 && c.c <= lim.down + 1e-9;
        var rng = seededRng('queue' + o.instr + date);
        if (!sealed) {
          this.emit('event', { type: 'system', level: 'warn', date: date, title: '排队卖单成交',
            text: this._fillSell(o.instr, o.qty, sealed ? lim.down : c.c, o.forced) });
        } else if (rng() < 0.15) {
          this.emit('event', { type: 'system', level: 'warn', date: date, title: '跌停价侥幸成交',
            text: this._fillSell(o.instr, o.qty, lim.down, o.forced) });
        } else {
          remain.push(o);
          this.emit('event', { type: 'system', level: 'danger', date: date, title: '卖单仍未成交',
            text: book.name + ' 连续封死跌停，' + o.qty + ' 股继续排队。' });
        }
      }
      this.pendingSells = remain;
    }
    // 融资/担保比例强平（两段式，按市场实务）：跌破追保线当天预警 → 次日仍跌破平仓线 → 强制减仓恢复到维持线
    if (pf.debt > 0 && m.margin) {
      var assets = pf.cash + pf.marketValue(this.prices, date);
      var ratio = assets / pf.debt;                 // 维持担保比例 = 资产 / 负债
      var R = this._marginLines();
      if (ratio < R.force) {
        if (pf.finCallPending) {
          var s = Math.max(0, (R.target * pf.debt - assets) / (R.target - 1));
          this._queueForcedSells(s, '担保比例强平');
          pf.finCallPending = false;
          this.pressure.addSpike(28);
          this.emit('event', { type: 'system', level: 'danger', date: date, title: '⚠ 维持担保比例不足，强制减仓',
            text: '维持担保比例 ' + Math.round(ratio * 100) + '% 低于平仓线 ' + Math.round(R.force * 100) + '%，券商强制减仓至 ' + Math.round(R.target * 100) + '% 维持线。' });
        } else {
          pf.finCallPending = true;
          this.pressure.addSpike(15);
          this.emit('event', { type: 'system', level: 'warn', date: date, title: '⚠ 跌破平仓线',
            text: '维持担保比例 ' + Math.round(ratio * 100) + '% 已跌破平仓线 ' + Math.round(R.force * 100) + '%，请明日收盘前补仓/减仓，否则券商强制减仓。' });
        }
      } else if (ratio < R.warn) {
        pf.finCallPending = true;
        this.pressure.addSpike(8);
        this.emit('event', { type: 'system', level: 'warn', date: date, title: '⚠ 跌破追保线',
          text: '维持担保比例 ' + Math.round(ratio * 100) + '% 跌破追保线 ' + Math.round(R.warn * 100) + '%，请及时补仓，跌破 ' + Math.round(R.force * 100) + '% 将强制减仓。' });
      } else {
        pf.finCallPending = false;
      }
    }
    // 期货保证金规则：占用保证金 > 100% 权益 → 当日通知；次日仍未自行减仓 → 强制减仓到 70% 维持线（不一次全平）
    var totalMargin = 0;
    for (var idf in pf.positions) {
      if (pf.positions[idf].fut) totalMargin += pf.positions[idf].margin || 0;
    }
    if (totalMargin > 0) {
      var eqF = pf.equity(this.prices, date);
      if (totalMargin > eqF) {
        var usagePct = Math.round(totalMargin / Math.max(1, eqF) * 100);
        if (pf.marginCallPending) {
          var targetMargin = Math.max(0, eqF) * 0.7;
          var closeFrac = Math.min(1, Math.max(0, (totalMargin - targetMargin) / totalMargin));
          for (var id3 in pf.positions) {
            var p3 = pf.positions[id3];
            if (p3.fut && p3.qty) {
              var c3 = this.prices[id3].at(date) || this.prices[id3].lastOnOrBefore(date);
              this._orderFutures(id3, 'close', closeFrac * 100, c3.c, null);
            }
          }
          pf.marginCallPending = false;
          this.pressure.addSpike(28);
          this.emit('event', { type: 'system', level: 'danger', date: date, title: '⚠ 期货公司强制减仓',
            text: '保证金占用连续两日超过账户权益（' + usagePct + '%），期货公司强制减仓至维持线（占用回落到权益的 70%），不接受协商。' });
        } else {
          pf.marginCallPending = true;
          this.pressure.addSpike(15);
          this.emit('event', { type: 'system', level: 'warn', date: date, title: '⚠ 保证金占用超过 100%',
            text: '当前保证金占用 ' + usagePct + '% 已超过账户权益：请在明日收盘前自行减仓，否则期货公司将强制减仓至 70% 维持线。' });
        }
      } else {
        pf.marginCallPending = false;
      }
    }
    // 记录净值
    var nav = pf.nav(this.prices, date);
    if (this.benchStart === null) this.benchStart = this.benchmark.at(date) ? this.benchmark.at(date).c : this.benchmark.lastOnOrBefore(date).c;
    var b = this.benchmark.at(date);
    var navPrev = pf.navSeries.length ? pf.navSeries[pf.navSeries.length - 1].nav : 1;
    var benchPrevRel = pf.navSeries.length ? pf.navSeries[pf.navSeries.length - 1].bench : null;
    pf.navSeries.push({ date: date, nav: nav, bench: b ? b.c / this.benchStart : null });
    var benchRel = b ? b.c / this.benchStart : null;
    var benchChg = (benchRel != null && benchPrevRel != null) ? benchRel / benchPrevRel - 1 : 0;
    var navChg = navPrev > 0 ? nav / navPrev - 1 : 0;
    if (benchChg <= -0.04 || navChg <= -0.03) this.emit('shock', { benchChg: benchChg, navChg: navChg });
    this.pressure.lossStreak = nav < navPrev ? this.pressure.lossStreak + 1 : 0;
    this.pressure.update(pf, this.prices, date);
    // 敞口采样（知行合一用）
    this.exposureSamples.push({ act: this.actIdx, exposure: pf.exposure(this.prices, date) });
    this.dailyLog.push({ date: date, nav: nav, pressure: this.pressure.value });
    this.emit('eod', { date: date, nav: nav, pressure: this.pressure.value, navChg: navChg, benchChg: benchChg });
    // 时变保证金跨档提示（如 2015 中金所提股指期货保证金压投机）：仅在保证金率抬高那天播一条
    var minst = this.caseData.instruments || [];
    for (var mi = 0; mi < minst.length; mi++) {
      var mit = minst[mi];
      if (mit.kind !== 'futures' || !(mit.marginSchedule && mit.marginSchedule.length)) continue;
      var curMr = this.futParams(mit.id).mr;
      this._mrSeen = this._mrSeen || {};
      if (this._mrSeen[mit.id] != null && curMr > this._mrSeen[mit.id]) {
        this.pressure.addSpike(10);
        this.emit('event', { type: 'system', level: 'warn', date: date, title: '⚠ 中金所上调股指期货保证金',
          text: mit.name + ' 交易保证金上调至 ' + Math.round(curMr * 100) + '%，杠杆降至约 ' + (1 / curMr).toFixed(1) + '×（监管抑制过度投机）。已持仓不动，新开仓占用更多保证金。' });
      }
      this._mrSeen[mit.id] = curMr;
    }
    // 清盘线
    var liq = (this.caseData.pressure && this.caseData.pressure.redemption) ? this.caseData.pressure.redemption.liquidation : 0;
    if (liq && nav < liq && !this.liquidated) {
      this.liquidated = true;
      this._finish('liquidated');
      return;
    }
    // 幕末：连续模式——静默推进 actIdx 到当前日期所属的幕（保证分时慢镜头/复盘按幕统计仍正确），
    // 全程不暂停、不弹幕间/报纸，行情一气呵成播到最后一幕末才结束。
    var acts = this.caseData.acts;
    while (this.actIdx < acts.length - 1 && date >= acts[this.actIdx].dateTo) {
      this.actIdx++;
    }
    if (this.actIdx >= acts.length - 1 && date >= acts[acts.length - 1].dateTo) {
      this.pause();
      this._finish('end');
    }
  };

  Engine.prototype.nextAct = function () {
    if (this.actIdx < this.caseData.acts.length - 1) {
      this.actIdx++;
      this.emit('actStart', { actIdx: this.actIdx });
    }
  };

  Engine.prototype.recordExpectation = function (exp) {
    exp.actIdx = this.actIdx;
    exp.date = this.currentDate() || this.caseData.acts[this.actIdx].dateFrom;
    this.expectations.push(exp);
    this.emit('expectation', exp);
  };

  Engine.prototype._finish = function (reason) {
    if (this.finished) return;
    this.finished = true;
    this.pause();
    this.emit('finish', { reason: reason });
  };

  /* ---------- 复盘统计 ---------- */
  // 对标基准的显示名：个股自身→「买入持有」；大盘/指数/期货/外汇→品种规范名
  Engine.prototype.benchLabel = function () {
    var bench = this.caseData.market.benchmark;
    var bi = this.instrMap[bench];
    if (bi && bi.kind === 'stock') return '买入持有';
    var nm = (bi && bi.name) || (this.benchmark && this.benchmark.name) || '基准';
    nm = nm.split('（')[0].split('(')[0].trim();
    nm = nm.replace(/指数期货$|股指期货$|期货$/, '');
    nm = nm.replace(/综合指数$|工业指数$/, '').replace(/指数$/, '').trim();
    return nm || '基准';
  };

  Engine.prototype.recapStats = function () {
    var pf = this.pf;
    var cd = this.caseData;
    var series = pf.navSeries;
    var last = series[series.length - 1] || { nav: 1, bench: 1 };
    var ret = Math.max(-100, (last.nav - 1) * 100);   // 亏损不超 -100%；收益上限 +99900%（净值 1000 倍封顶，双保险挡计算溢出）
    var benchRet = last.bench ? (last.bench - 1) * 100 : 0;
    // 最大回撤
    var peak = 1, maxDD = 0;
    for (var i = 0; i < series.length; i++) {
      peak = Math.max(peak, series[i].nav);
      maxDD = Math.max(maxDD, (peak - series[i].nav) / peak);
    }
    // 每幕：实际方向/平均敞口/基准涨跌
    var actStats = [];
    for (var a = 0; a < cd.acts.length; a++) {
      var act = cd.acts[a];
      var bFrom = this.benchmark.lastOnOrBefore(act.dateFrom) || this.benchmark.at(act.dateFrom);
      var bTo = this.benchmark.lastOnOrBefore(act.dateTo);
      var bRet = bFrom && bTo ? (bTo.c / bFrom.c - 1) * 100 : 0;
      var samples = this.exposureSamples.filter(function (s) { return s.act === a; });
      var avgExp = samples.length ? samples.reduce(function (s, x) { return s + x.exposure; }, 0) / samples.length : 0;
      var exp = null;
      for (var e = 0; e < this.expectations.length; e++) if (this.expectations[e].actIdx === a) exp = this.expectations[e];
      var marketDir = bRet > 3 ? 'bull' : bRet < -3 ? 'bear' : 'flat';
      actStats.push({
        act: act, benchRet: bRet, avgExposure: avgExp, expectation: exp, marketDir: marketDir,
        dirHit: exp ? exp.dir === marketDir : null,
        adherence: exp ? Math.max(0, 1 - Math.abs(avgExp * 100 - exp.exposure) / 100) : null
      });
    }
    var withExp = actStats.filter(function (s) { return s.expectation; });
    var hits = withExp.filter(function (s) { return s.dirHit; }).length;
    var accuracy = withExp.length ? hits / withExp.length : 0;
    var adherence;
    if (withExp.length) {
      adherence = withExp.reduce(function (s, x) { return s + (x.adherence || 0); }, 0) / withExp.length;
    } else {
      // 本局无「预期仓位」可对照(年度/轮动局)：决策质量改用真实战绩——跑赢基准(alpha)为主、收益与风控为辅，
      // 避免「满仓拿住、大幅跑赢基准」却被判 0 分、评级 C 的尴尬。
      var clampQ = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
      var fsc = pf.trades.filter(function (t) { return t.forced; }).length;
      var ddPct = maxDD * 100, alphaV = ret - benchRet;
      var q = this.liquidated
        ? clampQ(35 - ddPct * 0.3, 8, 40)
        : 58 + clampQ(alphaV * 1.1, -22, 30) + clampQ(ret * 0.18, -10, 12) - clampQ((ddPct - 12) * 0.7, 0, 24) - fsc * 4;
      adherence = clampQ(Math.round(q), 5, 99) / 100;
    }
    var maxLev = 0;
    for (i = 0; i < this.exposureSamples.length; i++) maxLev = Math.max(maxLev, this.exposureSamples[i].exposure);
    return {
      ret: ret, benchRet: benchRet, alpha: ret - benchRet, maxDD: Math.min(100, maxDD * 100), benchLabel: this.benchLabel(),
      navSeries: series, trades: pf.trades, actStats: actStats,
      accuracy: accuracy * 100, adherence: adherence * 100,
      maxLeverage: maxLev, interestPaid: pf.interestPaid, redeemedTotal: pf.redeemedTotal,
      liquidated: this.liquidated,
      forcedSellCount: pf.trades.filter(function (t) { return t.forced; }).length,
      tradeCount: pf.trades.length
    };
  };

  /* ---------- 工具 ---------- */
  MR.fmtMoney = function (x) {
    var abs = Math.abs(x);
    if (abs >= 1e8) return (x / 1e8).toFixed(2) + ' 亿';
    if (abs >= 1e4) return (x / 1e4).toFixed(1) + ' 万';
    return x.toFixed(0) + ' 元';
  };
  MR.fmtPrice = function (x) { return x >= 1000 ? x.toFixed(0) : x >= 100 ? x.toFixed(1) : x.toFixed(2); };
  MR.fmtPct = function (x, signed) {
    var s = x.toFixed(2) + '%';
    return signed && x > 0 ? '+' + s : s;
  };

  MR.Engine = Engine;
  MR.PriceBook = PriceBook;
})();
