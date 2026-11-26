// 住所・町名 → 座標（Cloudflare Pages Functions：POST /api/geocode）
// ログイン不要。1つのIPからの連続した大量リクエストは回数制限で止める（1分に30回まで）。
// 町名の範囲（viewport）も返す。
import { keyOf, geocodeText, placesHint } from "../../lib/vla-core.js";
import { hitLimit, clientIp, tooMany } from "../../lib/rate-limit.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function onRequestPost({ request, env }) {
  const lim = hitLimit(`geocode:${clientIp(request)}`, 30, 60_000);
  if (!lim.ok) return tooMany(lim.retryAfter);

  const key = keyOf(env);
  if (!key) return json({ ok: false, error: "住所の検索の設定がまだです（管理者がAPIキーを設定してください）" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "住所が正しくありません" }, 400); }
  const q = String(body?.q || "").trim().slice(0, 200);
  if (!q) return json({ ok: false, error: "住所か町名を入力してください" }, 400);

  try {
    const hit = await geocodeText(key, q);
    if (!hit) return json({ ok: false, error: "場所が見つかりませんでした" }, 404);
    return json({ ok: true, ...hit });
  } catch (e) {
    // 原因（キー・API未有効化・請求先など）が分かるように、理由を日本語のヒントで返す
    return json({ ok: false, error: placesHint(e.reason) || "場所の検索に失敗しました。時間をおいてもう一度お試しください" }, 502);
  }
}
