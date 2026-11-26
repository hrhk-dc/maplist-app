/*
 * 訪問リストアプリ：データの受け口（VLA_DATA）
 *
 * 画面（app.js）はこの VLA_DATA の関数だけを呼ぶ。
 * 本番の店舗検索・住所の座標変換・訪問NGの保存（Firestore）は、
 * バックエンド担当（Sonnet）がこのファイルの中身を差し替える。
 *
 * 今は動作確認用のサンプルデータ（架空の店）で動いている。
 * 店の名前・住所・数値はすべて架空。
 */
(function () {
  'use strict';

  // 業種：8グループ・33件（この並びと名前を正とする）
  const GROUPS = [
    { name: '飲食店', items: ['寿司・割烹', '焼き鳥・やきとん', 'ラーメン・中華そば', '居酒屋・大衆酒場', 'カフェ・喫茶', '焼肉・ホルモン', 'そば・うどん', 'パン・洋菓子・和菓子', 'イタリアン・フレンチ・ビストロ', '中華・餃子', '定食・食堂・とんかつ・洋食', 'バー・スナック'] },
    { name: '美容院', items: ['美容室（ヘア）', '理容室・バーバー', 'ネイル・まつげ', 'エステ・脱毛'] },
    { name: 'アパレル', items: ['セレクト・婦人服', '古着', '呉服・着物', '靴・バッグ・小物'] },
    { name: '整体・整骨院', items: ['整骨院・接骨院', '整体・カイロ', '鍼灸', 'リラクゼーション'] },
    { name: '不動産', items: ['賃貸仲介', '売買・買取'] },
    { name: '建築・土木', items: ['工務店・注文住宅・リフォーム', '外壁・屋根塗装', '水道・電気・設備', '外構・造園', '土木・解体'] },
    { name: '教室・スクール', items: ['学習塾（個別指導・小中高）'] },
    { name: 'その他', items: ['汎用（例：クリーニング）'] },
  ];

  const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const CENTER = { lat: 35.6812, lng: 139.7671 };

  // 架空のサンプル店。chain・website は検索で除外される条件（画面には出ない）
  const SAMPLE = [
    { id: 's01', name: 'サンプル寿司 本店', industry: '寿司・割烹', address: '（架空）〇〇区〇〇 1-2-3', lat: 35.6825, lng: 139.7650, rating: 4.4, reviews: 132, opened: 2012, staff: 6, base: '11:30-14:00 / 17:00-22:00', closed: ['wed'], insta: 'sample_sushi' },
    { id: 's02', name: 'サンプルラーメン 東口', industry: 'ラーメン・中華そば', address: '（架空）〇〇区〇〇 2-4-6', lat: 35.6790, lng: 139.7700, rating: 4.1, reviews: 86, opened: 2019, staff: 4, base: '11:00-15:00 / 17:30-21:00', closed: ['mon'], insta: 'sample_ramen' },
    { id: 's03', name: 'サンプルヘアサロン', industry: '美容室（ヘア）', address: '（架空）〇〇区〇〇 3-1-8', lat: 35.6840, lng: 139.7620, rating: 4.7, reviews: 58, opened: 2023, staff: 3, base: '10:00-19:00', closed: ['tue'], insta: 'sample_hair' },
    { id: 's04', name: 'サンプル整骨院', industry: '整骨院・接骨院', address: '（架空）〇〇区〇〇 4-5-2', lat: 35.6800, lng: 139.7680, rating: 4.3, reviews: 41, opened: 2016, staff: 5, base: '9:00-12:30 / 15:00-20:00', closed: ['sun'], insta: '' },
    { id: 's05', name: 'サンプル塗装店', industry: '外壁・屋根塗装', address: '（架空）〇〇区〇〇 5-3-9', lat: 35.6850, lng: 139.7700, rating: 3.9, reviews: 12, opened: 2009, staff: 12, base: '8:30-18:00', closed: ['sun'], insta: '' },
    { id: 's06', name: 'サンプル学習塾', industry: '学習塾（個別指導・小中高）', address: '（架空）〇〇区〇〇 6-2-4', lat: 35.6770, lng: 139.7600, rating: 4.5, reviews: 210, opened: 2015, staff: 8, base: '14:00-22:00', closed: ['sun'], insta: 'sample_juku' },
    { id: 's07', name: 'サンプル古着店', industry: '古着', address: '（架空）〇〇区〇〇 7-7-1', lat: 35.6830, lng: 139.7560, rating: 4.2, reviews: 27, opened: 2021, staff: 2, base: '12:00-20:00', closed: ['wed'], insta: 'sample_vintage' },
    { id: 's08', name: 'サンプル不動産', industry: '賃貸仲介', address: '（架空）〇〇区〇〇 8-6-3', lat: 35.6800, lng: 139.7750, rating: 3.8, reviews: 19, opened: 2005, staff: 15, base: '10:00-19:00', closed: ['sun'], insta: '' },
    { id: 's09', name: 'サンプル焼肉', industry: '焼肉・ホルモン', address: '（架空）〇〇区〇〇 9-1-5', lat: 35.6760, lng: 139.7640, rating: 4.0, reviews: 150, opened: 2018, staff: 7, base: '17:00-23:00', closed: ['mon'], insta: 'sample_yakiniku' },
    { id: 's10', name: 'サンプルカフェ', industry: 'カフェ・喫茶', address: '（架空）〇〇区〇〇 10-2-7', lat: 35.6870, lng: 139.7660, rating: 4.6, reviews: 98, opened: 2022, staff: 3, base: '8:00-17:00', closed: ['wed'], insta: 'sample_cafe' },
    { id: 's11', name: 'サンプル整体', industry: '整体・カイロ', address: '（架空）〇〇区〇〇 11-4-2', lat: 35.6810, lng: 139.7720, rating: 4.0, reviews: 60, opened: 2014, staff: 2, base: '10:00-21:00', closed: ['thu'], insta: '', visited: true },
    { id: 's12', name: 'サンプル工務店', industry: '工務店・注文住宅・リフォーム', address: '（架空）〇〇区〇〇 12-8-6', lat: 35.6900, lng: 139.7580, rating: 3.6, reviews: 9, opened: 2000, staff: 25, base: '8:00-17:30', closed: ['sun'], insta: '' },
    // 除外される例（チェーン店・サイトあり）
    { id: 'x01', name: 'サンプルチェーン 1号店', industry: 'そば・うどん', address: '（架空）〇〇区〇〇 13-1-1', lat: 35.6815, lng: 139.7665, rating: 4.0, reviews: 300, opened: 2010, staff: 40, base: '11:00-23:00', closed: [], insta: '', chain: true },
    { id: 'x02', name: 'サンプルサイト有り店', industry: '古着', address: '（架空）〇〇区〇〇 14-1-1', lat: 35.6818, lng: 139.7668, rating: 4.9, reviews: 500, opened: 2011, staff: 4, base: '11:00-20:00', closed: [], insta: '', website: 'https://example.com' },
  ];

  function haversine(a, b) {
    const R = 6371000, rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // 曜日別の営業時間を作る（定休日は null）
  function toShop(s) {
    const hours = {};
    DAYS.forEach((d) => { hours[d] = (s.closed || []).includes(d) ? null : s.base; });
    return {
      id: s.id, name: s.name, industry: s.industry, address: s.address,
      lat: s.lat, lng: s.lng, rating: s.rating, reviews: s.reviews,
      opened: s.opened, staff: s.staff, insta: s.insta || '', hours,
      visited: !!s.visited,
    };
  }

  window.VLA_DATA = {
    GROUPS,
    isSample: true, // 本番API接続後は false にする

    // 店舗の候補を返す（チェーン店・サイトありは除外、半径内・近い順）
    async searchShops({ center, radius }) {
      await delay(250);
      return SAMPLE
        .filter((s) => !s.chain && !s.website)
        .map((s) => ({ ...toShop(s), distance: haversine(center, s) }))
        .filter((s) => s.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 50);
    },

    // 住所・町名 → 座標（未接続のためサンプルの中心を返す）
    async geocode(address) {
      await delay(150);
      return { lat: CENTER.lat, lng: CENTER.lng, label: address };
    },

    // 訪問NG（永久ブロック）。今は端末内に保存。本番はFirestoreへ（Sonnet担当）
    async getBlocks() {
      try { return JSON.parse(localStorage.getItem('vla:blocks') || '[]'); } catch (e) { return []; }
    },
    async addBlock(block) {
      const list = await this.getBlocks();
      if (!list.some((b) => b.id === block.id)) list.push(block);
      try { localStorage.setItem('vla:blocks', JSON.stringify(list)); } catch (e) { /* 保存できない端末では無視 */ }
      return list;
    },
    async removeBlock(id) {
      const list = (await this.getBlocks()).filter((b) => b.id !== id);
      try { localStorage.setItem('vla:blocks', JSON.stringify(list)); } catch (e) { /* 同上 */ }
      return list;
    },
  };
})();
