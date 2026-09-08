# sueldo.ai compensation case catalog

Status: working product specification  
Legal baseline checked: 2026-08-28  
Initial audience: professionals living and paying taxes in Mexico who compare Mexican payroll offers, foreign contractor offers, or several offers with different compensation packages.

## Product promise

`sueldo.ai` should answer three related questions without pretending that every benefit is cash:

1. How much money will actually reach me, and when?
2. What is the economic value of the complete offer?
3. What contractor rate or alternative offer would leave me genuinely equivalent or better off?

The result must separate:

- regular spendable cash;
- irregular or contingent cash;
- restricted reimbursements and perks;
- retirement and housing wealth;
- insurance and protection;
- paid time and time costs;
- out-of-pocket work costs;
- unvested value and repayment liabilities.

A total-compensation metric may be calculated, but it must never be the only result.

## The universal compensation component

The calculator should not hard-code a small list of benefit names. Every item should use the same flexible component model, with presets for common cases.

| Field | Cases it resolves |
| --- | --- |
| Name and category | Wellness, internet, RSUs, experience bonus, transport, etc. |
| Amount and currency | MXN, USD, shares, percentage of salary or units |
| Amount basis | Gross, net, employer cost, reimbursement limit or share count |
| Frequency | One-time, weekly, monthly, quarterly, semiannual, annual or custom dates |
| Start and end | Joining midyear, temporary benefit or benefit ending after a year |
| First-year-only | Sign-on bonuses and initial home-office setup |
| Tax treatment | Taxable, non-taxable/exempt, partially taxable, already net or unknown |
| Payment form | Cash, payroll, reimbursement, company-paid service, employer-owned equipment or equity |
| Availability | Automatic, claim required, receipt required or conditional approval |
| Expiration | Use-it-or-lose-it, carryover or no expiration |
| Eligible spend | Wellness-only, internet-only, transport-only or unrestricted |
| Employee contribution | Required contribution before receiving an employer match |
| Certainty | Guaranteed, target, discretionary or formula-based |
| Expected payout | Probability or low/base/high scenarios; never silently assumed to be 100% |
| Vesting or earning schedule | Cliff, monthly, quarterly, annual, graded or custom tranches |
| Clawback | Full or prorated repayment, triggering event and end date |
| Liquidity | Spendable now, delayed, sale-restricted, private/illiquid or protection-only |
| Personal utilization | How much of a restricted benefit this person expects to use |
| Price and FX assumptions | RSU share price, USD/MXN conversion and settlement spread |
| Notes and evidence | Exact wording from the offer, plan or employment contract |

This model lets the user add unusual compensation without waiting for sueldo.ai to add another special-purpose field.

## Offer-level context

Each offer needs:

- a name and employer/client;
- payroll employee, contractor, EOR/PEO employee, mixed or unknown classification;
- location and tax residency;
- start date and comparison horizon;
- gross or net salary/rate and payment currency;
- payment cadence;
- expected hours per week;
- remote, hybrid or onsite schedule;
- commute time and cost per office day;
- expected tenure;
- tax regime and eligibility status;
- whether values came from an offer, contract, policy, pay stub or personal estimate.

The comparison should support the first 12 months after joining, a selected calendar year and a steady-state year. These are not interchangeable.

## A. Base pay and ordinary payroll cash

### A1. Base salary

- Gross monthly Mexican payroll salary.
- Net salary when the offer only communicates net pay; mark the gross calculation as estimated.
- Weekly, biweekly, semimonthly, monthly, 13-month or 14-month payment conventions.
- Salary paid partly in MXN and partly in another currency.
- Guaranteed base plus variable or commission-heavy pay.
- Salary increase already committed for a future date.
- Midyear start, partial first month and payroll lag.
- Employer registering a salary base different from cash salary; flag for review rather than treating it as normal.

### A2. Payroll deductions

- ISR withholding using the selected fiscal-year tables.
- Employee IMSS contribution.
- Infonavit loan deductions when relevant to spendable cash; do not confuse these with employer Infonavit contributions.
- Employee savings-fund contribution.
- Employee-paid insurance upgrade or dependent coverage.
- Payroll loans, garnishments or other personal deductions, clearly separated from offer value.

