# Plan de implementación FEMAR

## Semana de demostración

1. Configurar SenseFace 2A en red de prueba y registrar serial, firmware, IP y modo ADMS.
2. Apuntar ADMS al gateway público de Cloud Run y capturar una marcación real.
3. Probar el puente TCP 4370 como alternativa para equipos heredados.
4. Ejecutar marcación móvil con permiso de ubicación, foto y cola offline.
5. Convertir las marcas en novedades y una pre-nómina demostrativa reconciliada.
6. Mostrar trazabilidad completa: evento → regla → cálculo → aprobación.

## Reglas de producto

- Nunca declarar nómina legal definitiva: el MVP entrega **pre-nómina revisable**.
- Cada valor monetario debe mostrar fórmula, unidades, tarifa y evidencia.
- Las excepciones críticas bloquean el cierre del período.
- Fotos y ubicación requieren consentimiento, retención definida y acceso por rol.
- Guardar UTC en base de datos y presentar `America/Guayaquil` (UTC-5).

## Separación de responsabilidades

- Native.Builder: interfaz y demo acelerada.
- GitHub: fuente única de verdad y CI/CD.
- Google Cloud: API, datos, archivos y despliegue productivo.
- Adaptador ZKTeco: integración física independiente del frontend.
