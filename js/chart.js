/* 投资大师实战 · Canvas K线渲染器
 * 红涨绿跌（A股配色），蜡烛 + 均线 + 成交量 + 涨跌停标记 + 当前价线 + 形成中蜡烛
 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});

  var PALETTE = {
    dark: {
      up: '#ff4d4f', down: '#00b578', flat: '#8b949e',
      grid: 'rgba(139,148,158,0.12)', axis: '#8b949e',
      ma5: '#f0c040', ma10: '#40a9ff', ma20: '#b37feb',
      priceLine: '#e6edf3', bench: 'rgba(240,192,64,0.85)', nav: '#ff4d4f',
      label: '#e6edf3', mask: 'rgba(13,17,23,0.55)', panel: 'rgba(13,17,23,0.92)', wick: 'rgba(230,237,243,0.65)'
    },
    light: {
      up: '#e02d2f', down: '#0a9d6e', flat: '#8a8a88',
      grid: 'rgba(20,20,18,0.08)', axis: '#7a7a78',
      ma5: '#c8860a', ma10: '#1d6fa8', ma20: '#8a5cc4',
      priceLine: '#1d1d1b', bench: 'rgba(184,118,10,0.9)', nav: '#e02d2f',
      label: '#1d1d1b', mask: 'rgba(245,244,240,0.72)', panel: 'rgba(255,255,255,0.96)', wick: 'rgba(40,40,38,0.55)'
    }
  };
  var COLORS = PALETTE.dark;
  function syncPalette() { COLORS = document.body.classList.contains('light') ? PALETTE.light : PALETTE.dark; }

  function Chart(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.window = 56; // 可见K线数
    this._resize();
  }
  Chart.prototype.setWindow = function (n) {
    this.window = Math.max(16, Math.min(2400, Math.round(n)));
    return this.window;
  };

  Chart.prototype._resize = function () {
    var dpr = window.devicePixelRatio || 1;
    var rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
  };

  function ma(candles, n, idx) {
    if (idx < n - 1) return null;
    var s = 0;
    for (var i = idx - n + 1; i <= idx; i++) s += candles[i].c;
    return s / n;
  }

  /* candles: 已收盘K线数组; forming: {o,h,l,c} 形成中（可空）; opts: {limitUp, limitDown, suspended} */
  Chart.prototype.draw = function (candles, forming, curPrice, opts) {
    syncPalette();
    this._resize();
    var ctx = this.ctx, w = this.w, h = this.h;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    opts = opts || {};

    var volH = Math.floor(h * 0.18);
    var priceH = h - volH - 14;
    var padR = 52;

    var view = candles.slice(-this.window);
    var all = forming ? view.concat([forming]) : view.slice();
    if (!all.length) return;

    var lo = Infinity, hi = -Infinity, maxVol = 0;
    for (var i = 0; i < all.length; i++) {
      lo = Math.min(lo, all[i].l); hi = Math.max(hi, all[i].h);
      maxVol = Math.max(maxVol, all[i].volume || 0);
    }
    var span = Math.max(hi - lo, hi * 0.002);
    lo -= span * 0.06; hi += span * 0.06; span = hi - lo;
    var y = function (p) { return priceH - ((p - lo) / span) * priceH + 4; };

    var n = all.length;
    var slot = (w - padR) / Math.max(n, 28);
    var bw = Math.max(2, slot * 0.62);

    // 网格 + 轴标
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
    ctx.fillStyle = COLORS.axis; ctx.font = '10px ui-monospace,Menlo,monospace';
    ctx.textAlign = 'left';
    for (var g = 0; g <= 4; g++) {
      var gp = lo + (span * g) / 4;
      var gy = y(gp);
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w - padR + 6, gy); ctx.stroke();
      ctx.fillText(MR.fmtPrice(gp), w - padR + 8, gy + 3);
    }

    // 全量均线（用完整序列算，截窗显示）
    var baseIdx = candles.length - view.length;
    var self = this;
    [[5, COLORS.ma5], [10, COLORS.ma10], [20, COLORS.ma20]].forEach(function (cfg) {
      ctx.strokeStyle = cfg[1]; ctx.lineWidth = 1; ctx.beginPath();
      var started = false;
      for (var i = 0; i < view.length; i++) {
        var v = ma(candles, cfg[0], baseIdx + i);
        if (v === null) continue;
        var x = i * slot + slot / 2;
        if (!started) { ctx.moveTo(x, y(v)); started = true; } else ctx.lineTo(x, y(v));
      }
      ctx.stroke();
    });

    // 蜡烛 + 量
    for (i = 0; i < n; i++) {
      var c = all[i];
      var x = i * slot + slot / 2;
      var isForming = forming && i === n - 1;
      var color = c.c > c.o ? COLORS.up : c.c < c.o ? COLORS.down : COLORS.flat;
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y(c.h)); ctx.lineTo(x, y(c.l)); ctx.stroke();
      var top = y(Math.max(c.o, c.c)), bot = y(Math.min(c.o, c.c));
      var bh = Math.max(1, bot - top);
      if (c.c >= c.o) { ctx.fillRect(x - bw / 2, top, bw, bh); }
      else { ctx.fillRect(x - bw / 2, top, bw, bh); }
      if (isForming) {
        ctx.strokeStyle = COLORS.wick;
        ctx.strokeRect(x - bw / 2 - 1.5, top - 1.5, bw + 3, bh + 3);
      }
      // 量
      if (c.volume && maxVol) {
        var vh = (c.volume / maxVol) * (volH - 4);
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x - bw / 2, h - 12 - vh, bw, vh);
        ctx.globalAlpha = 1;
      }
      // 涨跌停标记
      if (opts.priceLimit) {
        var prev = i > 0 ? all[i - 1].c : null;
        if (prev) {
          var dn = Math.abs(c.c / prev - 1 + opts.priceLimit) < 0.004 && c.c < prev;
          var up = Math.abs(c.c / prev - 1 - opts.priceLimit) < 0.004 && c.c > prev;
          if (dn || up) {
            ctx.fillStyle = dn ? COLORS.down : COLORS.up;
            ctx.beginPath();
            ctx.arc(x, dn ? y(c.l) + 8 : y(c.h) - 8, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // 持仓成本线（金色虚线）
    if (opts.costLine && opts.costLine > lo && opts.costLine < hi) {
      var cy = y(opts.costLine);
      ctx.strokeStyle = 'rgba(240,192,64,0.85)'; ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w - padR + 6, cy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(240,192,64,0.95)'; ctx.font = '9px ui-monospace,Menlo,monospace';
      ctx.fillText('成本 ' + MR.fmtPrice(opts.costLine), 4, cy - 3);
    }

    // 买卖点标记（B/S 三角）
    if (opts.markers && opts.markers.length) {
      var mByDate = {};
      for (var mi = 0; mi < opts.markers.length; mi++) {
        var mk = opts.markers[mi];
        (mByDate[mk.date] = mByDate[mk.date] || []).push(mk);
      }
      for (i = 0; i < n; i++) {
        var ms = mByDate[all[i].date];
        if (!ms) continue;
        var mx = i * slot + slot / 2;
        var seenB = false, seenS = false;
        for (var mj = 0; mj < ms.length; mj++) {
          var isBuy = ms[mj].side === 'buy' || ms[mj].side === 'short';
          var isShort = ms[mj].side === 'short';
          if (isBuy && seenB) continue;
          if (!isBuy && seenS) continue;
          if (isBuy) seenB = true; else seenS = true;
          ctx.fillStyle = ms[mj].forced ? '#f0c040' : isBuy ? (isShort ? '#b37feb' : '#ff4d4f') : '#40a9ff';
          ctx.beginPath();
          if (isBuy) {
            var by = y(all[i].l) + 7;
            ctx.moveTo(mx, by); ctx.lineTo(mx - 4, by + 7); ctx.lineTo(mx + 4, by + 7);
          } else {
            var sy2 = y(all[i].h) - 7;
            ctx.moveTo(mx, sy2); ctx.lineTo(mx - 4, sy2 - 7); ctx.lineTo(mx + 4, sy2 - 7);
          }
          ctx.closePath(); ctx.fill();
          ctx.font = 'bold 8px ui-monospace,monospace'; ctx.textAlign = 'center';
          if (isBuy) ctx.fillText(isShort ? 'S' : 'B', mx, y(all[i].l) + 22);
          else ctx.fillText(isShort ? 'C' : 'S', mx, y(all[i].h) - 17);
          ctx.textAlign = 'left';
        }
      }
    }

    // 保存布局（十字光标用）
    this._layout = { all: all, slot: slot, padR: padR, lo: lo, hi: hi, span: span, priceH: priceH,
                     candles: candles, forming: forming, curPrice: curPrice, opts: opts };

    // 当前价线
    if (curPrice) {
      var py = y(curPrice);
      ctx.strokeStyle = COLORS.priceLine; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w - padR + 6, py); ctx.stroke();
      ctx.setLineDash([]);
      var lastClose = view.length ? view[view.length - 1].c : curPrice;
      var pc = forming && view.length ? view[view.length - 1].c : (view.length > 1 ? view[view.length - 2].c : curPrice);
      ctx.fillStyle = curPrice >= pc ? COLORS.up : COLORS.down;
      ctx.fillRect(w - padR + 2, py - 9, padR - 4, 18);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px ui-monospace,Menlo,monospace';
      ctx.textAlign = 'center';
      ctx.fillText(MR.fmtPrice(curPrice), w - padR / 2, py + 4);
      ctx.textAlign = 'left';
    }

    // 时间轴：均匀取 4~6 个日期刻度（按宽度自适应），含竖向网格，末位永远是当前日
    ctx.fillStyle = COLORS.axis; ctx.font = '9px ui-monospace,Menlo,monospace';
    if (all.length) {
      var ticks = Math.max(2, Math.min(6, Math.floor((w - padR) / 64)));
      for (var t = 0; t <= ticks; t++) {
        var ti = Math.round((n - 1) * t / ticks);
        var td = all[ti].date;
        if (!td) continue;
        var tx = ti * slot + slot / 2;
        ctx.strokeStyle = COLORS.grid;
        ctx.beginPath(); ctx.moveTo(tx, 4); ctx.lineTo(tx, priceH + 4); ctx.stroke();
        ctx.strokeStyle = 'rgba(139,148,158,0.45)';
        ctx.beginPath(); ctx.moveTo(tx, priceH + 4); ctx.lineTo(tx, priceH + 8); ctx.stroke();
        if (t === 0) { ctx.textAlign = 'left'; ctx.fillText(td.slice(5), Math.max(2, tx - 2), h - 2); }
        else if (t === ticks) { ctx.textAlign = 'right'; ctx.fillStyle = COLORS.label; ctx.fillText(td.slice(5), Math.min(tx + 14, w - padR), h - 2); ctx.fillStyle = COLORS.axis; }
        else { ctx.textAlign = 'center'; ctx.fillText(td.slice(5), tx, h - 2); }
      }
      ctx.textAlign = 'left';
    }

    if (opts.suspended) {
      ctx.fillStyle = COLORS.mask;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f0c040'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('—— 停 牌 中 ——', w / 2, h / 2);
      ctx.textAlign = 'left';
    }
  };

  /* 分时模式：当日 tick 折线 */
  Chart.prototype.drawIntraday = function (ticks, i, prevClose, dateLabel) {
    syncPalette();
    this._resize();
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    var visible = ticks.slice(0, i + 1);
    var lo = Math.min(prevClose, Math.min.apply(null, ticks)) * 0.999;
    var hi = Math.max(prevClose, Math.max.apply(null, ticks)) * 1.001;
    var span = hi - lo;
    var y = function (p) { return h - 18 - ((p - lo) / span) * (h - 36); };
    var x = function (k) { return (k / (ticks.length - 1)) * (w - 56); };
    // 昨收线
    ctx.strokeStyle = 'rgba(139,148,158,0.5)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, y(prevClose)); ctx.lineTo(w - 50, y(prevClose)); ctx.stroke();
    ctx.setLineDash([]);
    // 分时线 + 渐变填充
    var cur = visible[visible.length - 1];
    var lineColor = cur >= prevClose ? '#ff4d4f' : '#00b578';
    ctx.strokeStyle = lineColor; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (var k = 0; k < visible.length; k++) {
      if (k === 0) ctx.moveTo(x(k), y(visible[k])); else ctx.lineTo(x(k), y(visible[k]));
    }
    ctx.stroke();
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cur >= prevClose ? 'rgba(255,77,79,0.22)' : 'rgba(0,181,120,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.lineTo(x(visible.length - 1), h - 18); ctx.lineTo(0, h - 18); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    // 当前价标签
    ctx.fillStyle = lineColor;
    ctx.fillRect(w - 50, y(cur) - 9, 48, 18);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px ui-monospace,Menlo,monospace'; ctx.textAlign = 'center';
    ctx.fillText(MR.fmtPrice(cur), w - 26, y(cur) + 4);
    // 涨跌幅大字
    var chg = (cur / prevClose - 1) * 100;
    ctx.font = 'bold 22px ui-monospace,Menlo,monospace';
    ctx.fillStyle = lineColor; ctx.textAlign = 'left';
    ctx.fillText((chg > 0 ? '+' : '') + chg.toFixed(2) + '%', 8, 26);
    ctx.font = '10px sans-serif'; ctx.fillStyle = COLORS.axis;
    ctx.fillText(dateLabel + ' 盘中 · 分时', 8, 40);
    // 时间轴：A 股时段 09:30-11:30 / 13:00-15:00（线性映射, 跳过午休）
    ctx.font = '9px ui-monospace,Menlo,monospace';
    var tmarks = [[0, '09:30'], [0.25, '10:30'], [0.5, '11:30/13:00'], [0.75, '14:00'], [1, '15:00']];
    for (var tm = 0; tm < tmarks.length; tm++) {
      var fx = tmarks[tm][0] * (w - 56);
      ctx.strokeStyle = 'rgba(139,148,158,0.18)';
      ctx.beginPath(); ctx.moveTo(fx, 46); ctx.lineTo(fx, h - 16); ctx.stroke();
      ctx.textAlign = tm === 0 ? 'left' : tm === tmarks.length - 1 ? 'right' : 'center';
      ctx.fillText(tmarks[tm][1], tm === 0 ? 2 : fx, h - 4);
    }
    ctx.textAlign = 'left';
  };

  /* 复盘净值对比曲线 */
  Chart.prototype.drawNav = function (series, benchLabel) {
    syncPalette();
    this._resize();
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    if (!series.length) return;
    var lo = 1, hi = 1;
    series.forEach(function (s) {
      lo = Math.min(lo, s.nav, s.bench || 1);
      hi = Math.max(hi, s.nav, s.bench || 1);
    });
    var span = Math.max(hi - lo, 0.05);
    lo -= span * 0.08; hi += span * 0.08; span = hi - lo;
    var y = function (p) { return h - 16 - ((p - lo) / span) * (h - 30); };
    var x = function (k) { return (k / Math.max(series.length - 1, 1)) * (w - 44); };
    // 1.0 基线
    ctx.strokeStyle = 'rgba(139,148,158,0.4)'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, y(1)); ctx.lineTo(w - 40, y(1)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.axis; ctx.font = '9px ui-monospace,monospace';
    ctx.fillText('1.00', w - 36, y(1) + 3);
    // 基准
    ctx.strokeStyle = COLORS.bench; ctx.lineWidth = 1.2; ctx.beginPath();
    var started = false;
    for (var k = 0; k < series.length; k++) {
      if (series[k].bench == null) continue;
      if (!started) { ctx.moveTo(x(k), y(series[k].bench)); started = true; }
      else ctx.lineTo(x(k), y(series[k].bench));
    }
    ctx.stroke();
    // 净值
    ctx.strokeStyle = COLORS.nav; ctx.lineWidth = 2; ctx.beginPath();
    for (k = 0; k < series.length; k++) {
      if (k === 0) ctx.moveTo(x(k), y(series[k].nav)); else ctx.lineTo(x(k), y(series[k].nav));
    }
    ctx.stroke();
    // 终值标签
    var last = series[series.length - 1];
    ctx.fillStyle = COLORS.nav; ctx.font = 'bold 11px ui-monospace,monospace';
    ctx.fillText(last.nav.toFixed(3), w - 40, y(last.nav) - 4);
    if (last.bench != null) {
      ctx.fillStyle = COLORS.bench;
      ctx.fillText(last.bench.toFixed(3), w - 40, y(last.bench) + 12);
    }
    // 图例
    ctx.fillStyle = COLORS.nav; ctx.fillRect(6, 6, 14, 3);
    ctx.fillStyle = COLORS.label; ctx.font = '10px sans-serif'; ctx.fillText('你的净值', 24, 11);
    ctx.fillStyle = COLORS.bench; ctx.fillRect(86, 6, 14, 3);
    ctx.fillStyle = COLORS.label; ctx.fillText(benchLabel || '基准', 104, 11);
    series.forEach(function () {});
    ctx.fillStyle = COLORS.axis; ctx.font = '9px ui-monospace,monospace';
    ctx.fillText(series[0].date.slice(5), 2, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText(last.date.slice(5), w - 44, h - 4);
    ctx.textAlign = 'left';
  };

  /* HUD 心电图 */
  function ECG(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buf = [];
    this.phase = 0;
  }
  ECG.prototype.push = function (pressure) {
    // 心电波形：压力越高峰越尖、频率越快
    this.phase += 0.25 + (pressure / 100) * 0.55;
    var v = 0;
    var m = this.phase % 6.28;
    if (m < 0.5) v = Math.sin(m * 12.56) * (0.4 + pressure / 110);
    this.buf.push(v);
    if (this.buf.length > 60) this.buf.shift();
    var ctx = this.ctx;
    var dpr = window.devicePixelRatio || 1;
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    this.canvas.width = rect.width * dpr; this.canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);
    var color = pressure > 70 ? '#ff4d4f' : pressure > 40 ? '#f0c040' : '#00b578';
    ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var i = 0; i < this.buf.length; i++) {
      var x = (i / 59) * w;
      var y = h / 2 - this.buf[i] * (h / 2 - 1);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  /* ===== 十字光标：长按/划动查看历史K线 ===== */
  Chart.prototype.crosshairAt = function (px) {
    syncPalette();
    var L = this._layout;
    if (!L) return;
    this.draw(L.candles, L.forming, L.curPrice, L.opts);
    var ctx = this.ctx, w = this.w, h = this.h;
    var i = Math.max(0, Math.min(L.all.length - 1, Math.floor(px / L.slot)));
    var c = L.all[i];
    if (!c) return;
    var x = i * L.slot + L.slot / 2;
    var y = function (p) { return L.priceH - ((p - L.lo) / L.span) * L.priceH + 4; };
    ctx.strokeStyle = COLORS.wick; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, L.priceH + 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y(c.c)); ctx.lineTo(w - L.padR + 6, y(c.c)); ctx.stroke();
    ctx.setLineDash([]);
    var chg = null;
    if (i > 0) chg = (c.c / L.all[i - 1].c - 1) * 100;
    var lines = [
      (c.date || ''),
      '开 ' + MR.fmtPrice(c.o) + '  高 ' + MR.fmtPrice(c.h),
      '低 ' + MR.fmtPrice(c.l) + '  收 ' + MR.fmtPrice(c.c),
      chg == null ? '' : '涨跌 ' + (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%'
    ];
    var bw = 120, bh = 60, bx = x > w / 2 ? 8 : w - L.padR - bw - 4, by = 8;
    ctx.fillStyle = COLORS.panel;
    ctx.strokeStyle = 'rgba(139,148,158,0.5)';
    ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
    ctx.font = '10px ui-monospace,Menlo,monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = '#f0c040';
    ctx.fillText(lines[0], bx + 8, by + 14);
    ctx.fillStyle = COLORS.label;
    ctx.fillText(lines[1], bx + 8, by + 27);
    ctx.fillText(lines[2], bx + 8, by + 40);
    if (lines[3]) {
      ctx.fillStyle = chg >= 0 ? '#ff4d4f' : '#00b578';
      ctx.fillText(lines[3], bx + 8, by + 53);
    }
  };

  /* ===== 全景作战图：整段行情收盘线 + 你的买卖点 + 大师动作 ===== */
  Chart.prototype.drawJourney = function (candles, myTrades, masterMoves, opts) {
    syncPalette();
    this._resize();
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    if (!candles.length) return;
    opts = opts || {};
    var padB = 30, padT = 16, padR = 8;
    var lo = Infinity, hi = -Infinity;
    for (var i = 0; i < candles.length; i++) {
      lo = Math.min(lo, candles[i].l); hi = Math.max(hi, candles[i].h);
    }
    var span = Math.max(hi - lo, 1e-9);
    lo -= span * 0.1; hi += span * 0.14; span = hi - lo;
    var x = function (k) { return (k / Math.max(candles.length - 1, 1)) * (w - padR - 4) + 2; };
    var y = function (p) { return padT + (1 - (p - lo) / span) * (h - padT - padB); };
    var idxByDate = {};
    for (i = 0; i < candles.length; i++) idxByDate[candles[i].date] = i;
    function nearestIdx(date) {
      if (idxByDate[date] != null) return idxByDate[date];
      for (var k = 0; k < candles.length; k++) if (candles[k].date >= date) return k;
      return null; // 超出范围不画
    }
    // 收盘价区域
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(64,169,255,0.16)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    for (i = 0; i < candles.length; i++) {
      if (i === 0) ctx.moveTo(x(i), y(candles[i].c)); else ctx.lineTo(x(i), y(candles[i].c));
    }
    ctx.strokeStyle = 'rgba(160,190,230,0.9)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.lineTo(x(candles.length - 1), h - padB); ctx.lineTo(x(0), h - padB);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    // 你的买卖点
    (myTrades || []).forEach(function (t) {
      var k = nearestIdx(t.date);
      if (k == null) return;
      var isBuy = t.side === 'buy' || t.side === 'short';
      ctx.fillStyle = t.forced ? '#f0c040' : isBuy ? '#ff4d4f' : '#40a9ff';
      ctx.beginPath(); ctx.arc(x(k), y(candles[k].c), 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = COLORS.panel; ctx.lineWidth = 1;
      ctx.stroke();
    });
    // 大师动作（★ + 序号，标在曲线上方）
    var num = 1;
    (masterMoves || []).forEach(function (t) {
      var k = nearestIdx(t.date);
      if (k == null) { return; }
      var mx = x(k), my = y(candles[k].c) - 16;
      ctx.fillStyle = '#f0c040'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('★', mx, my);
      ctx.font = 'bold 8px ui-monospace,monospace';
      ctx.fillText(String(num), mx, my - 10);
      ctx.strokeStyle = 'rgba(240,192,64,0.4)';
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(mx, my + 2); ctx.lineTo(mx, y(candles[k].c) - 4); ctx.stroke();
      ctx.setLineDash([]);
      t._num = num; num++;
    });
    ctx.textAlign = 'left';
    // 图例 + 时间轴
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#ff4d4f'; ctx.fillText('● 你买', 6, h - 6);
    ctx.fillStyle = '#40a9ff'; ctx.fillText('● 你卖', 46, h - 6);
    ctx.fillStyle = '#f0c040'; ctx.fillText('★ ' + (opts.masterName || '大师') + '动作', 86, h - 6);
    ctx.fillStyle = COLORS.axis; ctx.font = '9px ui-monospace,monospace';
    ctx.fillText(candles[0].date, 4, h - 18);
    ctx.textAlign = 'right';
    ctx.fillText(candles[candles.length - 1].date, w - 6, h - 18);
    ctx.textAlign = 'left';
  };

  /* ===== 能力五维雷达 ===== */
  Chart.prototype.drawRadar = function (dims) {
    syncPalette();
    this._resize();
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) / 2 - 34;
    var n = dims.length;
    function pt(i, r) {
      var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    }
    // 网格
    for (var ring = 1; ring <= 4; ring++) {
      ctx.strokeStyle = 'rgba(139,148,158,' + (ring === 4 ? 0.4 : 0.16) + ')';
      ctx.lineWidth = 1; ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var p = pt(i % n, R * ring / 4);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }
    for (i = 0; i < n; i++) {
      var pe = pt(i, R);
      ctx.strokeStyle = 'rgba(139,148,158,0.18)';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(pe[0], pe[1]); ctx.stroke();
    }
    // 数据面
    ctx.beginPath();
    for (i = 0; i <= n; i++) {
      var d = dims[i % n];
      var p2 = pt(i % n, R * Math.max(0.06, Math.min(1, d.score / 100)));
      if (i === 0) ctx.moveTo(p2[0], p2[1]); else ctx.lineTo(p2[0], p2[1]);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(240,192,64,0.22)'; ctx.fill();
    ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 1.6; ctx.stroke();
    // 顶点 + 标签
    for (i = 0; i < n; i++) {
      var d2 = dims[i];
      var pv = pt(i, R * Math.max(0.06, Math.min(1, d2.score / 100)));
      ctx.fillStyle = '#f0c040';
      ctx.beginPath(); ctx.arc(pv[0], pv[1], 2.6, 0, Math.PI * 2); ctx.fill();
      var pl = pt(i, R + 18);
      ctx.fillStyle = COLORS.label; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d2.label, pl[0], pl[1]);
      ctx.fillStyle = '#f0c040'; ctx.font = 'bold 10px ui-monospace,monospace';
      ctx.fillText(Math.round(d2.score), pl[0], pl[1] + 13);
    }
    ctx.textAlign = 'left';
  };

  MR.Chart = Chart;
  MR.ECG = ECG;
})();
