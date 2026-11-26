// lib/rate-limit.js のテスト（時間は引数で渡すので、待たずに確かめられる）
import { test } from "node:test";
import assert from "node:assert/strict";
import { hitLimit, clientIp } from "./rate-limit.js";

test("上限までは通り、超えたら止まる", () => {
  const k = "t1";
  const t = 1_000_000;
  assert.equal(hitLimit(k, 3, 60_000, t).ok, true);
  assert.equal(hitLimit(k, 3, 60_000, t + 1).ok, true);
  assert.equal(hitLimit(k, 3, 60_000, t + 2).ok, true);
  const over = hitLimit(k, 3, 60_000, t + 3);
  assert.equal(over.ok, false);
  assert.ok(over.retryAfter >= 1 && over.retryAfter <= 60);
});

test("時間枠が過ぎるとまた使える", () => {
  const k = "t2";
  const t = 2_000_000;
  for (let i = 0; i < 2; i++) hitLimit(k, 2, 10_000, t);
  assert.equal(hitLimit(k, 2, 10_000, t).ok, false);
  assert.equal(hitLimit(k, 2, 10_000, t + 10_000).ok, true);
});

test("IPごとに別々に数える", () => {
  const t = 3_000_000;
  hitLimit("ip-a", 1, 60_000, t);
  assert.equal(hitLimit("ip-a", 1, 60_000, t).ok, false);
  assert.equal(hitLimit("ip-b", 1, 60_000, t).ok, true);
});

test("接続元のIPを CF-Connecting-IP から取る", () => {
  const r = new Request("https://x/api/search", { headers: { "CF-Connecting-IP": "203.0.113.5" } });
  assert.equal(clientIp(r), "203.0.113.5");
  assert.equal(clientIp(new Request("https://x/api/search")), "unknown");
});
