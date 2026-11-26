// lib/vla-core.js の純粋な関数だけをテストする（ネットワークは使わない）
import { test } from "node:test";
import assert from "node:assert/strict";
import { industryQuery, brandKey, chainIds, filterPlaces, parseHours, toShop, buildShops } from "./vla-core.js";

const P = (id, name, extra = {}) => ({
  id, displayName: { text: name }, formattedAddress: "日本、〒123-4567 東京都〇〇区1-2-3",
  location: { latitude: 35.68, longitude: 139.76 }, rating: 4.2, userRatingCount: 30,
  businessStatus: "OPERATIONAL", ...extra,
});

test("業種名から検索語を作る", () => {
  assert.equal(industryQuery("美容室（ヘア）"), "美容室");
  assert.equal(industryQuery("寿司・割烹"), "寿司 割烹");
  assert.equal(industryQuery("学習塾（個別指導・小中高）"), "学習塾");
  assert.equal(industryQuery("汎用（例：クリーニング）"), "クリーニング");
});

test("ブランド名は支店・号店・番地を除く", () => {
  assert.equal(brandKey("サンプル寿司 本店"), "サンプル寿司");
  assert.equal(brandKey("サンプルチェーン 1号店"), "サンプルチェーン");
  assert.equal(brandKey("サンプル整骨院"), "サンプル整骨院");
});

test("同じブランドが2件以上ある店はチェーン、1件だけの店は独立店", () => {
  const raw = [P("a", "サンプルチェーン 1号店"), P("b", "サンプルチェーン 2号店"), P("c", "サンプル寿司 本店")];
  const ids = chainIds(raw);
  assert.ok(ids.has("a") && ids.has("b"));
  assert.ok(!ids.has("c"));
});

test("既知のチェーン名の店はチェーン", () => {
  assert.ok(chainIds([P("m", "マクドナルド 渋谷店")]).has("m"));
});

test("ウェブサイトあり・閉業・チェーンは除外し、同じ店は1件にする", () => {
  const raw = [
    P("ok", "サンプル整骨院"),
    P("site", "サンプル古着店", { websiteUri: "https://example.com" }),
    P("closed", "サンプル閉店", { businessStatus: "CLOSED_PERMANENTLY" }),
    P("c1", "サンプルチェーン 1号店"), P("c2", "サンプルチェーン 2号店"),
    P("ok", "サンプル整骨院"),
  ];
  const ids = filterPlaces(raw).map((p) => p.id);
  assert.deepEqual(ids, ["ok"]);
});

test("曜日の営業時間：定休日は null、情報なしは「時間不明」", () => {
  const h = parseHours(["月曜日: 11:30～14:00", "火曜日: 休業日", "水曜日: 定休日"]);
  assert.equal(h.mon, "11:30～14:00");
  assert.equal(h.tue, null);
  assert.equal(h.wed, null);
  assert.equal(h.thu, null); // 書かれていない曜日は定休扱い
  assert.equal(parseHours([]).sun, "時間不明");
});

test("店データは既存の形に変換し、開業年・従業員数は null", () => {
  const s = toShop(P("x", "サンプル整骨院", { rating: undefined, userRatingCount: undefined }), "整骨院・接骨院");
  assert.equal(s.id, "x");
  assert.equal(s.name, "サンプル整骨院");
  assert.equal(s.industry, "整骨院・接骨院");
  assert.equal(s.address, "東京都〇〇区1-2-3");
  assert.equal(s.rating, 0);
  assert.equal(s.reviews, 0);
  assert.equal(s.opened, null);
  assert.equal(s.staff, null);
  assert.equal(s.lat, 35.68);
});

test("buildShops は業種を付け、座標のない店は外す", () => {
  const raw = [P("a", "サンプル寿司"), P("b", "サンプル理容", { location: undefined })];
  const shops = buildShops(raw, new Map([["a", "寿司・割烹"], ["b", "理容室・バーバー"]]));
  assert.equal(shops.length, 1);
  assert.equal(shops[0].industry, "寿司・割烹");
});
