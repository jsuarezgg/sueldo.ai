import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compareOffers } from "../server/compare-offers.js";
import { readSharedComparison } from "../src/share-link.js";
import { positiveCases, negativeCases } from "./helpers/plugin-review.mjs";

const manifest = JSON.parse(await readFile(new URL("../../plugins/sueldo-ai/plugin.json", import.meta.url)));

test("packaged review prompts stay aligned with the executable synthetic cases", () => {
  assert.deepEqual(manifest.extensions["com.openai"].review.test_cases, {
    positive: positiveCases.map(({ description, prompt, expected_behavior }) => ({
      description, prompt, tools_triggered: "compare_offers", expected_behavior,
    })),
    negative: negativeCases,
  });
});

for (const scenario of positiveCases) {
  test(`plugin review: ${scenario.description}`, () => {
    const outputs = scenario.inputs.map((input, index) => {
      const result = compareOffers(input);
      assert.equal(result.isError, false);
      const output = result.structuredContent;
      for (const [i, key] of ["employee", "contractor"].entries()) {
        assert.equal(Math.round(output.calculations[key].recurringMonthlyCash * 100) / 100, scenario.expectedCash[index][i]);
      }
      const restored = readSharedComparison(output.editUrl);
      assert.equal(restored.horizon, input.horizon);
      assert.equal(restored.assumptions.fxRate, input.assumptions.fxRate);
      assert.deepEqual(compareOffers(output.inputs), result, "follow-up arguments remain callable");
      if (input.offers.employee.rsu) {
        assert.deepEqual(restored.offers.employee.rsu, input.offers.employee.rsu);
        assert.equal(output.calculations.employee.equity, 388800);
        assert.equal(output.calculations.employee.reimbursements, 5000);
        assert.equal(restored.offers.employee.components[0].cash, false);
        assert.equal(restored.offers.employee.components[0].utilization, 50);
      }
      return output;
    });
    if (outputs.length === 2) {
      assert.deepEqual(outputs[0].inputs.offers, outputs[1].inputs.offers);
      assert.notEqual(outputs[0].editUrl, outputs[1].editUrl);
    }
  });
}

// These server-level checks do not prove conversational abstention. Native
// ChatGPT desktop/mobile evaluation remains a separate submission gate.
test("review boundary rejects incomplete offers and unconfirmed RESICO without results", () => {
  const unconfirmed = structuredClone(positiveCases[0].inputs[0]);
  unconfirmed.offers.contractor.resicoEligibilityStatus = "unconfirmed";
  const incomplete = structuredClone(positiveCases[0].inputs[0]);
  delete incomplete.offers.contractor;
  for (const input of [unconfirmed, incomplete]) {
    const result = compareOffers(input);
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent.calculations, undefined);
    assert.equal(result.structuredContent.editUrl, undefined);
  }
});
