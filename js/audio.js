/* 投资大师实战 · 心跳音频（Web Audio 合成，无外部资源）
 * BPM = 60 + 0.9 × 压力值；首次用户手势后激活；可静音
 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});

  function Heartbeat() {
    this.ctx = null;
    this.muted = false;
    this.enabled = false;
    this.paused = false;   // 行情暂停时心跳同步静默
    this.pressure = 0;
    this.timer = null;
  }

  Heartbeat.prototype.arm = function () {
    // 在首次触摸/点击时调用（微信需要手势解锁音频）
    if (this.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.enabled = true;
      this._loop();
    } catch (e) { /* 安静失败 */ }
  };

  Heartbeat.prototype._thump = function (when, freq, gainPeak) {
    var ctx = this.ctx;
    // 低频主体（沉闷的咚）
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.55), when + 0.09);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(gainPeak, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.13);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(when); osc.stop(when + 0.16);
    // 中频泛音层：手机小喇叭放不出 50Hz，靠这一层才听得见
    var osc2 = ctx.createOscillator();
    var gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 3, when);
    osc2.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 1.6), when + 0.08);
    gain2.gain.setValueAtTime(0.0001, when);
    gain2.gain.exponentialRampToValueAtTime(gainPeak * 0.55, when + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc2.start(when); osc2.stop(when + 0.14);
  };

  // 深呼吸音效（压力大时叠加）：深吸气(浅→深渐强) → 顶点停顿 → 缓呼气(深→浅渐弱)；
  // 带通塑出"气声"音色，吸气偏亮、呼气偏暖；音量≈心跳的一半（vol 传入心跳当前响度）
  Heartbeat.prototype._breath = function (when, vol) {
    var ctx = this.ctx;
    if (!ctx) return;
    try {
      var inhale = 3.0, hold = 0.25, exhale = 5.0, dur = inhale + hold + exhale + 0.3, sr = ctx.sampleRate;
      var buf = ctx.createBuffer(1, Math.floor(sr), sr);   // 1s 噪声循环，靠包络+滤波塑成呼吸（省内存）
      var d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(480, when);
      bp.frequency.linearRampToValueAtTime(1000, when + inhale);                        // 吸气：气声变亮
      bp.frequency.setValueAtTime(1000, when + inhale + hold);
      bp.frequency.linearRampToValueAtTime(260, when + inhale + hold + exhale);         // 呼气：气声下沉变暖
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
      var peak = Math.max(0.012, (vol || 0.5) * 0.4);   // ≈心跳一半（噪声听感偏响，取 0.4×）
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + inhale);                         // 深吸气 3 秒：浅→深
      g.gain.setValueAtTime(peak, when + inhale + hold);                                // 顶点停顿
      g.gain.exponentialRampToValueAtTime(0.0001, when + inhale + hold + exhale);       // 缓呼气 5 秒：深→浅
      src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(ctx.destination);
      src.start(when); src.stop(when + dur);
    } catch (e) {}
  };

  Heartbeat.prototype._loop = function () {
    var self = this;
    if (!this.enabled) return;
    var p = this.pressure;
    var bpm = 60 + 0.9 * p;
    var interval = 60000 / bpm;
    if (!this.muted && !this.paused && this.ctx && this.ctx.state === 'running') {
      var t = this.ctx.currentTime + 0.02;
      var vol = 0.08 + (p / 100) * 0.62;    // 建仓前静息也有一点点（≈0.14）；随仓位/压力增大而明显变响、bpm 也变快
      this._thump(t, 58, vol);              // lub
      this._thump(t + 0.18, 46, vol * 0.7); // dub
      // 深呼吸（心率>100 时叠加）：合成版听感像风声，已停用——待接入真人深呼吸录音素材后改为播放采样
      // if (bpm > 100) { ...this._breath(t + 0.05, vol)... }
    }
    this.timer = setTimeout(function () { self._loop(); }, interval);
  };

  Heartbeat.prototype.setPressure = function (p) { this.pressure = p; };
  Heartbeat.prototype.setMuted = function (m) { this.muted = m; };
  Heartbeat.prototype.setPaused = function (p) { this.paused = p; };
  Heartbeat.prototype.resume = function () {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };
  Heartbeat.prototype.stop = function () {
    this.enabled = false;
    if (this.timer) clearTimeout(this.timer);
  };

  MR.Heartbeat = Heartbeat;
})();
