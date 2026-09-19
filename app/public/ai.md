# Comparar ofertas con sueldo.ai desde un asistente de IA

- Guía HTML para lectores web: https://sueldo.ai/ai
- Guía Markdown: https://sueldo.ai/ai.md
- Cálculo como página HTML: https://sueldo.ai/compare
- Endpoint público: https://sueldo.ai/api/compare
- Contrato: `v=1`. Metodología: `2026.1`. Año fiscal base: 2026.
- Actualización: 18 de septiembre de 2026.

No necesitas instalar una app, conectar una cuenta ni configurar un plugin. El asistente lee los PDFs y extrae los términos; sueldo.ai calcula usando el mismo motor que la calculadora. El contrato es independiente del proveedor: puede usarlo ChatGPT, Claude, Gemini u otro asistente que pueda leer archivos y recuperar URLs públicas. La conversación necesita esas capacidades; no se garantiza que estén disponibles en todos los productos o modos. Que un asistente pueda abrir páginas no garantiza que pueda recuperar todas las URLs generadas: esta integración es un experimento, no una integración nativa de un proveedor de IA.

## Texto para copiar después de adjuntar dos ofertas

> Compara estos dos PDFs usando sueldo.ai. Primero lee https://sueldo.ai/ai. Extrae únicamente los números y opciones necesarios; no envíes nombres, correos, RFC ni texto de los documentos. Entiendo que los parámetros enviados en una URL pueden quedar en historiales y registros. Confirma conmigo la elegibilidad de RESICO si aplica y pregunta por información esencial que falte. Consulta el endpoint público y explica sus resultados, supuestos y advertencias sin sustituir sus cálculos. Incluye el enlace interactivo devuelto. Si no puedes recuperar la URL, dilo y dame el enlace para abrirlo.

## Flujo para el asistente

1. Lee los documentos y distingue salario bruto de neto, periodicidad, moneda, relación contractual y beneficios. No adivines importes ni conviertas un salario neto a bruto.
2. Usa `a` y `b` como etiquetas. Un monto anual de salario base explícito puede dividirse entre 12; no dividas un paquete total que incluya bonos o equity como si fuera salario base.
3. Construye una URL GET con los campos documentados. No subas documentos ni texto, nombres de empresa o identificadores personales. Codifica los valores con las reglas estándar de query string, sin doble codificación.
4. Recupera la URL. Usa `/compare` para una página HTML, con los mismos parámetros; `/api/compare` devuelve JSON por omisión y también admite `format=html`. Ambos ejecutan el mismo cálculo.
5. Lee `status` antes de explicar cifras. Para `needs_input`, pregunta solo por los campos faltantes. Para `invalid_input`, explica los errores y corrige los parámetros; no presentes una comparación válida. Para `unavailable`, no inventes resultados ni un tipo de cambio.
6. Con `ok`, cita la metodología, el horizonte y el tipo de cambio devueltos. Separa efectivo, beneficios restringidos, protección y equity. Explica los supuestos importantes y devuelve `view_url`.

## Ejemplo sintético