### A3. Other work cash

- Overtime, on-call pay, shift premiums and holiday work.
- Commissions with quota, accelerator, cap and payout delay.
- Tips or irregular cash that should not be presented as guaranteed salary.
- Employer-paid profit sharing or company-specific cash distributions.

## B. Statutory and standard employee benefits

### B1. Aguinaldo

- Minimum or enhanced number of days.
- Partial first year.
- Gross, exempt and taxable portions.
- Payment month and its effect on cash flow.
- Never convert it into ordinary monthly take-home without also showing its actual payment timing.

### B2. Vacation and vacation premium

- Vacation days by tenure or a company-specific policy.
- Paid vacation is time protection, not additional salary on top of the 12 monthly salary payments.
- Vacation premium is additional compensation.
- Unlimited PTO, subject to a user-entered expected number of days taken.
- Company shutdowns, summer days and additional personal days.
- Contractor paid time off, unpaid time off or a monthly retainer that continues during leave.

### B3. PTU

- Unknown until paid.
- Prior-year actual payment, employer estimate or user estimate.
- New-employer and other eligibility exceptions.
- Applicable legal caps.
- Show as contingent/variable unless it is contractually guaranteed under another name.

### B4. Employer wealth contributions

- Infonavit employer contribution.
- Afore/SAR and retirement contributions.
- Additional employer retirement plan or PPR contribution.
- Vesting and forfeiture rules for supplemental plans.
- Keep these out of “cash available this month.”

### B5. Insurance and protection

- IMSS coverage.
- Major medical, minor medical, dental, vision and life insurance.
- Employee only versus partner/dependent coverage.
- Deductible, coinsurance and coverage ceiling when the user wants a detailed comparison.
- Company-paid premium versus the subjective value to the user.
- Disability, maternity/paternity, caregiver and bereavement benefits.
- Severance and employment protections as protection, not guaranteed annual income.

## C. Bonuses and one-time cash

### C1. Annual or quarterly performance bonus

- Fixed amount or percentage of eligible salary.
- Target, threshold and maximum payout.
- Individual, team and company multipliers.
- Guaranteed versus discretionary.
- First-year proration and minimum tenure/payment-date requirements.
- Payout delay into the following year.
- Expected-value scenarios, while retaining the guaranteed value separately.

### C2. Experience, tenure or anniversary bonus

Example: a MXN 40,000 annual “experience bonus.”

Capture:

- taxable or net treatment;
- whether every eligible employee receives it;
- eligibility date and required tenure;
- first-year proration;
- whether the employee must still be employed on the payment date;
- whether the amount grows by tenure;
- whether it repeats every year.

### C3. Sign-on bonus

Example: paid with the first payroll but repayable if the employee leaves within one year.

The usual English term is **sign-on bonus subject to a one-year clawback** or **repayment obligation**. “Deferred” would normally mean some or all of the cash is paid later.

Support:

- payment date;
- taxable amount and net cash received;
- full or prorated repayment;
- voluntary departure, termination for cause, any departure or custom triggers;
- gross-versus-net repayment language;
- liability remaining on any comparison date;
- first-year value separately from steady-state value;
- multiple installments with separately earned dates.

### C4. Retention and completion bonuses

- Paid only after remaining through a date, completing a project or hitting a milestone.
- Cash received only at vest/payment, not before.
- Probability and forfeiture conditions.
- Rolling retention grants or repeated annual awards.

### C5. Referral, relocation and other one-offs

- Employee referral bonus.
- Relocation cash, reimbursement or gross-up.
- Immigration/legal assistance.
- Joining equipment allowance.
- Anniversary awards and spot bonuses.
- Tax gross-up paid by the employer.

## D. Equity compensation

### D1. RSUs

