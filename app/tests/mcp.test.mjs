import assert from "node:assert/strict";
import test from "node:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import vercel from "../api/mcp.js";
import worker from "../worker/index.js";
import { compareOffers } from "../server/compare-offers.js";
import { createMcpEndpoint, MCP_MAX_BODY_BYTES } from "../server/mcp.js";
import { calculateComparison } from "../src/compensation.js";
import { readSharedComparison } from "../src/share-link.js";
import { exampleInput, rpcBody, rpcRequest } from "./helpers/mcp.mjs";

const endpoint = createMcpEndpoint();
const wireValue = (value) => JSON.parse(JSON.stringify(value));

function assertParity(input) {
  const result = compareOffers(input);
  assert.equal(result.isError, false, result.content[0].text);
  const output = result.structuredContent;
  assert.deepEqual(JSON.parse(result.content[0].text), output);
  const { offers, assumptions } = output.inputs;
  assert.deepEqual(output.calculations, wireValue(calculateComparison(offers, assumptions, input.horizon)));
  const shared = readSharedComparison(output.editUrl);
  assert.ok(shared, "returned link must reopen in the existing editor");
  for (const key of ["employee", "contractor"]) {
    const { id, location, components, statutoryBenefits, ...sharedFields } = shared.offers[key];
    const { components: inputComponents, statutoryBenefits: inputBenefits, ...inputFields } = offers[key];
    assert.equal(id, key);
    assert.equal(location, "");
    assert.equal(Object.hasOwn(offers[key], "location"), false);
    assert.deepEqual(sharedFields, inputFields);
    assert.deepEqual(components.map(({ id: _id, ...component }) => component), inputComponents);
    if (inputBenefits !== null) assert.deepEqual(statutoryBenefits, inputBenefits);
  }
  assert.equal(shared.horizon, input.horizon);
  assert.deepEqual(output.calculations, wireValue(calculateComparison(shared.offers, shared.assumptions, shared.horizon)));
  const url = new URL(output.editUrl);
  assert.equal(url.origin, "https://sueldo.ai");
  assert.equal(url.search, "");
  assert.ok(url.hash.startsWith("#c="));
  assert.deepEqual(compareOffers(input), result, "same inputs are deterministic");
  assert.deepEqual(compareOffers(output.inputs), result, "returned inputs can be used directly for follow-up calls");
  return output;
}

test("matches the website and reopens every supported offer pairing and horizon", () => {
  for (const horizon of ["year", "three-years"]) {
    for (const pairing of ["mixed", "payroll", "contractor"]) {
      const input = exampleInput();
      input.horizon = horizon;
      if (pairing === "payroll") input.offers.contractor = { ...structuredClone(input.offers.employee), monthlyPay: 80000 };
      if (pairing === "contractor") input.offers.employee = { ...structuredClone(input.offers.contractor), monthlyPay: 5500 };
      const output = assertParity(input);
      assert.equal(output.calculations.months, horizon === "year" ? 12 : 36);
      assert.equal(output.calculations.valid, true);
      assert.equal(output.inputs.offers.employee.name, "Oferta A");
    }
  }
});

test("preserves costs, benefits, currencies, taxable components, and RSU vesting", () => {
  const input = exampleInput();
  input.horizon = "three-years";
  input.assumptions.fxDate = "2026-09-30";
  Object.assign(input.offers.employee, { currency: "USD", monthlyPay: 5000, fxFee: 1, additionalDeductions: 300 });
  Object.assign(input.offers.employee.statutoryBenefits, {
    tenureYears: 4, vacationDays: 18, annualPtu: 10000, monthlyVouchers: 1500,
    savingsFundIncluded: true, annualMedicalInsurance: 25000,
  });
  input.offers.employee.rsu = {
    grantValue: 40000, currency: "USD", cliffMonth: 12, cadence: 3, saleFeeRate: 0.5,
    allocations: [{ year: 1, percent: 10 }, { year: 2, percent: 20 }, { year: 3, percent: 30 }, { year: 4, percent: 40 }],
  };
  input.offers.employee.components = [{
    name: "Bono", category: "bonus", amount: 1000, currency: "USD",
    frequency: "quarterly", taxable: true, cash: true, utilization: 100,
  }];
  input.offers.contractor.components = [{
    name: "Equipo", category: "reimbursement", amount: 10000, currency: "MXN",
    frequency: "once", taxable: false, cash: false, utilization: 80,
  }];
  const output = assertParity(input);
  assert.ok(output.calculations.employee.equity > 0);
  assert.ok(output.calculations.employee.economicValue > output.calculations.employee.regularCash);
  assert.equal(output.calculations.contractor.reimbursements, 8000);
  assert.equal(output.fx.referenceDateVerified, false);
});

