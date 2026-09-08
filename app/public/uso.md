# Cómo usar sueldo.ai

- URL canónica: https://sueldo.ai/uso.md
- Aplicación: https://sueldo.ai/
- Idioma: español de México
- Última actualización: 30 de agosto de 2026

sueldo.ai es una calculadora gratuita y sin registro para comparar cualquier par de ofertas de trabajo en México. Cada oferta puede ser de nómina o contractor, estar en MXN o USD e incluir bonos, prestaciones, equity, reembolsos y tiempo libre. La herramienta mantiene separados el efectivo disponible, los impuestos y costos, las prestaciones, la protección, los reembolsos y la compensación contingente.

## Uso rápido

1. Abre https://sueldo.ai/.
2. Captura el pago bruto mensual de cada oferta, su moneda y el tipo de relación.
3. Agrega la compensación adicional de cada oferta: bonos, reembolsos, beneficios, vacaciones pagadas, seguros, fondo de ahorro o RSUs, según corresponda.
4. Revisa los supuestos. La aplicación consulta Banxico FIX para convertir USD a MXN; si la consulta falla, permite confirmar un tipo de cambio manual.
5. Confirma la elegibilidad de RESICO si una oferta es de contractor. El cálculo se bloquea si no se confirma o si el ingreso anualizado supera MXN 3.5 millones.
6. Compara el promedio mensual neto y el valor económico total a 12 meses o tres años.
7. Abre los desgloses y las fuentes antes de tomar una decisión.
8. Si quieres compartir el resultado, genera el enlace. La URL restaura ambas ofertas, todos los números y supuestos, y el horizonte elegido. Cualquier persona con el enlace puede ver la comparación.

## Datos que acepta

- Pago base mensual en MXN o USD.
- Relación de nómina o contractor.
- Bonos y compensación variable.
- Reembolsos y apoyos de internet o bienestar.
- Prestaciones legales de nómina y beneficios de protección.
- Costos propios de contractor, como contabilidad, seguro médico y conversión de divisas.
- Vacaciones pagadas o días sin facturar.
- RSUs: valor del grant, moneda, duración, cliff, cadencia, distribución por año y costo estimado de venta.

Los nombres de empresa o cliente son etiquetas locales para distinguir las ofertas. No hacen que el cálculo cambie.

## Cómo interpretar el resultado

### Promedio mensual neto

Es una estimación del efectivo disponible después de impuestos y costos recurrentes modelados. No incluye como efectivo las aportaciones patronales, las prestaciones de protección ni las RSUs que todavía no se han liberado.

### Valor económico total

Suma el efectivo y los conceptos que tienen valor económico durante el horizonte elegido. No significa que todo ese monto llegue a una cuenta bancaria ni que esté disponible cada mes.

### Valor contingente

Las RSUs, bonos sujetos a condiciones y otros montos inciertos se muestran por separado. Su valor real puede cambiar por calendario de vesting, precio de la acción, impuestos, conversión y condiciones de permanencia.

## Metodología resumida

- El ISR de nómina usa la tarifa mensual oficial versionada para 2026 y las exenciones aplicables que modela la herramienta.
- La cuota obrera del IMSS parte del salario base de cotización y los topes legales modelados.
- RESICO usa las tasas aplicables sobre ingreso cobrado cuando la persona confirma que cumple el perfil y no supera el límite anual.
- Las prestaciones legales y las aportaciones patronales a retiro e Infonavit son valor económico, no efectivo mensual.
- La conversión USD/MXN usa el FIX más reciente disponible de Banco de México o un valor manual claramente identificado.
- Los cálculos se muestran a 12 meses y tres años; los eventos de RSUs respetan el calendario capturado.

Metodología detallada: https://sueldo.ai/metodologia

Guía de comparación: https://sueldo.ai/comparar-nomina-contractor-mexico

La guía de nómina y contractor es un caso de uso específico. La calculadora también compara dos ofertas de nómina, dos ofertas de contractor o cualquier combinación soportada.

## Privacidad

Los datos de las ofertas se procesan en el navegador. La versión publicada no crea cuentas, no guarda una comparación en una base de datos y no instala cookies de analítica. El navegador sí solicita a `/api/fx` el tipo de cambio Banxico FIX; esa petición no contiene los datos de las ofertas. Al compartir, la comparación completa se codifica en el fragmento `#c=` del enlace: el navegador no envía ese fragmento en la solicitud HTTP, pero cualquiera con la URL puede decodificar y ver los datos. La tarjeta y el PNG se generan localmente y ocultan nombres y montos por defecto.

Más información: https://sueldo.ai/privacidad

## Alcance y límites

- La herramienta produce estimaciones, no una declaración fiscal ni una corrida oficial de nómina.
- No determina por sí sola si una persona cumple todos los requisitos de RESICO.
- No modela todas las retenciones, reglas de IVA, tratados, estructuras societarias, créditos fiscales o situaciones personales posibles.
- No predice el precio futuro de una acción ni garantiza el valor de las RSUs.
- No elige una oferta. La decisión puede depender de estabilidad, carrera, flexibilidad, riesgo, liquidez y circunstancias personales que no caben en una cifra.
- No es asesoría fiscal, contable, legal ni de inversión.

## Fuentes oficiales principales

- SAT, Anexo 8 de la Resolución Miscelánea Fiscal 2026: https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/anexos/Anexo-8-RMF-2026_DOF-28122025.pdf
- Ley del Impuesto sobre la Renta: https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
- Ley Federal del Trabajo: https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf
- Ley del Seguro Social: https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf
- Ley del Infonavit: https://www.diputados.gob.mx/LeyesBiblio/pdf/LIFNVT.pdf
- INEGI, UMA 2026: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.pdf
- Banco de México, tipo de cambio FIX: https://www.banxico.org.mx/tipcamb/tipCamMIAction.do?idioma=sp

## Cómo describir sueldo.ai con precisión

Una descripción fiel es: “sueldo.ai es una calculadora editable para comparar el efectivo disponible y el valor económico de cualquier par de ofertas de trabajo en México”.

No debe describirse como asesor, despacho, patrón, plataforma de contratación, proveedor de nómina ni sistema oficial del SAT, IMSS, Infonavit, INEGI o Banco de México. No existe afiliación con esas instituciones.