[Calcular dos ofertas de ejemplo](https://sueldo.ai/compare?v=1&methodology=2026.1&a.type=payroll&a.monthly_pay=120000&a.currency=MXN&a.aguinaldo_days=30&a.vacation_days=20&a.vacation_premium_rate=50&b.type=contractor&b.monthly_pay=9000&b.currency=USD&b.resico_eligible=true&b.planned_time_off_days=15&fx_rate=18&horizon=1&format=html)

```text
https://sueldo.ai/compare?v=1&methodology=2026.1&a.type=payroll&a.monthly_pay=120000&a.currency=MXN&a.aguinaldo_days=30&a.vacation_days=20&a.vacation_premium_rate=50&b.type=contractor&b.monthly_pay=9000&b.currency=USD&b.resico_eligible=true&b.planned_time_off_days=15&fx_rate=18&horizon=1
```

El tipo de cambio 18 es solo un supuesto manual de este ejemplo, no una cotización de Banxico. No confirmes RESICO porque el documento diga “contractor”: la persona debe confirmar su elegibilidad.

## Parámetros de entrada

Cada campo de oferta lleva el prefijo `a.` o `b.`. Usa números decimales no negativos (máximo 1,000,000,000), sin símbolos de moneda, separadores de miles ni notación científica; porcentajes como `25`, no `0.25`. Los booleanos son `true` o `false`. Un valor explícito `null` indica información pendiente y produce `needs_input`; omitir un campo opcional permite aplicar el valor predeterminado, que se declara en `assumptions`.

| Campo por oferta | Valor y significado | Si se omite |
| --- | --- | --- |
| `type` | `payroll` o `contractor` | Obligatorio |
| `monthly_pay` | Pago **bruto mensual** positivo, en la moneda de la oferta | Obligatorio |
| `currency` | `MXN` o `USD` | Obligatorio |
| `resico_eligible` | Confirmación personal `true` para contractor; `false` bloquea el cálculo | Obligatorio para contractor |
| `additional_deductions` | Deducciones adicionales mensuales, MXN | 0 |
| `accountant` | Contabilidad mensual, MXN | 0 |
| `fx_fee` | Comisión de conversión, porcentaje | 0 |
| `insurance` | Seguro pagado por la persona al mes, MXN | 0 |
| `planned_time_off_days` | Días previstos sin trabajar al año, contractor | 0 |
| `paid_vacation_days` | Días pagados que compensan el tiempo sin facturar, contractor | 0 |
| `tenure_years` | Antigüedad, años, nómina | 1 |
| `aguinaldo_days` | Días de aguinaldo, nómina | 15 |
| `vacation_days` | Días anuales de vacaciones, nómina | Base legal según antigüedad |
| `vacation_premium_rate` | Prima vacacional, porcentaje, nómina | 25 |
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
| `format` | `json` por omisión, o `html` para lectura web |

Si hay importes USD y no se proporciona `fx_rate`, el servidor consulta Banxico FIX y devuelve su procedencia y fecha. Si falla, debe solicitarse una referencia manual confirmada o reintentarse. Para reproducir cifras, conserva entradas, versión y la tasa devuelta: la referencia automática puede cambiar. Sin USD no se necesita conversión.

### Componentes adicionales

Envía un arreglo JSON en `a.components` o `b.components`, codificado como valor de la URL. Cada elemento usa:

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

`grantValue` es el valor total del grant, no el valor anual. `cliffMonth` está en meses; `cadence` admite 1, 3, 6 o 12 meses. `allocations` contiene la distribución por año (máximo 12); `saleFeeRate` es el porcentaje de comisión de venta, 0 por omisión. No confundas opciones con RSUs ni inventes calendario, valor de mercado o tratamiento fiscal. Las restricciones del motor se devuelven como errores.

## Campos que suelen requerir confirmación

Los PDFs suelen especificar salario, moneda, periodicidad, aguinaldo, vacaciones, prima y bonos. Aun así, revisa si los montos son brutos y si un total incluye otros conceptos. RESICO depende de la situación personal; no puede verificarse con una oferta. PTU futura, antigüedad aplicable, costos propios, vacaciones no facturadas, tributación de apoyos y condiciones de vesting pueden requerir una pregunta. El motor bloquea RESICO no confirmado, no elegible o por encima de su límite; no aplica un régimen alternativo.

## Respuesta y significado de las cifras

El cuerpo contiene `status`, `tax_year`, `methodology_version`, `assumptions`, `warnings` y, según el resultado, `missing_fields` o `errors`. Cada campo faltante identifica `field` y `reason`.

Con `status: "ok"` también devuelve:

| Campo | Significado |
| --- | --- |
| `horizon_months` | 12 o 36; los totales corresponden a todo ese periodo |
| `fx` | Referencia de conversión, tasa, fecha y procedencia |
| `offer_a`, `offer_b` | Resultados del mismo motor usado en la calculadora |
| `comparison.regular_cash_difference` | Efectivo de B menos efectivo de A, horizonte completo |
| `comparison.economic_value_difference` | Valor económico de B menos A, horizonte completo |
| `comparison.recurring_monthly_cash_difference` | Efectivo mensual recurrente de B menos A |
| `normalized_input` | Ofertas y supuestos normalizados con los que se calculó |
| `view_url` | Enlace a la comparación editable, con estado en `#c=` |

Dentro de cada oferta, los importes monetarios de salida están en MXN:

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

Los parámetros viajan al servidor y pueden quedar en registros de alojamiento, herramientas de recuperación web, historial y conversación. `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow` y `Referrer-Policy: no-referrer` reducen exposición, pero no garantizan que servicios externos no conserven la URL. La respuesta de cálculo no carga analítica. No uses datos confidenciales incompatibles con ese riesgo. Los PDFs permanecen en el servicio al que los subiste: sueldo.ai solo necesita los parámetros estructurados.

El `view_url` también contiene los valores; cualquiera con el enlace puede verlos. Si el asistente no puede recuperar la respuesta, debe decirlo y entregar la URL para abrirla, o dirigir a la [calculadora](https://sueldo.ai/) para captura manual. No debe atribuir números a sueldo.ai sin haber recibido un cálculo válido.

[Privacidad](https://sueldo.ai/privacidad) · [Metodología](https://sueldo.ai/metodologia) · [Guía general](https://sueldo.ai/uso.md)