test("all-MXN comparisons preserve a real rate for later currency edits; missing FX is rejected", () => {
  const input = exampleInput();
  input.offers.contractor.currency = "MXN";
  input.offers.contractor.monthlyPay = 80000;
  const output = assertParity(input);
  assert.equal(output.fx.used, false);
  assert.equal(output.fx.source, "not_used");
  assert.equal(readSharedComparison(output.editUrl).assumptions.fxRate, 18);
  input.assumptions.fxRate = null;
  assert.equal(compareOffers(input).isError, true);
  input.offers.employee.rsu = {
    grantValue: 10000, currency: "USD", cliffMonth: 12, cadence: 3, saleFeeRate: 0,
    allocations: [{ year: 1, percent: 100 }],
  };
  assert.equal(compareOffers(input).isError, true);
  input.offers.employee.rsu = null;
  input.offers.contractor.components = [{ name: "Bono", category: "bonus", amount: 500, currency: "USD", frequency: "annual", taxable: true, cash: true, utilization: 100 }];
  assert.equal(compareOffers(input).isError, true);
});

test("missing choices and unsupported scenarios return errors without numbers or edit links", () => {
  const cases = [
    (input) => { delete input.offers.contractor.accountant; },
    (input) => { input.offers.contractor.resicoEligibilityStatus = "unconfirmed"; },
    (input) => { input.offers.contractor.resicoEligibilityStatus = "ineligible"; },
    (input) => { input.offers.contractor.monthlyPay = 50000; },
    (input) => { input.offers.employee.statutoryBenefits.vacationDays = 1; },
    (input) => { input.offers.employee.statutoryBenefits = null; },
    (input) => { input.offers.employee.paidVacationDays = 20; },
    (input) => { input.offers.employee.accountant = 500; },
    (input) => { input.offers.employee.insurance = 500; },
    (input) => { input.offers.employee.fxFee = 1; },
    (input) => { input.offers.contractor.statutoryBenefits = input.offers.employee.statutoryBenefits; },
    (input) => { input.offers.contractor.currency = "EUR"; },
    (input) => { input.offers.employee.monthlyPay = "70000"; },
    (input) => { input.offers.employee.monthlyPay = 1e300; },
    (input) => { input.assumptions.fxDate = "2026-02-30"; },
    (input) => { input.horizon = "ten-years"; },
    (input) => { input.offers.employee.country = "US"; },
    (input) => { input.offers.employee.rsu = { grantValue: 20000, currency: "MXN", cliffMonth: 12, cadence: 3, saleFeeRate: 0, allocations: [{ year: 1, percent: 50 }] }; },
  ];
  for (const mutate of cases) {
    const input = exampleInput();
    mutate(input);
    const result = compareOffers(input);
    assert.equal(result.isError, true, mutate.toString());
    assert.ok(result.structuredContent.errors.length);
    assert.equal(result.structuredContent.calculations, undefined);
    assert.equal(result.structuredContent.editUrl, undefined);
  }
});

test("official SDK client can discover and call the stateless endpoint", async () => {
  const requests = [];
  const client = new Client({ name: "sueldo-test", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL("https://sueldo.ai/api/mcp"), {
    fetch: async (url, init) => {
      requests.push(init?.method);
      const response = await endpoint(new Request(url, init));
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("mcp-session-id"), null);
      assert.equal(response.headers.get("set-cookie"), null);
      return response;
    },
  });
  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name), ["compare_offers"]);
    assert.equal(tools[0].annotations.readOnlyHint, true);
    assert.equal(tools[0].inputSchema.additionalProperties, false);
    const result = await client.callTool({ name: "compare_offers", arguments: exampleInput() });
    assert.equal(result.isError, false);
    assert.deepEqual(result.structuredContent, compareOffers(exampleInput()).structuredContent);
    assert.ok(requests.includes("POST"));
  } finally {
    await client.close();
  }
});

for (const [name, fetch] of [["Vercel", vercel.fetch], ["Sites", (request) => worker.fetch(request, {})]]) {
  test(`${name} serves legacy initialization, tool discovery and calculation`, async () => {
    const initialized = await fetch(rpcRequest("initialize", {
      protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "legacy-client", version: "1.0.0" },
    }));
    assert.equal(initialized.status, 200);
    assert.equal((await rpcBody(initialized)).result.protocolVersion, "2025-11-25");
    const notification = await fetch(rpcRequest("notifications/initialized", undefined, { id: null }));
    assert.equal(notification.status, 202);
    const listed = await rpcBody(await fetch(rpcRequest("tools/list")));
    assert.equal(listed.result.tools[0].name, "compare_offers");
    const offerProperties = listed.result.tools[0].inputSchema.properties.offers.properties;
    for (const key of ["employee", "contractor"]) {
      assert.equal(Object.hasOwn(offerProperties[key].properties, "location"), false);
      const withLocation = exampleInput();
      withLocation.offers[key].location = "Ciudad de ejemplo";
      const rejected = await rpcBody(await fetch(rpcRequest("tools/call", { name: "compare_offers", arguments: withLocation })));
      assert.ok(rejected.error || rejected.result?.isError);
      assert.equal(rejected.result?.structuredContent?.editUrl, undefined);
    }
    const called = await fetch(rpcRequest("tools/call", { name: "compare_offers", arguments: exampleInput() }));
    assert.equal(called.headers.get("cache-control"), "no-store");
    assert.equal(called.headers.get("mcp-session-id"), null);
    assert.deepEqual((await rpcBody(called)).result.structuredContent, compareOffers(exampleInput()).structuredContent);
  });
}

