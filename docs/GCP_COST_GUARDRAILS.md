# Protección de costos en Google Cloud

Este proyecto debe desplegarse en un proyecto de Google Cloud exclusivo para
FEMAR. No se deben compartir la facturación ni las cuotas operativas con
proyectos antiguos sin inventariarlos primero.

## Capas obligatorias

1. Presupuesto mensual del proyecto con alertas al 25 %, 50 %, 75 %, 90 % y
   100 %.
2. `Spend cap` para Cloud Run si el servicio aparece como elegible en la cuenta.
   Debido al retraso de reporte, el valor debe quedar por debajo del límite
   económico absoluto.
3. Cloud Run con `min-instances=0` y `max-instances=2`.
4. CPU y memoria limitadas a 1 vCPU y 512 MiB por instancia.
5. Facturación basada en solicitudes (`--cpu-throttling`).
6. Revisión semanal del reporte de costos durante el piloto.
7. No habilitar GPU, instancias mínimas permanentes ni servicios adicionales
   sin aprobación expresa.

## Valores iniciales recomendados

- Presupuesto de aviso: USD 20 al mes.
- Alertas: USD 5, 10, 15, 18 y 20 equivalentes a los porcentajes anteriores.
- Spend cap de Cloud Run: USD 18, si está disponible.
- Límite operativo de Cloud Run: 2 instancias por servicio.

El presupuesto ordinario solo alerta. El spend cap puede pausar el servicio,
pero su aplicación puede retrasarse por la latencia del reporte de consumo.
Por eso los límites de escalado forman parte del despliegue y no dependen de
una intervención manual.

## Antes de enlazar la facturación

- Inventariar proyectos y su estado de facturación.
- Confirmar que el proyecto seleccionado no contiene cargas desconocidas.
- Crear o seleccionar un proyecto exclusivo, por ejemplo
  `innerspark-workforce-femar`.
- Vincular únicamente ese proyecto a la nueva cuenta de facturación.
- Habilitar solo Artifact Registry, Cloud Build, Cloud Run y Logging.
