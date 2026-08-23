# InnerSpark Workforce AI

Plataforma de asistencia y pre-nómina, núcleo (backend) para el hackathon NativeBuilder y producto real para FEMAR.

## Alcance del MVP

- **Marcaciones Físicas:** Desde equipos ZKTeco (SenseFace 2A) y Hikvision mediante ADMS/ISAPI.
- **Marcación Móvil:** Web API con GPS, geocerca y fotografía guardada privadamente en GCS.
- **Motor de Pre-nómina:** Turnos, atrasos, ausencias, permisos, horas suplementarias y deducciones.
- **Frontend Natively AI:** La interfaz gráfica principal de la demostración será proporcionada e integrada mediante Natively AI / Native Builder, conservando este repositorio como el *Core Operativo*.

## Mapa de Tecnologías (Hackathon)

| Tecnología | Rol en el Proyecto | Estado / Endpoint |
|------------|---------------------|-------------------|
| **Native.builder / Natively AI** | Interfaz gráfica y flujo visual de control de nómina y dashboard de anomalías. | Frontend principal externo. Integración vía API. |
| **Speechmatics** | Transcripción de audios (justificaciones de voz de supervisores y empleados para novedades). | API listos para invocar en proceso de novedades. |
| **Bright Data** | *Labor Policy Watch*: monitoreo de regulaciones laborales públicas para alertas contextuales en nómina. | Módulo complementario de contexto normativo. |
| **AI/ML API** | *Workforce Review Agent*: extracción de entidades, clasificación de anomalías y sugerencias. | Uso local/mock con fallback a API para decisiones complejas. |
| **Google Cloud Run** | Alojamiento serverless del backend (femar-mvp-core). | En proceso de despliegue / túnel temporal activado. |
| **Google Firestore** | Base de datos NoSQL para marcaciones, novedades y pre-nóminas. | Implementado y funcional. |
| **Google Cloud Storage** | Almacenamiento privado de fotografías y evidencias. | Implementado y funcional (URLs privadas gs://). |

## Conexión de Hardware (ZKTeco / Hikvision)

Para conectar los equipos biométricos al backend:

### ZKTeco (SenseFace y similares con ADMS)
Ingresar a *Opciones de Red* > *Configuración de Servidor Cloud (ADMS)*:
- **Dirección del Servidor:** `https://real-whom-tomatoes-counts.trycloudflare.com/api` (URL del túnel actual) o la IP/dominio de Cloud Run cuando se despliegue definitivamente.
- **Puerto:** `443`
El equipo sincronizará automáticamente mediante `/api/iclock/cdata` y `/api/iclock/getrequest`.

### Hikvision (Control de Acceso / Videoportero)
La integración con Hikvision requiere conectividad ISAPI o configuración de eventos de alarma hacia el endpoint web.

## Arquitectura E2E

```text
SenseFace (ADMS) ─────┐
Hikvision (ISAPI) ────┼─> API (Next.js / Cloud Run) ─> Firestore DB
Móvil (Web App) ──────┘           │
                                  ├─> Cloud Storage (Fotos)
Natively AI (Frontend) <──────────┴─> Motor Pre-nómina (IA + Speechmatics)
```

## Desarrollo y Pruebas
```bash
# Iniciar backend localmente
npm run dev

# Para pruebas con equipos físicos temporalmente, usar Cloudflare Tunnel:
cloudflared tunnel --url http://localhost:3000
```

<!-- RALFIA:PROJECT-STATUS:START -->
## Estado operativo automático

> Esta sección la mantiene automáticamente el Agente Documental de InnerOS. El contenido humano fuera de estos marcadores no se modifica.

- Última sincronización: 2026-08-23T06:39:02.094798-05:00
- Project ID: `innerspark-workforce-ai`
- Repositorio: `Rafa-Innerchispa/innerspark-workforce-ai`
- Runtime AMD: `/home/rlopez/inneros/inneros_core/workspaces/innerspark-workforce-ai`
- Runtime primary: `/home/rlopez/inneros/inneros_core/workspaces/innerspark-workforce-ai`
- HEAD remoto antes de sync: `3cd057bcfb2073c274f81f8dbdd72b3e7726be25`
- Policy class: `product-app`
- Write scope: `worktree`

### Cambios recientes registrados

- Sin cambios recientes registrados en coordinación.

<!-- RALFIA:PROJECT-STATUS:END -->
