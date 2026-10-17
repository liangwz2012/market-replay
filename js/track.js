/* 运营埋点：上报到 /api/games/track，监控后台见 /games/admi
 * 原则：全部静默失败，绝不影响产品本身；本地 file:// 打开时不上报。 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});
  var API = '/api/games/track';
  var enabled = /^https?:$/.test(location.protocol);
  var sessionId = 's' + Math.random().toString(36).slice(2, 10);

  function send(payload) {
    if (!enabled) return;
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API, new Blob([body], { type: 'application/json' }));
      } else {
        var x = new XMLHttpRequest();
        x.open('POST', API, true);
        x.setRequestHeader('Content-Type', 'application/json');
        x.send(body);
      }
    } catch (err) { /* 静默 */ }
  }

  MR.track = function (event, data) {
    var save = (MR.store && MR.store.get) ? MR.store.get() : {};
    var p = {
      event: event,
      playerId: save.inviteCode || 'anon',
      nickname: (save.profile && save.profile.name) || '',
      sessionId: sessionId,
      lang: 'cn',
      v: window.MR_V || ''
    };
    if (data) { for (var k in data) { if (data[k] != null) p[k] = data[k]; } }
    send(p);
  };

  // 流失追踪：实时上报"当前在哪个界面"（lobby/opening/trading/recap）。每次切界面立即上报，不靠关页面事件，移动端也记得到。
  MR.markLoc = function (view, caseId) { if (MR.track) MR.track('exit', { view: view, caseId: caseId || '' }); };

  // 来源识别：?src= 参数 > 外部 referrer > 直访
  function trafficSource() {
    try {
      var m = location.search.match(/[?&]src=([^&]+)/);
      if (m) return decodeURIComponent(m[1]).slice(0, 24);
      if (document.referrer) {
        var host = document.referrer.split('/')[2] || '';
        if (host && host.indexOf(location.hostname) === -1) return 'ref:' + host.slice(0, 40);
      }
    } catch (err) { }
    return 'direct';
  }

  MR.track('pv', { source: trafficSource(), ua: (navigator.userAgent || '').slice(0, 150) });

  // 在线时长：可见时累计，切后台/关页时上报累计值（服务端按 sessionId 取最大值，不会重复累加）
  var activeSince = Date.now(), accumMs = 0;
  function reportSession() {
    if (accumMs > 1000) MR.track('session', { durationMs: accumMs });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      accumMs += Date.now() - activeSince;
      reportSession();
    } else {
      activeSince = Date.now();
    }
  });
  window.addEventListener('pagehide', function () {
    if (!document.hidden) { accumMs += Date.now() - activeSince; activeSince = Date.now(); }
    reportSession();
  });
})();