- Grant represented as shares or a grant-date currency value.
- Actual vesting tranches, including cliffs, monthly/quarterly vesting and backloaded schedules.
- Total grant duration and a user-editable list of vesting periods and percentages that must reconcile to 100%.
- Non-standard schedules such as a three-year grant vesting 50% in year one, 33% in year two and the remaining 17% in year three.
- Allocation by period and vesting cadence are independent inputs: for example, 50% allocated to year one can vest in four quarterly installments, while a one-year cliff accumulates those installments into the month-12 vest.
- Grant price is not guaranteed future value.
- Low/base/high share-price scenarios.
- USD/MXN exchange rate on each expected vest date.
- Taxes and withholding at vest, including an “unknown/manual withholding” mode.
- Sell-to-cover, brokerage and transfer fees.
- Blackout windows or sale restrictions.
- Forfeiture of unvested units on departure.
- Dividend equivalents, if any.
- First grant, overlapping refresh grants and promotion grants.
- Front-loaded first years and “equity cliff” years when refresh grants do not replace the original grant.
- Public, private or otherwise illiquid shares.
- Net shares and spendable cash must be separate from gross vested value.

### D2. Stock options

- Number of options, strike price and expiration.
- Vesting schedule and post-termination exercise window.
- Current/private-company estimated share value.
- Exercise cost, tax at exercise/sale and liquidity.
- Options below strike should not have negative compensation value; assign zero intrinsic value while retaining potential upside as a separate scenario.

### D3. ESPP and employee share purchase

- Employee payroll contribution.
- Employer discount or match only counts as employer-provided value.
- Lookback provision, purchase dates and caps.
- Holding restrictions and price risk.
- Do not count the employee’s own contribution as compensation.

### D4. Other ownership

- Phantom equity and cash-settled units.
- Profit interests or partnership units.
- Crypto/token compensation.
- Private-company grants with no current liquidity.
- Acquisition/change-of-control acceleration.

## E. Reimbursements, stipends and restricted perks

### E1. Wellness reimbursement

Example: a quarterly taxable wellness allowance that is reimbursed only for eligible purchases.

Required inputs:

- quarterly limit and claim deadline;
- taxable treatment;
- receipt and eligible-category requirement;
- use-it-or-lose-it or carryover;
- expected utilization percentage;
- whether tax withholding is applied even though the employee already paid the expense;
- reimbursement lag.

Required calculated outputs for this case:

- nominal annual limit;
- expected reimbursements based on utilization;
- estimated after-tax usable value;
- cash-flow timing, because the employee pays before reimbursement.

### E2. Internet and electricity

Example: a monthly internet and electricity allowance for remote work.

Support:

- fixed payroll payment;
- actual-cost reimbursement;
- receipt required or automatic;
- taxable, non-taxable or unknown treatment;
- monthly cap and partial reimbursement;
- employee’s actual incremental cost;
- remote-work eligibility and days at home.

Mexican law does not define a universal standard “home-office stipend.” For an employment relationship that qualifies as telework—more than 40% of the time at the employee’s home or chosen location—the LFT requires the employer to provide and maintain necessary equipment and assume telework costs, including telecommunications and the proportional electricity cost. The amount and description of home-service payments belong in the written conditions. See LFT articles 330-A, 330-B and 330-E: [official current text](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf).

Therefore the product must distinguish:

- legally related telework cost coverage;
- discretionary remote-work benefit;
- reimbursement of actual cost;
- unrestricted taxable stipend;
- company-provided service or equipment.

### E3. Home-office setup

- One-time desk/chair/monitor budget.
- Refresh budget every N years.
- Reimbursement versus company-owned equipment.
- Equipment that must be returned is not employee compensation.
- Personal choice to buy above the cap.
- Ergonomic or disability accommodations.

### E4. Transport and commuting

- Fixed taxable transport allowance.
- Reimbursement per office day, trip or receipt.
- Company shuttle, parking or ride-share account.
- Petrol, tolls or public transit.
- Benefit expiration and utilization.
- Employee commute expense and commute hours as separate negative values.
- Hybrid schedule changes and mandatory travel days.

### E5. Meals and food

