/* 投资大师实战 · 增长系统
 * 解锁状态（免费/邀请/付费兑换码）+ 邀请码 + 战绩/邀请海报（Canvas 自绘 + 本地 QR 资产）
 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});

  /* 头像 url 加版本号破缓存（换了头像图但文件名不变时，浏览器才会重新拉取） */
  MR.av = function (u) { return u ? (u.indexOf('?') < 0 ? u + '?v=' + (window.MR_V || '') : u) : u; };

  /* ---------- 紧凑 SHA-256（同步，避开 crypto.subtle 兼容性） ---------- */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    var mathPow = Math.pow, maxWord = mathPow(2, 32), result = '';
    var words = [], asciiBitLength = ascii.length * 8;
    var hash = sha256.h = sha256.h || [], k = sha256.k = sha256.k || [];
    var primeCounter = k.length;
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while ((ascii.length % 64) - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      var j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words.length] = (asciiBitLength / maxWord) | 0;
    words[words.length] = asciiBitLength;
    for (j = 0; j < words.length;) {
      var w = words.slice(j, (j += 16));
      var oldHash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25))
          + ((e & hash[5]) ^ (~e & hash[6])) + k[i]
          + (w[i] = i < 16 ? w[i] : (w[i - 16]
              + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result;
  }
  MR.sha256 = sha256;

  /* ---------- 存档 ---------- */
  var KEY = 'mr_save_v1';
  function loadSave() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function writeSave(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  var save = loadSave();
  save.unlock = { invite: true, paid: true };
  if (!save.unlock.cases) save.unlock.cases = {};   // 按剧本转发解锁
  if (!save.results) save.results = {};
  if (!save.profile) save.profile = {};
  // 前20%奖励：vouchers=未用的「任选付费剧本」免费券；earnedOn=已发过券的剧本(防刷)；gifts=每个剧本已赠送次数
  if (!save.reward) save.reward = { vouchers: 0, earnedOn: {}, gifts: {} };
  if (!save.inviteCode) {
    save.inviteCode = 'Y' + Math.random().toString(36).slice(2, 7).toUpperCase();
  }
  save.visits = (save.visits || 0) + 1;   // 每次页面加载计一次访问（随机穿越只给回头客看）

  /* ---------- 交易员昵称（排行榜用；个人中心可改） ---------- */
  var NAME_A = ['追风', '满仓', '空仓', '抄底', '逃顶', '复利', '夜盘', '左侧', '右侧',
    '戒杠杆', '看线', '翻表', '涨停', '不割', '慢富', '反做', '低吸', '扛单'];
  var NAME_B = ['侠', '客', '散户', '老炮', '猫', '僧', '徒', '老兵',
    '收租', '数豆', '守夜', '雪球', '猎手', '渔夫', '木匠', '账房', '老张', '阿四'];
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
    return h;
  }
  MR.genTraderName = function (seed) {
    var h = hashStr(String(seed));
    return NAME_A[h % NAME_A.length] + NAME_B[(h >>> 7) % NAME_B.length];
  };
  if (!save.profile.name) {
    save.profile.name = MR.genTraderName(save.inviteCode + 'me');
  }
  writeSave(save);

  MR.store = {
    get: function () { return save; },
    commit: function () { writeSave(save); },
    saveResult: function (caseId, result) {
      save.results[caseId] = result;
      writeSave(save);
    },
    canPlay: function (caseData) {
      return true; // 开源版本全量免费解锁
    },
    unlockInvite: function () { save.unlock.invite = true; writeSave(save); },
    unlockCase: function (caseId) {
      save.unlock.cases[caseId] = true; writeSave(save);
      if (MR.track) MR.track('unlock', { caseId: caseId });
    },
    setProfile: function (p) {
      save.profile = save.profile || {};
      if (p.name != null) save.profile.name = p.name;
      if (p.contact != null) save.profile.contact = p.contact;
      writeSave(save);
      if (MR.track && p.contact) MR.track('contact', { contact: String(p.contact).slice(0, 80) });
    },
    // 网页解锁码：小程序付费后在小程序里生成的 MS-XXXX-XXXX，连后端验证 → 全解锁。异步，结果走 cb({ok,msg})。
    redeem: function (code, cb) {
      cb = cb || function () {};
      code = (code || '').trim().toUpperCase();
      if (!/^MS-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(code)) { cb({ ok: false, msg: '会员码格式：MS-XXXX-XXXX' }); return; }
      try {
        var x = new XMLHttpRequest();
        x.open('POST', 'https://master-ai.cn/wgame/pay/webcode/verify', true);
        x.setRequestHeader('Content-Type', 'application/json');
        x.timeout = 12000;
        x.onload = function () {
          var r = {}; try { r = JSON.parse(x.responseText || '{}'); } catch (e) {}
          if (r.ok) {
            save.unlock.paid = true; writeSave(save);
            if (MR.track) MR.track('redeem', { code: code });
            cb({ ok: true });
          } else cb({ ok: false, msg: r.msg || '会员码无效，请核对后重试' });
        };
        x.onerror = x.ontimeout = function () { cb({ ok: false, msg: '连接超时，请检查网络后重试' }); };
        x.send(JSON.stringify({ code: code }));
      } catch (e) { cb({ ok: false, msg: '验证失败，请重试' }); }
    },
    // 网页身份 token（扫码付款关联用，持久）：编进小程序码 scene，付款后后端按它标记已付
    getWebToken: function () {
      if (!save.webToken) { save.webToken = 'wt' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); writeSave(save); }
      return save.webToken;
    },
    // 扫码付款/轮询命中后应用解锁：all 或 unlock_all → 全解锁，否则按单剧本 caseId
    applyUnlock: function (sku, all) {
      if (all || sku === 'unlock_all' || sku === '__all__') save.unlock.paid = true;
      else if (sku) save.unlock.cases[sku] = true;
      writeSave(save);
      if (MR.track) MR.track('redeem', { code: 'scan:' + (all ? 'all' : sku) });
    },

    /* ===== 前20%奖励：任选付费剧本免费券 + 赠送名额 ===== */
    GIFT_MAX: 5,
    // 收益排名进前20%(击败≥80%同行) → 每个剧本「首次」达成发 1 张「任选付费剧本」券。
    // 返回 true=本次新得一张券；同一剧本重复达成不再累加，避免反复刷同一关刷券。
    earnReward: function (caseId) {
      save.reward = save.reward || { vouchers: 0, earnedOn: {}, gifts: {} };
      if (save.reward.earnedOn[caseId]) return false;
      save.reward.earnedOn[caseId] = true;
      save.reward.vouchers = (save.reward.vouchers || 0) + 1;
      writeSave(save);
      if (MR.track) MR.track('reward_earn', { caseId: caseId });
      return true;
    },
    rewardVouchers: function () { return (save.reward && save.reward.vouchers) || 0; },
    // 用 1 张券永久解锁某剧本（写入 unlock.cases，与转发/兑换解锁同口径）；成功返回 true
    redeemVoucher: function (caseId) {
      save.reward = save.reward || { vouchers: 0, earnedOn: {}, gifts: {} };
      if ((save.reward.vouchers || 0) <= 0) return false;
      save.reward.vouchers -= 1;
      save.unlock.cases[caseId] = true;
      writeSave(save);
      if (MR.track) MR.track('reward_redeem', { caseId: caseId });
      return true;
    },
    // 赠送名额：每个剧本可赠送给 GIFT_MAX 位好友（本地软计数，跨设备不强约束）
    giftLeft: function (caseId) {
      var used = (save.reward && save.reward.gifts && save.reward.gifts[caseId]) || 0;
      return Math.max(0, this.GIFT_MAX - used);
    },
    useGift: function (caseId) {
      save.reward = save.reward || { vouchers: 0, earnedOn: {}, gifts: {} };
      save.reward.gifts = save.reward.gifts || {};
      if (((save.reward.gifts[caseId]) || 0) >= this.GIFT_MAX) return false;
      save.reward.gifts[caseId] = (save.reward.gifts[caseId] || 0) + 1;
      writeSave(save);
      if (MR.track) MR.track('gift_send', { caseId: caseId });
      return true;
    }
  };

  /* ---------- 海报 ---------- */
  var qrImg = null;
  function loadQr(cb) {
    if (qrImg) { cb(qrImg); return; }
    var img = new Image();
    img.onload = function () { qrImg = img; cb(img); };
    img.onerror = function () { cb(null); };
    img.src = 'assets/qr.png?v=3';
  }
  /* 按局二维码：默认编码 ?case=<id> 深链——扫码直接进这一局（受邀者免解锁玩）。
     gift=true 时编码 ?gift=<id>——扫码者「永久解锁」该剧本（前20%奖励赠送好友用）。
     用本地 qrcodejs 现画，库未加载/出错则返回 null，海报回退到静态首页码 loadQr。 */
  var qrCache = {};
  function caseQrCanvas(caseId, gift) {
    if (!caseId || typeof QRCode === 'undefined') return null;
    var ck = (gift ? 'g:' : 'c:') + caseId;
    if (qrCache[ck] !== undefined) return qrCache[ck];
    var node = null;
    try {
      var holder = document.createElement('div');
      var url = 'https://marketbattles.com/?' + (gift ? 'gift=' : 'case=') + caseId;
      new QRCode(holder, { text: url, width: 256, height: 256, correctLevel: QRCode.CorrectLevel.M });
      node = holder.querySelector('canvas') || null;   // 取同步画好的 canvas（img 是异步 toDataURL，不取）
    } catch (e) { node = null; }
    qrCache[ck] = node;
    return node;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 战绩海报：stats 来自 recapStats，persona {title,desc}，caseTitle */
  MR.makePoster = function (caseData, stats, persona, cb) {
    loadQr(function (qr) {
      qr = caseQrCanvas(caseData && caseData.id) || qr;   // 优先按局二维码(扫码直达这一局)，回退静态首页码
      var W = 750, H = 1480;
      var wx = !!MR.WECHAT;   // 微信合规版：撤收益率/走势图，改决策评级+免责声明
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      // 背景
      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#15080a'); g.addColorStop(0.5, '#0d1117'); g.addColorStop(1, '#080a10');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 顶部光晕
      var rg = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 500);
      rg.addColorStop(0, 'rgba(255,77,79,0.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 500);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0c040';
      ctx.font = '26px "PingFang SC", sans-serif';
      ctx.fillText(wx ? '投 资 时 光 机' : '投 资 大 师 实 战', W / 2, 86);
      ctx.fillStyle = '#e6edf3';
      ctx.font = 'bold 52px "PingFang SC", sans-serif';
      ctx.fillText(caseData.posterTitle || caseData.title, W / 2, 168);
      ctx.fillStyle = '#8b949e';
      ctx.font = '24px "PingFang SC", sans-serif';
      ctx.fillText(caseData.era, W / 2, 212);

      var retColor = stats.ret >= 0 ? '#ff4d4f' : '#00b578';
      if (wx) {
        // 微信合规版：用「决策评级 + 人格称号」替代收益率大字（攀比感保留、不晒收益）
        var grade = stats.adherence >= 80 ? 'S' : stats.adherence >= 65 ? 'A' : stats.adherence >= 50 ? 'B' : 'C';
        ctx.fillStyle = '#f0c040';
        ctx.font = 'bold 88px "PingFang SC", sans-serif';
        ctx.fillText('决策评级 ' + grade, W / 2, 372);
        ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 36px "PingFang SC", sans-serif';
        ctx.fillText(persona.title || '历史亲历者', W / 2, 426);
      } else {
        // 大数字：收益率（字号随宽度自适应，杠杆爆赚到几百万 % 也不溢出）
        ctx.fillStyle = retColor;
        var retText = (stats.ret >= 0 ? '+' : '') + stats.ret.toFixed(1) + '%';
        var rfs = 120;
        ctx.font = 'bold ' + rfs + 'px ui-monospace, Menlo, monospace';
        while (ctx.measureText(retText).width > W - 70 && rfs > 36) {
          rfs -= 4; ctx.font = 'bold ' + rfs + 'px ui-monospace, Menlo, monospace';
        }
        ctx.fillText(retText, W / 2, 380);
        ctx.fillStyle = '#8b949e'; ctx.font = '26px "PingFang SC", sans-serif';
        ctx.fillText(stats.liquidated ? '触及清盘线 · 基金清盘' :
          ('最终收益率' + (stats.beatPct != null ? ' · 击败 ' + stats.beatPct + '% 同行' : '')), W / 2, 428);
      }

      // 三项小数据（微信版去收益%，只展示行为/决策维度）
      var items = wx ? [
        ['决策质量', Math.round(stats.adherence) + '分'],
        ['风控纪律', Math.max(0, Math.round(100 - stats.maxDD)) + '分'],
        ['操作次数', ((stats.trades || []).length) + '次']
      ] : [
        ['跑赢' + (stats.benchLabel || '基准'), (stats.alpha >= 0 ? '+' : '') + stats.alpha.toFixed(1) + '%'],
        ['最大回撤', '-' + stats.maxDD.toFixed(1) + '%'],
        ['决策质量', Math.round(stats.adherence) + '分']
      ];
      for (var i = 0; i < 3; i++) {
        var bx = 55 + i * 220, by = 470;
        ctx.fillStyle = 'rgba(33,38,45,0.85)';
        roundRect(ctx, bx, by, 200, 110, 16); ctx.fill();
        // 值字号自适应（alpha 也可能几百万 %）
        ctx.fillStyle = '#e6edf3';
        var vfs = 38;
        ctx.font = 'bold ' + vfs + 'px ui-monospace, monospace';
        while (ctx.measureText(items[i][1]).width > 184 && vfs > 16) {
          vfs -= 2; ctx.font = 'bold ' + vfs + 'px ui-monospace, monospace';
        }
        ctx.fillText(items[i][1], bx + 100, by + 56);
        ctx.fillStyle = '#8b949e'; ctx.font = '22px "PingFang SC", sans-serif';
        ctx.fillText(items[i][0], bx + 100, by + 92);
      }

      // ===== 净值走势图（中英文 web 版都画：你的净值 vs 对标，最重要的就是这条线；免责声明保留在底部）=====
      (function () {
        var gx = 55, gy = 610, gw = W - 110, gh = 270;
        ctx.fillStyle = 'rgba(33,38,45,0.85)';
        roundRect(ctx, gx, gy, gw, gh, 16); ctx.fill();
        // 标题 + 图例
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 26px "PingFang SC", sans-serif';
        ctx.fillText('📈 净值走势', gx + 24, gy + 40);
        var benchLab = stats.benchLabel || '基准';
        var lgY = gy + 32;
        ctx.fillStyle = retColor; ctx.fillRect(gx + 200, lgY - 9, 24, 4);
        ctx.fillStyle = '#c6cdd6'; ctx.font = '21px "PingFang SC", sans-serif';
        ctx.fillText('你的净值', gx + 232, lgY);
        var bxLeg = gx + 232 + ctx.measureText('你的净值').width + 26;
        ctx.fillStyle = 'rgba(240,192,64,0.92)'; ctx.fillRect(bxLeg, lgY - 9, 24, 4);
        ctx.fillStyle = '#c6cdd6'; ctx.fillText(benchLab, bxLeg + 32, lgY);
        // 绘图区
        var series = stats.navSeries || [];
        var pL = gx + 24, pT = gy + 64, pW = gw - 48, pH = gh - 64 - 44;
        if (series.length > 1) {
          var lo = 1, hi = 1;
          series.forEach(function (s) {
            var bv = (s.bench == null ? s.nav : s.bench);
            lo = Math.min(lo, s.nav, bv); hi = Math.max(hi, s.nav, bv);
          });
          var span = Math.max(hi - lo, 0.05); lo -= span * 0.12; hi += span * 0.12; span = hi - lo;
          var X = function (k) { return pL + (k / (series.length - 1)) * pW; };
          var Y = function (v) { return pT + pH - ((v - lo) / span) * pH; };
          // 1.0 基线
          ctx.strokeStyle = 'rgba(139,148,158,0.4)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(pL, Y(1)); ctx.lineTo(pL + pW, Y(1)); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(139,148,158,0.8)'; ctx.font = '18px ui-monospace, monospace';
          ctx.textAlign = 'left'; ctx.fillText('1.00', pL + 4, Y(1) - 8);
          // 对标线（金色）
          ctx.strokeStyle = 'rgba(240,192,64,0.92)'; ctx.lineWidth = 2.5; ctx.beginPath();
          var st = false;
          for (var k = 0; k < series.length; k++) {
            if (series[k].bench == null) continue;
            if (!st) { ctx.moveTo(X(k), Y(series[k].bench)); st = true; }
            else ctx.lineTo(X(k), Y(series[k].bench));
          }
          ctx.stroke();
          // 净值线（红/绿，加粗）
          ctx.strokeStyle = retColor; ctx.lineWidth = 4; ctx.beginPath();
          for (k = 0; k < series.length; k++) {
            if (k === 0) ctx.moveTo(X(k), Y(series[k].nav)); else ctx.lineTo(X(k), Y(series[k].nav));
          }
          ctx.stroke();
          // 净值终点光点
          var last = series[series.length - 1];
          ctx.fillStyle = retColor;
          ctx.beginPath(); ctx.arc(X(series.length - 1), Y(last.nav), 6, 0, Math.PI * 2); ctx.fill();
          // 起止日期不显示——海报一律不暴露时间，避免剧透见顶/行情节奏
        } else {
          ctx.textAlign = 'center'; ctx.fillStyle = '#8b949e'; ctx.font = '22px "PingFang SC", sans-serif';
          ctx.fillText('（本局无足够净值数据）', gx + gw / 2, gy + gh / 2);
        }
        ctx.textAlign = 'center';
      })();

      // 人格
      var pcY = 910;
      ctx.fillStyle = 'rgba(240,192,64,0.12)';
      roundRect(ctx, 55, pcY, W - 110, 150, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(240,192,64,0.5)'; ctx.lineWidth = 2;
      roundRect(ctx, 55, pcY, W - 110, 150, 18); ctx.stroke();
      ctx.fillStyle = '#f0c040'; fitCN(ctx, persona.title, W - 120, 44, 26, 'bold');
      ctx.fillText(persona.title, W / 2, pcY + 67);
      ctx.fillStyle = '#d8c9a8';
      var pdesc = persona.poster || persona.desc.slice(0, 26);
      fitCN(ctx, pdesc, W - 120, 24, 17, '');
      ctx.fillText(pdesc, W / 2, pcY + 115);

      // 交易风格标签（行为分析 · 与大师对照）——长标签缩字号不爆框
      if (persona.styleTag) {
        ctx.fillStyle = '#40a9ff';
        var stg = '⚔ ' + persona.styleTag;
        fitCN(ctx, stg, W - 80, 26, 16, 'bold');
        ctx.fillText(stg, W / 2, pcY + 181);
      }

      // 金句：长反思段落截成精炼一句 + 逐字换行(≤2行)，不爆框
      ctx.fillStyle = '#8b949e'; ctx.font = '25px "PingFang SC", sans-serif';
      var quote = '「' + shortQuote(caseData.posterQuote || '行情总在绝望中诞生，在犹豫中成长。') + '」';
      var qLines = wrapCN(ctx, quote, W - 96).slice(0, 2);
      var qy = (persona.styleTag ? pcY + 232 : pcY + 214) - (qLines.length - 1) * 15;
      qLines.forEach(function (ln, qi) { ctx.fillText(ln, W / 2, qy + qi * 32); });

      // 底部：二维码 + 邀请
      var qcY = 1195;
      ctx.fillStyle = 'rgba(33,38,45,0.9)';
      roundRect(ctx, 55, qcY, W - 110, 210, 18); ctx.fill();
      if (qr) {
        ctx.fillStyle = '#fff';
        roundRect(ctx, 85, qcY + 25, 160, 160, 10); ctx.fill();
        ctx.drawImage(qr, 93, qcY + 33, 144, 144);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 28px "PingFang SC", sans-serif';
      var challenger = (save.profile && save.profile.name) ? save.profile.name : '我';
      ctx.fillText(wx ? '和我一起复盘这段历史？' : ('你能跑赢「' + challenger + '」吗？'), 275, qcY + 50);
      ctx.fillStyle = '#8b949e'; ctx.font = '21px "PingFang SC", sans-serif';
      ctx.fillText(wx ? '长按识别 · 投资历史案例研习' : '长按识别 · 亲历大师经典战役', 275, qcY + 86);
      // 网址：加大 + 金色（被微信屏蔽时，浏览器直接输网址也能玩）
      ctx.fillStyle = '#f0c040'; ctx.font = 'bold 34px "PingFang SC", sans-serif';
      ctx.fillText('MarketBattles.com', 275, qcY + 128);
      ctx.fillStyle = '#c6cdd6'; ctx.font = '18px "PingFang SC", sans-serif';
      ctx.fillText('打不开？浏览器直接输入网址也能玩', 275, qcY + 162);
      ctx.fillStyle = '#f0c040'; ctx.font = 'bold 19px "PingFang SC", sans-serif';
      ctx.fillText('★ 进来记得「收藏」', 275, qcY + 192);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(139,148,158,0.7)'; ctx.font = '20px "PingFang SC", sans-serif';
      ctx.fillText('投资史教育体验产品 · 不构成投资建议', W / 2, 1448);

      cb(cv.toDataURL('image/jpeg', 0.88));
    });
  };

  function loadImg(src, cb) {
    if (!src) { cb(null); return; }
    var im = new Image();
    im.onload = function () { cb(im); };
    im.onerror = function () { cb(null); };
    im.src = src;
  }

  /* 邀请海报（解锁用）：每个剧本专属主题。
   * c = CASES 条目（用 c.invite{kicker,line1,line2,dateLine,hook} + c.avatar + c.cat）；
   * 兼容旧调用 makeInvitePoster(cb) → 旗舰默认主题 */
  /* 海报走势图数据：拉该剧本主标的(priceFiles[0])收盘序列，下采样 + 算见顶/最大回撤。失败回退 null（海报照出，只是无图）。 */
  function loadSpark(c, cb) {
    if (!c || !c.dir) { cb(null); return; }
    var v = window.MR_V || '1';
    fetch(c.dir + 'case.json?v=' + v).then(function (r) { return r.json(); }).then(function (cj) {
      var pf = (cj.priceFiles || [])[0];
      if (!pf) { cb(null); return; }
      fetch(c.dir + pf + '?v=' + v).then(function (r) { return r.json(); }).then(function (p) {
        var cs = (p.candles || []).map(function (k) { return k.c; });
        if (cs.length < 4) { cb(null); return; }
        var N = 84, step = Math.max(1, Math.floor(cs.length / N)), pts = [];
        for (var i = 0; i < cs.length; i += step) pts.push(cs[i]);
        if (pts[pts.length - 1] !== cs[cs.length - 1]) pts.push(cs[cs.length - 1]);
        var pk = 0; for (var j = 1; j < cs.length; j++) if (cs[j] > cs[pk]) pk = j;
        cb({ pts: pts, name: p.name, pkRatio: cs.length > 1 ? pk / (cs.length - 1) : 0.66 });
      }).catch(function () { cb(null); });
    }).catch(function () { cb(null); });
  }
  function drawSpaced(ctx, text, x, y, sp) {   // 字间距文本（抬头 logo 用）
    var cx = x;
    for (var i = 0; i < text.length; i++) { ctx.fillText(text[i], cx, y); cx += ctx.measureText(text[i]).width + sp; }
  }
  function wrapCN(ctx, t, maxW) {   // 中文逐字换行
    var lines = [], cur = '';
    for (var i = 0; i < t.length; i++) { var ch = t[i]; if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; }
    if (cur) lines.push(cur); return lines;
  }
  function fitCN(ctx, text, maxW, base, min, weight) {   // 自适应字号(中文)：长标题/标签缩到框内
    var s = base, pre = weight ? weight + ' ' : '';
    for (; s > min; s -= 1) { ctx.font = pre + s + 'px "PingFang SC", sans-serif'; if (ctx.measureText(text).width <= maxW) break; }
    ctx.font = pre + s + 'px "PingFang SC", sans-serif';
  }
  function shortQuote(q) {   // 海报金句：把超长反思段落截成精炼一句（句末标点处断）
    if (!q) return '';
    if (q.length <= 30) return q;
    var m = q.slice(0, 48).match(/^[\s\S]*?[。！？!?]/);
    if (m && m[0].length >= 12 && m[0].length <= 46) return m[0];
    return q.slice(0, 40) + '…';
  }
  /* 海报走势图（藏结局版）：只画剧情前段的真实走势，单色金线，末端逐段渐隐入迷雾——
     勾起"后来怎么了"，但不剧透见顶位置/崩盘幅度。智能截在见顶之前（见顶前 or 前58%取小者）。 */
  function drawSpark(ctx, sp, x, y, w, h, W) {
    var all = sp.pts, n0 = all.length;
    var cap = Math.min(0.58, (sp.pkRatio != null ? sp.pkRatio * 0.85 : 0.58));   // 不越过见顶
    var cut = Math.max(Math.floor(n0 * 0.3), Math.floor(n0 * cap), 4);
    var pts = all.slice(0, cut), n = pts.length, cB = y + h;
    var mx = Math.max.apply(null, pts), mn = Math.min.apply(null, pts), rng = (mx - mn) || 1;
    var padTop = h * 0.14, plotH = h - padTop;
    function X(i) { return x + w * i / (n - 1); }
    function Y(val) { return y + padTop + plotH - (val - mn) / rng * plotH; }
    // 曲线下渐变填充
    var grad = ctx.createLinearGradient(0, y, 0, cB);
    grad.addColorStop(0, 'rgba(240,192,64,0.14)'); grad.addColorStop(1, 'rgba(240,192,64,0)');
    ctx.beginPath(); ctx.moveTo(X(0), cB);
    for (var a = 0; a < n; a++) ctx.lineTo(X(a), Y(pts[a]));
    ctx.lineTo(X(n - 1), cB); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    // 单色金线（不分涨跌色、不标见顶/跌幅），末端 ~40% 逐段渐隐入迷雾
    ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = '#f0c040';
    var fadeFrom = Math.floor(n * 0.6);
    for (var r = 1; r < n; r++) {
      ctx.globalAlpha = r <= fadeFrom ? 1 : Math.max(0, 1 - (r - fadeFrom) / Math.max(1, n - 1 - fadeFrom));
      ctx.beginPath(); ctx.moveTo(X(r - 1), Y(pts[r - 1])); ctx.lineTo(X(r), Y(pts[r])); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 底部标的说明（不剧透结局）
    ctx.fillStyle = '#8b949e'; ctx.font = '22px "PingFang SC", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText((sp.name || '') + ' · 真实行情，结局由你改写', W / 2, cB + 44);
  }

  MR.makeInvitePoster = function (c, cb, opts) {
    if (typeof c === 'function') { cb = c; c = null; }
    var gift = !!(opts && opts.gift);   // 赠送海报：二维码走 ?gift= 永久解锁、文案改赠送口吻
    // 无专属 invite 文案时，从案例字段兜底（年复盘/部分大师局也能出合理海报）
    var inv = (c && c.invite) || {
      kicker: (c && c.year) ? ('一 封 来 自 ' + c.year + ' 的 邀 请 函') : '一 封 来 自 历 史 的 邀 请 函',
      posterTitle: (c && c.title) || '经典战役复盘',
      posterLead: (c && c.posterLead) || (c && c.recap && c.recap.lead) || '回到那一天，重新做一次你的决定'
    };
    if (gift) inv = {
      kicker: '一 份 来 自 高 手 的 赠 礼',
      posterTitle: (inv.posterTitle) || (c && c.title) || '经典战役复盘',
      posterLead: '我打进了前 20%，送你免费解锁这一局——来挑战我的成绩'
    };
    var accent = (c && c.cat === 'master') ? '#f0c040' : '#ff7875';
    // 干货摘要：优先 invite.posterSummary，回退案例 desc（历史看点/史实，做实"不是纯广告"）；meta=真实事件数等
    var summary = (inv && inv.posterSummary) || (c && c.desc) || '';
    var metaLine = (c && c.meta) || '';
    var eventsN = (metaLine.match(/(\d+)\s*个真实(?:事件|史实)/) || [])[1];
    var FONT = function (s, w) { return (w ? w + ' ' : '') + s + 'px "PingFang SC", sans-serif'; };
    loadQr(function (qr) {
      qr = caseQrCanvas(c && c.id, gift) || qr;   // 优先按局二维码(扫码直达这一局)，回退静态首页码
      loadSpark(c, function (spark) {
        var hasChart = !!(spark && spark.pts && spark.pts.length > 3);
        var W = 750, LEAD_LH = 54, SUM_LH = 41;
        // 预测量：钩子行、摘要行（用临时 ctx，只为 measureText）
        var mc = document.createElement('canvas').getContext('2d');
        var lead = inv.posterLead || inv.hook || '';
        mc.font = FONT(37, 'bold'); var leadLines = wrapCN(mc, lead, W - 88);
        mc.font = FONT(25); var sumLines = summary ? wrapCN(mc, summary, W - 140) : [];

        // 布局函数：H 为假值=测量(只推进 y)，H 为真=真画。返回最终底部 y。
        function build(ctx, H) {
          var draw = !!H;
          if (draw) {
            var g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, c && c.cat === 'master' ? '#161106' : '#1a0c0d');
            g.addColorStop(1, '#080a10');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            var rg = ctx.createRadialGradient(W / 2, 0, 50, W / 2, 0, 520);
            rg.addColorStop(0, c && c.cat === 'master' ? 'rgba(240,192,64,0.18)' : 'rgba(255,77,79,0.20)');
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rg; ctx.fillRect(0, 0, W, 520);
            // 抬头：MARKET BATTLES（字间距）+ 标语 + 分隔线
            ctx.textAlign = 'left'; ctx.fillStyle = '#f0c040'; ctx.font = FONT(27, 'bold');
            drawSpaced(ctx, 'MARKET BATTLES', 60, 64, 4);
            ctx.textAlign = 'right'; ctx.fillStyle = '#8b949e'; ctx.font = FONT(22);
            ctx.fillText('真实行情 · 你来决定', 690, 62);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(60, 92); ctx.lineTo(690, 92); ctx.stroke();
          }
          ctx.textAlign = 'center';
          var y = 150;
          if (draw) { ctx.fillStyle = '#f0c040'; ctx.font = FONT(26); ctx.fillText(inv.kicker, W / 2, y); }
          y += 62;
          // 钩子大字
          for (var i = 0; i < leadLines.length; i++) {
            if (draw) { ctx.fillStyle = '#e6edf3'; ctx.font = FONT(37, 'bold'); ctx.fillText(leadLines[i], W / 2, y); }
            y += LEAD_LH;
          }
          y += 4;
          // 案例名（金色大字）
          var mainTitle = (inv && inv.posterTitle) || (c && c.title) || '';
          var tf = 52; mc.font = FONT(tf, 'bold');
          while (mc.measureText(mainTitle).width > W - 90 && tf > 30) { tf -= 2; mc.font = FONT(tf, 'bold'); }
          y += 20;
          if (draw) { ctx.fillStyle = '#f0c040'; ctx.font = FONT(tf, 'bold'); ctx.fillText(mainTitle, W / 2, y); }
          y += 22;
          // ===== 干货框：这一局发生了什么 =====
          if (sumLines.length) {
            var boxX = 48, boxW = W - 96, boxTop = y + 14;
            var bodyTop = boxTop + 54;
            var bodyH = sumLines.length * SUM_LH;
            var boxH = 54 + bodyH + (metaLine ? 34 : 0) + 22;
            if (draw) {
              ctx.fillStyle = 'rgba(255,255,255,0.045)';
              roundRect(ctx, boxX, boxTop, boxW, boxH, 16); ctx.fill();
              ctx.strokeStyle = 'rgba(240,192,64,0.22)'; ctx.lineWidth = 1.2;
              roundRect(ctx, boxX, boxTop, boxW, boxH, 16); ctx.stroke();
              ctx.textAlign = 'left';
              ctx.fillStyle = accent; ctx.font = FONT(22, 'bold');
              ctx.fillText('这一局发生了什么', boxX + 30, boxTop + 38);
              ctx.fillStyle = '#cdd4dd'; ctx.font = FONT(25);
              for (var s = 0; s < sumLines.length; s++) ctx.fillText(sumLines[s], boxX + 30, bodyTop + 22 + s * SUM_LH);
              if (metaLine) { ctx.fillStyle = '#8b949e'; ctx.font = FONT(20); ctx.fillText('📊 ' + metaLine, boxX + 30, bodyTop + 22 + bodyH + 8); }
              ctx.textAlign = 'center';
            }
            y = boxTop + boxH + 26;
          }
          // 走势图（藏结局版）
          if (hasChart) { if (draw) drawSpark(ctx, spark, 64, y + 8, 622, 248, W); y += 8 + 248 + 56 + 8; }
          // 扫码引导（呼应"详细逻辑扫进去"）
          if (draw) {
            ctx.fillStyle = '#e6edf3'; ctx.font = FONT(23, 'bold');
            ctx.fillText(eventsN ? ('想看完整逻辑？进去研习全部 ' + eventsN + ' 个真实事件') : '想看完整逻辑？长按下方二维码进去研习', W / 2, y + 6);
          }
          y += 44;
          // 二维码 + 网址 + 脚注
          var qrY = y + 6;
          if (draw && qr) { ctx.fillStyle = '#fff'; roundRect(ctx, W / 2 - 100, qrY, 200, 200, 14); ctx.fill(); ctx.drawImage(qr, W / 2 - 88, qrY + 12, 176, 176); }
          if (draw) {
            ctx.fillStyle = '#8b949e'; ctx.font = FONT(22);
            ctx.fillText(gift ? '🎁 长按识别 · 免费解锁这一局' : '长按识别二维码 · 免费研习历史', W / 2, qrY + 238);
            ctx.fillStyle = '#f0c040'; ctx.font = FONT(40, 'bold');
            ctx.fillText('MarketBattles.com', W / 2, qrY + 292);
            ctx.fillStyle = '#c6cdd6'; ctx.font = FONT(20);
            ctx.fillText('打不开？浏览器直接输入网址也能玩', W / 2, qrY + 328);
            ctx.fillStyle = '#f0c040'; ctx.font = FONT(20, 'bold');
            ctx.fillText('★ 进去记得「收藏」，下次别找不到', W / 2, qrY + 362);
            ctx.fillStyle = 'rgba(139,148,158,0.7)'; ctx.font = FONT(18);
            ctx.fillText('投资史教育体验产品 · 不构成投资建议', W / 2, qrY + 398);
          }
          return qrY + 398 + 34;
        }

        var H = Math.ceil(build(mc, 0));        // 测量
        var cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        build(cv.getContext('2d'), H);          // 真画
        cb(cv.toDataURL('image/jpeg', 0.92));
      });
    });
  };
})();
