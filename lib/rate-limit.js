// 1つのIPからの連続した大量リクエストを防ぐ、簡単な回数制限（固定の時間枠）
//
// 注意：Cloudflare の Worker は、同じ時間でも複数の場所・複数の実行環境で動くため、
// ここでの数え方は「この実行環境の中」だけの目安。厳密に止めたいときは、
// Cloudflare ダッシュボードの Rate Limiting ルール（/api/ 向け）を併用する。

const buckets = new Map(); // key -> { start, count }
const MAX_KEYS = 5000;

// 制限内なら { ok: true }、超えたら { ok: false, retryAfter: 秒 }
export function hitLimit(key, limit, windowMs, now = Date.now()) {
  let b = buckets.get(key);
  if (!b || now - b.start >= windowMs) {
    b = { start: now, count: 0 };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > MAX_KEYS) sweep(now, windowMs);
  if (b.count <= limit) return { ok: true };
  return { ok: false, retryAfter: Math.max(1, Math.ceil((b.start + windowMs - now) / 1000)) };
}

// 古い枠を捨てる（メモリが増え続けないように）
function sweep(now, windowMs) {
  for (const [k, v] of buckets) {
    if (now - v.start >= windowMs) buckets.delete(k);
  }
}

// 接続元のIP（Cloudflare が付ける CF-Connecting-IP）。取れなければ共通の枠
export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

// 制限を超えたときの応答
export function tooMany(retryAfter) {
  return new Response(
    JSON.stringify({ ok: false, error: "少し時間をおいてから、もう一度お試しください" }),
    { status: 429, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Retry-After": String(retryAfter) } }
  );
}
