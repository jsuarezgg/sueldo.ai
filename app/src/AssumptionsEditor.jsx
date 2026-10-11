import { WarningCircle } from "@phosphor-icons/react";
import { EMPLOYMENT_SUBSIDY_2026, MXN, TAX_YEAR, isPayrollOffer } from "./compensation.js";
import { CalculatedLine, Disclosure, MoneyInput, PercentInput, QuantityInput } from "./fields.jsx";
import { MXN_WITH_CENTS, describeResico } from "./format.js";

function describeImssBasis(imss) {
  if (imss.employerCovered) return "El patrón absorbe la cuota al salario mínimo";
  if (imss.capped) return "SBC estimado · aplica tope de 25 UMA";
  if (imss.fixedMonthlyCompensation > 0) {
    return `SBC integra ${MXN.format(imss.fixedMonthlyCompensation)} de compensación fija mensual`;
  }
  return "SBC integrado con las prestaciones capturadas";
}

function PayrollAssumptions({ offer, calculation, onChange }) {
  const { taxProfile, imss, employerContributions } = calculation;

  return (
    <section>
      <div className="assumption-heading">
        <span>{offer.name}</span>
        <small>Nómina</small>
      </div>
      <Disclosure className="calculation-disclosure" summary="Ver ISR, IMSS y aportaciones">
        <div className="calculation-sheet" aria-label={`Deducciones calculadas de ${offer.name}`}>
          <CalculatedLine
            label="ISR retenido"
            amount={taxProfile.monthlyTax}
            detail={`${taxProfile.effectiveRate.toFixed(2)}% efectivo · tarifa mensual SAT ${TAX_YEAR}`}
          />
          {taxProfile.subsidy > 0 ? (
            <CalculatedLine
              label="Subsidio para el empleo aplicado"
              amount={taxProfile.subsidy}
              detail={`Reduce el ISR con ingresos de hasta ${MXN_WITH_CENTS.format(EMPLOYMENT_SUBSIDY_2026.incomeLimit)} al mes; el excedente no se paga en efectivo`}
              formatter={MXN_WITH_CENTS}
            />
          ) : null}
          <CalculatedLine
            label="Cuota obrera IMSS"
            amount={imss.monthly}
            detail={`${describeImssBasis(imss)} · cuota mensual sobre ${imss.monthDays} días`}
          />
          <CalculatedLine
            label="Afore · retiro (empresa)"
            amount={employerContributions.retirement / 12}
            detail="2% del salario base de cotización"
          />
          <CalculatedLine
            label="Afore · cesantía y vejez"
            amount={employerContributions.ceav / 12}
            detail={`${employerContributions.ceavRate.toFixed(3)}% patronal en 2026`}
          />
          <CalculatedLine
            label="Infonavit (empresa)"
            amount={employerContributions.infonavit / 12}
            detail="5% del salario base de cotización"
          />
        </div>
      </Disclosure>
      <MoneyInput
        label="Deducciones adicionales al mes"
        value={offer.additionalDeductions}
        onChange={(additionalDeductions) => onChange({ additionalDeductions })}
        suffix="MXN"
      />
      {offer.currency === "USD" ? (
        <PercentInput
          label="Costo cambiario"
          value={offer.fxFee}
          onChange={(fxFee) => onChange({ fxFee })}
        />
      ) : null}
    </section>
  );
}

function ContractorAssumptions({ offer, calculation, onChange }) {
  const profile = calculation.taxProfile;
  const resicoDetail = describeResico(profile);

  return (
    <section>
      <div className="assumption-heading">
        <span>{offer.name}</span>
        <small>Contratista independiente</small>
      </div>
      <Disclosure className="calculation-disclosure" summary="Ver RESICO y tiempo libre">
        <div className="calculation-sheet" aria-label={`ISR RESICO calculado de ${offer.name}`}>
          <CalculatedLine
            label={profile.eligible ? "ISR RESICO" : "RESICO pendiente"}
            amount={profile.monthlyTax}
            detail={resicoDetail}
            warning={!profile.eligible}
          />
          <CalculatedLine
            label="Tiempo libre sin pago"
            amount={calculation.unpaidTime / 12}
            detail={`${calculation.unpaidDays} días no cubiertos de ${offer.plannedTimeOffDays || 0} planeados`}
          />
        </div>
      </Disclosure>
      {!profile.eligible ? (
        <div className="resico-blocker" role="alert">
          <WarningCircle size={20} weight="fill" />
          <div>
            <strong>No calculamos un neto RESICO para esta oferta</strong>
            <p>{resicoDetail}.</p>
          </div>
        </div>
      ) : null}
      <MoneyInput
        label="Contador al mes"
        value={offer.accountant}
        onChange={(accountant) => onChange({ accountant })}
        suffix="MXN"
      />
      <MoneyInput
        label="Otras deducciones al mes"
        value={offer.additionalDeductions}
        onChange={(additionalDeductions) => onChange({ additionalDeductions })}
        suffix="MXN"
      />
      <div className="field-row">
        <PercentInput
          label="Costo cambiario"
          value={offer.fxFee}
          onChange={(fxFee) => onChange({ fxFee })}
        />
        <MoneyInput
          label="Seguro propio"
          value={offer.insurance}
          onChange={(insurance) => onChange({ insurance })}
        />
      </div>
      <QuantityInput
        label="Días libres que tomarías"
        value={offer.plannedTimeOffDays}
        onChange={(plannedTimeOffDays) => onChange({ plannedTimeOffDays })}
        suffix="días / año"
      />
    </section>
  );
}

export function OfferAssumptionsEditor(props) {
  return isPayrollOffer(props.offer)
    ? <PayrollAssumptions {...props} />
    : <ContractorAssumptions {...props} />;
}
