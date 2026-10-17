/* 投资大师实战 · 装配层
 * 大厅 / 剧本加载 / 幕流程（场景→预判→盘面→幕间）/ 解锁与邀请 / 心跳激活
 */
(function () {
  'use strict';
  var MR = (window.MR = window.MR || {});
  var UI = MR.UI;
  var $ = function (id) { return document.getElementById(id); };
  var H = function () { return MR.UI._helpers; };

  /* ---------- 剧本清单 ---------- */
  /* cat: 'market'=市场风暴（全民事件） | 'master'=大师战役（经典案例） | 'annual'=A股每年复盘（年度大盘×行业轮动） | 'usannual'=美股每年复盘 | 'commodity'=商品年度全景（商品期货多品种多空轮动） */
  var CASES = [
    /* ===== 市场风暴 ===== */
    {
      id: 'a2015', dir: 'cases/a2015/', access: 'free', flagship: true, cat: 'market', year: '2015',
      title: '5178 · 股灾十一周年祭', era: '2015 · 中国A股',
      desc: '2015-06-12，上证 5178 见顶，正好十一周年。你是管理 3 亿的私募基金经理，疯牛、崩塌、千股跌停、黑色星期一——重活一遍那个夏天。',
      tags: ['旗舰', '杠杆', '千股跌停'], hot: true, meta: '36 个真实事件 · 真实行情', chip: '5178',
      invite: { kicker: '一 封 来 自 2015 的 邀 请 函', line1: '回到 5178 点', line2: '那一天', dateLine: '2015.6.12 → 2026.6.12，十一周年', hook: '重返 5178 顶点，看清股灾如何吞没所有人' }
    },
    {
      id: 'nasdaq2000', dir: 'cases/nasdaq2000/', access: 'free', cat: 'market', year: '2000', flagship: true,
      title: '对的太早 · 纳斯达克 2000', era: '1999-2000 · 华尔街',
      desc: '你看空互联网泡沫、做多被冷落的价值股——但整个市场与你为敌。做空被轧、净值暴跌、客户赎回——一场与全市场为敌、直到泡沫破裂才见分晓的孤独坚守。',
      tags: ['做空', '互联网泡沫', '赎回压力'], meta: '33 个真实事件 · 4 标的可双向 · 可做空', chip: '纳指',
      invite: { kicker: '一 封 来 自 2000 的 邀 请 函', posterTitle: '互联网泡沫', posterLead: '不管 AI 泡沫像不像 2000 年互联网泡沫，你都该搭乘人人复盘来体验一次', line1: '你看对了', line2: '却扛不住', dateLine: '2000.3.10 · 纳指 5048 见顶', hook: '不管 AI 泡沫像不像 2000 年互联网泡沫，你都该搭乘人人复盘来体验一次' }
    },
    {
      id: 'dj1929', dir: 'cases/dj1929/', access: 'paid', cat: 'market', year: '1929', master: 'livermore',
      avatar: 'assets/avatars/livermore.webp', masterName: '投机之王',
      title: '大崩盘 · 1929', era: '1929 · 纽约华尔街',
      desc: '你是投机之王本人。381 点的顶，全世界都在做多，你转身做空——单周赚 1 亿美元封神，但这个故事的结尾是一声枪响。',
      tags: ['做空', '大萧条', '世纪崩盘'], meta: '历史锚点复刻 · 可双向交易', chip: '1929',
      invite: { kicker: '一 封 来 自 1929 的 邀 请 函', line1: '做空', line2: '整个美国', dateLine: '1929.10.24 · 黑色星期四', hook: '全世界都在做多时，他独自转身' }
    },
    {
      id: 'silver1980', dir: 'cases/silver1980/', access: 'paid', cat: 'market', year: '1980',
      title: '白银惊魂 · 1980', era: '1979-1980 · 纽约商品交易所',
      desc: '亨特兄弟囤下半个地球的白银，6 美元逼到 50。然后交易所改了规则：只许卖，不许买。跟庄的人，见识了什么叫「赌场宣布筹码作废」。',
      tags: ['逼仓', '规则风险', '杠杆'], meta: '12 倍杠杆 · 可双向交易', chip: '白银',
      invite: { kicker: '一 封 来 自 1980 的 邀 请 函', line1: '只许卖', line2: '不许买', dateLine: '1980.3.27 · 白银星期四', hook: '庄家逼仓、规则突变——白银惊魂 48 小时' }
    },
    {
      id: 'spy2020', dir: 'cases/spy2020/', access: 'paid', cat: 'market', year: '2020',
      title: '熔断 · 2020', era: '2020 · 全球市场',
      desc: '你唯一亲历过的剧本。四次熔断、VIX 82、原油负价、无限 QE——这一次重来，你和当年的自己谁做得好？',
      tags: ['亲历者', '熔断', '美联储'], meta: '真实行情 · 可双向交易', chip: '2020',
      invite: { kicker: '一 封 来 自 2020 的 邀 请 函', line1: '四次熔断', line2: '你都亲历过', dateLine: '2020.3.16 · 单日 -12%', hook: '四次熔断重演，重温 2020 最惊魂的一季' }
    },
    {
      id: 'bigshort2008', dir: 'cases/bigshort2008/', access: 'invite', cat: 'market', year: '2008', flagship: true,
      title: '大空头 · 2008', era: '2007-2009 · 华尔街',
      desc: '次贷狂欢，所有人都在买。你独自看空——做空雷曼、AIG、做空大盘，扛着浮亏和投资者的怒火，坚守到雷曼倒下、真相兑现的那一天。',
      tags: ['做空', '次贷危机', '赎回压力'], meta: '34 个真实事件 · 4 标的可双向 · 可做空', chip: '2008',
      invite: { kicker: '一 封 来 自 大 崩 溃 前 夜 的 邀 请 函', line1: '所有人都在买', line2: '你独自做空', dateLine: '2008.9.15 · 雷曼倒下', hook: '悬崖边的狂欢里，他选择了逆势做空' }
    },
    /* ===== 人类二十大泡沫（新增） ===== */
    {
      id: 'nikkei1989', dir: 'cases/nikkei1989/', access: 'free', flagship: true, cat: 'market', year: '1989',
      title: '泡沫之巅 · 日本 1989', era: '1986-1992 · 东京',
      desc: '广场协议后日元升值、央行放水，地价与股市齐飞。日经向 39000 冲刺，没人愿意下车——然后是「失落的三十年」。',
      tags: ['资产泡沫', '失落三十年', '可做空'], meta: '真实日K · 可双向交易', chip: '日经',
      invite: { kicker: '一 封 来 自 1989 的 邀 请 函', posterTitle: '日经泡沫', posterLead: '人类史上最大的资产泡沫，重活一遍「卖掉东京可买下整个美国」的年代', hook: '人类史上最大的资产泡沫，你能在所有人疯狂时下车吗' }
    },
    {
      id: 'ashare2007', dir: 'cases/ashare2007/', access: 'free', flagship: true, cat: 'market', year: '2007',
      title: '6124 · 全民疯牛 2007', era: '2006-2008 · 中国A股',
      desc: '股改红利点燃史诗级大牛市，开户排长队、基金被抢光。上证向 6124 冲刺——这一年的尽头是万劫不复。A股不能做空，功课是知道何时离场。',
      tags: ['全民牛市', '股改', '6124'], hot: true, meta: '60 个真实事件 · 真实行情', chip: '6124',
      invite: { kicker: '一 封 来 自 2007 的 邀 请 函', posterTitle: '全民疯牛', posterLead: '和 2015 并列的国民级大牛市，重活一遍 6124 的疯狂与坠落', hook: '上证 6124 的全民疯牛，你知道什么时候该走吗' }
    },
    {
      id: 'oil2008', dir: 'cases/oil2008/', access: 'invite', cat: 'market', year: '2008',
      title: '石油的疯狂 · 2008', era: '2007-2009 · 纽约商品交易所',
      desc: '「中国需求」和「石油峰值」喊得最响时，原油从 50 美元向 147 狂奔，高盛喊 200。然后半年崩去三分之二。多空都能做。',
      tags: ['原油', '暴涨暴跌', '可做空'], meta: '53 个真实事件 · 可双向交易', chip: '原油',
      invite: { kicker: '一 封 来 自 2008 的 邀 请 函', posterTitle: '$147', posterLead: '高盛喊出 200 美元的那一年，原油在 147 见顶崩盘——多空一念之间', hook: '原油冲 147 又崩到 35，多空你怎么下注' }
    },
    {
      id: 'niftyfifty1973', dir: 'cases/niftyfifty1973/', access: 'invite', cat: 'market', year: '1973',
      title: '漂亮 50 的幻灭 · 1973', era: '1972-1974 · 华尔街',
      desc: '「漂亮 50」——那 50 家「只许买、不许卖」的伟大成长股托起一轮牛市，50 倍市盈率被认为理所当然。然后石油危机来了，标普腰斩。',
      tags: ['成长股', '抱团', '可做空'], meta: '65 个真实事件 · 可双向交易', chip: '漂亮50',
      invite: { kicker: '一 封 来 自 1973 的 邀 请 函', posterTitle: '漂亮50', posterLead: '「买入伟大公司永远持有」的信仰，如何在 1973 年崩塌', hook: '50 倍市盈率的「伟大公司」，腰斩套牢十年' }
    },
    {
      id: 'southsea1720', dir: 'cases/southsea1720/', access: 'invite', cat: 'market', year: '1720',
      title: '南海泡沫 · 1720', era: '1720 · 伦敦交易巷',
      desc: '南海公司「接管国债、垄断南美贸易」的故事让股价从 128 英镑向 1000 狂奔，连牛顿都栽了进去。人类金融史上最著名的泡沫。',
      tags: ['古典泡沫', '牛顿', '史料重构'], meta: '36 个真实史实 · 价格据史料锚点重构', chip: '南海',
      invite: { kicker: '一 封 来 自 1720 的 邀 请 函', posterTitle: '南海泡沫', posterLead: '「我能算出天体运行，却算不出人类的疯狂」——连牛顿都未能幸免', hook: '连牛顿都栽进去的世纪泡沫，你能全身而退吗' }
    },
    {
      id: 'mississippi1720', dir: 'cases/mississippi1720/', access: 'invite', cat: 'market', year: '1720',
      title: '密西西比泡沫 · 1720', era: '1719-1720 · 巴黎',
      desc: '约翰·劳用纸币和密西西比公司股票制造了人类第一场纸币泡沫，股价一年涨近 20 倍，「百万富翁」一词就此诞生——直到纸变回纸。',
      tags: ['古典泡沫', '约翰·劳', '史料重构'], meta: '36 个真实史实 · 价格据史料锚点重构', chip: '密西西比',
      invite: { kicker: '一 封 来 自 1720 的 邀 请 函', posterTitle: '纸币狂热', posterLead: '人类第一场纸币泡沫，约翰·劳的印钞机如何点石成金又灰飞烟灭', hook: '一年涨 20 倍的纸币狂热，你能在印钞机停下前离场吗' }
    },
    {
      id: 'tulip1637', dir: 'cases/tulip1637/', access: 'invite', cat: 'market', year: '1637',
      title: '郁金香狂热 · 1637', era: '1636-1637 · 荷兰',
      desc: '一颗稀有郁金香球茎能换一栋运河边的豪宅，酒馆里人人炒「风之交易」。人类史上第一场泡沫，1637 年 2 月会在几天内灰飞烟灭。',
      tags: ['古典泡沫', '人类第一泡沫', '史料重构'], meta: '34 个真实史实 · 价格据史料锚点重构', chip: '郁金香',
      invite: { kicker: '一 封 来 自 1637 的 邀 请 函', posterTitle: '郁金香狂热', posterLead: '人类史上第一场泡沫，一颗球茎换一栋房子的疯狂', hook: '一颗球茎换一栋房子，直到没人接盘' }
    },
    /* ===== 大师战役 ===== */
    /* ===== 期货大师剧本（新增·真实行情+史料重构）===== */
    {
      id: "iron2016", dir: "cases/iron2016/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "天道 · 铁矿石 2016", era: "2015-2016 · 大连商品交易所",
      desc: "全市场喊「经济硬着陆」、矿价跌破成本线时，傅天师反手重仓做多黑色。1 月信贷点火，4 月单边暴涨见顶。",
      tags: ["期货", "供给侧", "跌破成本"], meta: "15 个历史事件 · 供给侧黑色牛", chip: "铁矿石",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "282 元的大底", line2: "跌破成本的反击", dateLine: "2015-2016 · 黑色系绝地反弹", hook: "所有人都在卖、没人敢接的那个冬天" }
    },
    {
      id: "apple2018", dir: "cases/apple2018/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "天道 · 苹果 2018", era: "2018 · 郑州商品交易所",
      desc: "清明一场倒春寒，西北苹果减产约两成。傅天师赴产区实地核灾、连夜看多，盘面单边上行到年末。",
      tags: ["期货", "减产", "看供给"], meta: "22 个历史事件 · 霜冻减产", chip: "苹果",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "一场霜冻", line2: "吃掉两成苹果", dateLine: "2018 · 鲜果期货第一个大年", hook: "清明的那场冷空气、值多少钱" }
    },
    {
      id: "jujube2019", dir: "cases/jujube2019/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "天道 · 红枣 2019", era: "2019 · 郑州商品交易所",
      desc: "中国第一个干果期货上市，新疆减产预期与仓单稀缺叠加，盘面上市即冲高。预期与「秤」反复博弈的一年。",
      tags: ["期货", "新品种", "减产博弈"], meta: "26 个历史事件 · 新品种博弈", chip: "红枣",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "干果期货", line2: "开张第一年", dateLine: "2019 · 红枣上市元年", hook: "减产是嘴上的、新枣是秤上的" }
    },
    {
      id: "rubber2016", dir: "cases/rubber2016/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "天道 · 橡胶 2016", era: "2016-2017 · 上海期货交易所",
      desc: "胶价跌到成本附近、全产业链被套，傅天师从产区到轮胎厂双向调研后重仓做多，泰国抛储后止盈。",
      tags: ["期货", "农工双属性", "成本底"], meta: "18 个历史事件 · 成本底", chip: "橡胶",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "割胶人不割了", line2: "轮胎厂等着料", dateLine: "2016-2017 · 橡胶的成本底", hook: "跌到没人愿意割胶的时候" }
    },
    {
      id: "garlic2009", dir: "cases/garlic2009/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "天道 · 大蒜 2009", era: "2008-2010 · 山东金乡",
      desc: "金乡蒜价跌到五分一斤、低于成本，农民出身的傅天师驱车数万公里调研后重仓囤蒜。甲流一来，价格几个月翻数十倍。（价格据史料重构）",
      tags: ["现货", "成名战", "物极必反"], meta: "27 个真实史实 · 价格据史料重构", chip: "大蒜",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "五分钱一斤", line2: "到蒜你狠", dateLine: "2009 · 一个农民的成名战", hook: "没人要的烂蒜里、藏着一座金矿" }
    },
    {
      id: "copper2014", dir: "cases/copper2014/", access: 'paid', cat: 'master', master: "geweidong",
      avatar: "assets/avatars/geweidong.webp", masterName: "葛老大",
      title: "东方之狼 · 纽约铜 2014", era: "2014 · 上海期货交易所",
      desc: "超日债违约引爆「融资铜」抵押链断裂，葛老大识别铜从商品属性转为金融抵押品，先平多、再反手做空。",
      tags: ["期货", "做空", "信用违约"], meta: "18 个历史事件 · 铜属性切换", chip: "铜",
      invite: { kicker: "一 封 来 自 葛 老 大 的 邀 请 函", line1: "一笔债违约", line2: "砸塌一座铜山", dateLine: "2014 · 刚兑神话破裂之年", hook: "当铜不再是铜、而是抵押品" }
    },
    {
      id: "rebar2016s", dir: "cases/rebar2016s/", access: 'paid', cat: 'master', master: "geweidong",
      avatar: "assets/avatars/geweidong.webp", masterName: "葛老大",
      title: "逼空 · 螺纹钢 2016（东邪折戟）", era: "2016 · 上海期货交易所",
      desc: "供给侧黑色疯涨中逆势做空，被多头逼仓、流动性枯竭被迫砍仓——方向最终对了，却死在逼仓的途中。一则做空反面教材。",
      tags: ["期货", "做空", "逼仓"], meta: "15 个历史事件 · 做空反面教材", chip: "螺纹钢",
      invite: { kicker: "一 封 来 自 葛 老 大 的 邀 请 函", line1: "看对了方向", line2: "却死在半路", dateLine: "2016 · 南帝东邪的对决", hook: "逼空里、对错不由你结算" }
    },
    {
      id: "rubber2009", dir: "cases/rubber2009/", access: 'paid', cat: 'master', master: "geweidong",
      avatar: "assets/avatars/geweidong.webp", masterName: "葛老大",
      title: "胶链 · 橡胶 2009", era: "2008-2011 · 上海期货交易所",
      desc: "金融危机把沪胶砸到 8650 的危机底，四万亿与汽车爆发点燃需求，一路涨到 43500 的历史天价。危机底敢不敢重仓、加速段拿不拿得住。",
      tags: ["期货", "危机底", "顺周期"], meta: "22 个历史事件 · 顺周期五年", chip: "橡胶",
      invite: { kicker: "一 封 来 自 葛 老 大 的 邀 请 函", line1: "8650 的废墟", line2: "到 43500 的天价", dateLine: "2008-2011 · 危机底的五年", hook: "别人恐惧时、你敢重仓吗" }
    },
    {
      id: "soybean2004", dir: "cases/soybean2004/", access: 'paid', cat: 'master', master: "geweidong",
      avatar: "assets/avatars/geweidong.webp", masterName: "葛老大",
      title: "大豆地震 · 2004", era: "2003-2004 · 大连商品交易所",
      desc: "干旱炒作把大豆推上 4100 的历史顶，采购团高位签下百万吨大单——随后基金反手做空，大豆地震、压榨厂成片爆仓。（价格据史料重构）",
      tags: ["期货", "逼空崩盘", "爆仓"], meta: "19 个真实史实 · 价格据史料重构", chip: "大豆",
      invite: { kicker: "一 封 来 自 那 个 时 代 的 邀 请 函", line1: "4100 的顶", line2: "一场大豆地震", dateLine: "2003-2004 · 农产品史最惨一役", hook: "在最疯狂的高位、谁在接最后一棒" }
    },
    {
      id: "jiao2016", dir: "cases/jiao2016/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "天道 · 焦炭 2016", era: "2016 · 大连商品交易所",
      desc: "煤矿半年发不出工资、焦炭跌到「白送价」，傅天师在政策限产+跌破成本+去库三杀里重仓做多，全年近四倍。",
      tags: ["期货", "供给侧", "限产"], meta: "22 个历史事件 · 供给侧黑色牛", chip: "焦炭",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "白送的焦炭", line2: "到四倍的牛", dateLine: "2016 · 276 个工作日", hook: "跌到不要钱、就是天道攒力气" }
    },
    {
      id: "corn2016", dir: "cases/corn2016/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "止损 · 玉米 2016-17", era: "2015-2017 · 大连商品交易所",
      desc: "取消临储后玉米单边下跌、傅天师做空获利；2017 春节后实地调研却发现减产，于是果断把空单止损离场——一堂「割得掉」的课。",
      tags: ["期货", "做空", "止损"], meta: "17 个历史事件 · 调研止损", chip: "玉米",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "开车去产区", line2: "发现货没了", dateLine: "2015-2017 · 临储退场之后", hook: "看错不可怕、割得掉才是本事" }
    },
    {
      id: "egg2017", dir: "cases/egg2017/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "天道 · 鸡蛋 2017", era: "2017 · 大连商品交易所",
      desc: "蛋价跌到十年新低、养殖深亏，傅天师按兵不动；直到调研发现存栏暴跌、「走三个村装不满一车」，才确认供应实塌、满仓做多。",
      tags: ["期货", "去产能", "看供给"], meta: "22 个历史事件 · 存栏暴跌反转", chip: "鸡蛋",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "走三个村", line2: "装不满一车", dateLine: "2017 · 鸡蛋的至暗与反转", hook: "生产端亏到没人干时、机会才来" }
    },
    {
      id: "sugar2016", dir: "cases/sugar2016/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "能力圈 · 白糖 2014-16", era: "2014-2017 · 郑州商品交易所",
      desc: "白糖走出 4500→7000+ 的大牛市，傅天师却一手不碰：政策垄断、收放储双向打脸的品种，「没有优势就不做」。看而不做的一课。",
      tags: ["期货", "能力圈", "克制"], meta: "23 个历史事件 · 看而不做", chip: "白糖",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "看得见的牛市", line2: "偏偏不出手", dateLine: "2014-2017 · 能力圈的边界", hook: "没有优势的仗、最好的打法是不打" }
    },
    {
      id: "meal2012", dir: "cases/meal2012/", access: 'paid', cat: 'master', master: "fuhaitang",
      avatar: "assets/avatars/fuhaitang.webp", masterName: "傅天师",
      title: "天道 · 豆粕 2012", era: "2011-2012 · 大连商品交易所",
      desc: "拉尼娜确认南美减产、生猪存栏高位，傅天师重仓做多豆粕。震荡市里反复加仓、对锁、纠错——利润 5000 万到 8000 万再回吐的真实波动。",
      tags: ["期货", "基本面", "震荡市"], meta: "16 个历史事件 · 震荡反复纠错", chip: "豆粕",
      invite: { kicker: "一 封 来 自 傅 天 师 的 邀 请 函", line1: "南美的旱", line2: "北方的猪", dateLine: "2011-2012 · 豆粕的天道之年", hook: "基本面定方向、过程全是纠错" }
    },
    {
      id: 'netease2002', dir: 'cases/netease2002/', access: 'free', cat: 'master', master: 'duanyongping',
      avatar: 'assets/avatars/duanyongping.webp', masterName: '大道',
      title: '暗夜独行 · 网易 2002', era: '2001-2003 · 纳斯达克',
      desc: '互联网泡沫废墟上，一只 0.95 美元的退市边缘股。阿段看到了账上现金比市值还多——一笔教科书级的逆向重仓。',
      tags: ['价值投资', '逆向', '十倍股'], meta: '871 根真实日K', chip: '网易',
      invite: { kicker: '一 封 来 自 大 道 的 邀 请 函', line1: '0.95 美元', line2: '的网易', dateLine: '2001 · 全市场叫它垃圾股', hook: '账上现金比市值还多——被遗弃的网易' }
    },
    {
      id: 'wapo1973', dir: 'cases/wapo1973/', access: 'free', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神',
      title: '奥马哈来信 · 华盛顿邮报 1973', era: '1973-1975 · 纽约证交所',
      desc: '石油危机 + 水门事件，道指腰斩。巴老却在买报纸——一份市值只有内在价值四分之一的报纸。',
      tags: ['安全边际', '熊市', '逆向'], meta: '历史锚点复刻', chip: '华邮',
      invite: { kicker: '一 封 来 自 奥 马 哈 的 邀 请 函', line1: '两毛五', line2: '买一块钱', dateLine: '1973 · 道指腰斩之年', hook: '跟巴老买入，先承受 25% 浮亏的考验' }
    },
    {
      id: 'cotton2010', dir: 'cases/cotton2010/', access: 'invite', cat: 'master', master: 'fuhaitang',
      avatar: 'assets/avatars/fuhaitang.webp', masterName: '傅天师',
      title: '天道 · 棉花 2010', era: '2010-2011 · 郑州商品交易所',
      desc: '农民出身的傅天师在新疆棉田里数棉桃，断定供需缺口巨大。一年，600 万变 10 亿。期货首秀：保证金、杠杆、逼仓。',
      tags: ['期货', '供需', '逼仓'], meta: '35 个真实事件 · 10 倍杠杆', chip: '棉花',
      invite: { kicker: '一 封 来 自 傅 天 师 的 邀 请 函', line1: '600 万', line2: '到 10 亿', dateLine: '2010 · 棉花的天道之年', hook: '新疆棉田里数出来的一波大行情' }
    },
    {
      id: 'rebar2016', dir: 'cases/rebar2016/', access: 'paid', cat: 'master', master: 'geweidong',
      avatar: 'assets/avatars/geweidong.webp', masterName: '葛老大',
      title: '出清 · 螺纹钢 2016', era: '2015-2016 · 上海期货交易所',
      desc: '钢厂半数停产，一吨钢的利润买不起一瓶矿泉水。1556 元的历史大底重仓做多——供给侧出清后的一场暴力反弹。',
      tags: ['期货', '周期底部', '供给侧'], meta: '32 个真实事件 · 真实期货行情', chip: '螺纹钢',
      invite: { kicker: '一 封 来 自 葛 老 大 的 邀 请 函', line1: '1556 元', line2: '历史大底', dateLine: '2016 · 钢铁行业濒死之年', hook: '全行业亏损时的逆势满仓一役' }
    },
    {
      id: 'byd2008', dir: 'cases/byd2008/', access: 'paid', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神 × 查理',
      title: '八块钱的未来 · 比亚迪 2008', era: '2008-2010 · 港交所',
      desc: '金融危机最深处，比亚迪从 52 港元跌到 6 块。然后巴老出手了：8 港元，2.25 亿股。你抄他的作业，能拿住几个月？',
      tags: ['危机', '十倍股', '抄作业'], meta: '真实行情（港股）', chip: '比亚迪',
      invite: { kicker: '一 封 来 自 股 神 的 邀 请 函', line1: '八块钱', line2: '的比亚迪', dateLine: '2008.9.27 · 巴老出手', hook: '股神八块钱抄底比亚迪的那一刻' }
    },
    {
      id: 'ko1988', dir: 'cases/ko1988/', access: 'paid', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神',
      title: '废墟上的可乐 · 1988', era: '1986-1990 · 纽约证交所',
      desc: '1987 黑色星期一可乐单日 -25%。巴老没接飞刀——他等了整整一年，然后买成伯克希尔史上最大持仓。耐心比勇气更稀缺。',
      tags: ['护城河', '黑色星期一', '耐心'], meta: '真实行情 · 含 1987 崩盘日', chip: '可乐',
      invite: { kicker: '一 封 来 自 奥 马 哈 的 邀 请 函', line1: '废墟上', line2: '的可乐', dateLine: '1987.10.19 · 单日 -25%', hook: '他等了整整一年，才出手买入可乐' }
    },
    {
      id: 'gbp1992', dir: 'cases/gbp1992/', access: 'paid', cat: 'master', master: 'soros',
      avatar: 'assets/avatars/soros.webp', masterName: '狙击巨鳄',
      title: '狙击英镑 · 1992', era: '1992 · 伦敦外汇市场',
      desc: '你在量子基金的交易桌上，对手是英格兰银行。输了亏 1%，赢了赚 20%——老索说：直捣咽喉（Go for the jugular）。',
      tags: ['外汇', '不对称下注', '宏观'], meta: '32 个真实事件 · 历史锚点复刻', chip: '英镑',
      invite: { kicker: '一 封 来 自 量 子 基 金 的 邀 请 函', line1: '对手是', line2: '英格兰银行', dateLine: '1992.9.16 · 黑色星期三', hook: '输了亏 1%、赢了赚 20% 的不对称一役' }
    },
    {
      id: 'asia1997', dir: 'cases/asia1997/', access: 'paid', cat: 'master', master: 'soros',
      avatar: 'assets/avatars/soros.webp', masterName: '狙击巨鳄',
      title: '亚洲风暴 · 1997', era: '1997-1998 · 曼谷 → 香港',
      desc: '上半场：做空泰铢，一战封神。下半场：转战香港，对手换成了一个不缺美元、还能改规则的政府。同一招打第二次，对面已经读过你的剧本。',
      tags: ['外汇', '双战场', '官鳄对决'], meta: '泰铢+恒指双标的 · 可双向交易', chip: '泰铢',
      invite: { kicker: '一 封 来 自 量 子 基 金 的 邀 请 函', line1: '赢了曼谷', line2: '别输在香港', dateLine: '1998.8.28 · 790 亿决战日', hook: '大鳄的双线剧本：赢了曼谷，别输在香港' }
    },
    {
      id: 'wmt1985', dir: 'cases/wmt1985/', access: 'invite', cat: 'master', master: 'lynch',
      avatar: 'assets/avatars/lynch.webp', masterName: '老林',
      title: '翻石头 · 沃尔玛 1985', era: '1985-1995 · 纽约证交所',
      desc: '一家偏居阿肯色的折扣零售店，没人看得上。老林翻石头翻到它——用 PEG 0.6 买入，看着它把成功复制到全美，十年涨成十六倍。耐心拿住十倍股，比抓涨停难得多。',
      tags: ['成长股', '十倍股', '长期持有'], meta: '30 个真实事件 · 真实行情（美股10年） · 可做空', chip: '沃尔玛',
      invite: { kicker: '一 封 来 自 麦 哲 伦 基 金 的 邀 请 函', line1: '没人看上的', line2: '区域小店', dateLine: '1985 · 翻到的那块石头', hook: '一只十倍股，与十年持有的考验' }
    },
    {
      id: 'graham_geico1948', dir: 'cases/graham_geico1948/', access: 'invite', cat: 'master', master: 'graham',
      avatar: 'assets/avatars/graham.webp', masterName: '祖师爷',
      title: '祖师爷的保险课 · GEICO 1948', era: '1948-1972 · 纽约',
      desc: '价值投资祖师爷违反了自己「分散」的铁律，把基金四分之一押在一家小车险公司上。这笔「不该下的重注」，后来赚的钱超过他其它所有投资的总和。',
      tags: ['安全边际', '集中持仓', '复利'], meta: '30 个真实事件 · 真实行情（24年） · 可做空', chip: 'GEICO',
      invite: { kicker: '一 封 来 自 价 值 投 资 之 父 的 邀 请 函', line1: '违反铁律的', line2: '那一注', dateLine: '1948 · 祖师爷的重仓', hook: '把四分之一身家押向一只小保险股' }
    },
    {
      id: 'dalio1987', dir: 'cases/dalio1987/', access: 'invite', cat: 'master', master: 'dalio',
      avatar: 'assets/avatars/dalio.webp', masterName: '全天候',
      title: '黑色星期一 · 1987', era: '1987 · 华尔街',
      desc: '程序化交易把市场推上天，也能一天打回原形。1987-10-19，道指单日 -22.6%。你是桥水的宏观交易员，债务周期告诉你危险——但你扛得住、对得起这份判断吗？',
      tags: ['宏观对冲', '黑色星期一', '债务周期'], meta: '28 个真实事件 · 可双向 · 可做空', chip: '1987',
      invite: { kicker: '一 封 来 自 桥 水 的 邀 请 函', line1: '一天', line2: '跌掉 22%', dateLine: '1987.10.19 · 黑色星期一', hook: '程序化交易制造的雪崩，如何站对边' }
    }
