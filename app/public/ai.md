# Comparar ofertas con sueldo.ai desde un asistente de IA

- Guía HTML para lectores web: https://sueldo.ai/ai
- Guía Markdown: https://sueldo.ai/ai.md
- **Ruta recomendada para asistentes con acceso web:** https://sueldo.ai/compare
- API JSON para clientes capaces de consumirla: https://sueldo.ai/api/compare
- Contrato: `v=1`. Metodología: `2026.1`. Año fiscal base: 2026.
- Actualización: 18 de septiembre de 2026.

No necesitas instalar una app, conectar una cuenta ni configurar un plugin. El asistente lee los PDFs y extrae los términos; sueldo.ai calcula usando el mismo motor que la calculadora. El contrato es independiente del proveedor: puede usarlo ChatGPT, Claude, Gemini u otro asistente que pueda leer archivos y recuperar URLs públicas. La conversación necesita esas capacidades; no se garantiza que estén disponibles en todos los productos o modos. Que un asistente pueda abrir páginas no garantiza que pueda recuperar todas las URLs generadas: esta integración es un experimento, no una integración nativa de un proveedor de IA.

## Texto para copiar después de adjuntar dos ofertas

> Compara estos dos PDFs usando sueldo.ai. Primero lee https://sueldo.ai/ai. Extrae únicamente los números y opciones necesarios; no envíes nombres, correos, RFC ni texto de los documentos. Entiendo que los parámetros enviados en una URL pueden quedar en historiales y registros. Confirma conmigo la elegibilidad de RESICO si aplica y pregunta por información esencial que falte. Construye y recupera una URL https://sueldo.ai/compare con los parámetros documentados; lee el resultado HTML sin ejecutar JavaScript y explica sus resultados, supuestos y advertencias sin sustituir sus cálculos. Incluye el enlace interactivo devuelto. Si no puedes recuperar la URL, dilo y dame el enlace para abrirlo.

## Flujo para el asistente

1. Lee los documentos y distingue salario bruto de neto, periodicidad, moneda, relación contractual y beneficios. No adivines importes ni conviertas un salario neto a bruto.
2. Usa `a` y `b` como etiquetas. Un monto anual de salario base explícito puede dividirse entre 12; no dividas un paquete total que incluya bonos o equity como si fuera salario base.
3. Construye una URL GET con los campos documentados. No subas documentos ni texto, nombres de empresa o identificadores personales. Codifica los valores con las reglas estándar de query string, sin doble codificación.
4. **Recupera `/compare?...` como página web.** Es la ruta recomendada para asistentes con acceso web genérico; no necesita JavaScript. El HTML inicial incluye el resultado completo visible en `<pre id="sueldo-result-text">` y el mismo objeto en `<script id="sueldo-result" type="application/json">`. Ese bloque es datos, no código ejecutable. Si tu lector elimina las etiquetas script, lee el JSON visible. Reserva `/api/compare?...` para clientes que puedan consumir APIs JSON con fiabilidad. Ambas rutas y la calculadora interactiva usan exactamente el mismo motor.
5. Lee `status` antes de explicar cifras. Para `needs_input`, pregunta solo por los campos faltantes. Para `invalid_input`, explica los errores y corrige los parámetros; no presentes una comparación válida. Para `unavailable`, no inventes resultados ni un tipo de cambio.
6. Con `ok`, cita la metodología, el horizonte y el tipo de cambio devueltos. Separa efectivo, beneficios restringidos, protección y equity. Explica los supuestos importantes y devuelve `view_url`.

## Ejemplos completos con datos sintéticos

Estos casos se pueden copiar en dos PDFs de prueba. El asistente extrae únicamente los términos descritos, construye la URL, lee `status` y explica las cifras devueltas. No calcules impuestos por tu cuenta ni atribuyas cifras a sueldo.ai antes de recuperar una respuesta válida.

### 1. Dos ofertas de nómina en MXN

El PDF A indica salario **bruto mensual** de MXN 120,000, 30 días de aguinaldo, 20 días de vacaciones y prima de 50%. El PDF B indica salario **bruto mensual** de MXN 130,000 y no detalla prestaciones. Se usan los valores predeterminados documentados de B y se explican como supuestos; si sus prestaciones están pendientes de confirmación, envía `null` en esos campos.