- Vales de despensa.
- Meal vouchers, cafeteria subsidy and delivery credits.
- Per diem while traveling versus normal-work meals.
- Restricted categories, expiration and employee utilization.
- Taxable/exempt treatment and limits by the selected year.

### E6. Learning and professional development

- Annual learning budget.
- Tuition reimbursement.
- Certification and conference reimbursement.
- Approval/repayment conditions.
- Paid learning days.
- Benefit value based on likely use, not merely the maximum catalog amount.

### E7. Other recurring lifestyle benefits

- Mobile phone.
- Childcare or dependent-care support.
- Mental-health sessions.
- Gym membership paid directly by the employer.
- Coworking allowance.
- Car allowance or company car.
- Memberships and subscriptions.
- Travel credits or sabbatical allowances.
- Donation matching; track separately because it is not spendable personal compensation.

## F. Fondo de ahorro and matching benefits

- Employee contribution percentage or fixed amount.
- Employer match percentage and cap.
- Deposit/payment schedule.
- Tax treatment and applicable limits by year.
- Withdrawal restrictions and forfeiture conditions.
- Loans against the fund.
- Count only the employer contribution as new compensation.
- Treat the employee contribution as reduced current liquidity but retained savings.

The same rule applies to retirement matches, ESPP contributions and any benefit that requires the employee to provide their own money.

## G. Foreign contractor income

### G1. Contract structure

- Monthly retainer, hourly rate, daily rate, milestone or fixed project.
- Guaranteed hours versus maximum availability.
- Paid or unpaid public holidays.
- Paid or unpaid vacation and sick days.
- Invoice cadence, payment terms and realistic collection delay.
- Partial first month and contract end date.
- Termination notice, guaranteed minimum term and early termination.
- Multiple simultaneous clients.
- Client-paid bonus, equity or reimbursements.

### G2. Currency and payment costs

- Offer currency and tax/reporting currency.
- Reference exchange rate versus actual settlement rate.
- Bank, SWIFT, Wise, DolarApp or platform fees.
- Percentage spread plus fixed fees.
- Low/base/high USD/MXN scenarios.
- Revenue volatility when the peso moves.
- Avoid presenting today’s exchange rate as a guaranteed annual salary.

### G3. RESICO

- Eligibility rather than automatic selection.
- Annual income across applicable sources and the MXN 3.5 million ceiling.
- Current monthly/annual rate tier.
- Revenue effectively collected and supported by CFDI.
- Other income, shareholder/partner status and other disqualifying conditions.
- Month when the ceiling could be exceeded.
- Alternative business/professional regime scenario.
- Accountant and compliance costs.
- Tax amounts held aside versus spendable cash.

Current statutory baseline: RESICO individual rates are 1%–2.5% on collected invoiced revenue without ISR deductions in that calculation, subject to the eligibility rules and ceiling in LISR article 113-E: [official current text](https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf).

### G4. IVA on exported services

Never infer “0% IVA” only because the client is abroad.

Capture:

- client residence;
- whether the client has a permanent establishment in Mexico;
- where the service is used/benefited from;
- service type;
- contract and invoice recipient;
- payment origin and destination;
- evidence available for the transaction;
- accountant-confirmed, likely eligible, likely ineligible or unknown status.

LIVA article 29 applies 0% to qualifying exported services and includes independent personal services used entirely abroad by a foreign resident without a Mexican permanent establishment; specific technology-service provisions contain additional requirements: [official current text](https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf).

The calculator is educational. It should explain the assumption and allow the user/accountant to override it, not certify the transaction.

### G5. Costs an employee may not normally see

- Accountant/bookkeeping.
- CFDI or invoicing tooling.
- Payment and FX fees.
- Major medical insurance.
- IMSS enrollment for independent workers.
- Retirement saving.
- Equipment, repairs and replacement reserve.
- Software and coworking.
- Unpaid vacation and sick time.
- Training and conferences.
- Bad-debt/payment-delay reserve.
- Bench time between contracts.
- Legal/contract review.

### G6. Contractor risk and classification

