import test from "node:test";
import assert from "node:assert/strict";
import { fetchBanxicoFix, parseBanxicoFix } from "../server/banxico-fix.js";

const sample = `
  <tr class="renglonNon" align="center">
    <td align="left">29/08/2026</td><td align="right">N/E</td><td>17.0427</td>
  </tr>
  <tr class="renglonPar" align="center">
    <td align="left">28/08/2026</td><td align="right">17.0427</td><td>16.9712</td>
  </tr>
`;

test("uses the latest numeric Banxico FIX when the newest row is unavailable", () => {
  assert.deepEqual(parseBanxicoFix(sample), {
    rate: 17.0427,
    date: "2026-08-28",
    source: "Banco de México",
    series: "FIX",
  });
});

test("fetches and parses the Banxico page", async () => {
  const result = await fetchBanxicoFix(async () => new Response(sample));
  assert.equal(result.rate, 17.0427);
});

test("rejects a Banxico response without a numeric FIX", () => {
  assert.throws(() => parseBanxicoFix(sample.replace("17.0427</td><td>", "N/E</td><td>")));
});
