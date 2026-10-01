# sueldo.ai para clientes MCP

- Endpoint: `https://sueldo.ai/api/mcp`
- Transporte: MCP Streamable HTTP, POST; sin autenticación ni sesiones.
- Herramienta: `compare_offers`.
- Idioma de producto: español de México.
- Última actualización: 1 de octubre de 2026.

Conecta esta URL desde un cliente que permita servidores MCP remotos. No requiere un componente visual, una skill o un modelo específico. Un buscador que sólo puede leer páginas no puede llamar la herramienta automáticamente: el cliente necesita una conexión MCP o soporte HTTP adecuado.

El servidor publica el esquema completo mediante `tools/list`. Usa el ciclo de conexión de tu cliente MCP; soporta el protocolo actual del SDK y clientes Streamable HTTP de 2025. GET y DELETE devuelven 405 porque no hay stream permanente ni sesiones. Las respuestas son JSON o eventos SSE finitos según la versión del protocolo. No se admite el transporte SSE antiguo con un endpoint separado.

## Antes de calcular

1. Confirma que la comparación corresponde a una persona residente fiscal en México y que los pagos son brutos mensuales.
2. Recoge las dos ofertas, sus monedas, prestaciones, costos, tiempo libre y compensación adicional. Pregunta por lo que falte. No uses los números del ejemplo ni asumas cero automáticamente.
3. Para contractor, pregunta si la persona confirma los requisitos personales de RESICO. Un ingreso bajo el límite no prueba elegibilidad. Usa `unconfirmed` cuando no esté confirmado; el cálculo se bloqueará.
4. Acuerda el horizonte y el tipo de cambio cuando haya algún monto en USD. Una tasa proporcionada es un supuesto fijo, no una consulta en tiempo real.
5. Explica que la llamada envía los números al servidor para calcular y que el enlace devuelto contiene la comparación completa.

## Entradas y unidades

Las claves `offers.employee` y `offers.contractor` identifican Oferta A y Oferta B por compatibilidad con el sitio. **Cualquiera de las dos puede ser nómina o contractor.** Las propiedades no reconocidas se rechazan; no envíes documentos, RFC, correos, identificadores o instrucciones dentro de etiquetas.

| Campo | Significado |
| --- | --- |
| `relationship` | `Nómina` o `Contratista independiente` |
| `currency`, `monthlyPay` | Pago bruto mensual en MXN o USD |
| `additionalDeductions`, `accountant`, `insurance` | Costos mensuales en MXN; no duplicar ISR o IMSS calculados. El editor de nómina agrupa todos los costos personales en `additionalDeductions`; para nómina usa cero en `accountant` e `insurance` |
| `fxFee` | Comisión porcentual sobre ingresos en USD convertidos. El editor de nómina permite este costo sólo si el sueldo base está en USD; con base MXN debe ser cero |
| `plannedTimeOffDays`, `paidVacationDays` | Días por año de contractor. `null` para días pagados significa sin prestación, equivalente a cero. Nómina usa `0` y `null`; sus vacaciones van en prestaciones |
| `resicoEligibilityStatus` | `eligible`, `unconfirmed` o `ineligible`; nómina puede usar `unconfirmed` porque no aplica |
| `statutoryBenefits` | Objeto completo para nómina; `null` para contractor. Antigüedad, aguinaldo y vacaciones en años/días; prima vacacional en porcentaje. PTU y seguro patronal son anuales en MXN; vales mensuales en MXN |
| `components` | Lista de bonos, reembolsos, protección u otros conceptos. Cada monto usa su moneda y frecuencia. `cash` y `taxable` son decisiones distintas; `utilization` es porcentaje. `[]` significa que no se incluyen conceptos |
| `rsu` | Grant en su moneda, cliff en meses, cadencia en meses (1, 3, 6 o 12), costo de venta porcentual y asignaciones por años consecutivos que sumen 100%. `null` si no se incluyen RSUs; sólo se soportan en nómina |
| `name`, `location` | Etiquetas opcionales; no cambian las reglas fiscales. Se prefieren etiquetas genéricas y se usan Oferta A/B si no se envía nombre |
| `assumptions.fxRate` | MXN por USD, explícita y mayor que cero. Se requiere incluso si todo está en MXN: no participa en esos cálculos, pero queda disponible si la persona cambia monedas al editar el enlace. No inventar una tasa de relleno |
| `assumptions.fxDate` | Fecha de referencia proporcionada, YYYY-MM-DD, o `null`. El servidor no verifica su procedencia |
| `horizon` | `year` (12 meses) o `three-years` (36 meses) |

Para obtener una referencia puedes consultar `GET https://sueldo.ai/api/fx`, que devuelve el FIX publicado por Banxico con fecha y fuente. Presenta la tasa y su fecha a la persona y pásalas como supuesto explícito. `compare_offers` no hace solicitudes externas: repetir entradas produce los mismos resultados. El enlace conserva la tasa fija para reproducirlos; se puede editar después.