- Single client concentration.
- At-will/short-notice termination.
- No severance.
- Currency volatility.
- Late payment.
- Noncompete/exclusivity.
- Apparent subordination or classification concerns should produce a legal-review flag, not a tax-saving recommendation.

Model risk as explicit scenarios or a reserve chosen by the user. Do not hide it inside an unexplained “contractor discount.”

## H. Time, location and quality-of-life economics

- Contracted hours and realistic average hours.
- Commute hours.
- Required travel and travel days.
- On-call load.
- Paid vacation actually expected to be used.
- Company holidays and shutdowns.
- Flexible schedule, compressed week or part-time arrangement.
- Remote, hybrid and onsite costs.
- Time-zone mismatch and weekend/evening work.
- Sabbatical eligibility and vesting.

Outputs should include effective after-tax value per working hour. Subjective quality-of-life factors should not receive fake monetary precision unless the user chooses a monetary value.

## I. Timing, certainty and comparison horizons

Every offer should produce:

### First 12 months

Includes sign-on cash, first-year proration, initial equity cliff, setup allowances and actual start date.

### Steady-state annual

Excludes one-time joining benefits and uses repeating compensation only.

### Cash-flow calendar

Shows the months in which salary, bonuses, reimbursements, taxes and RSU vesting actually happen.

### Guaranteed, expected and upside cases

- Guaranteed: contractually earned with no performance assumption.
- Expected: user-selected payout/utilization and base market scenarios.
- Upside: target/max bonuses, favorable share price and favorable FX, clearly labeled.

### Leaving scenarios

At month 3, 6, 12, 24 or a custom date, calculate:

- earned cash;
- unvested value forfeited;
- sign-on/relocation amount repayable;
- benefits not yet eligible;
- final PTO or other relevant settlement assumptions;
- next-contract downtime selected by the user.

## J. Required comparison outputs

For each offer and for the comparison:

- regular monthly take-home;
- irregular cash by month;
- first-12-month take-home;
- first-12-month total economic value;
- steady-state annual take-home and value;
- employer retirement/housing contributions;
- restricted benefits at nominal and expected usable value;
- insurance/protection summary;
- unvested equity and vested after-tax equity;
- user-borne annual costs;
- effective value per working hour;
- guaranteed, expected and upside totals;
- USD contractor break-even rate;
- FX rate at which the recommendation changes;
- remaining bonus repayment obligation by date;
- assumptions, unknowns and review flags.

Any conclusion that one offer leads must be supported by the calculated drivers. Example:

> Offer B gives you MXN 8,200 more spendable cash per month, but Offer A has MXN 146,000 more expected annual equity and MXN 62,000 more retirement/housing value. Offer B only leads in total expected value if USD/MXN remains above 17.40 and its bonus pays at least 70% of target.

## K. Guardrails against misleading totals

- Do not count paid vacation as extra cash in addition to monthly salary.
- Do not count the employee’s part of a match as employer compensation.
- Do not value employer-owned equipment as employee wealth.
- Do not treat a reimbursement limit as cash if it requires eligible spending.
- Apply utilization to restricted/use-it-or-lose-it benefits.
- Do not repeat a sign-on bonus in steady-state years.
- Treat a sign-on repayment obligation as a liability until the required permanence period expires or is earned.
- Use actual RSU vesting tranches; do not blindly divide a grant by four.
- Separate vested equity from sellable proceeds.
- Do not assume a target bonus is guaranteed.
- Do not assume today’s share price or exchange rate for the whole future year.
- Do not assume RESICO eligibility.
- Do not assume exported services qualify for 0% IVA.
- Do not present employer insurance cost as identical to the user’s personal value.
- Do not mix cash, protection and long-term wealth without preserving the breakdown.
- Label user-entered, inferred, legally defined and accountant-confirmed assumptions differently.

## L. Seed scenarios for product and calculation tests

### Scenario 1: Equity-heavy employee package

