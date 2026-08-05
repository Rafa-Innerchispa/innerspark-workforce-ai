# Demo portátil con SenseFace 2A

## Configuración única del equipo

1. Red: activar DHCP.
2. Protocolo: seleccionar **TA Push / ADMS**.
3. Servidor: usar el dominio estable entregado por Cloud Run (sin rutas manuales).
4. Protocolo/puerto: HTTPS 443 si el firmware lo permite; validar que dispositivo y servidor usen el mismo modo.
5. Registrar el número de serie en `DEVICE_ALLOWLIST`.
6. Configurar zona horaria UTC-5 y sincronización automática de hora.

## Uso en cualquier lugar

- Conectar Ethernet a un router con Internet; DHCP asigna la IP local.
- Si la unidad tiene el módulo Wi‑Fi opcional, conectarla a una red 2.4 GHz.
- No abrir puertos ni configurar IP pública en el lugar de la demostración.
- El equipo inicia la conexión saliente hacia el dominio cloud.
- Las transacciones quedan en la memoria del dispositivo si Internet cae y se reenvían al recuperar conectividad.

## Prueba antes de salir

1. Encender el equipo usando la fuente correcta.
2. Confirmar que el dashboard muestra el serial como `online`.
3. Registrar un usuario ficticio y marcar con rostro o huella.
4. Verificar el evento en `/api/v1/events` y en el dashboard.
5. Desconectar Internet, realizar otra marca, reconectar y comprobar la sincronización.
6. Repetir desde un hotspot/router diferente.

## Datos que necesitamos anotar

- Número de serie.
- Versión de firmware (para ZKBio Zlink, ZKTeco recomienda 1.0.25 o superior).
- Si la unidad incluye Wi‑Fi.
- Menús visibles: ADMS, Cloud Server, AC Push/TA Push y HTTP/HTTPS.
- Formato real de una transacción recibida.
