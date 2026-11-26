// 店舗検索（Cloudflare Pages Functions：POST /api/search）
// ログイン不要。1つのIPからの連続した大量リクエストは回数制限で止める（1分に10回まで）。
// Places の結果を「ウェブサイトなし・チェーン除外」にして返す。
import { keyOf, searchAll, buildShops, PLACES_CAP } from "../../lib/vla-core.js";
import { hitLimit, clientIp, tooMany } from "../../lib/rate-limit.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const lim = hitLimit(`search:${clientIp(request)}`, 10, 60_000);
  if (!lim.ok) return tooMany(lim.retryAfter);

  const key = keyOf(env);
  if (!key) return json({ ok: false, error: "店舗検索の設定がまだです（管理者がAPIキーを設定してください）" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "検索条件が正しくありません" }, 400); }
  const { center, radius, town, viewport, industries } = body || {};
  if (!center || typeof center.lat !== "number" || typeof center.lng !== "number") {
    return json({ ok: false, error: "中心の場所がありません" }, 400);
  }
  const list = Array.isArray(industries) ? industries.filter((n) => typeof n === "string") : [];
  if (!list.length) return json({ ok: false, error: "業種を選んでください" }, 400);

  try {
    const { raw, industryOf } = await searchAll(key, { center, radius: Number(radius) || 1000, town: !!town, viewport, industries: list });
    return json({ ok: true, shops: buildShops(raw, industryOf).slice(0, PLACES_CAP * 4) });
  } catch (e) {
    const hint = {
      API_KEY_INVALID: "APIキーが正しくありません（管理者に確認してください）",
      SERVICE_DISABLED: "Places API (New) が有効になっていません",
      BILLING_DISABLED: "請求先アカウントが有効になっていません",
      REQUEST_DENIED: "APIの利用が許可されていません",
    }[e.reason];
    return json({ ok: false, error: hint || "店舗の取得に失敗しました。時間をおいてもう一度お試しください" }, 502);
  }
}