Límites del servicio: 64 KiB por petición, hasta 32 componentes por oferta y 12 años en un calendario de RSUs; importes entre 0 y 1,000 millones por campo, tipo de cambio mayor que cero y hasta 1,000, porcentajes entre 0 y 100. Las reglas del motor pueden imponer límites menores. El enlace tiene un límite de tamaño: si se excede, la herramienta pide reducir conceptos o etiquetas en lugar de devolver un enlace incompleto.

## Ejemplo sintético de argumentos

Los ceros y la elegibilidad de este ejemplo son elecciones explícitas del escenario ficticio. No son valores predeterminados para otras personas.

```json
{
  "offers": {
    "employee": {
      "relationship": "Nómina",
      "currency": "MXN",
      "monthlyPay": 70000,
      "additionalDeductions": 0,
      "accountant": 0,
      "insurance": 0,
      "fxFee": 0,
      "plannedTimeOffDays": 0,
      "paidVacationDays": null,
      "resicoEligibilityStatus": "unconfirmed",
      "statutoryBenefits": {
        "tenureYears": 1,
        "aguinaldoDays": 15,
        "vacationDays": 12,
        "vacationPremiumRate": 25,
        "annualPtu": 0,
        "monthlyVouchers": 0,
        "savingsFundIncluded": false,
        "annualMedicalInsurance": 0
      },
      "components": [],
      "rsu": null
    },
    "contractor": {
      "relationship": "Contratista independiente",
      "currency": "USD",
      "monthlyPay": 5000,
      "additionalDeductions": 0,
      "accountant": 1000,
      "insurance": 2000,
      "fxFee": 0.5,
      "plannedTimeOffDays": 15,
      "paidVacationDays": 5,
      "resicoEligibilityStatus": "eligible",
      "statutoryBenefits": null,
      "components": [],
      "rsu": null
    }
  },
  "assumptions": { "fxRate": 18, "fxDate": null },
  "horizon": "year"
}
```

## Resultados y errores

Una respuesta válida contiene los mismos datos en `structuredContent` y en contenido de texto JSON:

- `status: "ok"`, moneda de salida MXN y horizonte.
- `inputs`: ambas ofertas, supuestos y horizonte. Son argumentos válidos para volver a llamar la herramienta; puedes cambiar sólo el tipo de cambio u otro dato cuando la persona lo pida. En el enlace, el editor también restaura valores internos de prestaciones legales para contractor, que no participan en su cálculo.
- `fx`: indica si se usó conversión y que la tasa/fecha son proporcionadas, no verificadas.
- `calculations`: salida del motor del sitio para ambas ofertas. `recurringMonthlyCash` es efectivo recurrente mensual; `averageMonthlyCash` distribuye el efectivo regular del periodo. `economicValue` incorpora beneficios, aportaciones y equity neto; no lo presentes como sueldo disponible. Los desgloses incluyen impuestos, costos, protección, prestaciones, equity y resultados anuales. Un límite superior de tramo fiscal `null` significa sin tope, no un dato faltante.
- `editUrl`: enlace a sueldo.ai con la comparación en `#c=`. Puede abrirse y editarse sin crear una cuenta.
- `methodologyUrl` y `notices`: interpretación, alcance y privacidad.

Muestra las cifras con redondeo para lectura, pero no cambies las entradas ni recalcules impuestos por tu cuenta. Explica los supuestos y muestra el enlace editable. Las reglas monetarias son las del motor 2026; la proyección mantiene ISR, UMA, salario mínimo y subsidio constantes, mientras antigüedad y CEAV avanzan por año. No representa una predicción de reglas futuras.

La validación del esquema produce errores MCP para entradas incompletas o tipos inválidos. Los errores del dominio devuelven `isError: true`, un estado `invalid_input` o `unsupported`, y campos/mensajes para corregir. No contienen cálculos parciales ni enlace de resultado. Pregunta por los datos faltantes; no inventes un resultado. Otro régimen fiscal, otra residencia fiscal o una moneda no soportada requieren otra herramienta. Consulta [metodología](https://sueldo.ai/metodologia) y [alcance](https://sueldo.ai/uso.md).

## Privacidad

Envía entradas sólo en el cuerpo POST, nunca en parámetros de URL. El endpoint rechaza consultas con query string; un proveedor de infraestructura podría registrar la URL antes del rechazo.

El cálculo usa memoria durante la solicitud: no hay cuentas, base de datos, sesiones guardadas ni llamadas a modelos de IA. La aplicación no registra ofertas, resultados o enlaces, y responde con `Cache-Control: no-store`. Esto no controla las políticas de retención del cliente de IA ni los registros técnicos del alojamiento.

El enlace no es cifrado ni privado: cualquiera que reciba la URL completa puede decodificar las ofertas. El asistente recibe ese enlace y puede conservarlo en el historial. No lo envíes a buscadores o verificadores de enlaces externos. [Privacidad completa](https://sueldo.ai/privacidad).
