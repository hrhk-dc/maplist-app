// 提案の地図画像（Cloudflare Pages Functions：POST /api/map）
// ログインしたメンバーだけ使える。店の位置を番号つきのピンで並べた画像（PNG）を返す。
// APIキーはサーバーの中だけで使い、画面にもレスポンスにも出さない。
import { verifyMember, keyOf } from "../../lib/vla-core.js";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// ピンの番号（画面の並び順と同じ）。1〜9、そのあと A〜K（最大20件）
const LABELS = "123456789ABCDEFGHIJK";
// 完了報告アプリと同じ暗い配色
const STYLES = [
  "element:geometry|color:0x1d2030",
  "element:labels.text.fill|color:0x8a8f9c",
  "element:labels.text.stroke|color:0x1d2030",
  "feature:water|color:0x0b0d12",
  "feature:road|color:0x2a2e3a",
];

export async function onRequestPost({ request, env }) {
  const who = await verifyMember(request);
  if (!who.ok) return json({ ok: false, error: who.error }, who.status);

  const key = keyOf(env);
  if (!key) return json({ ok: false, error: "地図の設定がまだです（管理者がAPIキーを設定してください）" }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "地図に出す店が正しくありません" }, 400); }
  const points = Array.isArray(body?.points)
    ? body.points.filter((p) => typeof p?.lat === "number" && typeof p?.lng === "number").slice(0, LABELS.length)
    : [];
  if (!points.length) return json({ ok: false, error: "地図に出す店がありません" }, 400);

  const params = [
    "size=640x440", "scale=2", "maptype=roadmap",
    ...STYLES.map((s) => `style=${encodeURIComponent(s)}`),
    ...points.map((p, i) => `markers=${encodeURIComponent(`color:0x00B4D8|label:${LABELS[i]}|${p.lat},${p.lng}`)}`),
    `key=${encodeURIComponent(key)}`,
  ];

  let res;
  try {
    res = await fetch(`https://maps.googleapis.com/maps/api/staticmap?${params.join("&")}`);
  } catch {
    return json({ ok: false, error: "地図を取得できませんでした。時間をおいてもう一度お試しください" }, 502);
  }
  if (!res.ok) {
    return json({ ok: false, error: "地図を取得できませんでした（管理者に、Maps Static APIの設定を確認してもらってください）" }, 502);
  }
  return new Response(res.body, {
    headers: { "Content-Type": res.headers.get("Content-Type") || "image/png", "Cache-Control": "no-store" },
  });
}
