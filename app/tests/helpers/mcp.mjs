// Synthetic inputs, with every financial choice explicit.
export function exampleInput() {
  return {
    offers: {
      employee: {
        relationship: "Nómina", currency: "MXN", monthlyPay: 70000,
        additionalDeductions: 0, accountant: 0, insurance: 0, fxFee: 0,
        plannedTimeOffDays: 0, paidVacationDays: null, resicoEligibilityStatus: "unconfirmed",
        statutoryBenefits: {
          tenureYears: 1, aguinaldoDays: 15, vacationDays: 12, vacationPremiumRate: 25,
          annualPtu: 0, monthlyVouchers: 0, savingsFundIncluded: false, annualMedicalInsurance: 0,
        },
        components: [], rsu: null,
      },
      contractor: {
        relationship: "Contratista independiente", currency: "USD", monthlyPay: 5000,
        additionalDeductions: 0, accountant: 1000, insurance: 2000, fxFee: 0.5,
        plannedTimeOffDays: 15, paidVacationDays: 5, resicoEligibilityStatus: "eligible",
        statutoryBenefits: null, components: [], rsu: null,
      },
    },
    assumptions: { fxRate: 18, fxDate: null },
    horizon: "year",
  };
}

export function rpcRequest(method, params, { id = 1, headers = {}, url = "https://sueldo.ai/api/mcp" } = {}) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-11-25",
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: "2.0", ...(id === null ? {} : { id }), method, ...(params ? { params } : {}) }),
  });
}

export async function rpcBody(response) {
  const text = await response.text();
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const event = text.split("\n").findLast((line) => line.startsWith("data: "));
    return JSON.parse(event.slice(6));
  }
  return JSON.parse(text);
}