test("rejects unsafe origins/hosts, URL parameters and session methods", async () => {
  for (const [headers, url, expected] of [
    [{ Origin: "https://evil.test" }, undefined, 403],
    [{ Origin: "null" }, undefined, 403],
    [{ Host: "evil.test" }, undefined, 403],
    [{}, "https://evil.test/api/mcp", 403],
    [{}, "https://sueldo.ai/api/mcp?salary=12345", 400],
    [{ Origin: "https://sueldo.ai" }, undefined, 200],
  ]) {
    const response = await endpoint(rpcRequest("tools/list", undefined, { headers, url }));
    assert.equal(response.status, expected);
    assert.equal(response.headers.get("cache-control"), "no-store");
    if (expected !== 200) assert.doesNotMatch(await response.text(), /12345|evil\.test/);
  }
  for (const method of ["GET", "DELETE", "PUT", "OPTIONS"]) {
    const response = await endpoint(new Request("https://sueldo.ai/api/mcp", { method }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
  }
});

test("bounds actual streamed bytes and rejects malformed JSON and batch requests", async () => {
  for (const headers of [{}, { "content-length": "1" }, { "content-length": String(MCP_MAX_BODY_BYTES + 1) }]) {
    const response = await endpoint(new Request("https://sueldo.ai/api/mcp", {
      method: "POST", headers: { "content-type": "application/json", ...headers },
      body: "x".repeat(MCP_MAX_BODY_BYTES + 1),
    }));
    assert.equal(response.status, 413);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  for (const body of ["{broken", "[]"]) {
    const response = await endpoint(new Request("https://sueldo.ai/api/mcp", {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body,
    }));
    assert.equal(response.status, 400);
  }
});

test("protocol validation rejects incomplete/unknown tools without outbound calls or data logs", async (context) => {
  const logs = [];
  for (const method of ["log", "warn", "error", "info", "debug"]) context.mock.method(console, method, (...args) => logs.push(args));
  const outbound = context.mock.method(globalThis, "fetch", () => { throw new Error("No external request expected"); });
  const input = exampleInput();
  delete input.offers.contractor.accountant;
  for (const params of [
    { name: "compare_offers", arguments: input },
    { name: "unknown_tool", arguments: {} },
  ]) {
    const response = await endpoint(rpcRequest("tools/call", params));
    const payload = await rpcBody(response);
    assert.ok(payload.error || payload.result?.isError);
    assert.equal(payload.result?.structuredContent?.editUrl, undefined);
  }
  const valid = await rpcBody(await endpoint(rpcRequest("tools/call", { name: "compare_offers", arguments: exampleInput() })));
  assert.equal(valid.result.isError, false);
  assert.equal(outbound.mock.callCount(), 0);
  assert.deepEqual(logs, []);
});

test("large comparisons fail explicitly instead of returning truncated links", () => {
  const input = exampleInput();
  const component = { name: "Prestación".repeat(12), category: "protection", amount: 1000, currency: "MXN", frequency: "annual", taxable: false, cash: false, utilization: 100 };
  input.offers.employee.components = Array.from({ length: 32 }, () => ({ ...component }));
  input.offers.contractor.components = Array.from({ length: 32 }, () => ({ ...component }));
  const result = compareOffers(input);
  assert.equal(result.isError, true);
  assert.match(result.structuredContent.errors[0].message, /enlace editable/);
  assert.equal(result.structuredContent.editUrl, undefined);
});

test("independent concurrent requests neither retain nor mix comparison data", async () => {
  const inputs = Array.from({ length: 8 }, (_, index) => {
    const input = exampleInput();
    input.offers.employee.monthlyPay += index * 1000;
    return input;
  });
  const outputs = await Promise.all(inputs.map(async (input) => {
    const response = await endpoint(rpcRequest("tools/call", { name: "compare_offers", arguments: input }));
    return (await rpcBody(response)).result.structuredContent;
  }));
  outputs.forEach((output, index) => assert.deepEqual(output, compareOffers(inputs[index]).structuredContent));
  assert.equal(new Set(outputs.map((output) => output.editUrl)).size, inputs.length);
});
