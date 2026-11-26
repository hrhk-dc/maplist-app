(function () {
  'use strict';

  // ---------- 小さな道具 ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = window.VLA_DATA;

  // ---------- 日付（すべて日本時間 JST 基準） ----------
  const JST_MS = 9 * 3600 * 1000;
  const pad = (n) => String(n).padStart(2, '0');
  const WD_JP = ['日', '月', '火', '水', '木', '金', '土'];
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 月曜始まりで表示
  const ymdOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  const todayJst = () => ymdOf(new Date(Date.now() + JST_MS));
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); return ymdOf(new Date(Date.UTC(y, m - 1, d + n))); };
  const wdOf = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  const weekKey = (s) => DAY_KEYS[wdOf(s)];
  const fmtDate = (s) => { const [, m, d] = s.split('-').map(Number); return `${m}月${d}日（${WD_JP[wdOf(s)]}）`; };
  const NOW_YEAR = Number(todayJst().slice(0, 4));

  // ---------- 定数 ----------
  const RADIUS = [
    ['500m', '500m', 500],
    ['1km', '1km', 1000],
    ['2km', '2km', 2000],
    ['3km', '3km', 3000],
    ['town', '町名まるごと', 1500], // 町名まるごとの実際の範囲はバックエンドで決める（仮の値）
  ];
  const COUNTS = [3, 5, 10, 15, 20];
  const ITEM_H = 44;
  const REASONS_BLOCK = ['出禁', '廃業・閉店', 'ターゲット外'];
  const SCREENS = ['search', 'proposal', 'list', 'later'];
  const NAV = [['search', '検索', 'search'], ['proposal', '提案', 'target'], ['list', '訪問リスト', 'list'], ['later', '後で訪問', 'later']];
  const SITE_URL = 'https://kanryohkk-app.pages.dev';

  // ---------- 線のアイコン（1.5px・塗りつぶしなし） ----------
  const ICON_PATHS = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    later: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
    map: '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    cal: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    insta: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h.01"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>',
    gps: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/>',
    block: '<circle cx="12" cy="12" r="8.5"/><path d="M6 18L18 6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  const ic = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;

  // ---------- 保存（端末内。訪問リストの本番保存は別途） ----------
  const LS = {
    get(k, def) { try { const v = localStorage.getItem('vla:' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('vla:' + k, JSON.stringify(v)); } catch (e) { /* 保存できない端末では無視 */ } },
  };

  // ---------- おすすめの点数（基準は暫定。バックエンド担当と確定させる） ----------
  const KEYS = ['rating', 'reviews', 'fresh', 'fit'];
  const W = { rating: 0.25, reviews: 0.25, fresh: 0.2, fit: 0.3 };
  const LABEL = { rating: '評価', reviews: '口コミ', fresh: '新しさ', fit: '成約しやすさ' };
  const CRIT = {
    rating: '4.5以上＝5点／4.0以上＝4点／3.5以上＝3点／3.0以上＝2点／それ未満＝1点',
    reviews: '200件以上＝5点／100件以上＝4点／50件以上＝3点／10件以上＝2点／9件以下＝1点',
    fresh: '開業2年以内＝5点／5年以内＝4点／10年以内＝3点／20年以内＝2点／それ以上＝1点。開業年が分からない店は3点（中立）',
    fit: '従業員5名以下＝5点／10名以下＝4点／30名以下＝3点／それ以上＝2点。従業員数が分からない店は3点（中立）',
  };
  const WHY = {
    rating: '口コミ評価が高く、店の信頼が見込める',
    reviews: '口コミが多く、集客の実績がある',
    fresh: '新しく開業した店は、取引先を探している可能性が高い',
    fit: '規模が小さく、オーナーが直接決めやすい',
  };

  function subScores(s) {
    const age = NOW_YEAR - s.opened;
    return {
      rating: s.rating >= 4.5 ? 5 : s.rating >= 4 ? 4 : s.rating >= 3.5 ? 3 : s.rating >= 3 ? 2 : 1,
      reviews: s.reviews >= 200 ? 5 : s.reviews >= 100 ? 4 : s.reviews >= 50 ? 3 : s.reviews >= 10 ? 2 : 1,
      // 開業年・従業員数は Google Places に無いので、分からない店は3点（中立）
      fresh: s.opened == null ? 3 : age <= 2 ? 5 : age <= 5 ? 4 : age <= 10 ? 3 : age <= 20 ? 2 : 1,
      fit: s.staff == null ? 3 : s.staff <= 5 ? 5 : s.staff <= 10 ? 4 : s.staff <= 30 ? 3 : 2,
    };
  }

  function evidence(s, k) {
    if (k === 'rating') return `評価 ${s.rating}（5点満点）`;
    if (k === 'reviews') return `口コミ ${s.reviews}件`;
    if (k === 'fresh') return s.opened == null ? '開業年は未取得' : `開業 ${s.opened}年（${NOW_YEAR - s.opened}年目）`;
    return s.staff == null ? '従業員数は未取得' : `従業員 ${s.staff}名`;
  }

  function reasonText(s, k) {
    if (k === 'rating') return `評価 ${s.rating}（口コミ${s.reviews}件）`;
    if (k === 'reviews') return `口コミ${s.reviews}件と実績が多い`;
    if (k === 'fresh') return `${s.opened}年開業の新しい店`;
    return `従業員${s.staff}名の小規模店で決めやすい`;
  }

  function withScores(s) {
    const sub = subScores(s);
    const total5 = KEYS.reduce((a, k) => a + sub[k] * W[k], 0);
    const overall = Math.round(total5 * 2 * 10) / 10;
    // 理由は、データがある項目から選ぶ（未取得の項目は理由にしない）
    const known = KEYS.filter((k) => !(k === 'fresh' && s.opened == null) && !(k === 'fit' && s.staff == null));
    const top = known.slice().sort((a, b) => sub[b] - sub[a]).slice(0, 3);
    return { ...s, sub, total5, overall, reasons: top.map((k) => reasonText(s, k)) };
  }

  const SORTERS = {
    rec: (a, b) => b.overall - a.overall || a.distance - b.distance,
    dist: (a, b) => a.distance - b.distance,
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  };

  // ---------- 状態 ----------
  const today = todayJst();
  const state = {
    area: { mode: 'address', address: '', lat: null, lng: null },
    radius: '1km',
    count: 5,
    date: addDays(today, 1), // 訪問する日（デフォルトは翌日・JST）
    industries: new Set(),   // 検索画面で選んだ業種（空＝全業種）
    indTab: 0,
    presets: LS.get('presets', []),
    user: null,              // ログイン中の利用者（{name}）。未ログインは null
    blocks: [],
    pool: [],                // 検索で取得した候補（おすすめ点つき）
    snap: null,              // 検索時の条件（提案画面の要約用）
    pSort: 'rec',
    pIndustries: new Set(),  // 提案画面の業種絞り込み（空＝全業種）
    openOnly: true,
    expanded: new Set(),
    visit: LS.get('visit', []),  // [{id, shop, visitDate}]
    later: LS.get('later', []),
    listSort: 'default',
    userPos: null,
  };
  let pendingCount = 5;
  let dateCb = null;

  // ---------- 共通の部品 ----------
  const weekRange = (k) => { const d = addDays(today, k); return d; };
  const mapUrl = (s) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + ' ' + s.address)}`;
  const fmtDist = (m) => (m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);
  const isOpenOn = (s, date) => !!s.hours[weekKey(date)];
  const findIn = (list, id) => list.find((x) => x.id === id);
  const findShop = (id) => findIn(state.pool, id) || (findIn(state.visit, id) || {}).shop || (findIn(state.later, id) || {}).shop;
  const inVisit = (id) => state.visit.some((x) => x.id === id);
  const inLater = (id) => state.later.some((x) => x.id === id);
  const industryLabel = (set) => (set.size ? `${set.size}業種` : '全業種');

  function distM(a, b) {
    const R = 6371000, rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function hoursRow(s, date) {
    const wk = date ? weekKey(date) : '';
    return `<div class="hours">${DAY_ORDER.map((i) => {
      const k = DAY_KEYS[i];
      const h = s.hours[k];
      return `<span class="hpill${h ? '' : ' closed'}${k === wk ? ' sel' : ''}"><b>${WD_JP[i]}</b>${h ? esc(h) : '定休日'}</span>`;
    }).join('')}</div>`;
  }

  function dateStrip(sel, act, extra = '') {
    const t = todayJst();
    let h = '';
    for (let k = -2; k <= 7; k++) {
      const d = addDays(t, k);
      const lab = k === 0 ? '今日' : k === 1 ? '明日' : ' ';
      h += `<button class="dchip${d === sel ? ' on' : ''}" data-act="${act}" data-date="${d}" ${extra}><small>${lab}</small><b>${Number(d.slice(5, 7))}/${Number(d.slice(8))}</b><span>${WD_JP[wdOf(d)]}</span></button>`;
    }
    return `<div class="dstrip">${h}</div>`;
  }

  function copyText(text, msg = 'コピーしました') {
    const fallback = () => {
      const t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      t.remove();
      toast(ok ? msg : 'コピーできませんでした');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(msg), fallback);
    } else fallback();
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function openSheet(title, html) {
    const root = $('#sheet');
    root.innerHTML = `<div class="scrim" data-close></div><section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="閉じる">${ic('x')}</button></header><div class="sheet-body">${html}</div></section>`;
    root.hidden = false;
    document.body.classList.add('lock');
    return root;
  }
  function closeSheet() {
    const root = $('#sheet');
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('lock');
    dateCb = null;
  }

  // ---------- 検索画面 ----------
  function renderArea() {
    const a = state.area;
    $('#s-area').innerHTML = `
      <div class="seg two">
        <button class="${a.mode === 'address' ? 'on' : ''}" data-act="area-mode" data-v="address">住所・町名</button>
        <button class="${a.mode === 'gps' ? 'on' : ''}" data-act="area-mode" data-v="gps">現在地</button>
      </div>
      ${a.mode === 'address'
        ? `<label class="field"><span class="sr">住所・町名</span><input id="addr" type="text" placeholder="例：〇〇区〇〇" value="${esc(a.address)}" autocomplete="off"></label>`
        : `<button class="btn wide" data-act="gps">${ic('gps')}${a.lat == null ? '現在地を取得する' : '現在地を取得済み（取り直す）'}</button>
           <p class="hint">${a.lat == null ? '位置情報を許可すると、今いる場所の周りから探します。' : '現在地の周りから探します。'}</p>`}`;
  }

  function renderRadius() {
    $('#s-radius').innerHTML = `<div class="seg scroll">${RADIUS.map(([k, l]) =>
      `<button class="${state.radius === k ? 'on' : ''}" data-act="radius" data-v="${k}">${l}</button>`).join('')}</div>`;
  }

  function renderCount() {
    $('#s-count').innerHTML = `<button class="pick" data-act="count-open"><b>${state.count}</b>件 ${ic('down')}</button>`;
  }

  function renderDate() {
    const el = $('#s-date');
    el.innerHTML = `<p class="date-now">訪問する日：<b>${fmtDate(state.date)}</b></p>${dateStrip(state.date, 'search-date')}`;
    const on = $('.dchip.on', el);
    if (on) on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function renderInd() {
    const g = D.GROUPS[state.indTab];
    const cnt = (gi) => D.GROUPS[gi].items.filter((n) => state.industries.has(n)).length;
    const tabs = D.GROUPS.map((gr, i) => {
      const c = cnt(i);
      return `<button class="htab${i === state.indTab ? ' on' : ''}" data-act="ind-tab" data-i="${i}">${esc(gr.name)}${c ? `<span class="cnt">${c}</span>` : ''}</button>`;
    }).join('');
    const all = g.items.every((n) => state.industries.has(n));
    $('#s-ind').innerHTML = `
      <div class="htabs" role="tablist">${tabs}</div>
      <div class="ind-head"><span class="sub">${esc(g.name)}（${g.items.length}業種）</span>
        <button class="pill-btn${all ? ' on' : ''}" data-act="ind-group">${all ? 'まるごと解除' : 'まるごと選択'}</button></div>
      <div class="chips">${g.items.map((n) => `<button class="chip${state.industries.has(n) ? ' on' : ''}" data-act="ind" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <p class="hint">${state.industries.size ? `選択中 ${state.industries.size}業種` : '未選択なら全業種が対象です'}</p>`;
  }

  function renderPresets() {
    const chips = state.presets.map((p, i) =>
      `<span class="chip preset"><button data-act="preset-apply" data-i="${i}">${esc(p.name)}</button><button class="x" data-act="preset-del" data-i="${i}" aria-label="削除">${ic('x')}</button></span>`).join('');
    $('#s-presets').innerHTML = `<div class="chips">${chips || '<p class="hint">よく使う条件を保存できます</p>'}</div>
      <div class="stack-row"><button class="btn small" data-act="preset-save">今の条件を保存</button></div>`;
  }

  function renderSearchBlocks() {
    $('#blockBtn').innerHTML = `訪問NGの店（${state.blocks.length}）`;
  }

  // ---------- 提案リスト ----------
  function visibleList() {
    let list = state.pool.slice().sort(SORTERS[state.pSort]);
    if (state.pIndustries.size) list = list.filter((s) => state.pIndustries.has(s.industry));
    if (state.openOnly) list = list.filter((s) => isOpenOn(s, state.date));
    return list.slice(0, state.count);
  }

  function renderProposal() {
    const sn = state.snap;
    if (!sn) {
      $('#pSummary').textContent = 'まだ提案がありません。';
      $('#pSort').innerHTML = '';
      $('#pInd').innerHTML = '';
      $('#pOpenLabel').textContent = '';
      $('#pList').innerHTML = `<div class="empty"><p>まだ提案がありません。</p><button class="btn primary" data-act="go-search">条件を決める</button></div>`;
      return;
    }
    $('#pSummary').textContent = `${sn.area}／半径 ${sn.radius}／${sn.count}件／訪問日 ${fmtDate(state.date)}／${sn.industry}`;
    $('#pSort').innerHTML = [['rec', 'おすすめ順'], ['dist', '近い順'], ['rating', '評価順']].map(([k, l]) =>
      `<button class="${state.pSort === k ? 'on' : ''}" data-act="p-sort" data-v="${k}">${l}</button>`).join('');

    const inds = [...new Set(state.pool.map((s) => s.industry))];
    $('#pInd').innerHTML = inds.map((n) => `<button class="chip${state.pIndustries.has(n) ? ' on' : ''}" data-act="p-ind" data-name="${esc(n)}">${esc(n)}</button>`).join('')
      || '<p class="hint">候補がありません</p>';

    $('#pOpenLabel').textContent = `${fmtDate(state.date)}営業している店のみ`;
    const sw = $('#pOpen');
    sw.setAttribute('aria-checked', String(state.openOnly));

    const list = visibleList();
    $('#pList').innerHTML = list.length
      ? list.map((s, i) => proposalCard(s, i + 1)).join('')
      : `<div class="empty"><p>条件に合う店がありませんでした。</p><p class="hint">半径を広げるか、条件を変えてもう一度お試しください。</p></div>`;
  }

  function overallDetail(s) {
    const rows = KEYS.map((k) => `<tr><td>${LABEL[k]}</td><td>${s.sub[k]}点・重み${Math.round(W[k] * 100)}%</td><td>${(s.sub[k] * W[k]).toFixed(2)}</td></tr>`).join('');
    return `<div class="detail"><p class="detail-title">総合おすすめ度の計算</p>
      <table class="calc">${rows}
        <tr class="sum"><td>合計（5点満点）</td><td></td><td>${s.total5.toFixed(2)}</td></tr>
        <tr class="sum"><td>10点満点にする</td><td>2倍</td><td>${s.overall.toFixed(1)}</td></tr>
      </table>
      <p class="hint">4項目の重み：評価25%・口コミ25%・新しさ20%・成約しやすさ30%。各項目は5点満点です。</p></div>`;
  }

  function scoreDetail(s, k) {
    return `<div class="detail"><p class="detail-title">${LABEL[k]}：${s.sub[k]}点／5点</p>
      <dl><dt>根拠</dt><dd>${esc(evidence(s, k))}</dd>
      <dt>理由</dt><dd>${esc(WHY[k])}</dd>
      <dt>点数の決め方（基準）</dt><dd>${esc(CRIT[k])}</dd></dl></div>`;
  }

  function proposalCard(s, rank) {
    const open = isOpenOn(s, state.date);
    const exp = (k) => state.expanded.has(s.id + ':' + k);
    const inList = inVisit(s.id) || inLater(s.id);
    const banner = s.visited
      ? `<div class="banner">${ic('info')}訪問済みの店です</div>`
      : inList ? `<div class="banner">${ic('info')}訪問リストに入っています</div>` : '';
    return `<article class="card shop">
      ${banner}
      <div class="shop-head"><span class="rank">${rank}位</span><span class="tag">${esc(s.industry)}</span></div>
      <h3 class="shop-name">${esc(s.name)}</h3>
      <button class="overall${exp('overall') ? ' open' : ''}" data-act="p-expand" data-id="${s.id}" data-k="overall">
        <span>総合おすすめ度</span><b>${s.overall.toFixed(1)}</b><small>/ 10</small></button>
      ${exp('overall') ? overallDetail(s) : ''}
      <div class="scores">${KEYS.map((k) => `<button class="score${exp(k) ? ' open' : ''}" data-act="p-expand" data-id="${s.id}" data-k="${k}"><span>${LABEL[k]}</span><b>${s.sub[k]}</b><small>/5</small></button>`).join('')}</div>
      ${KEYS.map((k) => (exp(k) ? scoreDetail(s, k) : '')).join('')}
      <ul class="reasons">${s.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      <p class="meta">${ic('pin')}<span>${esc(s.address)}</span></p>
      <div class="meta-row">
        <span class="dist">${fmtDist(s.distance)}</span>
        ${open ? `<span class="vtime">${esc(s.hours[weekKey(state.date)])}</span>` : '<span class="vtime closed">選択日は定休日</span>'}
        ${s.insta ? `<a class="pill-btn" href="https://www.instagram.com/${esc(s.insta)}" target="_blank" rel="noopener">${ic('insta')}@${esc(s.insta)}</a>` : ''}
      </div>
      <div class="actions">
        <button class="btn" data-act="add" data-id="${s.id}" ${inVisit(s.id) ? 'disabled' : ''}>${ic('plus')}${inVisit(s.id) ? '追加済み' : '訪問リストに追加'}</button>
        <button class="btn" data-act="copy-map" data-id="${s.id}">${ic('copy')}Map URLコピー</button>
        <a class="btn icon" href="${esc(mapUrl(s))}" target="_blank" rel="noopener" aria-label="地図で開く">${ic('map')}</a>
        <button class="btn text" data-act="block" data-id="${s.id}">${ic('block')}訪問NG</button>
      </div>
    </article>`;
  }

  // ---------- 訪問リスト・後で訪問 ----------
  function visitCard(it, kind) {
    const s = it.shop;
    const date = it.visitDate;
    const dateTag = date ? `<span class="vdate">${fmtDate(date)}</span>` : '<span class="vdate none">日付未定</span>';
    const common = `
      <button class="btn" data-act="copy-map" data-id="${s.id}">${ic('copy')}Map URLコピー</button>
      <a class="btn icon" href="${esc(mapUrl(s))}" target="_blank" rel="noopener" aria-label="地図で開く">${ic('map')}</a>`;
    const actions = kind === 'visit'
      ? `${common}<button class="btn" data-act="later-move" data-id="${s.id}">後で訪問</button>
         <button class="btn danger" data-act="remove" data-src="visit" data-id="${s.id}">${ic('x')}外す</button>`
      : `<button class="btn" data-act="back-visit" data-id="${s.id}">${ic('back')}訪問リストに戻す</button>
         <a class="btn" href="${SITE_URL}" target="_blank" rel="noopener">${ic('ext')}完了報告へ</a>
         ${common}
         <button class="btn danger" data-act="remove" data-src="later" data-id="${s.id}">${ic('x')}外す</button>`;
    return `<article class="card visit">
      <div class="visit-top">${dateTag}<button class="pill-btn" data-act="pick-date" data-id="${s.id}" data-kind="${kind}">${ic('cal')}日付を変える</button></div>
      <h3 class="shop-name">${esc(s.name)}</h3>
      <div class="row"><span class="tag">${esc(s.industry)}</span></div>
      <p class="meta">${ic('pin')}<span>${esc(s.address)}</span></p>
      ${hoursRow(s, date)}
      <div class="actions">${actions}</div>
    </article>`;
  }

  function sortForList(items) {
    if (state.listSort === 'dist' && state.userPos) {
      return items.slice().sort((a, b) => distM(state.userPos, a.shop) - distM(state.userPos, b.shop));
    }
    return items;
  }

  function renderVisitList() {
    const items = state.visit;
    $('#lCount').textContent = `${items.length}件`;
    if (!items.length) {
      $('#lList').innerHTML = `<div class="empty"><p>訪問リストは空です。</p><p class="hint">提案リストから店を追加できます。</p></div>`;
      return;
    }
    const groups = new Map();
    items.forEach((it) => {
      const k = it.visitDate || '';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(it);
    });
    const keys = [...groups.keys()].sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a < b ? -1 : a > b ? 1 : 0));
    $('#lList').innerHTML = keys.map((k) => {
      const list = sortForList(groups.get(k));
      return `<h2 class="date-head">${k ? fmtDate(k) : '日付未定'}<span class="cnt">${list.length}件</span></h2>${list.map((it) => visitCard(it, 'visit')).join('')}`;
    }).join('');
  }

  function renderLaterList() {
    const items = state.later;
    $('#gCount').textContent = `${items.length}件`;
    $('#gList').innerHTML = items.length
      ? items.map((it) => visitCard(it, 'later')).join('')
      : `<div class="empty"><p>後で訪問の店はありません。</p><p class="hint">訪問リストの「後で訪問」から移せます。</p></div>`;
  }

  function renderNav() {
    $('#nav').innerHTML = NAV.map(([k, l, i]) => `<a href="#${k}" data-nav="${k}">${ic(i)}<span>${l}</span><em class="bdg" data-badge="${k}"></em></a>`).join('');
  }
  function renderBadges() {
    const n = { list: state.visit.length, later: state.later.length };
    $$('[data-badge]').forEach((el) => { const c = n[el.dataset.badge]; el.textContent = c ? String(c) : ''; });
  }

  // ---------- ログイン（Googleログインのみ） ----------
  function renderAccount() {
    const el = $('#account');
    if (!el) return;
    const u = state.user;
    el.innerHTML = u
      ? `<div class="acct"><div class="acct-who"><span class="sub">ログイン中</span><b>${esc(u.name)}</b></div>
           <button class="btn small" data-act="logout">ログアウト</button></div>`
      : `<div class="acct"><div class="acct-who"><span class="sub">ログインしてください</span></div>
           <button class="btn small" data-act="login">Googleでログイン</button></div>`;
  }

  // ログインの状態を読み直す（未ログインなら一覧は空・候補も消す）
  async function refreshUser() {
    try {
      const u = await D.currentUser();
      state.user = u ? { name: u.displayName || u.email || 'ログイン中' } : null;
    } catch (e) {
      state.user = null;
    }
    state.blocks = state.user ? await D.getBlocks() : [];
    if (!state.user) { state.pool = []; state.snap = null; }
    renderAll();
  }

  async function login() {
    try {
      await D.signIn();
      await refreshUser();
      if (state.user) toast('ログインしました');
    } catch (e) {
      toast(e && e.code === 'auth/popup-closed-by-user' ? 'ログインを中止しました' : 'ログインできませんでした。もう一度お試しください');
    }
  }

  async function logout() {
    try {
      await D.signOut();
      await refreshUser();
      toast('ログアウトしました');
    } catch (e) {
      toast('ログアウトできませんでした。もう一度お試しください');
    }
  }

  function renderAll() {
    renderAccount();
    renderArea(); renderRadius(); renderCount(); renderDate(); renderInd(); renderPresets(); renderSearchBlocks();
    renderProposal(); renderVisitList(); renderLaterList(); renderBadges();
  }

  // ---------- 画面の切り替え ----------
  function currentName() {
    const h = location.hash.slice(1);
    return SCREENS.includes(h) ? h : 'search';
  }
  function showScreen() {
    const name = currentName();
    $$('.screen').forEach((s) => s.classList.toggle('active', s.dataset.screen === name));
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === name));
    renderAll();
    window.scrollTo(0, 0);
  }
  function go(name) {
    if (location.hash.slice(1) === name) showScreen();
    else location.hash = name;
  }

  // ---------- 検索の実行 ----------
  async function runSearch() {
    if (!state.user) return toast('先にログインしてください');
    const a = state.area;
    let center, viewport = null;
    const btn = $('[data-act="run-search"]');
    btn.disabled = true; btn.textContent = '探しています…';
    try {
      if (a.mode === 'address') {
        const text = a.address.trim();
        if (!text) return toast('住所か町名を入力してください');
        center = await D.geocode(text);
        if (!center) return toast('場所が見つかりませんでした');
        viewport = center.viewport || null;
      } else {
        if (a.lat == null) return toast('先に現在地を取得してください');
        center = { lat: a.lat, lng: a.lng };
      }
      const town = state.radius === 'town';
      const radiusM = RADIUS.find((r) => r[0] === state.radius)[2];
      const raw = await D.searchShops({ center, radius: radiusM, town, viewport: town ? viewport : null, industries: [...state.industries] });
      const blocked = new Set(state.blocks.map((b) => b.id));
      state.pool = raw.filter((s) => !blocked.has(s.id)).map(withScores);
      state.snap = {
        area: a.mode === 'address' ? a.address.trim() : '現在地',
        radius: RADIUS.find((r) => r[0] === state.radius)[1],
        count: state.count,
        industry: industryLabel(state.industries),
      };
      state.pIndustries = new Set(state.industries);
      state.openOnly = true;
      state.expanded = new Set();
      go('proposal');
    } catch (e) {
      toast(e && e.message ? e.message : '取得に失敗しました。時間をおいてもう一度お試しください');
    } finally {
      btn.disabled = false; btn.textContent = '提案リストを作る';
    }
  }

  function locate(done) {
    if (!navigator.geolocation) return toast('この端末では現在地を使えません');
    toast('現在地を取得しています');
    navigator.geolocation.getCurrentPosition((p) => {
      state.area.lat = p.coords.latitude;
      state.area.lng = p.coords.longitude;
      state.userPos = { lat: p.coords.latitude, lng: p.coords.longitude };
      renderArea();
      toast('現在地を取得しました');
      if (done) done();
    }, () => toast('現在地を取得できませんでした'), { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }

  // ---------- 数字選択（件数）・日付選択 ----------
  function openCountWheel() {
    pendingCount = state.count;
    const root = openSheet('件数', `
      <div class="wheel-wrap"><div class="wheel-hi"></div>
        <div class="wheel" id="wheel">${COUNTS.map((n) => `<div class="wi" data-act="wi" data-n="${n}">${n}件</div>`).join('')}</div>
      </div>
      <p class="hint">数字をスクロールして選び、「決める」を押してください。</p>
      <div class="stack"><button class="btn primary wide" data-act="count-ok">決める</button></div>`);
    const w = $('#wheel', root);
    const idx = COUNTS.indexOf(state.count);
    w.scrollTop = idx * ITEM_H;
    const mark = (i) => $$('.wi', w).forEach((el, j) => el.classList.toggle('on', j === i));
    mark(idx);
    w.addEventListener('scroll', () => {
      const i = Math.min(Math.max(Math.round(w.scrollTop / ITEM_H), 0), COUNTS.length - 1);
      pendingCount = COUNTS[i];
      mark(i);
    }, { passive: true });
  }

  function openDatePick(id, kind) {
    const it = findIn(kind === 'later' ? state.later : state.visit, id);
    if (!it) return;
    dateCb = (d) => setVisitDate(id, d, kind);
    openSheet('訪問予定日', `${dateStrip(it.visitDate || state.date, 'dpick', `data-id="${id}" data-kind="${kind}"`)}
      <div class="stack"><button class="btn text wide" data-act="dpick-none" data-id="${id}" data-kind="${kind}">日付未定にする</button></div>`);
  }

  function setVisitDate(id, date, kind) {
    const list = kind === 'later' ? state.later : state.visit;
    const it = findIn(list, id);
    if (it) it.visitDate = date;
    saveAll();
    renderAll();
  }

  // ---------- 訪問リストの操作 ----------
  function saveAll() {
    LS.set('visit', state.visit);
    LS.set('later', state.later);
  }

  function addVisit(id) {
    const s = findIn(state.pool, id) || findShop(id);
    if (!s || inVisit(id)) return;
    state.visit.push({ id, shop: stripScores(s), visitDate: state.date });
    saveAll();
    toast('訪問リストに追加しました');
    renderAll();
  }

  function stripScores(s) {
    const { sub, total5, overall, reasons, ...rest } = s; // 一覧に必要な店の情報だけ残す
    return rest;
  }

  function moveList(id, from, to) {
    const src = from === 'visit' ? state.visit : state.later;
    const dst = to === 'visit' ? state.visit : state.later;
    const i = src.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [it] = src.splice(i, 1);
    dst.unshift(it);
    saveAll();
    toast(to === 'later' ? '後で訪問に移しました' : '訪問リストに戻しました');
    renderAll();
  }

  function removeFrom(id, src) {
    if (!window.confirm('この店を外しますか？')) return;
    const list = src === 'visit' ? state.visit : state.later;
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list.splice(i, 1);
    saveAll();
    toast('外しました');
    renderAll();
  }

  function copyAll(src) {
    const list = src === 'visit' ? state.visit : state.later;
    if (!list.length) return toast('コピーする店がありません');
    const text = list.map((x, i) => `${i + 1}. ${x.shop.name}\n${mapUrl(x.shop)}`).join('\n\n');
    copyText(text, `${list.length}件のリンクをコピーしました`);
  }

  function sortByDistance() {
    const apply = () => { state.listSort = 'dist'; renderVisitList(); toast('近い順に並べました'); };
    if (state.userPos) return apply();
    locate(apply);
  }

  // ---------- 訪問NG（永久ブロック） ----------
  function openBlockSheet(id) {
    const s = findShop(id);
    if (!s) return;
    openSheet('訪問NGに登録', `<p class="sub">${esc(s.name)}</p>
      <p class="hint">登録すると、以降の提案から永久に除外されます。</p>
      <div class="stack">
        ${REASONS_BLOCK.map((r) => `<button class="btn wide" data-act="block-reason" data-id="${id}" data-r="${esc(r)}">${esc(r)}</button>`).join('')}
        <button class="btn text wide" data-close>スキップ</button>
      </div>`);
  }

  async function doBlock(id, reason) {
    const s = findShop(id);
    if (!s) return;
    state.blocks = await D.addBlock({ id, name: s.name, reason, at: Date.now() });
    state.pool = state.pool.filter((x) => x.id !== id);
    closeSheet();
    toast('訪問NGに登録しました');
    renderAll();
  }

  async function openBlockList() {
    state.blocks = await D.getBlocks();
    const body = state.blocks.length
      ? `<ul class="blist">${state.blocks.map((b) => `<li><div><b>${esc(b.name)}</b><small>${esc(b.reason)}</small></div>
          <button class="btn small" data-act="unblock" data-id="${esc(b.id)}">解除</button></li>`).join('')}</ul>`
      : '<p class="hint">登録した店はありません</p>';
    openSheet('訪問NG一覧', body);
  }

  async function unblock(id) {
    state.blocks = await D.removeBlock(id);
    toast('解除しました（次の検索から表示されます）');
    renderSearchBlocks();
    openBlockList();
  }

  // ---------- お気に入り条件 ----------
  function savePreset() {
    const name = window.prompt('条件の名前（例：〇〇区の寿司店）');
    if (!name || !name.trim()) return;
    state.presets.push({
      name: name.trim(),
      area: { mode: state.area.mode, address: state.area.address },
      radius: state.radius, count: state.count, industries: [...state.industries],
    });
    LS.set('presets', state.presets);
    renderPresets();
    toast('条件を保存しました');
  }

  function applyPreset(i) {
    const p = state.presets[i];
    if (!p) return;
    state.area = { mode: p.area.mode, address: p.area.address, lat: null, lng: null };
    state.radius = p.radius;
    state.count = p.count;
    state.industries = new Set(p.industries);
    renderAll();
    toast(`「${p.name}」を反映しました`);
  }

  function deletePreset(i) {
    state.presets.splice(i, 1);
    LS.set('presets', state.presets);
    renderPresets();
  }

  // ---------- 操作の登録（クリックの委任） ----------
  const ACT = {
    login: () => login(),
    logout: () => logout(),
    'area-mode': (el) => { state.area.mode = el.dataset.v; renderArea(); },
    gps: () => locate(() => renderArea()),
    radius: (el) => { state.radius = el.dataset.v; renderRadius(); },
    'count-open': openCountWheel,
    wi: (el) => { const w = $('#wheel'); if (w) w.scrollTo({ top: COUNTS.indexOf(Number(el.dataset.n)) * ITEM_H, behavior: 'smooth' }); },
    'count-ok': () => { state.count = pendingCount; closeSheet(); renderCount(); renderProposal(); },
    'search-date': (el) => { state.date = el.dataset.date; renderDate(); },
    'ind-tab': (el) => { state.indTab = Number(el.dataset.i); renderInd(); },
    ind: (el) => { const n = el.dataset.name; state.industries.has(n) ? state.industries.delete(n) : state.industries.add(n); renderInd(); },
    'ind-group': () => {
      const g = D.GROUPS[state.indTab].items;
      const all = g.every((n) => state.industries.has(n));
      g.forEach((n) => (all ? state.industries.delete(n) : state.industries.add(n)));
      renderInd();
    },
    'preset-save': savePreset,
    'preset-apply': (el) => applyPreset(Number(el.dataset.i)),
    'preset-del': (el) => deletePreset(Number(el.dataset.i)),
    'block-list': openBlockList,
    'run-search': runSearch,
    'go-search': () => go('search'),
    'go-list': () => go('list'),
    'p-sort': (el) => { state.pSort = el.dataset.v; renderProposal(); },
    'p-ind': (el) => { const n = el.dataset.name; state.pIndustries.has(n) ? state.pIndustries.delete(n) : state.pIndustries.add(n); renderProposal(); },
    'open-only': () => { state.openOnly = !state.openOnly; renderProposal(); },
    'p-expand': (el) => {
      const key = el.dataset.id + ':' + el.dataset.k;
      state.expanded.has(key) ? state.expanded.delete(key) : state.expanded.add(key);
      renderProposal();
    },
    add: (el) => addVisit(el.dataset.id),
    'copy-map': (el) => { const s = findShop(el.dataset.id); if (s) copyText(mapUrl(s), 'Map URLをコピーしました'); },
    block: (el) => openBlockSheet(el.dataset.id),
    'block-reason': (el) => doBlock(el.dataset.id, el.dataset.r),
    unblock: (el) => unblock(el.dataset.id),
    'later-move': (el) => moveList(el.dataset.id, 'visit', 'later'),
    'back-visit': (el) => moveList(el.dataset.id, 'later', 'visit'),
    remove: (el) => removeFrom(el.dataset.id, el.dataset.src),
    'copy-all': (el) => copyAll(el.dataset.src),
    'sort-dist': sortByDistance,
    'pick-date': (el) => openDatePick(el.dataset.id, el.dataset.kind),
    dpick: (el) => { if (dateCb) dateCb(el.dataset.date); closeSheet(); },
    'dpick-none': (el) => { setVisitDate(el.dataset.id, null, el.dataset.kind); closeSheet(); },
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeSheet(); return; }
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act];
    if (fn) fn(el);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'addr') state.area.address = e.target.value;
  });

  window.addEventListener('hashchange', showScreen);

  // ---------- 起動 ----------
  async function init() {
    renderNav();
    const note = $('#demoNote');
    if (note) note.hidden = !D.isSample;
    renderAll();
    showScreen();
    await refreshUser(); // 画面は先に出し、ログイン状態は後から反映する
  }
  init();
})();
