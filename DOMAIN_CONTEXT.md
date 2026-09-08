# sueldo.ai domain context

This document records product-market and calculation context only. It intentionally does not prescribe visual direction, layout, interaction patterns, component anatomy, typography, color, spacing, density, or brand styling.

## Market and purpose

- sueldo.ai is for professionals who live and pay taxes in Mexico and need to compare any two job offers.
- Either offer may be payroll or independent contractor, paid in MXN or USD, and may include salary, bonuses, benefits, equity, reimbursements, protection, and time off.
- Payroll versus contractor is an important comparison scenario, not the product's entire market position.
- The comparison answers three separate questions: how much money reaches the person and when, what the complete economic value is, and which components explain the difference.
- The product informs a decision with editable assumptions. It does not choose an offer and is not tax, accounting, legal, or investment advice.
- Product language is Mexican Spanish. Employment and tax concepts should use plain terms unless a more specialized term is necessary for accuracy.

## Calculation invariants

- Keep spendable cash separate from total economic value and from contingent, restricted, or protection-only value.
- Preserve separate treatment for taxes and contractor costs, reimbursements, statutory benefits, employer wealth contributions, insurance and protection, bonuses, paid and unpaid time, and equity.
- Support 12-month and three-year horizons, including actual RSU allocation, cadence, cliff, and vesting events.
- Both offers may contain additional compensation. Contractor items may include taxable cash benefits, reimbursements, and paid vacation days that offset planned unpaid time.
- Payroll calculations include the Mexican statutory baseline, including tenure-based vacation, aguinaldo, vacation premium, applicable exempt portions, PTU assumptions, employee IMSS, and employer Afore, cesantia y vejez, and Infonavit contributions. Employer retirement and housing contributions are economic value, not spendable cash.
- Derive payroll ISR, employee IMSS, and RESICO from explicitly versioned official rules rather than a generic editable rate when an official table or statutory formula exists.
- Block RESICO results when annualized taxable income exceeds MXN 3.5 million or eligibility is not confirmed. Do not substitute the top RESICO rate as a fallback.
- Model a qualifying payroll fondo de ahorro as equal employee and employer contributions at 13% of salary, capped at 1.3 annual UMA.
- Use Banxico FIX as the default USD/MXN reference rate, retain its source date, and provide a clearly identified manual value when the live rate is unavailable.
- Production defaults must remain neutral and must not contain a real company name or an identifiable person's compensation package.

## Data and privacy behavior

- Comparisons are processed in the browser; the published product does not require an account or store a comparison in a database.
- A shared comparison is a versioned, self-contained URL fragment containing both offers, editable assumptions, selected horizon, and result state. The fragment is not sent in the HTTP request, but anyone with the full URL can decode and view it.
- Generated share summaries are anonymous by default. Identifying names and monetary amounts are included only through an explicit user choice.
- The `/api/fx` request contains no offer data.

## Scope and evidence

- `COMPENSATION_CASES.md` is the broader working specification for compensation cases, calculation boundaries, open methodology questions, seed scenarios, and official sources. Later-stage cases and open questions are not claims of current implementation.
- `app/src/compensation.js` contains the implemented calculation engine, and `app/tests/compensation.test.mjs` contains its regression coverage.
- `app/` contains the current runnable product. Its current interface is implementation state, not a design prescription for future work.
- No customer testimonials, adoption metrics, endorsements, or production-usage claims are approved.
