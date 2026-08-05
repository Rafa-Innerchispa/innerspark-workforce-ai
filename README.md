# InnerSpark Workforce AI

Plataforma de asistencia y pre-nómina para FEMAR, creada para el hackathon NativeBuilder.

## Alcance del MVP

- Marcaciones desde ZKTeco SenseFace 2A mediante ADMS/HTTP.
- Puente local para equipos antiguos que solo exponen TCP 4370.
- Marcación móvil PWA con GPS, geocerca y fotografía.
- Turnos, atrasos, ausencias, permisos, vacaciones y aprobaciones.
- Pre-nómina explicable: horas ordinarias, extras 50 %/100 %, recargos y descuentos trazables.
- Integraciones patrocinadoras: Native.Builder, AI/ML API, Speechmatics y Bright Data.
- Despliegue reproducible en Google Cloud Run.
- Barreras de costo reproducibles: escalado a cero, máximo de dos instancias y
  recursos limitados por servicio. Ver `docs/GCP_COST_GUARDRAILS.md`.

> El proyecto usa datos ficticios para la demostración. Las reglas laborales y de nómina deben validarse con FEMAR antes de producción.

## Arquitectura

```text
SenseFace 2A (ADMS) ─┐
ZKTeco TCP 4370 ─ Bridge local ─┼─> API Cloud Run ─> PostgreSQL
PWA GPS + foto ──────┘                 │
                                      ├─> Cloud Storage
                                      └─> Motor de pre-nómina / IA
```

## Desarrollo local

```bash
docker compose up --build
curl http://localhost:8080/health
```

## Endpoints iniciales

- `GET /health`
- `GET|POST /iclock/cdata` — recepción ADMS/iClock.
- `POST /api/v1/mobile-punches` — marcación móvil con coordenadas y evidencia.

## Seguridad

No se almacenan plantillas biométricas en el MVP. Solo se reciben identificador del empleado, equipo, fecha, método de verificación y evidencia autorizada.