- MXN gross payroll base salary.
- Annual performance bonus with target and actual-payout scenarios.
- Sign-on bonus paid in month one and subject to a one-year clawback.
- RSU grant with quarterly vesting and changing share-price/FX scenarios.
- Quarterly taxable wellness reimbursement, use-it-or-lose-it.
- Monthly internet/electricity payment.
- Mexican statutory benefits and employer contributions.

Acceptance checks:

- first year and steady state differ;
- month-one cash and month-one liability both appear;
- wellness nominal value and usable after-tax value change with utilization;
- RSUs appear on actual vest dates and not as ordinary monthly salary;
- the internet/electricity item can be modeled as taxable cash or reimbursement;
- leaving before month 12 shows the applicable sign-on repayment and forfeited RSUs.

### Scenario 2: Annual experience bonus

- Mexican payroll offer.
- MXN 40,000 taxable annual experience/tenure bonus.
- Employee must be active on payment date.
- Compare guaranteed, first-year-prorated and discretionary variants.

Acceptance checks:

- the bonus is paid in the correct month;
- it does not inflate regular monthly take-home;
- first-year eligibility is explicit;
- after-tax value is separated from its stated gross amount.

### Scenario 3: USD contractor under possible RESICO

- Monthly USD retainer.
- Multiple exchange-rate scenarios and actual payment fee.
- Accountant fee.
- Unpaid time off.
- Health/IMSS and retirement alternatives.
- Conditional RESICO eligibility.
- Conditional 0% IVA export assumption.

Acceptance checks:

- shows the contractor USD rate needed to match each employee offer;
- a strong peso can flip the result;
- crossing the RESICO ceiling produces a warning and alternative scenario;
- unknown IVA eligibility prevents a falsely definitive tax result.

### Scenario 4: Two employee offers with unusual benefits

- Offer A has higher salary and minimal benefits.
- Offer B has lower salary, enhanced aguinaldo, fondo de ahorro, annual bonus, RSUs, transport and wellness.
- User expects to use only 30% of wellness and none of transport.

Acceptance checks:

- nominal package and personal expected value differ;
- unused benefits do not win the comparison by themselves;
- Offer B’s long-term wealth remains part of the comparison even if Offer A wins monthly cash.

### Scenario 5: Equity cliff

- Four-year initial grant with a one-year cliff.
- Quarterly vesting afterward.
- Small annual refresh grants beginning in year two.
- Departure at months 11, 18 and 49.

Acceptance checks:

- month 11 has no vested initial RSUs;
- month 18 includes only actual vested tranches;
- year five exposes a possible compensation cliff rather than repeating the original grant forever.

## M. Suggested delivery scope

### V1: credible offer comparison

- Multiple offers.
- Flexible universal compensation components.
- Mexican payroll base calculation.
- Statutory benefits and common employer contributions.
- USD contractor plus RESICO eligibility/IVA assumption workflow.
- Quarterly/annual/one-time reimbursements and stipends.
- Bonuses, sign-on repayment obligations and experience bonuses.
- RSUs with custom vesting tranches and scenarios.
- First-12-month and steady-state views.
- Guaranteed/expected/upside and utilization.
- Shareable assumption-based URL or exported report.

### V1.1: deeper personal economics

- Cash-flow calendar.
- Leaving scenarios.
- Commute/time-adjusted value.
- Detailed insurance comparison.
- Fondo de ahorro and retirement matching.
- Stock options and ESPP.
- Historical actual bonus/RSU/FX scenarios.

### Later

- Offer-letter import with explicit user review of every extracted assumption.
- Saved comparisons and compensation history.
- Negotiation targets and scenario reports.
- Accountant-reviewed tax profiles.
- Invoice and monthly RESICO workflows, kept separate from the educational calculator until compliance and professional-review requirements are met.

## N. Open methodology decisions

- Default share-price and FX scenario ranges.
- How to estimate bonus probability without implying false precision.
- Whether insurance should use employer premium, replacement cost or user-entered personal value.
- How much payroll tax precision V1 needs for irregular payments.
- Exact treatment of mixed payroll and RESICO income.
- Which tax/benefit rules require annual versioning from launch.
- What evidence and accountant review are required before labeling an IVA export case “confirmed.”