,
    /* ===== web-demo 转换（自动生成）===== */
    {
      id: 'buffett_1964_axp', dir: 'cases/buffett_1964_axp/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '美国运通 · 巴菲特 1964 沙拉油丑闻', era: '1963 · 纽约证交所',
      desc: '一桩仓库欺诈震动华尔街, 全美最大支票发行商被起诉, 股价四个月腰斩',
      tags: ['危机反转', '集中持股', '护城河'], meta: '真实行情 · 可做空', chip: '1964',
      invite: { kicker: '一 封 来 自 1963 的 邀 请 函', line1: '1963年秋，华尔街的电报机嘀嘀作响——美国运通深陷沙拉油仓储欺诈丑闻，被追索赔偿金额高达一亿五千万美元，四个月内股价从62美元雪崩至35美元，恐慌像瘟疫一样蔓延整个金融街。', line2: '而在奥马哈，一个33岁的年轻合伙人穿梭于街角餐馆和杂货店之间，悄悄观察着每一个掏出绿色卡片的顾客——他看到了别人看不见的东西，正准备做出一个将改变其职业生涯的集中下注。', dateLine: '1963', hook: '用四成身家买下华尔街的恐慌' }
    }
,
    /* ===== web-demo 转换（自动生成）===== */
    {
      id: 'livermore_1907', dir: 'cases/livermore_1907/', access: 'invite', cat: 'master', master: 'livermore',
      avatar: 'assets/avatars/livermore.webp', masterName: '投机之王',
      title: '银行业恐慌 · 利弗莫尔 1907 做空成名', era: '1907 · 纽约华尔街',
      desc: '一场华尔街银行业恐慌, 一个 30 岁年轻人 1 个月赚 100 万 (今天 3000 万)',
      tags: ['做空', '宏观博弈', '趋势跟踪'], meta: '真实行情 · 可做空', chip: '1907',
      invite: { kicker: '一 封 来 自 1907 的 邀 请 函', line1: '1907年秋，华尔街的空气里弥漫着恐惧的气息——银行挤兑的人龙绵延数条街区，信托公司一夜之间关门倒闭，整个金融体系像被抽掉支柱的大厦，轰然颤抖。', line2: '而一个30岁的年轻投机者，却在众人夺路而逃之际，悄然转身，举起了做空的旗帜——他看见的不是灾难，而是一条清晰得令人战栗的下行轨道。', dateLine: '1907', hook: '恐慌蔓延时重仓做空' }
    },
    {
      id: 'templeton_1939_100stocks', dir: 'cases/templeton_1939_100stocks/', access: 'invite', cat: 'master', master: 'templeton',
      avatar: 'assets/avatars/templeton.webp', masterName: '爵士',
      title: '二战开打 · 邓普顿 1939 借万元买百股', era: '1939 · 纽约证交所',
      desc: '德国入侵波兰当天, 一个 26 岁年轻人借 1 万美元在 NYSE 上买所有 $1 以下股票',
      tags: ['逆向投资', '危机反转', '宏观博弈'], meta: '真实行情 · 可做空', chip: '1939',
      invite: { kicker: '一 封 来 自 1939 的 邀 请 函', line1: '1939年9月，纳粹铁蹄踏入波兰，战火点燃欧洲。纽约证交所哀鸿遍野，股价如石沉大海，所有人都在疯狂抛售，没有人知道这场战争会把世界带向何处。', line2: '一个26岁的年轻人站在交易所门口，口袋里揣着借来的一万美元，盯着那张满是一美元以下残票的清单——他看到的不是末日，而是一生一次的机会。', dateLine: '1939', hook: '借钱买百只濒死股' }
    },
    {
      id: 'lynch_1973_hanes', dir: 'cases/lynch_1973_hanes/', access: 'invite', cat: 'master', master: 'lynch',
      avatar: 'assets/avatars/lynch.webp', masterName: '老林',
      title: '内裤股 Hanes · 林奇 1973', era: '1973 · 纽约证交所',
      desc: '一家妇女连裤袜公司, 林奇老婆超市发现"鸡蛋盒"包装',
      tags: ['成长发现', '价值发现', '消费洞察'], meta: '真实行情 · 可做空', chip: '1973',
      invite: { kicker: '一 封 来 自 1973 的 邀 请 函', line1: '1973年，石油危机引爆股市崩盘，道琼斯指数腰斩，华尔街精英们在数据和模型里找寻救命稻草，整个市场弥漫着绝望与恐慌的气息。', line2: '而有一个年轻的基金经理，注意到了妻子购物袋里一只印着鸡蛋盒图案的连裤袜——他即将用一次超市偶遇，完成一次教科书级别的成长股发现。', dateLine: '1973', hook: '老婆超市一停，十倍股现形' }
    },
    {
      id: 'buffett_1976_geico', dir: 'cases/buffett_1976_geico/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '盖可保险 · 巴菲特 1976 救援', era: '1976 · 纽约证交所',
      desc: '一家保险公司从全美第七大跌到濒临破产, $61 → $2',
      tags: ['困境反转', '护城河', '逆向投资'], meta: '真实行情 · 可做空', chip: '1976',
      invite: { kicker: '一 封 来 自 1976 的 邀 请 函', line1: '1976年，美国股市刚从石油危机的阴影中踉跄站起，通胀高企、利率飙升，华尔街人心惶惶。曾经风光无限的盖可保险从全美第七大保险公司急坠至破产边缘，股价从61美元暴跌至2美元，无数分析师已为它写好了讣告。', line2: '然而，奥马哈有一个人正在反复翻阅那份被人扔进垃圾桶的年报，他看到的不是一具尸体，而是一条被泥沙掩埋却依然流淌的护城河——当所有人在逃命，他在计算这场可以修复的错误究竟值多少钱。', dateLine: '1976', hook: '以2美元买回61美元的护城河' }
    },
    {
      id: 'lynch_1980_taco', dir: 'cases/lynch_1980_taco/', access: 'invite', cat: 'master', master: 'lynch',
      avatar: 'assets/avatars/lynch.webp', masterName: '老林',
      title: '塔可钟 Taco Bell · 林奇 1980', era: '1980 · 纽约证交所',
      desc: '加州 50 家店的小型墨西哥快餐连锁, 林奇出差排队时发现',
      tags: ['成长发现', '价值发现', '护城河'], meta: '真实行情 · 可做空', chip: '1980',
      invite: { kicker: '一 封 来 自 1980 的 邀 请 函', line1: '1980年，美国通胀肆虐、利率飙至20%，华尔街人心惶惶，资金疯狂逃离股市。所有人都盯着美联储的每一句话，没有人愿意为一家卖玉米卷饼的小连锁店多看一眼。', line2: '但有一个基金经理在加州出差时，排队买了一份塔可钟，然后放下托盘，掏出笔记本开始计算——50家店的翻台率、客单价、店面租金。他看到的不是午饭，是接下来六年的16倍回报。', dateLine: '1980', hook: '出差排队，发现连锁复制的印钞机' }
    },
    {
      id: 'lynch_1982_chrysler', dir: 'cases/lynch_1982_chrysler/', access: 'invite', cat: 'master', master: 'lynch',
      avatar: 'assets/avatars/lynch.webp', masterName: '老林',
      title: '克莱斯勒 · 林奇 1982 危机救援', era: '1982 · 纽约证交所',
      desc: '美国第三大汽车公司距破产一步, 国会刚通过 $15 亿担保',
      tags: ['困境反转', '集中持股', '逆向投资'], meta: '真实行情 · 可做空', chip: '1982',
      invite: { kicker: '一 封 来 自 1982 的 邀 请 函', line1: '1982年，美国制造业的心脏正在停跳。克莱斯勒——这个曾经的工业帝国——欠下40亿美元债务，底特律的工厂停产，华尔街的机构投资者早已把它列入禁买名单。', line2: '但麦哲伦基金的那个年轻经理，正悄悄翻阅K-Car的销售数据和国会担保协议的细节，他看到了一个机构规则逼着别人视而不见的窗口——', dateLine: '1982', hook: '押注机构不能碰的救援股' }
    },
    {
      id: 'lynch_1985_fnma', dir: 'cases/lynch_1985_fnma/', access: 'invite', cat: 'master', master: 'lynch',
      avatar: 'assets/avatars/lynch.webp', masterName: '老林',
      title: '房利美 Fannie Mae · 林奇 1985 长期复利', era: '1985 · 纽约证交所',
      desc: '美国按揭龙头, 利率敏感, 1980 高利率时几乎破产',
      tags: ['困境反转', '成长发现', '护城河'], meta: '真实行情 · 可做空', chip: '1985',
      invite: { kicker: '一 封 来 自 1985 的 邀 请 函', line1: '1985年的华尔街，联储刚刚结束那场残酷的高利率战争——整整五年，30年期按揭利率从未低于13%，无数储贷机构已经倒在血泊里，房利美更是在破产边缘徘徊了整整两年。', line2: '就在所有人还在数房利美的伤口时，波士顿有个基金经理悄悄看完了它全部的财务报告，他发现了一件任何人都没有注意到的事——这头濒死的猛兽，正在悄悄长出新的牙齿。', dateLine: '1985', hook: '死而复生时重仓按揭龙头' }
    },
    {
      id: 'soros_1985_plaza', dir: 'cases/soros_1985_plaza/', access: 'invite', cat: 'master', master: 'soros',
      avatar: 'assets/avatars/soros.webp', masterName: '老索',
      title: '广场协议 · 索罗斯 1985 做空美元', era: '1985 · 伦敦外汇市场',
      desc: '5 国财长在纽约广场酒店秘密开会, 一夜之间美元走完它的强势周期',
      tags: ['反身性', '宏观博弈', '趋势跟踪'], meta: '真实行情 · 可做空', chip: '1985',
      invite: { kicker: '一 封 来 自 1985 的 邀 请 函', line1: '1985年，里根时代的强势美元已让欧洲出口商苦不堪言，美国贸易逆差创下历史新高，全球经济失衡到了临界点，一场秘密会议正在酝酿，将彻底改写货币史。', line2: '当五国财长在广场饭店关上那扇门的瞬间，索罗斯已经看穿了接下来将要发生的一切——不是靠内幕消息，而是靠一套别人都不懂的思维框架。', dateLine: '1985', hook: '用反身性押注美元崩塌' }
    },
    {
      id: 'buffett_1989_usair', dir: 'cases/buffett_1989_usair/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '全美航空 · 巴菲特 1989 优先股 (失败)', era: '1989 · 纽约证交所',
      desc: '美国第六大航空公司, 巴菲特 3.58 亿美元买 9.25% 累计优先股',
      tags: ['优先股', '困境反转', '逆向投资'], meta: '真实行情 · 可做空', chip: '1989',
      invite: { kicker: '一 封 来 自 1989 的 邀 请 函', line1: '1989年，美国航空业正站在悬崖边上——油价波动、工会罢工、机票价格战，每一家航空公司都像在用别人的油箱飞自己的飞机，行业性亏损让华尔街闻风丧胆。', line2: '就在所有人逃离航空股的时候，一份精心设计的优先股合同悄然落笔——9.25%的固定回报、优先清偿权，这不是赌博，这是用法律条款把风险关进笼子里。', dateLine: '1989', hook: '用合同锁定利息、优先股护身入危局' }
    },
    {
      id: 'buffett_1990_wfc', dir: 'cases/buffett_1990_wfc/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '富国银行 · 巴菲特 1990', era: '1990 · 纽约证交所',
      desc: '加州房地产泡沫破裂, 西海岸最大银行半年腰斩',
      tags: ['逆向投资', '危机反转', '护城河'], meta: '真实行情 · 可做空', chip: '1990',
      invite: { kicker: '一 封 来 自 1990 的 邀 请 函', line1: '1990年，加州房地产的泡沫正在崩塌。西海岸最大的银行富国银行股价半年内腰斩，华尔街分析师纷纷预言银行业将遭遇系统性崩溃，坏账的噩梦笼罩着每一个持有金融股的人。', line2: '就在恐慌最深处，奥马哈有一个人悄悄地打开了账户，开始以极低的价格大量买入。他看到的不是危机，而是一张被低估的护城河——而你，能看到他看到的那张底牌吗？', dateLine: '1990', hook: '以半价买入西海岸最强银行' }
    },
    {
      id: 'templeton_1999_tech', dir: 'cases/templeton_1999_tech/', access: 'invite', cat: 'master', master: 'templeton',
      avatar: 'assets/avatars/templeton.webp', masterName: '爵士',
      title: '互联网泡沫 · 邓普顿 1999 做空科技股', era: '1999 · 纽约证交所',
      desc: '所有人都在买 Cisco / Yahoo, 一个 87 岁的老人把 NDX 做空',
      tags: ['做空', '逆向投资', '套利'], meta: '真实行情 · 可做空', chip: '1999',
      invite: { kicker: '一 封 来 自 1999 的 邀 请 函', line1: '1999年，纳斯达克的钟声敲响了一个又一个新高，华尔街的每一个人都在谈论"新经济"，Cisco市值超越微软，Yahoo股价一年翻了十倍，贪婪的气息弥漫在每一个交易大厅。', line2: '而一位87岁的老人，在巴哈马群岛的书房里，翻开了一份又一份IPO招股书，用铅笔划出那个被所有人忽视的日期——解禁日，那是他看见的，史上最确定的一次下跌。', dateLine: '1999', hook: '掐准解禁日，做空84只科技股' }
    },
    {
      id: 'druck_2000_tech', dir: 'cases/druck_2000_tech/', access: 'invite', cat: 'master', master: 'druckenmiller',
      avatar: 'assets/avatars/druckenmiller.webp', masterName: '老德',
      title: '互联网泡沫顶部 · 德拉肯米勒 2000 (失败案例)', era: '1999 · 芝加哥期货交易所',
      desc: '30 年无亏损年的人, 在顶部加仓 60 亿美元一周亏 30 亿',
      tags: ['明知顶部加仓', '情绪覆盖理性', '宏观博弈'], meta: '真实行情 · 可做空', chip: '2000',
      invite: { kicker: '一 封 来 自 1999 的 邀 请 函', line1: '1999年末，纳斯达克像一台永动机，每周都有公司名字加上".com"后股价翻倍，整个华尔街弥漫着一种癫狂的确定感——错过就是失败者。', line2: '你手握30年零亏损的传奇战绩，你比任何人都清楚这是泡沫，但市场还在涨，你的对手还在赚——那个致命的念头开始生长：再赢一次。', dateLine: '1999', hook: '明知泡沫顶部仍重仓60亿' }
    },
    {
      id: 'buffett_2003_ptr', dir: 'cases/buffett_2003_ptr/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '中石油 H 股 · 巴菲特 2003', era: '2003 · 香港联交所',
      desc: 'SARS 阴影下, 港股一片狼藉. 一家中国国企的 250 页年报',
      tags: ['资产清算', '逆向投资', '价值发现'], meta: '真实行情 · 可做空', chip: '2003',
      invite: { kicker: '一 封 来 自 2003 的 邀 请 函', line1: '2003年春，SARS病毒笼罩香港，恒生指数暴跌，交易厅几乎空无一人。外资争相撤离，"中国风险"四个字成了港股的死亡标签，整个市场弥漫着一种末日般的恐慌气息。', line2: '就在这片狼藉之中，一份厚达250页的中国国企年报悄悄落在某位老人的书桌上。他翻开第一页，嘴角微微上扬——那些被市场遗忘在地下的数字，正在向他招手。', dateLine: '2003', hook: '以半价买下地下的油田' }
    },
    {
      id: 'buffett_2008_gs', dir: 'cases/buffett_2008_gs/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '高盛 · 巴菲特 2008', era: '2008 · 纽约证交所',
      desc: '雷曼倒下后的第 8 天, 一通深夜电话',
      tags: ['危机反转', '逆向投资', '优先股'], meta: '真实行情 · 可做空', chip: '2008',
      invite: { kicker: '一 封 来 自 2008 的 邀 请 函', line1: '2008年9月23日，雷曼倒下第八天，华尔街陷入世纪恐慌——银行股腰斩、信贷市场冻结、每一个交易员都在抛售，没有人知道下一个倒下的会是谁。', line2: '就在这个深夜，奥马哈的电话铃声响起——一个老人准备用五十亿美元，告诉全世界他对美国的判断，而那个判断将让所有人重新定义"危机"的含义。', dateLine: '2008', hook: '深夜接线，五十亿押注濒死巨头' }
    },
    {
      id: 'dalio_2008_crisis', dir: 'cases/dalio_2008_crisis/', access: 'invite', cat: 'master', master: 'dalio',
      avatar: 'assets/avatars/dalio.webp', masterName: '全天候',
      title: '金融危机 · 达里奥 2008 提前预警', era: '2007 · 芝加哥期货交易所',
      desc: '雷曼倒下前 2 年, 达里奥写了内部分析"我们都死定了"',
      tags: ['宏观博弈', '危机反转', '去杠杆预判'], meta: '真实行情 · 可做空', chip: '2008',
      invite: { kicker: '一 封 来 自 2007 的 邀 请 函', line1: '2007年，华尔街的香槟还没凉，CDO和MBS的销售额已破历史纪录——没有人想听"次贷泡沫"这四个字，说这话的人被称为疯子或者空头。', line2: '而有一个人，已经在内部备忘录里写下"历史上每一次超级杠杆周期的终结，都是一场至少十年的慢性清算"——他不打算逃跑，他打算精确地活过去。', dateLine: '2007', hook: '提前两年建模押注去杠杆周期' }
    },
    {
      id: 'buffett_2011_bac', dir: 'cases/buffett_2011_bac/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '美国银行 · 巴菲特 2011', era: '2011 · 纽约证交所',
      desc: '美国最大零售银行, 美国按揭危机后业务在重建. 一通泡澡时打来的电话',
      tags: ['困境反转', '优先股', '逆向投资'], meta: '真实行情 · 可做空', chip: '2011',
      invite: { kicker: '一 封 来 自 2011 的 邀 请 函', line1: '2011年夏，美国银行股价从历史高位腰斩至7美元——次贷诉讼、坏账缠身、媒体每天都在预言美国最大零售银行将要崩塌，华尔街弥漫着比雷曼时代更深的恐惧。', line2: '而一位81岁的老人，在浴缸里拨出了那通改变一切的电话——他看到的不是即将沉没的巨轮，而是被恐慌错误标价的8000万美国储户和无可替代的零售存款护城河。', dateLine: '2011', hook: '泡澡时打出50亿美元' }
    },
    {
      id: 'buffett_2011_ibm', dir: 'cases/buffett_2011_ibm/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '国际商业机器 · 巴菲特 2011 (失败案例)', era: '2011 · 纽约证交所',
      desc: '巴菲特一辈子说自己不懂科技股, 这次他用 109 亿美元买了一家百年老 IT 公司',
      tags: ['护城河', '价值发现', '困境反转'], meta: '真实行情 · 可做空', chip: '2011',
      invite: { kicker: '一 封 来 自 2011 的 邀 请 函', line1: '2011年，金融危机的余震未散，美国股市在债务上限危机中剧烈震荡，"去风险化"成为华尔街关键词，机构投资者纷纷抛售科技板块，百年 IT 巨头 IBM 股价在恐慌中悄然沉底。', line2: '就在所有人回避科技股的时候，那位自称"看不懂科技"的老人，花了整整一年暗中建仓 109 亿美元——他说自己看懂了护城河，却不知道这道墙正在被一朵"云"悄悄溶解。', dateLine: '2011', hook: '以百年老店押注切换成本' }
    },
    {
      id: 'soros_2013_jpy', dir: 'cases/soros_2013_jpy/', access: 'invite', cat: 'master', master: 'soros',
      avatar: 'assets/avatars/soros.webp', masterName: '老索',
      title: '安倍经济学 · 索罗斯 2013 做空日元', era: '2012 · 伦敦外汇市场',
      desc: '一个 56 岁的政客发誓"无限印钞", 索罗斯 83 岁还出手',
      tags: ['宏观博弈', '趋势跟踪', '做空'], meta: '真实行情 · 可做空', chip: '2013',
      invite: { kicker: '一 封 来 自 2012 的 邀 请 函', line1: '2012年深冬，东京外汇室的屏幕上，日元/美元汇率每隔几分钟就跳动一次——安倍晋三刚刚以压倒性优势赢得大选，他在镜头前承诺"无限量宽松"，空气中弥漫着一种久违的、危险的亢奋。', line2: '全球交易员盯着日本央行的声明，有人说政客不过是说说而已；但有一个83岁的老人，正在纽约某处悄悄建仓，他从不赌政府的"犹豫"，他只赌政府的"决心"。', dateLine: '2012', hook: '跟着央行做空本币' }
    },
    {
      id: 'buffett_2016_aapl', dir: 'cases/buffett_2016_aapl/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '苹果 · 巴菲特 2016', era: '2016 · 纽约证交所',
      desc: 'iPhone 销量下滑, 中国市场放缓. 巴菲特一辈子说自己不懂科技股',
      tags: ['护城河', '逆向投资', '价值发现'], meta: '真实行情 · 可做空', chip: '2016',
      invite: { kicker: '一 封 来 自 2016 的 邀 请 函', line1: '2016年，华尔街笼罩在阴云之下：iPhone连续季度销量下滑，中国增长熄火，科技股估值泡沫论甚嚣尘上，分析师们纷纷下调苹果目标价，基金经理们争相清仓。', line2: '就在众人踩踏出逃之际，一位自称"不懂科技"的老人悄悄打开账本，他看到的不是硬件周期，而是十亿用户舍不得离开的生态囚笼——他决定重仓押注。', dateLine: '2016', hook: '用消费品眼光买科技护城河' }
    },
    {
      id: 'buffett_2016_dal', dir: 'cases/buffett_2016_dal/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '达美航空 · 巴菲特 2016 (失败案例)', era: '2016 · 纽约证交所',
      desc: '90 年代说"航空业是坑"的巴菲特, 25 年后改主意了',
      tags: ['行业重估', '寡头护城河', '认知迭代'], meta: '真实行情 · 可做空', chip: '2016',
      invite: { kicker: '一 封 来 自 2016 的 邀 请 函', line1: '2016年，美国航空业历经数十年价格战与破产浪潮后，终于完成了历史性整合——达美、美联、西南、美航四巨头瓜分天下，机票价格悄然上涨，利润率创下历史新高。', line2: '一个曾经公开嘲讽航空股的86岁老人，正在悄悄动用数十亿美元买入他25年前发誓永不碰的东西——他看见了别人还没看见的结构性转变。', dateLine: '2016', hook: '25年后押注寡头重写认知' }
    },
    {
      id: 'buffett_2020_mc', dir: 'cases/buffett_2020_mc/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '三菱商事 · 巴菲特 2020 日本五大商社', era: '2020 · 东京证交所',
      desc: '巴菲特 90 岁前最后一次重磅出手, 6.7% 股权进入日本五大综合商社',
      tags: ['套利', '逆向投资', '价值发现'], meta: '真实行情 · 可做空', chip: '2020',
      invite: { kicker: '一 封 来 自 2020 的 邀 请 函', line1: '2020年，全球央行史无前例地放水，日本却已在零利率的泥淖中沉默二十年——东京证交所遍地是被世界遗忘的老牌巨头，股价低迷，股息丰厚，无人问津。', line2: '一位90岁的老人悄悄用0.5%的日元债券融资，将数十亿美元悄然注入五家日本商社——他看到的，不是衰老的日本，而是一台安静运转的现金套利机器。', dateLine: '2020', hook: '借日元低息债，锁定5%股息套利' }
    },
    {
      id: 'buffett_2020_oxy', dir: 'cases/buffett_2020_oxy/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '西方石油 · 巴菲特 2020', era: '2020 · 纽约证交所',
      desc: '油价负值的那一年, 一家页岩油公司, 100 亿优先股 + 8400 万权证',
      tags: ['优先股', '危机反转', '困境反转'], meta: '真实行情 · 可做空', chip: '2020',
      invite: { kicker: '一 封 来 自 2020 的 邀 请 函', line1: '2020年4月，纽约原油期货史无前例地跌至每桶负37美元，页岩油公司股价断崖，华尔街哀鸿遍野，整个能源行业仿佛在倒计时等待死亡。', line2: '就在市场最恐慌的时刻，一位白发老人悄悄签下了一份100亿美元的合同——他不买股票，他买的是"无论如何都要付钱"的承诺。', dateLine: '2020', hook: '用优先股合同锁定危机红利' }
    },
    {
      id: 'druck_2020_snow', dir: 'cases/druck_2020_snow/', access: 'invite', cat: 'master', master: 'druckenmiller',
      avatar: 'assets/avatars/druckenmiller.webp', masterName: '老德',
      title: 'Snowflake · 德拉肯米勒 2020', era: '2020 · 芝加哥期货交易所',
      desc: 'Snowflake 有史以来最大软件 IPO, 德拉肯米勒 IPO 当天买进 $1.7 亿',
      tags: ['成长发现', '宏观博弈', '趋势跟踪'], meta: '真实行情 · 可做空', chip: '2020',
      invite: { kicker: '一 封 来 自 2020 的 邀 请 函', line1: '2020年，全球最大软件IPO横空出世，巴菲特、老虎基金同日抢筹，华尔街沸腾——这是十年一遇的数据云革命，还是零利率泡沫最后的狂欢？', line2: '德拉肯米勒盯着客户用量每年+60%的飞轮数据，在上市首日按下了1.7亿美元的买入键——他看到了别人还没看到的东西，但宏观的风，正在悄悄转向。', dateLine: '2020', hook: 'IPO首日押注数据云飞轮' }
    },
    {
      id: 'dalio_2020_covid', dir: 'cases/dalio_2020_covid/', access: 'invite', cat: 'master', master: 'dalio',
      avatar: 'assets/avatars/dalio.webp', masterName: '全天候',
      title: '疫情 · 达里奥 2020 全天候组合考验', era: '2020 · 芝加哥期货交易所',
      desc: '一只病毒打趴了所有大类资产, 全天候组合的核心防御被打脸',
      tags: ['流动性危机', '宏观博弈', '策略失效'], meta: '真实行情 · 可做空', chip: '2020',
      invite: { kicker: '一 封 来 自 2020 的 邀 请 函', line1: '2020年3月，新冠病毒席卷全球，市场进入三十年一遇的流动性危机——股票熔断、黄金暴跌、债券被抛售，连现金都成了稀缺品，任何"分散"都失去意义，所有人都在同一时间疯狂逃命。', line2: '瑞·达利欧用四十年打造的"全天候"防御体系正在颤抖，当所有资产相关性同时归一，他将如何面对自己亲手构建的信仰崩塌，又能从这场惨败中读出什么别人看不见的真相？', dateLine: '2020', hook: '在相关性归一时承认体系失效' }
    },
    /* maotai2013（但斌/老但）暂下线，待定是否重新上线 —— 案例文件保留在 cases/maotai2013/ */
    /* ===== gam3 骨架旗舰化（9 个，自动注册）===== */
    {
      id: '2015_crash_if', dir: 'cases/2015_crash_if/', access: 'invite', cat: 'master', master: 'geweidong',
      avatar: 'assets/avatars/geweidong.webp', masterName: '葛老大',
      title: 'A股股灾 · 葛卫东 2015 沪深300期货', era: '2015 · 中国期货市场',
      desc: '全民疯牛见顶，千股跌停、国家队千亿救市，你做的是政策的对手盘',
      tags: ['股指期货', '去杠杆', '宏观博弈'], meta: '真实行情 · 期货 · T+0 可双向', chip: '2015',
      invite: { kicker: '一 封 来 自 2015 的 邀 请 函', line1: '2015年夏，A股疯牛冲上5178点，两融加杠杆的资金疯狂涌入，所有人都相信"国家牛市"才刚刚开始。', line2: '而当成交破2.3万亿、千股停牌、国家队千亿驰援的那一刻，沪深300股指期货的盘口里，一个期货传奇正站在所有人的对面。', dateLine: '2015.6.15 · 疯牛见顶', hook: '高杠杆股指期货里做政策的对手盘' }
    },
    {
      id: 'buffett_1974_bear_market', dir: 'cases/buffett_1974_bear_market/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '至暗熊市 · 巴菲特 1974 遍地捡黄金', era: '1974 · 纽约证交所',
      desc: '股市跌近两年、标普腰斩至 60 出头，当所有人都讨厌股票时，他却说自己像后宫里的好色之徒',
      tags: ['逆向投资', '安全边际', '至暗时刻'], meta: '真实行情 · 可做空', chip: '1974',
      invite: { kicker: '一 封 来 自 1974 的 邀 请 函', line1: '1974年，石油危机、滞胀、水门事件三重夹击，股市已连跌两年，道指从1051点腰斩，漂亮50神话崩塌，华尔街一片死寂。', line2: '而在奥马哈，一个44岁的男人翻着遍地6倍市盈率的便宜货，对《福布斯》说出那句名言——现在是投资致富的时候了。', dateLine: '1974.10 · 大底', hook: '当所有人都讨厌股票，谁敢满仓买入' }
    },
    {
      id: 'buffett_1998_ko_overvaluation', dir: 'cases/buffett_1998_ko_overvaluation/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '可口可乐 · 巴菲特 1998 高估之惑', era: '1998 · 纽约证交所',
      desc: '全世界都说它"永远不会错"，50 倍市盈率的可乐，随后却十年原地踏步',
      tags: ['估值泡沫', '好公司坏价格', '戴维斯双杀'], meta: '真实行情 · 可做空', chip: '1998',
      invite: { kicker: '一 封 来 自 1998 的 邀 请 函', line1: '1998年，可口可乐是全球消费品皇冠：近60%碳酸饮料份额、护城河极深，市盈率却被捧到50倍，市值近2000亿，登顶全美最贵公司。', line2: '伟大的公司毫无疑问——但当价格透支了未来十年，连巴菲特后来都承认：我本该在那时卖出。', dateLine: '1998 · 估值之巅', hook: '再伟大的公司，买在泡沫顶也要套十年' }
    },
    {
      id: 'buffett_2022_oxy_energy', dir: 'cases/buffett_2022_oxy_energy/', access: 'invite', cat: 'master', master: 'buffett',
      avatar: 'assets/avatars/buffett.webp', masterName: '股神（巴老）',
      title: '西方石油 · 巴菲特 2022 押注能源', era: '2022 · 纽约证交所',
      desc: 'CPI 40 年最高、油价飙升，他却重仓一只"该被淘汰"的石油股，两周买进 14%',
      tags: ['能源周期', '通胀对冲', '现金流'], meta: '真实行情 · 可做空', chip: '2022',
      invite: { kicker: '一 封 来 自 2022 的 邀 请 函', line1: '2022年初，美国CPI同比7.5%创40年新高，俄乌战争点燃油价，美联储即将暴力加息，市场从成长叙事仓皇逃向当期现金流。', line2: '当所有人都在为通胀恐慌时，奥马哈的老人两周买进西方石油14%的股份——他要的不是赌油价，而是一台印现金的机器。', dateLine: '2022 · 通胀烈火', hook: '通胀烧起来时，重仓被嫌弃的石油股' }
    },
    {
      id: 'burry_2019_gme', dir: 'cases/burry_2019_gme/', access: 'invite', cat: 'master', master: 'burry',
      avatar: 'assets/avatars/burry2.webp', masterName: '老博',
      title: '游戏驿站 · 伯里 2019 深度价值', era: '2019 · 纽约证交所',
      desc: '全华尔街都等它死，他却在数它的现金——致信董事会主张回购，两年后引爆史诗级轧空',
      tags: ['深度价值', '逆向布局', '轧空'], meta: '真实行情 · 可做空', chip: '2019',
      invite: { kicker: '一 封 来 自 2019 的 邀 请 函', line1: '2019年，线下游戏零售被电商碾压，市场把游戏驿站当成"下一个百视达"判了死刑，做空比例超过流通股本的100%。', line2: '而《大空头》原型迈克尔·伯里翻开财报，看到的是堆积的现金和被严重低估的价值——他买入、致信董事会要求回购，静待引信被点燃。', dateLine: '2019 · 无人问津', hook: '人人等它破产时，数清它兜里的现金' }
    },
    {
      id: 'burry_2021_tsla_short', dir: 'cases/burry_2021_tsla_short/', access: 'invite', cat: 'master', master: 'burry',
      avatar: 'assets/avatars/burry2.webp', masterName: '老博',
      title: '特斯拉 · 伯里 2021 孤独做空', era: '2021 · 纳斯达克',
      desc: '全市场最拥挤的多头，和一个孤独的空头——5.3 亿美元看跌期权赌估值回归',
      tags: ['做空', '估值压缩', '逆势'], meta: '真实行情 · 做空头寸', chip: '2021',
      invite: { kicker: '一 封 来 自 2021 的 邀 请 函', line1: '2021年，特斯拉是全市场最拥挤的信仰多头，市值冲破万亿，散户与机构齐声看多，做空它无异于螳臂当车。', line2: '而迈克尔·伯里通过13F亮出5.3亿美元的看跌期权——他赌的不是马斯克，而是离谱估值终将回归地心引力。你敢站在他这边吗？', dateLine: '2021 · 万亿信仰', hook: '在最拥挤的多头对面，孤独做空' }
    },
    {
      id: 'druckenmiller_2009_gold_qe', dir: 'cases/druckenmiller_2009_gold_qe/', access: 'invite', cat: 'master', master: 'druckenmiller',
      avatar: 'assets/avatars/druckenmiller.webp', masterName: '老德',
      title: '黄金 · 德鲁肯米勒 2009 印钞时代', era: '2009 · 纽约商品交易所',
      desc: '美联储零利率 + QE 大放水，当所有人躲进现金，纸币还值多少？金价从 850 冲向 1900',
      tags: ['黄金', '量化宽松', '宏观对冲'], meta: '真实行情 · 可做空', chip: '2009',
      invite: { kicker: '一 封 来 自 2009 的 邀 请 函', line1: '2009年，金融危机的废墟上，美联储把利率压到零、开动印钞机大举扩表，零利率让持有无息黄金的机会成本几乎归零。', line2: '宏观刺客德鲁肯米勒的逻辑简单到极致：央行印多少钞，黄金就该涨多少——他要做的，是在纸币贬值的浪潮上重仓下注。', dateLine: '2009 · QE 元年', hook: '央行开动印钞机，重仓黄金对冲法币' }
    },
    {
      id: 'duanyongping_2018_aapl_drawdown', dir: 'cases/duanyongping_2018_aapl_drawdown/', access: 'invite', cat: 'master', master: 'duanyongping',
      avatar: 'assets/avatars/duanyongping.webp', masterName: '大道',
      title: '苹果回撤 · 段永平 2018 越跌越买', era: '2018 · 纽约证交所',
      desc: '万亿苹果罕见下调指引、单日暴跌 10%，他却淡淡写下"便宜了就多买点"',
      tags: ['逆向加仓', '能力圈', '本分'], meta: '真实行情 · 可做空', chip: '2018',
      invite: { kicker: '一 封 来 自 2018 的 邀 请 函', line1: '2018年底，中美贸易摩擦升级，科技股从高位杀估值，苹果史上首次因iPhone砍营收指引，2019年开年单日暴跌近10%。', line2: '当市场恐慌抛售这只信仰股时，阿段在雪球上淡淡写下"便宜了就多买点"——买股票就是买公司，护城河没变，跌就是机会。', dateLine: '2019.1.2 · 砍指引', hook: '好公司遇上坏消息，越跌越买' }
    },
    {
      id: 'lynch_1987_blackmonday', dir: 'cases/lynch_1987_blackmonday/', access: 'invite', cat: 'master', master: 'lynch',
      avatar: 'assets/avatars/lynch.webp', masterName: '老林',
      title: '黑色星期一 · 林奇 1987 赎回潮', era: '1987 · 纽约证交所',
      desc: '度假途中，全美最大基金一天蒸发 20 亿——单日 -22.6%，是卖股应对赎回，还是扛住？',
      tags: ['黑色星期一', '赎回压力', '守纪律'], meta: '真实行情 · 可做空', chip: '1987',
      invite: { kicker: '一 封 来 自 1987 的 邀 请 函', line1: '1987年10月19日，道指单日暴跌22.6%，程序化交易制造的雪崩瞬间抹去半年涨幅，恐慌赎回的电话淹没了基金公司。', line2: '而麦哲伦基金的掌舵人彼得·林奇，正在爱尔兰度假——管着全美最大的基金，一天蒸发20亿，他要决定：在底部割肉应付赎回，还是死扛？', dateLine: '1987.10.19 · 黑色星期一', hook: '最大的基金一天蒸发 20 亿，扛还是逃' }
    },
    /* ===== A股每年复盘（年度大盘×行业轮动；按 year 倒序，最新年在最上） ===== */
    {
      id: 'annual_2025', dir: 'cases/annual_2025/', access: 'free', cat: 'annual', year: '2025',
      title: 'A股 2025 全景复盘', era: '2025 · 中国A股'
    },
    {
      id: 'annual_2024', dir: 'cases/annual_2024/', access: 'free', cat: 'annual', year: '2024',
      title: 'A股 2024 全景复盘 · 冰点到沸点', era: '2024 · 中国A股'
    },
    {
      id: 'annual_2023', dir: 'cases/annual_2023/', access: 'free', cat: 'annual', year: '2023',
      title: 'A股 2023 全景复盘', era: '2023 · 中国A股'
    },
    {
      id: 'annual_2022', dir: 'cases/annual_2022/', access: 'free', cat: 'annual', year: '2022',
      title: 'A股 2022 全景复盘', era: '2022 · 中国A股'
    },
    { id: 'annual_2021', dir: 'cases/annual_2021/', access: 'free', cat: 'annual', year: '2021', title: 'A股 2021 全景复盘 · 赛道股见顶', era: '2021 · 中国A股' },
    { id: 'annual_2020', dir: 'cases/annual_2020/', access: 'free', cat: 'annual', year: '2020', title: 'A股 2020 全景复盘 · 疫情与结构牛', era: '2020 · 中国A股' },
    { id: 'annual_2019', dir: 'cases/annual_2019/', access: 'free', cat: 'annual', year: '2019', title: 'A股 2019 全景复盘 · 核心资产', era: '2019 · 中国A股' },
    { id: 'annual_2018', dir: 'cases/annual_2018/', access: 'free', cat: 'annual', year: '2018', title: 'A股 2018 全景复盘 · 贸易战熊市', era: '2018 · 中国A股' },
    { id: 'annual_2017', dir: 'cases/annual_2017/', access: 'free', cat: 'annual', year: '2017', title: 'A股 2017 全景复盘 · 漂亮50', era: '2017 · 中国A股' },
    { id: 'annual_2016', dir: 'cases/annual_2016/', access: 'free', cat: 'annual', year: '2016', title: 'A股 2016 全景复盘 · 熔断', era: '2016 · 中国A股' },
    { id: 'annual_2015', dir: 'cases/annual_2015/', access: 'free', cat: 'annual', year: '2015', title: 'A股 2015 全景复盘 · 杠杆牛与股灾', era: '2015 · 中国A股' },
    { id: 'annual_2014', dir: 'cases/annual_2014/', access: 'free', cat: 'annual', year: '2014', title: 'A股 2014 全景复盘 · 券商牛', era: '2014 · 中国A股' },
    { id: 'annual_2013', dir: 'cases/annual_2013/', access: 'free', cat: 'annual', year: '2013', title: 'A股 2013 全景复盘 · 钱荒与创业板', era: '2013 · 中国A股' },
    { id: 'annual_2012', dir: 'cases/annual_2012/', access: 'free', cat: 'annual', year: '2012', title: 'A股 2012 全景复盘', era: '2012 · 中国A股' },
    { id: 'annual_2011', dir: 'cases/annual_2011/', access: 'free', cat: 'annual', year: '2011', title: 'A股 2011 全景复盘 · 紧缩熊市', era: '2011 · 中国A股' },
    { id: 'annual_2010', dir: 'cases/annual_2010/', access: 'free', cat: 'annual', year: '2010', title: 'A股 2010 全景复盘', era: '2010 · 中国A股' },
    { id: 'annual_2009', dir: 'cases/annual_2009/', access: 'free', cat: 'annual', year: '2009', title: 'A股 2009 全景复盘 · 四万亿反弹', era: '2009 · 中国A股' },
    { id: 'annual_2008', dir: 'cases/annual_2008/', access: 'free', cat: 'annual', year: '2008', title: 'A股 2008 全景复盘 · 金融危机', era: '2008 · 中国A股' },
    { id: 'annual_2007', dir: 'cases/annual_2007/', access: 'free', cat: 'annual', year: '2007', title: 'A股 2007 全景复盘 · 6124 点', era: '2007 · 中国A股' },
    { id: 'annual_2006', dir: 'cases/annual_2006/', access: 'free', cat: 'annual', year: '2006', title: 'A股 2006 全景复盘 · 牛市启动', era: '2006 · 中国A股' },
    { id: 'annual_2005', dir: 'cases/annual_2005/', access: 'free', cat: 'annual', year: '2005', title: 'A股 2005 全景复盘 · 998 见底', era: '2005 · 中国A股' },
    { id: 'annual_2004', dir: 'cases/annual_2004/', access: 'free', cat: 'annual', year: '2004', title: 'A股 2004 全景复盘', era: '2004 · 中国A股' },
    { id: 'annual_2003', dir: 'cases/annual_2003/', access: 'free', cat: 'annual', year: '2003', title: 'A股 2003 全景复盘 · 五朵金花', era: '2003 · 中国A股' },
    { id: 'annual_2002', dir: 'cases/annual_2002/', access: 'free', cat: 'annual', year: '2002', title: 'A股 2002 全景复盘', era: '2002 · 中国A股' },
    /* ===== 商品年度全景复盘（国内商品期货：商品综合指数×多品种多空轮动；按 year 倒序） ===== */
    { id: 'comm_2025', dir: 'cases/comm_2025/', access: 'free', cat: 'commodity', year: '2025', title: '商品 2025 全景复盘 · 贵金属与新能源金属牛', era: '2025 · 国内商品期货', chip: '2025' },
    { id: 'comm_2024', dir: 'cases/comm_2024/', access: 'free', cat: 'commodity', year: '2024', title: '商品 2024 全景复盘 · 黄金独行与黑色塌方', era: '2024 · 国内商品期货', chip: '2024' },
    { id: 'comm_2023', dir: 'cases/comm_2023/', access: 'free', cat: 'commodity', year: '2023', title: '商品 2023 全景复盘 · 锂镍崩与红枣独牛', era: '2023 · 国内商品期货', chip: '2023' },
    { id: 'comm_2022', dir: 'cases/comm_2022/', access: 'free', cat: 'commodity', year: '2022', title: '商品 2022 全景复盘 · 镍逼空与能源高烧', era: '2022 · 国内商品期货', chip: '2022' },
    { id: 'comm_2021', dir: 'cases/comm_2021/', access: 'free', cat: 'commodity', year: '2021', title: '商品 2021 全景复盘 · 大宗超级周期与猪周期崩塌', era: '2021 · 国内商品期货', chip: '2021' },
    { id: 'comm_2020', dir: 'cases/comm_2020/', access: 'free', cat: 'commodity', year: '2020', title: '商品 2020 全景复盘 · 负油价与黑色 V 反', era: '2020 · 国内商品期货', chip: '2020' },
    { id: 'comm_2019', dir: 'cases/comm_2019/', access: 'free', cat: 'commodity', year: '2019', title: '商品 2019 全景复盘 · 油脂与铁矿修复', era: '2019 · 国内商品期货', chip: '2019' },
    { id: 'comm_2018', dir: 'cases/comm_2018/', access: 'free', cat: 'commodity', year: '2018', title: '商品 2018 全景复盘 · 苹果霜冻独牛与普跌', era: '2018 · 国内商品期货', chip: '2018' },
    { id: 'comm_2017', dir: 'cases/comm_2017/', access: 'free', cat: 'commodity', year: '2017', title: '商品 2017 全景复盘 · 供给侧黑色与有色共振', era: '2017 · 国内商品期货', chip: '2017' },
    { id: 'comm_2016', dir: 'cases/comm_2016/', access: 'free', cat: 'commodity', year: '2016', title: '商品 2016 全景复盘 · 供给侧黑色暴涨', era: '2016 · 国内商品期货', chip: '2016' },
    { id: 'comm_2015', dir: 'cases/comm_2015/', access: 'free', cat: 'commodity', year: '2015', title: '商品 2015 全景复盘 · 黑色探底与白糖牛', era: '2015 · 国内商品期货', chip: '2015' },
    { id: 'comm_2014', dir: 'cases/comm_2014/', access: 'free', cat: 'commodity', year: '2014', title: '商品 2014 全景复盘 · 铁矿崩塌与油脂熊', era: '2014 · 国内商品期货', chip: '2014' },
    { id: 'comm_2013', dir: 'cases/comm_2013/', access: 'free', cat: 'commodity', year: '2013', title: '商品 2013 全景复盘 · 贵金属暴跌', era: '2013 · 国内商品期货', chip: '2013' },
    { id: 'comm_2012', dir: 'cases/comm_2012/', access: 'free', cat: 'commodity', year: '2012', title: '商品 2012 全景复盘 · 宽幅震荡', era: '2012 · 国内商品期货', chip: '2012' },
    { id: 'comm_2011', dir: 'cases/comm_2011/', access: 'free', cat: 'commodity', year: '2011', title: '商品 2011 全景复盘 · 紧缩去库与橡胶崩', era: '2011 · 国内商品期货', chip: '2011' },
    { id: 'comm_2010', dir: 'cases/comm_2010/', access: 'free', cat: 'commodity', year: '2010', title: '商品 2010 全景复盘 · 棉花天道与流动性盛宴', era: '2010 · 国内商品期货', chip: '2010' },
    /* ===== 百年美股复盘（近 26 年：标普×行业轮动；按 year 倒序） ===== */
    { id: 'us_2025', dir: 'cases/us_2025/', access: 'free', cat: 'usannual', year: '2025', title: '美股 2025 全景复盘', era: '2025 · 美股' },
    { id: 'us_2024', dir: 'cases/us_2024/', access: 'free', cat: 'usannual', year: '2024', title: '美股 2024 全景复盘 · AI 延续', era: '2024 · 美股' },
    { id: 'us_2023', dir: 'cases/us_2023/', access: 'free', cat: 'usannual', year: '2023', title: '美股 2023 全景复盘 · AI 七巨头', era: '2023 · 美股' },
    { id: 'us_2022', dir: 'cases/us_2022/', access: 'free', cat: 'usannual', year: '2022', title: '美股 2022 全景复盘 · 加息熊市', era: '2022 · 美股' },
    { id: 'us_2021', dir: 'cases/us_2021/', access: 'free', cat: 'usannual', year: '2021', title: '美股 2021 全景复盘 · 放水牛与 meme', era: '2021 · 美股' },
    { id: 'us_2020', dir: 'cases/us_2020/', access: 'free', cat: 'usannual', year: '2020', title: '美股 2020 全景复盘 · 疫情与科技狂潮', era: '2020 · 美股' },
    { id: 'us_2019', dir: 'cases/us_2019/', access: 'free', cat: 'usannual', year: '2019', title: '美股 2019 全景复盘 · 强势反弹', era: '2019 · 美股' },
    { id: 'us_2018', dir: 'cases/us_2018/', access: 'free', cat: 'usannual', year: '2018', title: '美股 2018 全景复盘 · 加息回调', era: '2018 · 美股' },
    { id: 'us_2017', dir: 'cases/us_2017/', access: 'free', cat: 'usannual', year: '2017', title: '美股 2017 全景复盘', era: '2017 · 美股' },
    { id: 'us_2016', dir: 'cases/us_2016/', access: 'free', cat: 'usannual', year: '2016', title: '美股 2016 全景复盘', era: '2016 · 美股' },
    { id: 'us_2015', dir: 'cases/us_2015/', access: 'free', cat: 'usannual', year: '2015', title: '美股 2015 全景复盘', era: '2015 · 美股' },
    { id: 'us_2014', dir: 'cases/us_2014/', access: 'free', cat: 'usannual', year: '2014', title: '美股 2014 全景复盘', era: '2014 · 美股' },
    { id: 'us_2013', dir: 'cases/us_2013/', access: 'free', cat: 'usannual', year: '2013', title: '美股 2013 全景复盘 · 大牛市', era: '2013 · 美股' },
    { id: 'us_2012', dir: 'cases/us_2012/', access: 'free', cat: 'usannual', year: '2012', title: '美股 2012 全景复盘', era: '2012 · 美股' },
    { id: 'us_2011', dir: 'cases/us_2011/', access: 'free', cat: 'usannual', year: '2011', title: '美股 2011 全景复盘 · 欧债危机', era: '2011 · 美股' },
    { id: 'us_2010', dir: 'cases/us_2010/', access: 'free', cat: 'usannual', year: '2010', title: '美股 2010 全景复盘 · 闪崩', era: '2010 · 美股' },
    { id: 'us_2009', dir: 'cases/us_2009/', access: 'free', cat: 'usannual', year: '2009', title: '美股 2009 全景复盘 · 大反弹', era: '2009 · 美股' },
    { id: 'us_2008', dir: 'cases/us_2008/', access: 'free', cat: 'usannual', year: '2008', title: '美股 2008 全景复盘 · 金融危机', era: '2008 · 美股' },
    { id: 'us_2007', dir: 'cases/us_2007/', access: 'free', cat: 'usannual', year: '2007', title: '美股 2007 全景复盘 · 见顶', era: '2007 · 美股' },
    { id: 'us_2006', dir: 'cases/us_2006/', access: 'free', cat: 'usannual', year: '2006', title: '美股 2006 全景复盘', era: '2006 · 美股' },
    { id: 'us_2005', dir: 'cases/us_2005/', access: 'free', cat: 'usannual', year: '2005', title: '美股 2005 全景复盘', era: '2005 · 美股' },
    { id: 'us_2004', dir: 'cases/us_2004/', access: 'free', cat: 'usannual', year: '2004', title: '美股 2004 全景复盘', era: '2004 · 美股' },
    { id: 'us_2003', dir: 'cases/us_2003/', access: 'free', cat: 'usannual', year: '2003', title: '美股 2003 全景复盘 · 反弹', era: '2003 · 美股' },
    { id: 'us_2002', dir: 'cases/us_2002/', access: 'free', cat: 'usannual', year: '2002', title: '美股 2002 全景复盘 · 安然与熊市底', era: '2002 · 美股' },
    { id: 'us_2001', dir: 'cases/us_2001/', access: 'free', cat: 'usannual', year: '2001', title: '美股 2001 全景复盘 · 911 与衰退', era: '2001 · 美股' },
    { id: 'us_2000', dir: 'cases/us_2000/', access: 'free', cat: 'usannual', year: '2000', title: '美股 2000 全景复盘 · 互联网泡沫破裂', era: '2000 · 美股' },
    { id: 'us_1999', dir: 'cases/us_1999/', access: 'free', cat: 'usannual', year: '1999', title: '美股 1999 全景复盘 · 互联网狂热', era: '1999 · 美股' }
  ];

  /* 大师注册表：大师战役版块以人为主体，点开看其全部剧本（未来每人挂多个案例） */
  /* 大师一律用市场通行称谓，不用真名（头像亦为风格化形象） */
  var MASTERS = [
    { id: 'buffett',      name: '股神',     avatar: 'assets/avatars/buffett.webp',      tagline: '巴老 · 护城河与安全边际' },
    { id: 'duanyongping', name: '大道',     avatar: 'assets/avatars/duanyongping.webp', tagline: '阿段 · 买股票就是买公司' },
    { id: 'soros',        name: '狙击巨鳄', avatar: 'assets/avatars/soros.webp',        tagline: '老索 · 反身性（Reflexivity）' },
    { id: 'fuhaitang',    name: '傅天师',   avatar: 'assets/avatars/fuhaitang.webp',    tagline: '农民哲学家 · 天道思维' },
    { id: 'geweidong',    name: '葛老大',   avatar: 'assets/avatars/geweidong.webp',    tagline: '混沌投资 · 期货传奇' },
    { id: 'livermore',    name: '投机之王', avatar: 'assets/avatars/livermore.webp',    tagline: '趋势与纪律 · 世纪大空头' },
    { id: 'lynch',        name: '老林',     avatar: 'assets/avatars/lynch.webp',         tagline: '十倍股捕手 · 翻石头找 Tenbagger' },
    { id: 'dalio',        name: '全天候',   avatar: 'assets/avatars/dalio.webp',         tagline: '桥水老达 · 债务周期与原则' },
    { id: 'graham',       name: '祖师爷',   avatar: 'assets/avatars/graham.webp',        tagline: '价值投资之父 · 安全边际（Margin of Safety）' },
    { id: 'templeton',    name: '爵士',     avatar: 'assets/avatars/templeton.webp',     tagline: '逆向猎手 · 在最悲观处买入' },
    { id: 'druckenmiller',name: '老德',     avatar: 'assets/avatars/druckenmiller.webp', tagline: '宏观刺客 · 看对就下重注' },
    { id: 'burry',        name: '老博',     avatar: 'assets/avatars/burry2.webp',         tagline: '大空头 · 独立到孤独' },
    { id: 'danbin',       name: '老但',     avatar: 'assets/avatars/danbin.svg',        tagline: '时间的玫瑰 · 满仓穿越至暗时刻' }
  ];

  /* ---------- 心跳：只在进入盘面（K线模拟器）时激活，不再绑全局首点，避免大厅/开局就响 ---------- */
  var hb = new MR.Heartbeat();
  function armHb() { hb.arm(); hb.resume(); }

  /* ---------- 大厅 ---------- */
  function showLobby() {
    if (MR.markLoc) MR.markLoc('lobby');   // 流失追踪：回到大厅
    if (state.engine) { state.engine.pause(); hb.setPressure(0); }
    document.body.classList.remove('playing');
    $('lobby').classList.remove('hidden');
    $('scene-layer').classList.add('hidden');
    $('terminal-layer').classList.add('hidden');
    $('recap-layer').classList.add('hidden');
    $('vignette').style.opacity = 0;
    renderLobby();
  }

  function lockInfo(c) {
    if (c.access === 'invite' && !MR.store.canPlay(c)) return MR.WECHAT ? '🔒 兑换码解锁' : '🔒 转发邀请函解锁';
    if (c.access === 'paid' && !MR.store.canPlay(c)) return MR.WECHAT ? '🔒 兑换码解锁' : '🔒 转发或兑换码解锁';
    return null;
  }

  function renderCard(c, save, box) {
    var locked = !MR.store.canPlay(c);
    var card = H().el('div', 'case-card' + (c.flagship ? ' flagship' : '') + (locked ? ' locked' : '') + (c.avatar ? ' has-avatar' : ''));
    var _tagMap = { '做空': '双向交易', '杠杆': '保证金', '逼仓': '逼空行情', '满仓': '重仓', '暴跌': '大幅波动', '去杠杆预判': '周期研判' };
    var tags = (c.tags || []).map(function (t, i) {
      var tt = MR.WECHAT ? (_tagMap[t] || t) : t;   // 微信版：敏感交易术语换中性词
      return '<span class="tag' + (c.hot && i === 0 ? ' hot' : '') + '">' + tt + '</span>';
    }).join('');
    var res = save.results[c.id];
    var resLine = res ? '<div class="result-line">上次战绩：' + (res.ret >= 0 ? '+' : '') + res.ret + '% · ' + H().esc(res.persona) + (res.liquidated ? ' · 清盘' : '') + '</div>' : '';
    var go = locked ? lockInfo(c) : (c.soon ? '⏳ 即将上线' : (res ? '再战一局 →' : '开始 →'));
    var head;
    if (c.avatar) {
      // 大师卡：头像 + 名字
      head = '<div class="cc-head"><img class="cc-avatar" src="' + MR.av(c.avatar) + '" alt="">' +
        '<div class="cc-head-r"><div class="cc-master">' + H().esc(c.masterName || '') + '</div>' +
        '<div class="era">' + H().esc(c.era) + '</div></div></div>';
    } else {
      // 市场卡：年份大字水印
      head = (c.year ? '<div class="year-wm num">' + c.year + '</div>' : '') +
        '<div class="era">' + H().esc(c.era) + '</div>';
    }
    card.innerHTML = head +
      '<h3>' + H().esc(c.title) + (locked ? '<span class="lockmark">🔒</span>' : '') + '</h3>' +
      '<div class="desc">' + H().esc(c.desc) + '</div>' +
      (c.meta ? '<div class="cc-meta">' + H().esc(c.meta) + '</div>' : '') +
      '<div class="tags">' + tags + '</div>' + resLine +
      '<div class="go">' + go + '</div>';
    card.onclick = function () {
      if (locked) { onLockedClick(c); return; }
      if (c.soon) { UI.toast('即将上线，先去打 2015 旗舰战役！'); return; }
      startCase(c);
    };
    attachShare(card, c);
    box.appendChild(card);
  }

  /* 卡片右上角分享键：点了不开局，弹出该剧本邀请海报供转发 */
  function attachShare(cardEl, c) {
    if (c.soon) return;
    var sb = H().el('button', 'card-share',
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f0c040" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" transform="translate(24 0) scale(-1 1)"/></svg>');
    sb.setAttribute('type', 'button');
    sb.setAttribute('aria-label', '分享');
    sb.onclick = function (ev) { ev.stopPropagation(); shareCase(c); };
    cardEl.appendChild(sb);   // 统一：右上角绝对定位小键（行卡与大卡一致，不挤标题）
  }

  function shareCase(c) {
    if (!MR.store.canPlay(c)) { showUnlock(c); return; }   // 未解锁：转发即可解锁
    MR.makeInvitePoster(c, function (url) {
      var link = 'https://marketbattles.com/?case=' + c.id;
      var m = H().modal('<h3>🎁 分享《' + H().esc(c.chip || c.title) + '》</h3>' +
        '<img id="poster-img" src="' + url + '">' +
        '<div class="save-hint">⬇ 保存海报 或 ↗ 复制链接，转发到 微信 / 知识星球 / 知乎 / 雪球，邀好友重活这段历史<br>（发微信：朋友需长按网址、用浏览器打开）</div>' +
        '<div class="ul-actions"><button class="btn gold" id="sh-save">⬇ 保存海报</button><button class="btn gold" id="sh-copy">↗ 复制链接</button></div>' +
        '<button class="btn block" id="sh-close">关闭</button>', { dismiss: true });
      m.box.querySelector('#sh-save').onclick = function () { saveDataUrl(url, (c.chip || 'invite') + '-邀请函.png'); };
      m.box.querySelector('#sh-copy').onclick = function () { MR.copyText(link, '邀请链接已复制 ✓ 去粘贴分享'); };
      m.box.querySelector('#sh-close').onclick = m.close;
    });
  }

  /* 市场风暴紧凑行卡：年份 + 标题 + 状态，一行装下 */
  function renderMarketRow(c, save, box) {
    var locked = !MR.store.canPlay(c);
    var row = H().el('div', 'market-row' + (c.flagship ? ' flagship' : '') + (locked ? ' locked' : ''));
    var res = save.results[c.id];
    var status = locked ? '🔒' : (c.soon ? '⏳' : (res ? '再战 →' : '开始 →'));
    var subParts = [c.era];
    if (res) subParts.push('上次 ' + (res.ret >= 0 ? '+' : '') + res.ret + '%');
    else if (c.meta) subParts.push(c.meta.split(' · ')[0] + ' · ' + (c.meta.split(' · ')[1] || ''));
    row.innerHTML =
      '<div class="mr-year num">' + (c.year || '') + '</div>' +
      '<div class="mr-mid"><div class="mr-title">' + H().esc(c.title) +
      (c.hot ? '<span class="tag hot" style="margin-left:6px">旗舰</span>' : '') + '</div>' +
      '<div class="mr-sub">' + H().esc(subParts.join(' · ')) + '</div></div>' +
      '<div class="mr-go">' + status + '</div>';
    row.onclick = function () {
      if (locked) { onLockedClick(c); return; }
      if (c.soon) { UI.toast('即将上线，先去打 2015 旗舰战役！'); return; }
      startCase(c);
    };
    attachShare(row, c);
    box.appendChild(row);
  }

  /* lobbyView.view: null=首页 | 'market'=市场风暴列表页 | 'annual'=A股每年复盘列表页
   * lobbyView.master: 非空=某大师详情页（与 view 互斥，master 优先） */
  var lobbyView = { view: null, master: null };

  /* 前20%奖励·免费券模式：从战报点「回大厅·任选一个新剧本」进入。
     此模式下点任意带🔒剧本=用 1 个名额免费解锁，而非走付费/转发。 */
  var freePickMode = false;

  /* 通用「返回大厅」链接：传入点击回调（一般是把 view/master 置空后重渲染） */
  function backLink(onBack) {
    var back = H().el('div', 'back-link', '← 返回大厅');
    back.onclick = onBack;
    return back;
  }

  /* 市场风暴排序：2015 A股股灾 → 纳斯达克 2000 置顶，其余按年份升序（首页入口卡与列表页共用） */
  function sortedMarkets() {
    var TOP = ['a2015', 'nasdaq2000'];
    return CASES.filter(function (c) { return c.cat === 'market'; }).slice().sort(function (a, b) {
      var ai = TOP.indexOf(a.id), bi = TOP.indexOf(b.id);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0);
    });
  }

  /* 分类入口卡：图标 + 标题 + 副标题 + 计数角标，整卡可点入对应分区列表页 */
  function catEntry(icon, title, sub, count, onGo) {
    var card = H().el('div', 'cat-entry',
      '<div class="ce-icon">' + icon + '</div>' +
      '<div class="ce-mid"><div class="ce-title">' + H().esc(title) + '</div>' +
      '<div class="ce-sub">' + H().esc(sub) + '</div></div>' +
      '<div class="ce-go"><span class="ce-count">' + H().esc(count) + '</span><span class="ce-arrow">进入 →</span></div>');
    card.onclick = onGo;
    return card;
  }

  function renderLobby() {
    var box = $('case-list');
    box.innerHTML = '';
    var save = MR.store.get();

    /* 前20%奖励·免费券模式提示条：点任意带🔒剧本即免费解锁（所有分区页都显示，便于挑） */
    if (freePickMode && MR.store.rewardVouchers() > 0) {
      var fp = H().el('div', 'freepick-bar',
        '🎟 前20%奖励：你有 <b>' + MR.store.rewardVouchers() + '</b> 个「新剧本」名额 · 点任意带 🔒 的剧本即可<b>免费解锁</b>' +
        '<span class="fp-x" id="fp-exit">退出</span>');
      box.appendChild(fp);
      var fpx = fp.querySelector('#fp-exit');
      if (fpx) fpx.onclick = function () { freePickMode = false; renderLobby(); };
    } else if (freePickMode) {
      freePickMode = false;   // 名额用完自动退出
    }

    /* ---- 大师详情页 ---- */
    if (lobbyView.master) {
      var ms = null;
      MASTERS.forEach(function (x) { if (x.id === lobbyView.master) ms = x; });
      box.appendChild(backLink(function () { lobbyView.master = null; renderLobby(); window.scrollTo(0, 0); }));
      box.appendChild(H().el('div', 'master-head',
        '<img class="mh-avatar" src="' + MR.av(ms.avatar) + '" alt="">' +
        '<div><div class="mh-name">' + H().esc(ms.name) + '</div>' +
        '<div class="mh-tag">' + H().esc(ms.tagline) + '</div></div>'));
      CASES.filter(function (c) { return c.master === lobbyView.master; })
        .forEach(function (c) { renderCard(c, save, box); });
      box.appendChild(H().el('div', 'sec-sub', '更多 ' + ms.name + ' 战役持续上新中…'));
      return;
    }

    /* ---- 市场风暴列表页（点入才展示这批极端市场案例） ---- */
    if (lobbyView.view === 'market') {
      box.appendChild(backLink(function () { lobbyView.view = null; renderLobby(); window.scrollTo(0, 0); }));
      box.appendChild(H().el('div', 'sec-head',
        '<h2>市场风暴</h2><div class="sec-sub">股灾 · 大萧条 · 熔断——亲历全民事件</div>'));
      var mkList = sortedMarkets();   // 旗舰置顶 + 其余按年份升序
      var mkScrollL = H().el('div', 'market-scroll' + (mkList.length > 5 ? ' scrollable' : ''));
      mkList.forEach(function (c) { renderMarketRow(c, save, mkScrollL); });
      box.appendChild(mkScrollL);
      return;
    }

    /* ---- A股每年复盘列表页（一年一局，大盘×行业轮动；按年份倒序，最新年在最上） ---- */
    if (lobbyView.view === 'annual') {
      box.appendChild(backLink(function () { lobbyView.view = null; renderLobby(); window.scrollTo(0, 0); }));
      box.appendChild(H().el('div', 'sec-head',
        '<h2>A股每年复盘</h2><div class="sec-sub">一年一局 · 大盘×行业轮动 · 看清那年钱往哪走</div>'));
      var years = CASES.filter(function (c) { return c.cat === 'annual'; }).slice()
        .sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); });
      if (!years.length) {
        box.appendChild(H().el('div', 'sec-sub', '年度复盘剧本即将上线…'));
      } else {
        years.forEach(function (c) { renderMarketRow(c, save, box); });   // 复用紧凑行卡（年份大字 + 标题）
      }
      return;
    }

    /* ---- 首页：每日盘后复盘 → 行情盲盒 → 三个分类入口卡 ---- */
    // 每日盘后复盘入口（无门槛、所有人可见——引流内容，越多人看越好；导向 daily-recap.html）
    var daily = H().el('div', 'random-card daily-card top',
      '<div class="rc-dice">📈</div><div class="rc-mid"><div class="rc-title">每日复盘</div>' +
      '<div class="rc-sub">今天市场在交易什么逻辑 · 核心矛盾 · 不预测只观察</div></div><div class="rc-go">看复盘 →</div>');
    daily.onclick = function () { window.location.href = 'daily-recap.html'; };
    if (window.MR_DAILY_RECAP) box.appendChild(daily);   // 入口先藏起来：页面已部署、可直接 /daily-recap.html 访问；内容成熟后在 index.html 置 window.MR_DAILY_RECAP=true 放出
    // 行情盲盒：随机抽一段历史行情，隐去名称，凭宏观/产业/资金/情绪盲判交易，结束揭晓真身+大师
    // 放出来：所有人首页可见（原"通关≥1局"门槛已撤）
    var blind = H().el('div', 'random-card blind-card top',
      '<div class="rc-dice">🎁</div><div class="rc-mid"><div class="rc-title">行情盲盒</div>' +
      '<div class="rc-sub">隐去名字，只给宏观/产业/资金/情绪——你能猜中并赚到吗？</div></div><div class="rc-go">开盒 →</div>');
    blind.onclick = function () { document.body.classList.add('playing'); MR.startBlind(); };
    box.appendChild(blind);

    // （2）分区 tab：市场风暴 / A股复盘 / 美股复盘 —— 首页内联快速切换，不跳页，直达对应剧本
    var annuals = CASES.filter(function (c) { return c.cat === 'annual'; }).slice()
      .sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); });
    var usAnnuals = CASES.filter(function (c) { return c.cat === 'usannual'; }).slice()
      .sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); });
    var commodities = CASES.filter(function (c) { return c.cat === 'commodity'; }).slice()
      .sort(function (a, b) { return (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0); });
    if (!lobbyView.tab) lobbyView.tab = 'market';
    if (lobbyView.tab === 'annual' && !annuals.length) lobbyView.tab = 'market';
    var tabBar = H().el('div', 'lobby-tabs');
    function mkTab(key, label) {
      var t = H().el('button', 'lobby-tab' + (lobbyView.tab === key ? ' on' : ''), label);
      t.onclick = function () { if (lobbyView.tab !== key) { lobbyView.tab = key; renderLobby(); } };
      return t;
    }
    tabBar.appendChild(mkTab('market', '市场风暴'));
    tabBar.appendChild(mkTab('annual', 'A股复盘'));
    tabBar.appendChild(mkTab('us', '美股复盘'));
    tabBar.appendChild(mkTab('commodity', '商品年度'));
    box.appendChild(tabBar);

    // 列表只露约 3.5 行（露半行提示可滑），多出的区块内滚动——让下面的大师战役露头
    if (lobbyView.tab === 'annual') {
      box.appendChild(H().el('div', 'sec-sub tab-sub', '一年一局 · 大盘×行业轮动 · 看清那年钱往哪走'));
      var anScroll = H().el('div', 'market-scroll' + (annuals.length > 3 ? ' scrollable' : ''));
      annuals.forEach(function (c) { renderMarketRow(c, save, anScroll); });   // 年份倒序紧凑行卡
      box.appendChild(anScroll);
    } else if (lobbyView.tab === 'us') {
      if (usAnnuals.length) {
        box.appendChild(H().el('div', 'sec-sub tab-sub', '百年美股 · 标普×行业轮动 · 看清钱往哪走'));
        var usScroll = H().el('div', 'market-scroll' + (usAnnuals.length > 3 ? ' scrollable' : ''));
        usAnnuals.forEach(function (c) { renderMarketRow(c, save, usScroll); });
        box.appendChild(usScroll);
      } else {
        box.appendChild(H().el('div', 'sec-sub tab-sub', '百年美股复盘 · 即将上线，敬请期待'));
      }
    } else if (lobbyView.tab === 'commodity') {
      if (commodities.length) {
        box.appendChild(H().el('div', 'sec-sub tab-sub', '国内商品期货 · 多品种多空轮动 · 看清那年钱在哪个品种'));
        var coScroll = H().el('div', 'market-scroll' + (commodities.length > 3 ? ' scrollable' : ''));
        commodities.forEach(function (c) { renderMarketRow(c, save, coScroll); });
        box.appendChild(coScroll);
      } else {
        box.appendChild(H().el('div', 'sec-sub tab-sub', '商品年度全景复盘 · 即将上线，敬请期待'));
      }
    } else {
      box.appendChild(H().el('div', 'sec-sub tab-sub', '股灾 · 大萧条 · 熔断——亲历全民事件'));
      var mkList = sortedMarkets();
      var mkScroll = H().el('div', 'market-scroll' + (mkList.length > 3 ? ' scrollable' : ''));
      mkList.forEach(function (c) { renderMarketRow(c, save, mkScroll); });
      box.appendChild(mkScroll);
    }

    // （3）大师战役：以人为主体的网格，点开看 TA 的全部剧本
    box.appendChild(H().el('div', 'sec-head',
      '<h2>大师战役</h2><div class="sec-sub">跟着大师的真实操作，重走他们的至暗与高光</div>'));
    var grid = H().el('div', 'master-grid');
    MASTERS.forEach(function (ms) {
      var list = CASES.filter(function (c) { return c.master === ms.id; });
      if (!list.length) return;
      var playable = list.filter(function (c) { return MR.store.canPlay(c) && !c.soon; }).length;
      var tile = H().el('div', 'master-tile',
        '<img class="mt-avatar" src="' + MR.av(ms.avatar) + '" alt="">' +
        '<div class="mt-name">' + H().esc(ms.name) + '</div>' +
        '<div class="mt-tag">' + H().esc(ms.tagline) + '</div>' +
        '<div class="mt-count">' + list.length + ' 个战役' + (playable ? ' · ' + playable + ' 可玩' : '') + '</div>');
      tile.onclick = function () { lobbyView.master = ms.id; renderLobby(); window.scrollTo(0, 0); };
      grid.appendChild(tile);
    });
    box.appendChild(grid);

    $('lobby-invite').onclick = function () { showUnlock(null); };
    $('lobby-redeem').onclick = function () { showRedeem(); };
  }

  /* ---------- 解锁 ----------
   * 点了哪个剧本，就生成哪个剧本的邀请函；转发动作自动检测（离开页面再回来），
   * 转发成功只解锁这个剧本。兑换码解锁全部。
   */
  /* 转发解锁：先弹邀请海报让他去转发；不立即解锁——离开页面再回来 / 保存 / 复制 / 点「我已分享」后才解锁（见 showInvitePoster） */
  function shareUnlock(c) {
    if (MR.track) MR.track('share_unlock_open', { caseId: c.id });
    MR.makeInvitePoster(c, function (url) { showInvitePoster(c, url); });
  }

  function showUnlock(c) {
    if (MR.WECHAT) { showRedeem(); return; }   // 微信版：关闭转发=解锁，统一走兑换码（避诱导分享）
    if (typeof c === 'string' || !c) {
      // 大厅底部入口：先让用户挑一个想要的剧本（点剧本卡进来的不会走这里）
      var locked = CASES.filter(function (x) { return !MR.store.canPlay(x); });
      if (!locked.length) { showRedeem(); return; }
      var html0 = '<h3>解锁更多战役</h3><div class="m-sub">选一关扫码购买，或直接全部解锁</div>';
      locked.forEach(function (x, i) {
        html0 += '<button class="dec-opt" data-i="' + i + '">' + H().esc(x.title) + '<span class="do-hint">' + H().esc(x.era) + '</span></button>';
      });
      html0 += '<button class="btn gold block" id="ul-redeem-entry">🛒 直接全部解锁 / 已有会员码</button>';
      var m0 = H().modal(html0, { dismiss: true });
      m0.box.querySelectorAll('.dec-opt').forEach(function (b) {
        b.onclick = function () { m0.close(); showUnlock(locked[parseInt(b.getAttribute('data-i'), 10)]); };
      });
      m0.box.querySelector('#ul-redeem-entry').onclick = function () { m0.close(); showRedeem(); };
      return;
    }
    var html = '<h3>解锁《' + H().esc(c.title) + '》</h3>' +
      '<div class="unlock-opt" style="border-color:rgba(63,185,80,.45)"><h5>🎁 转发给好友，解锁一起玩 · 免费</h5>' +
      '<p>把这一局的邀请海报 / 链接转发给好友或群，你和好友都能免费玩这一局。</p>' +
      '<button class="btn gold block" id="ul-share">🎁 转发解锁 · 免费一起玩</button></div>' +
      '<div class="unlock-opt"><h5>🛒 扫码购买 · 付完自动解锁</h5>' +
      '<p>微信扫码进「人人复盘」小程序付款，付完本页自动解锁，无需手输。</p>' +
      '<button class="btn gold block" id="ul-buy-this">🛒 只买这一关 ¥2.99</button>' +
      '<button class="btn gold block" id="ul-buy-all" style="margin-top:8px">🛒 全部解锁 ¥99 · 更划算（含后续更新）</button></div>' +
      '<div class="unlock-opt"><h5>🔑 已在小程序买过？输会员码</h5>' +
      '<div class="wx-badge">小程序购买后获得会员码，或加微信 <b>sparkle2011</b><button class="wx-copy" type="button" data-copy="sparkle2011">复制</button> 获取</div>' +
      '<input class="code-input" id="ul-code" placeholder="MS-XXXX-XXXX" autocapitalize="characters">' +
      '<button class="btn primary block" id="ul-redeem">解锁</button></div>';
    var m = H().modal(html, { dismiss: true });
    m.box.querySelector('#ul-share').onclick = function () { m.close(); shareUnlock(c); };
    m.box.querySelector('#ul-buy-this').onclick = function () { m.close(); showScanPay(c); };
    m.box.querySelector('#ul-buy-all').onclick = function () { m.close(); showScanPay(null); };
    m.box.querySelector('#ul-redeem').onclick = function () {
      var _b = this; _b.disabled = true; _b.textContent = '验证中…';
      MR.store.redeem(m.box.querySelector('#ul-code').value, function (r) {
        _b.disabled = false; _b.textContent = '解锁';
        if (r.ok) { m.close(); UI.toast('解锁成功！全部剧本已解锁 🎉'); renderLobby(); }
        else UI.toast(r.msg, true);
      });
    };
  }

  /* ---------- 前20%奖励：免费券领新剧本 + 赠送好友 ---------- */
  // 从战报「回大厅·任选一个新剧本」进入免费券模式
  MR.startFreePick = function () {
    freePickMode = MR.store.rewardVouchers() > 0;
    showLobby();
    window.scrollTo(0, 0);
    if (freePickMode) UI.toast('点任意带 🔒 的剧本，免费解锁 🎟');
    else UI.toast('暂无可用名额，再进一次前20%可得', true);
  };
  // 锁定剧本被点击：免费券模式下=用券免费解锁；否则走原付费/转发解锁
  function onLockedClick(c) {
    if (freePickMode && MR.store.rewardVouchers() > 0) { redeemWithVoucher(c); return; }
    showUnlock(c);
  }
  function redeemWithVoucher(c) {
    var m = H().modal('<h3>🎟 用 1 个名额免费解锁</h3>' +
      '<p style="font-size:13px;color:#8b949e;line-height:1.65">这是你打进前 20% 赢得的奖励。<br>将<b style="color:#f0c040">永久解锁</b>《' + H().esc(c.title) + '》，无需付费。<br>当前可用名额 ' + MR.store.rewardVouchers() + ' 个。</p>' +
      '<button class="btn gold block" id="fp-ok">✓ 免费解锁并开打</button>' +
      '<button class="btn block" id="fp-cancel">再看看别的</button>', { dismiss: true });
    m.box.querySelector('#fp-ok').onclick = function () {
      if (MR.store.redeemVoucher(c.id)) {
        m.close();
        UI.toast('已免费解锁《' + c.title + '》🎉');
        if (MR.store.rewardVouchers() <= 0) freePickMode = false;
        startCase(c);
      } else { m.close(); UI.toast('名额不足', true); }
    };
    m.box.querySelector('#fp-cancel').onclick = m.close;
  }

  // 赠送好友：生成该局的赠送海报 + ?gift= 永久解锁链接；好友打开即免费解锁这一局。5 位名额软计数。
  MR.giftCase = function (c) {
    if (!c) return;
    if (MR.store.giftLeft(c.id) <= 0) { UI.toast('这一局的 ' + MR.store.GIFT_MAX + ' 个赠送名额已用完', true); return; }
    var link = 'https://marketbattles.com/?gift=' + c.id;
    MR.makeInvitePoster(c, function (url) {
      var m = H().modal('<h3>🎁 赠送《' + H().esc(c.chip || c.title) + '》</h3>' +
        '<img id="poster-img" src="' + url + '">' +
        '<div class="save-hint">你打进了前 20%，可把这一局免费送给好友。<br>⬇ 保存海报 或 ↗ 复制链接 → 发给好友 → 好友打开即<b style="color:#3fb950">免费解锁</b>这一局<br>赠送名额还剩 <b id="gf-left">' + MR.store.giftLeft(c.id) + '</b> / ' + MR.store.GIFT_MAX + ' 位</div>' +
        '<div class="ul-actions"><button class="btn gold" id="gf-save">⬇ 保存海报</button><button class="btn gold" id="gf-copy">↗ 复制链接</button></div>' +
        '<button class="btn block" id="gf-close">关闭</button>', { dismiss: true });
      function consume(after) {
        if (MR.store.giftLeft(c.id) <= 0) { UI.toast('赠送名额已用完', true); return; }
        after();
        MR.store.useGift(c.id);   // 每完成一次「保存/复制」算赠送出 1 位（软计数）
        var nl = MR.store.giftLeft(c.id);
        var le = m.box.querySelector('#gf-left'); if (le) le.textContent = nl;
        if (nl <= 0) { UI.toast('5 位赠送名额已全部用完 🎁'); m.close(); }
      }
      m.box.querySelector('#gf-save').onclick = function () { consume(function () { saveDataUrl(url, (c.chip || 'gift') + '-赠送.png'); }); };
      m.box.querySelector('#gf-copy').onclick = function () { consume(function () { MR.copyText(link, '赠送链接已复制 ✓ 发给好友即免费解锁'); }); };
      m.box.querySelector('#gf-close').onclick = m.close;
    }, { gift: true });
  };

  /* 邀请海报 + 解锁：微信靠长按转发（visibilitychange 自动检测）；雪球/知乎/星球等非微信内置浏览器
     长按存不下也不会离开页面，所以另给「保存海报」「复制链接」，做过分享动作即可点「我已分享」解锁。 */
  function saveDataUrl(url, filename) {
    try {
      var a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      UI.toast('已保存，去相册 / 文件里找 ✓');
    } catch (e) {
      try { window.open(url, '_blank'); } catch (e2) {}
      UI.toast('长按上方海报即可保存图片', true);
    }
  }
  // 转发解锁待办标记：做过分享动作（长按转发/保存/复制 → 多半会离开页面）就写盘。
  // 关键：手机离开页面常把页面丢弃/重载，内存里的 shared 标记会丢 → 单靠 visibilitychange 解不了锁。
  // 写进 localStorage，回来时无论页面是否重载，都能在 boot() 里补解锁（见下方 boot 内的检查）。
  var PENDING_UNLOCK_KEY = 'mr_pending_unlock';
  function markPendingUnlock(id) { lsSet(PENDING_UNLOCK_KEY, id); }
  function clearPendingUnlock() { try { localStorage.removeItem(PENDING_UNLOCK_KEY); } catch (e) {} }
  function showInvitePoster(c, url) {
    var shared = false;
    var link = 'https://marketbattles.com/?case=' + c.id;
    var m2 = H().modal('<h3>🎁 转发《' + H().esc(c.chip || c.title) + '》，解锁一起玩</h3>' +
      '<img id="poster-img" src="' + url + '">' +
      '<div class="save-hint"><b>复制 / 转发海报给好友 → <span style="color:#3fb950">自动解锁这一关</span></b><br>（长按上方海报或点「复制链接」，发给好友或群；你和好友都能免费玩）<br>转发完回到本页即自动解锁，无需手动操作</div>' +
      '<div class="ul-actions"><button class="btn gold" id="ul-save">⬇ 保存海报</button><button class="btn gold" id="ul-copy">↗ 复制链接</button></div>' +
      '<button class="btn primary block" id="ul-done">我已分享，解锁这一关</button>');
    function cleanup() { document.removeEventListener('visibilitychange', onVis); }
    function markShared() { shared = true; markPendingUnlock(c.id); }   // 做过分享动作即落盘，离开页面也不丢
    function unlock() {
      cleanup();
      clearPendingUnlock();
      MR.store.unlockCase(c.id);
      m2.close();
      UI.toast('已解锁《' + c.title + '》🎉');
      renderLobby();
    }
    function onVis() {   // 微信长按转发会离开页面，回来即自动解锁
      if (document.visibilityState === 'hidden') { markShared(); return; }   // 离开 = 去转发了，落盘
      if (shared) unlock();
    }
    document.addEventListener('visibilitychange', onVis);
    m2.box.querySelector('#ul-save').onclick = function () { markShared(); saveDataUrl(url, (c.chip || 'invite') + '-邀请函.png'); };
    m2.box.querySelector('#ul-copy').onclick = function () { markShared(); MR.copyText(link, '邀请链接已复制 ✓ 去雪球 / 知乎 / 星球粘贴分享'); };
    m2.box.querySelector('#ul-done').onclick = function () {
      if (shared) unlock();
      else UI.toast('先「保存海报」或「复制链接」分享出去，再点解锁', true);
    };
    m2.mask.onclick = function (ev) { if (ev.target === m2.mask) { cleanup(); m2.close(); } };
  }

  function showRedeem() {
    var m = H().modal('<h3>🔑 解锁全部剧本</h3>' +
      '<p style="font-size:12.5px;color:#8b949e">解锁全部剧本 + 后续每一个新剧本（持续更新）。</p>' +
      '<button class="btn gold block" id="ul-scan">🛒 扫码购买 · 付完自动解锁</button>' +
      '<div style="text-align:center;color:#8b949e;font-size:12px;margin:12px 0 8px">— 或，已在小程序买过、有会员码 —</div>' +
      '<input class="code-input" id="ul-code" placeholder="MS-XXXX-XXXX" autocapitalize="characters">' +
      '<button class="btn primary block" id="ul-redeem">解锁</button>', { dismiss: true });
    m.box.querySelector('#ul-redeem').onclick = function () {
      var _b = this; _b.disabled = true; _b.textContent = '验证中…';
      MR.store.redeem(m.box.querySelector('#ul-code').value, function (r) {
        _b.disabled = false; _b.textContent = '解锁';
        if (r.ok) { m.close(); UI.toast('解锁成功！全部剧本已解锁 🎉'); renderLobby(); }
        else UI.toast(r.msg, true);
      });
    };
    var _sc = m.box.querySelector('#ul-scan'); if (_sc) _sc.onclick = function () { m.close(); showScanPay(null); };
  }

  /* 扫码购买 · 自动解锁：显示小程序码 → 微信扫码进「人人复盘」小程序付款 → 后端按 webToken 标记已付 → 本页轮询到即自动解锁。
     caseObj 传入=买单剧本，null=全解锁。需小程序端配合：扫码读 scene(=webToken[~caseId]) → 下单带 webToken。 */
  function showScanPay(caseObj) {
    var token = MR.store.getWebToken();
    var scene = caseObj ? (token + '~' + caseObj.id).slice(0, 32) : token;   // scene≤32字符；带 caseId 让小程序定位买哪一关
    var qrUrl = 'https://master-ai.cn/wgame/pay/wxacode?scene=' + encodeURIComponent(scene) + '&page=' + encodeURIComponent('pages/lobby/lobby');
    var what = caseObj ? ('购买《' + H().esc(caseObj.chip || caseObj.title) + '》') : '解锁全部剧本（¥99）';
    var m = H().modal('<h3>🛒 扫码购买 · 自动解锁</h3>' +
      '<p style="font-size:12.5px;color:#8b949e">微信扫下方小程序码 → 在「人人复盘」小程序付款 → <b style="color:#3fb950">本页自动解锁</b>，无需手输。手机上可长按图片识别。</p>' +
      '<img src="' + qrUrl + '" style="width:200px;height:200px;display:block;margin:14px auto;border-radius:12px;background:#fff;padding:8px" alt="小程序码">' +
      '<p style="font-size:12px;color:#8b949e;text-align:center">' + what + '<br>付款成功后这里会自动解锁 🎉</p>', { dismiss: true });
    var stop = false;
    var origClose = m.close; m.close = function () { stop = true; origClose.call(m); };
    (function poll() {
      if (stop) return;
      var x = new XMLHttpRequest();
      x.open('GET', 'https://master-ai.cn/wgame/pay/webtoken/status?token=' + encodeURIComponent(token) + '&t=' + Date.now(), true);
      x.timeout = 8000;
      x.onload = function () {
        if (stop) return;
        var r = {}; try { r = JSON.parse(x.responseText || '{}'); } catch (e) {}
        if (r.paid) { stop = true; MR.store.applyUnlock(r.sku, r.all); try { origClose.call(m); } catch (e) {} UI.toast('解锁成功！🎉'); renderLobby(); return; }
        setTimeout(poll, 3000);
      };
      x.onerror = x.ontimeout = function () { if (!stop) setTimeout(poll, 4000); };
      x.send();
    })();
  }

  /* ---------- 个人中心 ---------- */
  function showProfile() {
    var save = MR.store.get();
    var prof = save.profile || {};
    var results = Object.keys(save.results || {});
    var doneHtml = results.length
      ? results.map(function (id) {
          var r = save.results[id];
          var meta = null;
          CASES.forEach(function (x) { if (x.id === id) meta = x; });
          return '<div>· ' + H().esc(meta ? meta.title : id) + '：<b>' + (r.ret >= 0 ? '+' : '') + r.ret + '%</b>' + (r.rank ? ' · 第' + r.rank + '名/击败' + r.beat + '%' : '') + ' · ' + H().esc(r.persona || '') + '</div>';
        }).join('')
      : '<div>还没有完成任何战役</div>';
    var m = H().modal('<h3>👤 个人中心</h3>' +
      '<div class="prof-field"><label>昵称（显示在战绩海报上）</label><input id="pf-name" maxlength="12" placeholder="未来的大师" value="' + H().esc(prof.name || '') + '"></div>' +
      '<div class="prof-field"><label>手机 / 邮箱（用于跨设备同步战绩、预约新剧本通知）</label><input id="pf-contact" placeholder="手机号或邮箱" value="' + H().esc(prof.contact || '') + '"></div>' +
      '<div class="prof-results"><b>我的战绩</b>' + doneHtml + '</div>' +
      '<div style="font-size:11.5px;color:#8b949e;margin-bottom:6px">新剧本持续上新中，留下联系方式第一时间收到预约通知。</div>' +
      '<button class="btn primary block" id="pf-save">保存</button>', { dismiss: true });
    m.box.querySelector('#pf-save').onclick = function () {
      MR.store.setProfile({
        name: m.box.querySelector('#pf-name').value.trim(),
        contact: m.box.querySelector('#pf-contact').value.trim()
      });
      m.close();
      UI.toast('已保存 ✓');
    };
  }

  /* ---------- 剧本加载 ---------- */
  function getJSON(url, cb, onerr) {
    var x = new XMLHttpRequest();
    x.open('GET', url + (url.indexOf('?') < 0 ? '?v=' + (window.MR_V || '1') : ''), true);
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300) {
        try { cb(JSON.parse(x.responseText)); } catch (e) { onerr('数据解析失败'); }
      } else onerr('加载失败 ' + x.status);
    };
    x.send();
  }

  var state = { meta: null, caseData: null, engine: null, mode: 'fast', started: false };

  function startCase(meta) {
    document.body.classList.add('playing');
    getJSON(meta.dir + 'case.json', function (caseData) {
      // 价格文件统一放 prices/ 子目录；剧本里写裸文件名也兼容
      var files = (caseData.priceFiles || []).map(function (f) {
        return f.indexOf('/') < 0 ? 'prices/' + f : f;
      });
      var jsons = [], left = files.length;
      if (!left) { UI.toast('剧本缺少行情数据', true); return; }
      files.forEach(function (f, i) {
        getJSON(meta.dir + f, function (j) {
          jsons[i] = j;
          if (--left === 0) bootCase(meta, caseData, jsons);
        }, function (msg) { UI.toast(msg, true); });
      });
    }, function (msg) { UI.toast(msg, true); });
  }

  function bootCase(meta, caseData, priceJsons) {
    if (MR.track) MR.track('case_start', { caseId: caseData.id, caseTitle: caseData.title });
    if (MR.markLoc) MR.markLoc('opening', caseData.id);   // 流失追踪：进入开局阅读
    state.meta = meta;
    state.caseData = caseData;
    state.engine = new MR.Engine(caseData, priceJsons);
    state.started = false;
    UI.resetResearch();
    wireEngine(state.engine, caseData);
    $('lobby').classList.add('hidden');
    $('recap-layer').classList.add('hidden');   // 再来一局时复盘层必须收起
    // 精简开局：模式选择 →（深度：先读研报）→ 一页合并开局（开场钩子 + 多空声音 + 编辑部之问）→ 选品种 → 直接交易
    UI.showModeSelect(caseData, function (mode) {
      state.mode = mode;
      var open = caseData.opening || {};
      var act1 = (caseData.acts && caseData.acts[0]) || {};
      // 合并幕：用开场白叙事（角色/钩子/对话）+ act1 的多空声音与「编辑部之问」，复用报纸样式，去掉开场白与一页简报两张重复页
      var introAct = {
        title: open.title || act1.title,
        scene: {
          title: open.title || (act1.scene && act1.scene.title),
          dateLabel: open.dateLabel || (act1.scene && act1.scene.dateLabel),
          mood: open.mood || (act1.scene && act1.scene.mood),
          lines: (open.lines && open.lines.length) ? open.lines : ((act1.scene && act1.scene.lines) || [])
        },
        events: act1.events || [],
        expectation: act1.expectation
      };
      var enterTrade = function () {
        UI.pickInstrument(caseData, function (instrId) {
          if (instrId) UI.setPreferredInstr(instrId);
          state.engine.actIdx = 0;
          UI.enterTerminal(state.engine, caseData, hb);
          if (MR.markLoc) MR.markLoc('trading', caseData.id);   // 流失追踪：进入交易
          state.started = true;
          state.engine.play();
          armHb();
        });
      };
      var showIntro = function () { UI.showNewspaper(caseData, introAct, 0, enterTrade); };
      if (mode === 'deep') UI.showResearchSelect(caseData, showIntro);   // 深度：先读研报，再看合并开局页
      else showIntro();
    });
  }

  /* ---------- 蒙眼实战（盲盘）：匿名简报 → 直接进盘面 → 结束揭晓 ---------- */
  MR.bootBlindCase = function (caseData, priceJsons) {
    if (MR.track) MR.track('blind_start', { caseId: caseData.id });
    state.meta = null;
    state.caseData = caseData;
    state.engine = new MR.Engine(caseData, priceJsons);
    state.started = false;
    state.mode = 'fast';
    UI.resetResearch();
    wireEngine(state.engine, caseData);
    $('lobby').classList.add('hidden');
    $('recap-layer').classList.add('hidden');
    // 匿名简报 → 进盘面播放（跳过模式/品种/报纸）
    MR.showBlindBriefing(caseData, function () {
      UI.enterTerminal(state.engine, caseData, hb);
      if (MR.markLoc) MR.markLoc('trading', caseData.id);   // 流失追踪：进入交易（盲盒）
      state.started = true;
      state.engine.play();
      armHb();
    });
  };

  function showFastBrief(caseData, cb) {
    var lines = (caseData.fastBrief || []).map(function (l) { return '<div class="scene-line show">' + H().esc(l) + '</div>'; }).join('');
    var m = H().modal('<h3>⚡ 一页简报</h3>' + lines + '<button class="btn primary block">明白了，开盘</button>');
    m.box.querySelector('button.btn').onclick = function () { m.close(); cb(); };
  }

  /* ---------- 幕流程：报纸头版开幕（自动播放 + 一键开盘） ---------- */
  function startActFlow(actIdx) {
    var cd = state.caseData;
    var act = cd.acts[actIdx];
    UI.showNewspaper(cd, act, actIdx, function (exp) {
      state.engine.actIdx = actIdx;
      if (exp) state.engine.recordExpectation(exp);
      UI.enterTerminal(state.engine, cd, hb);
      if (MR.markLoc) MR.markLoc('trading', cd.id);   // 流失追踪：进入交易（分幕）
      state.started = true;
      state.engine.play();
      armHb();
    });
  }

  /* ---------- 引擎接线 ---------- */
  function wireEngine(engine, caseData) {
    engine.on('tick', function () {
      UI.onTick();   // K线 + 持仓市值同节奏刷新
    });
    engine.on('day', function () {
      UI.refreshHud();
      UI.refreshTabsPrice();
      UI.drawChart();
    });
    engine.on('event', function (e) {
      if (e.type === 'decision') {
        UI.showDecision(e, engine, function () { engine.play(); });
      } else {
        UI.pushMsg(e);
      }
    });
    engine.on('trade', function () { UI.refreshAll(); });
    engine.on('eod', function (p) {
      UI.applyPressure(p.pressure);
    });
    engine.on('playstate', function (playing) {
      UI.refreshHud();
      hb.setPaused(!playing);   // 暂停时心跳声同步停
    });
    // 连续模式：不再分幕暂停（actEnd/actStart 已停用），行情一路播到底，只在开场一次报纸、终局一次复盘
    engine.on('finish', function () {
      if (MR.markLoc && caseData) MR.markLoc('recap', caseData.id);   // 流失追踪：到达复盘页
      hb.setPressure(0);
      hb.setPaused(true);
      $('vignette').style.opacity = 0;
      if (caseData.blind) {   // 行情盲盒：先揭晓真身，再走完整复盘（六维/净值/大师轨迹/教训）
        MR.showRecap(engine, caseData, { mode: 'fast', blind: caseData.blind }, {
          onRetry: function () { MR.startBlind(); },
          onLobby: showLobby
        });
        return;
      }
      MR.showRecap(engine, caseData, { mode: state.mode, researchRead: UI.getResearchRead(), researchStats: UI.getResearchStats() }, {
        onRetry: function () { startCase(state.meta); },
        onLobby: showLobby
      });
    });
  }

  /* ---------- 退出回大厅（所有层的 ‹ 返回统一走这里） ---------- */
  /* silent=true 时不弹确认（开局前的流程弹窗里点退出，不用再问一遍） */
  MR.requestExit = function (silent) {
    function doExit() {
      if (state.engine) { state.engine.pause(); }
      hb.setPaused(true); hb.setPressure(0);
      // 清掉所有浮层：报纸 / 弹窗 / 全屏阅读
      document.querySelectorAll('.paper-mask, .modal-mask').forEach(function (x) {
        if (x.parentNode) x.parentNode.removeChild(x);
      });
      $('research-full').classList.add('hidden');
      $('research-full').innerHTML = '';
      $('vignette').style.opacity = 0;
      showLobby();
    }
    if (silent) { doExit(); return; }
    var m = H().modal('<h3>退出本局？</h3>' +
      '<p style="font-size:13px;color:#8b949e">本局进度不会保存，剧本随时可以重新开。</p>' +
      '<div class="btn-row"><button class="btn" id="ex-stay">继续体验</button>' +
      '<button class="btn primary" id="ex-go">退出回大厅</button></div>', { dismiss: true });
    m.box.querySelector('#ex-stay').onclick = m.close;
    m.box.querySelector('#ex-go').onclick = function () { m.close(); doExit(); };
  };

  /* ---------- 启动 ---------- */
  function applyTheme(t) {
    document.body.classList.toggle('light', t === 'light');
    var btn = $('theme-fab');
    if (btn) btn.textContent = t === 'light' ? '🌙' : '☀';
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch(e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }
  function initThemeFab() {
    var t = lsGet('mr_theme') || 'dark';
    applyTheme(t);
    var btn = $('theme-fab');
    if (!btn) return;
    btn.onclick = function () {
      t = t === 'dark' ? 'light' : 'dark';
      applyTheme(t);
      lsSet('mr_theme', t);
    };
  }

  function initProfileFab() {
    if ($('profile-fab')) return;
    var fab = H().el('button', '');
    fab.id = 'profile-fab';
    fab.type = 'button';
    fab.textContent = '👤';
    fab.onclick = showProfile;
    document.body.appendChild(fab);
  }

  /* 一键复制（微信号等）：优先 Clipboard API，微信 XWEB 不支持时回退 execCommand */
  MR.copyText = function (text, okMsg) {
    function done() { UI.toast(okMsg || '已复制 ✓'); }
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-9999px'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        ta.setSelectionRange(0, text.length);
        document.execCommand('copy'); document.body.removeChild(ta); done();
      } catch (e) { UI.toast('请手动复制：' + text, true); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
  };

  /* 微信合规模式：仅微信内浏览器降级文案（标题→人人复盘、去"实战/亲手交易/微信"、关转发解锁入口） */
  function applyWechatMode() {
    if (!MR.WECHAT) return;
    document.title = '投资历史案例研习 · 人人复盘';
    var h1 = document.querySelector('#lobby .brand h1');
    if (h1) h1.textContent = '人人复盘';
    var sub = document.querySelector('#lobby .brand .sub');
    if (sub) sub.textContent = '重返历史现场 · 理解大师决策 · 教育研习';
    var fav = document.querySelector('.fav-tip');
    if (fav) fav.innerHTML = '★ 收藏本页，下次继续 · 投资历史案例研习';
    var inv = document.getElementById('lobby-invite');
    if (inv) inv.style.display = 'none';   // 微信版去「转发邀请函解锁」入口
    var disc = document.getElementById('disclaimer');
    if (disc) disc.textContent = '📚 历史复盘 · 模拟交易，不涉及真实资金 · 不构成投资建议';
  }

  function boot() {
    window.MR_V = '20260628e';
    initThemeFab();
    initProfileFab();
    applyWechatMode();
    // 微信号等「复制」按钮：事件委托，任意弹窗内的 .wx-copy 均生效
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t && t.classList && t.classList.contains('wx-copy')) {
        ev.preventDefault();
        MR.copyText(t.getAttribute('data-copy') || '', t.getAttribute('data-msg') || '已复制到剪贴板 ✓');
      }
    });
    $('t-back').onclick = function () { MR.requestExit(); };
    $('scene-back').onclick = function () { MR.requestExit(); };
    // URL 直达：?code= 兑换；?case= 直接开局
    var q = {};
    location.search.replace(/[?&]([^=&]+)=([^&]*)/g, function (_, k, v) { q[k] = decodeURIComponent(v); });
    if (q.code) {
      MR.store.redeem(q.code, function (r) { if (r.ok) { UI.toast('解锁成功！全部剧本已解锁 🎉'); renderLobby(); } });
    }
    // 转发解锁补刀：上次做过分享动作但页面被手机丢弃/重载，没来得及解锁 → 这次进来补上。
    try {
      var pend = lsGet(PENDING_UNLOCK_KEY);
      if (pend) {
        clearPendingUnlock();
        var pc = null;
        for (var pi = 0; pi < CASES.length; pi++) { if (CASES[pi].id === pend) { pc = CASES[pi]; break; } }
        if (pc && !MR.store.get().unlock.paid && !MR.store.get().unlock.cases[pend]) {
          MR.store.unlockCase(pend);
          setTimeout(function () { UI.toast('转发成功，已解锁《' + pc.title + '》🎉'); }, 500);
        }
      }
    } catch (e) {}
    showLobby();
    // 底部小版本号：方便排查"是否加载到新版"（旧缓存会显示旧号）
    try { var _dc = document.getElementById('disclaimer'); if (_dc && _dc.textContent.indexOf(window.MR_V) < 0) _dc.textContent += ' · ' + window.MR_V; } catch (e) {}
    if (q.gift) {
      // 好友赠送链接（前20%奖励）：永久解锁这一局并直接开打（与 ?case= 临时进入不同，这是永久解锁）。
      for (var gi = 0; gi < CASES.length; gi++) {
        if (CASES[gi].id === q.gift && !CASES[gi].soon) {
          MR.store.unlockCase(CASES[gi].id);
          if (MR.track) MR.track('gift_recv', { caseId: CASES[gi].id });
          UI.toast('🎁 好友送你《' + CASES[gi].title + '》，已永久解锁！');
          renderLobby();
          startCase(CASES[gi]);
          break;
        }
      }
    }
    if (q.case && !q.gift) {
      // 邀请函/剧本链接直达：即使该局锁定，也免解锁直接开玩这一局（收到邀请的人专属的免费门）。
      // 但不写入 unlock.cases——回到大厅其他局仍锁着，这一局也只有靠链接进，不是永久解锁。
      for (var i = 0; i < CASES.length; i++) {
        if (CASES[i].id === q.case && !CASES[i].soon) { startCase(CASES[i]); break; }
      }
    }
    window.addEventListener('resize', function () {
      if (state.started && !$('terminal-layer').classList.contains('hidden')) UI.drawChart();
    });
  }

  // 微信 XWEB：脚本可能在 DOMContentLoaded 后才执行，readyState 兜底
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