[Recuperar comparación de nómina](https://sueldo.ai/compare?v=1&methodology=2026.1&a.type=payroll&a.monthly_pay=120000&a.currency=MXN&a.aguinaldo_days=30&a.vacation_days=20&a.vacation_premium_rate=50&b.type=payroll&b.monthly_pay=130000&b.currency=MXN&horizon=1)

```text
https://sueldo.ai/compare?v=1&methodology=2026.1&a.type=payroll&a.monthly_pay=120000&a.currency=MXN&a.aguinaldo_days=30&a.vacation_days=20&a.vacation_premium_rate=50&b.type=payroll&b.monthly_pay=130000&b.currency=MXN&horizon=1
```

Esperado: `status: "ok"`, `horizon_months: 12`, moneda de salida MXN. Lee `summary.offer_a`, `summary.offer_b`, los deltas y `assumptions`; devuelve `view_url` para revisar los mismos datos en la calculadora. No requiere consulta de FX.

### 2. Nómina frente a contractor en USD, con confirmación personal

El PDF A indica nómina de MXN 120,000 brutos mensuales. El PDF B indica USD 9,000 brutos mensuales como contractor y 15 días al año sin facturar. La persona confirma su elegibilidad RESICO y acepta **18 MXN/USD como supuesto manual**, no como cotización de Banxico.

[Recuperar nómina frente a contractor](https://sueldo.ai/compare?v=1&methodology=2026.1&a.type=payroll&a.monthly_pay=120000&a.currency=MXN&b.type=contractor&b.monthly_pay=9000&b.currency=USD&b.resico_eligible=true&b.planned_time_off_days=15&fx_rate=18&horizon=1)

```text
https://sueldo.ai/compare?v=1&methodology=2026.1&a.type=payroll&a.monthly_pay=120000&a.currency=MXN&b.type=contractor&b.monthly_pay=9000&b.currency=USD&b.resico_eligible=true&b.planned_time_off_days=15&fx_rate=18&horizon=1
```

Esperado: `status: "ok"`, `fx.source: "manual"` y advertencia `manual_fx`. Explica la diferencia de efectivo y valor económico, el efecto del tiempo sin facturar y los supuestos de costos omitidos; devuelve `view_url`. Sin `fx_rate`, sueldo.ai consulta Banxico FIX y puede devolver `unavailable` si esa consulta falla.

### 3. El mismo caso, pero RESICO todavía no está confirmado

No deduzcas elegibilidad por leer “contractor” en el PDF. Con los mismos términos del caso anterior, omite `b.resico_eligible` hasta recibir confirmación personal.

[Recuperar solicitud de información faltante](https://sueldo.ai/compare?v=1&methodology=2026.1&a.type=payroll&a.monthly_pay=120000&a.currency=MXN&b.type=contractor&b.monthly_pay=9000&b.currency=USD&b.planned_time_off_days=15&fx_rate=18&horizon=1)

```text
https://sueldo.ai/compare?v=1&methodology=2026.1&a.type=payroll&a.monthly_pay=120000&a.currency=MXN&b.type=contractor&b.monthly_pay=9000&b.currency=USD&b.planned_time_off_days=15&fx_rate=18&horizon=1
```

Esperado: `status: "needs_input"` y `missing_fields` con `field: "b.resico_eligible"`, una `question` y valores booleanos esperados. Pregunta a la persona esa cuestión; no presentes cifras válidas todavía. Si confirma elegibilidad, agrega `b.resico_eligible=true` y recupera la URL del caso 2. Si responde que no, envía `false`: se obtiene `invalid_input` porque el motor no implementa otro régimen contractor. No sugieras cambiar la respuesta a `true` para conseguir un resultado.

## Parámetros de entrada

Cada campo de oferta lleva el prefijo `a.` o `b.`. Usa números decimales no negativos (máximo 1,000,000,000), sin símbolos de moneda, separadores de miles ni notación científica. Los porcentajes usan puntos porcentuales: `25` significa 25%, no `0.25`. Los booleanos son `true` o `false`. En campos de oferta, `horizon` y `fx_rate`, un valor explícito `null` o vacío indica información pendiente y produce `needs_input`; omitir un campo opcional permite aplicar el valor predeterminado, que se declara en `assumptions`. No repitas claves ni envíes campos desconocidos. `v`, `methodology`, `format` y `fx_date` deben omitirse o usar sus valores válidos documentados.

| Campo por oferta | Valor y significado | Si se omite |
| --- | --- | --- |
| `type` | `payroll` o `contractor` | Obligatorio |
| `monthly_pay` | Pago **bruto mensual** positivo, en la moneda de la oferta | Obligatorio |
| `currency` | `MXN` o `USD` | Obligatorio |
| `resico_eligible` | Confirmación personal `true` para contractor; `false` bloquea el cálculo | Obligatorio para contractor |
| `additional_deductions` | Deducciones adicionales mensuales, MXN | 0 |
| `accountant` | Contabilidad mensual, MXN | 0 |
| `fx_fee` | Comisión de conversión, 0–100% | 0 |
| `insurance` | Seguro pagado por la persona al mes, MXN | 0 |
| `planned_time_off_days` | Días previstos sin trabajar al año, 0–260, contractor | 0 |
| `paid_vacation_days` | Días pagados que compensan el tiempo sin facturar, 0–260 al año, contractor | 0 |
| `tenure_years` | Antigüedad, al menos 1 año, nómina | 1 |
| `aguinaldo_days` | Días de aguinaldo, al menos 15, nómina | 15 |
| `vacation_days` | Días anuales de vacaciones, no menos del mínimo calculado según antigüedad, nómina | Base legal según antigüedad |
| `vacation_premium_rate` | Prima vacacional, 25–100%, nómina | 25 |
| `annual_ptu` | PTU anual estimada, MXN, nómina | 0 |
| `monthly_vouchers` | Vales mensuales, MXN, nómina | 0 |
| `savings_fund_included` | Fondo de ahorro según el modelo actual: aportaciones iguales de 13%, con tope UMA; no representa cualquier plan | `false` |
| `annual_medical_insurance` | Valor anual de protección médica del empleador, MXN, nómina | 0 |
| `components` | Arreglo JSON de compensaciones adicionales, máximo 32 | `[]` |
| `rsu` | Objeto JSON con grant y vesting | Sin RSUs |

Los campos de elegibilidad RESICO y tiempo libre de contractor se rechazan para nómina; los campos de prestaciones de nómina se rechazan para contractor. Las RSUs solo están implementadas para nómina.

Los ceros por omisión son supuestos, no evidencia de que la oferta no incluya esos conceptos. Si un documento promete un beneficio pero falta un importe o calendario necesario, pide el dato o marca el campo como pendiente. No conviertas beneficios inciertos en cero sin explicarlo.

| Campo general | Valores |
| --- | --- |
| `v` | Versión de contrato: `1` por omisión |
| `methodology` | `2026.1`; se puede enviar para exigir esta metodología |
| `horizon` | `1` (12 meses, predeterminado) o `3` (36 meses) |
| `fx_rate` | MXN por USD, positivo; si se envía, es una referencia manual |
| `fx_date` | Fecha `AAAA-MM-DD` opcional de la referencia manual; no acredita procedencia Banxico |
| `format` | Omítelo en `/compare`: devuelve HTML. En `/api/compare`, `json` por omisión o `html` opcional |

Si hay importes USD y no se proporciona `fx_rate`, el servidor consulta Banxico FIX y devuelve su procedencia y fecha. Si falla, debe solicitarse una referencia manual confirmada o reintentarse. Para reproducir cifras, conserva entradas, versión y la tasa devuelta: la referencia automática puede cambiar. Sin USD no se necesita conversión.

### Componentes adicionales

Envía un arreglo JSON en `a.components` o `b.components`, codificado como valor de la URL. Cada elemento requiere `category`, `amount`, `frequency`, `currency`, `taxable` y `cash`; `utilization` es opcional. Ejemplo:

```json
{"category":"bonus","amount":144000,"frequency":"annual","currency":"MXN","taxable":true,"cash":true,"utilization":100}
```

- `category`: `reimbursement`, `bonus`, `protection` u `other`.
- `amount`: importe en la moneda del componente por periodo indicado.
- `frequency`: `monthly`, `quarterly`, `semiannual`, `annual` u `once`.
- `currency`: `MXN` o `USD`.
- `taxable` y `cash`: booleanos explícitos. Confirma un tratamiento incierto; no deduzcas una exención solo por el nombre del beneficio.
- `utilization`: porcentaje aprovechable, 100 por omisión.

No se aceptan nombres ni IDs de componentes. Para un bono del 10% del salario base anual, convierte a importe solo si esa base está explícita. El motor no modela una probabilidad de pago: no presentes un bono condicionado como garantizado.

### RSUs

Envía el objeto JSON en `a.rsu` o `b.rsu`:

```json
{"grantValue":100000,"currency":"USD","cliffMonth":12,"cadence":3,"saleFeeRate":0,"allocations":[{"year":1,"percent":25},{"year":2,"percent":25},{"year":3,"percent":25},{"year":4,"percent":25}]}
```

`grantValue` es el valor total positivo del grant, no el valor anual; `currency` admite `MXN` o `USD`. `cliffMonth` está en meses, desde 0 hasta el final del calendario; `cadence` admite 1, 3, 6 o 12 meses. `allocations` contiene de 1 a 12 años consecutivos desde 1; cada `percent` está entre 0 y 100 y el total debe sumar 100%. `saleFeeRate` es la comisión de venta entre 0 y 100%, 0 por omisión. Los demás campos del objeto son obligatorios cuando se envía `rsu`. No confundas opciones con RSUs ni inventes calendario, valor de mercado o tratamiento fiscal. Las restricciones del motor se devuelven como errores.

## Campos que suelen requerir confirmación

Los PDFs suelen especificar salario, moneda, periodicidad, aguinaldo, vacaciones, prima y bonos. Aun así, revisa si los montos son brutos y si un total incluye otros conceptos. RESICO depende de la situación personal; no puede verificarse con una oferta. PTU futura, antigüedad aplicable, costos propios, vacaciones no facturadas, tributación de apoyos y condiciones de vesting pueden requerir una pregunta. El motor bloquea RESICO no confirmado, no elegible o por encima de su límite; no aplica un régimen alternativo.

## Respuesta y significado de las cifras

El HTML de `/compare` y el JSON de `/api/compare` contienen el mismo objeto. El HTML inicial presenta todos los datos, sin esperar hidratación, peticiones del navegador ni ejecución de JavaScript. Se puede leer el bloque visible `sueldo-result-text` o analizar el bloque de datos `sueldo-result`.

El cuerpo contiene `status`, `api_version`, `tax_year`, `methodology_version`, `documentation_url`, `assumptions` y `warnings`. Primero atiende el estado:

| Estado | Qué debe hacer el asistente |
| --- | --- |
| `ok` | Interpretar el resultado y compartir `view_url` |
| `needs_input` | Leer `missing_fields` y preguntar solo lo que falte; todavía no hay comparación válida |
| `invalid_input` | Leer `errors` y corregir datos o explicar una combinación no soportada; nunca modificar una confirmación personal para forzar el cálculo |
| `unavailable` | Explicar la dependencia no disponible y reintentar o pedir el dato manual indicado; no inventar FX ni resultados |

Cada entrada de `missing_fields` o `errors` contiene `field`, `code`, `reason`, `question` y `expected` (tipo, unidad, valores permitidos o límites cuando aplican). `field` usa los nombres públicos como `b.resico_eligible`, `a.aguinaldo_days` o `a.rsu.allocations.0.percent`; no requiere entender campos internos de React. Usa `question` para preguntar a la persona y `reason` para explicar el motivo. Si RESICO rebasa el límite del motor, confirma los importes: una respuesta afirmativa de elegibilidad no elimina ese bloqueo.

`assumptions` identifica cada valor predeterminado mediante `field`, `value` y `reason`. `warnings` usa `code` y `message` para advertencias como FX manual. Si el PDF menciona un beneficio cuyo monto falta, envía `null` en vez de aceptar silenciosamente su exclusión.

Con `status: "ok"` también devuelve:

| Campo | Significado |
| --- | --- |
| `horizon_months` | 12 o 36; los totales corresponden a todo ese periodo |
| `fx` | Referencia de conversión, tasa, fecha y procedencia |
| `offer_a`, `offer_b` | Resultados completos del mismo motor usado en la calculadora |
| `summary.offer_a`, `summary.offer_b` | Entradas normalizadas y campos compactos descritos abajo, sin un segundo cálculo |
| `summary.contingent_value_basis` | `modeled_vested_equity_net_only`: alcance exacto de `contingent_value` |
| `comparison.regular_cash_difference` | Efectivo de B menos efectivo de A, horizonte completo |
| `comparison.economic_value_difference` | Valor económico de B menos A, horizonte completo |
| `comparison.recurring_monthly_cash_difference` | Efectivo mensual recurrente de B menos A |
| `comparison.average_monthly_cash_difference` | Promedio mensual de efectivo de B menos A |
| `comparison.contingent_value_difference` | Equity neto modelado de B menos A, horizonte completo |
| `normalized_input` | Ofertas y supuestos normalizados con los que se calculó |
| `view_url` | Enlace a la comparación editable, con estado en `#c=` |

En `summary.offer_a` y `summary.offer_b`, los importes calculados están en MXN y cubren el horizonte completo salvo los campos mensuales:

| Campo | Significado |
| --- | --- |
| `inputs` | Oferta normalizada utilizada por el motor; importes de entrada conservan sus monedas declaradas |
| `net_cash` | Efectivo disponible de todo el horizonte, igual a `regularCash` |
| `recurring_month_cash`, `average_month_cash` | Efectivo de mes recurrente y promedio mensual, respectivamente |
| `economic_value` | Valor económico de todo el horizonte; ya incluye el equity neto modelado |
| `contingent_value` | Solo equity neto liberado modelado, igual a `equityNet`; no agrega bonos ni PTU condicionados ni ajusta por probabilidad |
| `taxes` | `income`, `equity`, `total`: impuestos sobre ingresos y equity; IMSS se desglosa en el resultado completo |
| `benefits` | `aguinaldo`, `vacation_premium`, `ptu`, `vouchers`, `employee_savings_fund`, `employer_savings_fund`, `medical_insurance`, `protection`, `employer_contributions` |
| `equity` | `gross`, `net`, `tax`, `fees`: valores del calendario de vesting dentro del horizonte |

Estos campos resumen el resultado del motor. No sumes indiscriminadamente beneficios ni `contingent_value` a `economic_value`: hay conceptos ya incluidos y no todos son efectivo. La incertidumbre de bonos, PTU u otros pagos sigue requiriendo explicar sus condiciones aunque `contingent_value` sea cero.

Dentro de `offer_a` y `offer_b`, los importes monetarios de salida están en MXN:

- `gross`: salario base bruto acumulado, no el paquete completo.
- `regularCash`: efectivo disponible acumulado; no incluye RSUs ni aportaciones patronales como efectivo.
- `recurringMonthlyCash`: efectivo de un mes recurrente; excluye pagos anuales extraordinarios.
- `averageMonthlyCash`: efectivo total dividido entre los meses del horizonte; puede diferir del mes recurrente.
- `economicValue`: valor económico total, que incluye conceptos no disponibles como efectivo y el equity neto modelado. No sumes `equityNet` otra vez.
- `equityNet`, `equityTax`, `equityFees`: equity liberado según calendario, su impuesto y costos modelados; su valor futuro es contingente.
- `taxes`, `totalTaxes`, `taxProfile`, `imss`, `employerContributions`, `statutoryBenefits`, `yearResults`: desgloses del motor; `totalTaxes` incluye el impuesto modelado sobre equity.

No etiquetes un total de 36 meses como anual. Las proyecciones parten de las reglas monetarias 2026 y del calendario de antigüedad y CEAV implementado; no predicen futuras reformas.

## Límites y privacidad

El endpoint es público, GET y sin sesión. No guarda una comparación en una base de datos. La URL completa admite hasta 8,000 bytes; estructuras grandes pueden superar ese límite. No trunques términos para hacerlas caber: usa la calculadora interactiva si la URL es demasiado larga. No se necesita autenticación, encabezados especiales ni POST.

Los parámetros viajan al servidor y pueden quedar en registros de alojamiento, herramientas de recuperación web, historial y conversación. `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow` y `Referrer-Policy: no-referrer` reducen exposición, pero no garantizan que servicios externos no conserven la URL. La respuesta de cálculo no carga analítica ni recursos externos. El código de cálculo no registra consultas ni cuerpos completos, pero esto no acredita que los registros del CDN, alojamiento o proveedor del asistente estén desactivados; configura cualquier monitor externo para descartar consultas y cuerpos. No uses datos confidenciales incompatibles con ese riesgo. Los PDFs permanecen en el servicio al que los subiste: sueldo.ai solo necesita los parámetros estructurados.

El `view_url` también contiene los valores; cualquiera con el enlace puede verlos. Si el asistente no puede recuperar la respuesta, debe decirlo y entregar la URL para abrirla, o dirigir a la [calculadora](https://sueldo.ai/) para captura manual. No debe atribuir números a sueldo.ai sin haber recibido un cálculo válido.

[Privacidad](https://sueldo.ai/privacidad) · [Metodología](https://sueldo.ai/metodologia) · [Guía general](https://sueldo.ai/uso.md)
