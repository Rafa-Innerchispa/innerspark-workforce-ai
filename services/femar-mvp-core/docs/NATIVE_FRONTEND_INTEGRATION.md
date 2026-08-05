# Integración de Frontend Natively AI

- **Estado Actual:** Existe un frontend visual en `natively.ai` (Native.builder) construido durante la sesión desde el navegador.
- **Acceso:** Actualmente no hay repositorio ni export directo conocido por problemas de conexión con GitHub desde Natively AI. 
- **Decisión Arquitectónica:** 
  - NO reconstruir un frontend completo desde cero en Next.js.
  - El frontend de Next.js (`femar-mvp-core`) se limitará a proveer un backend operativo (API, mock data, esquemas) y una UI técnica mínima para depuración y E2E.
  - El frontend visual final de pre-nómina será el artefacto de Natively AI una vez recuperado e integrado.
- **Ruta de Demo:** Se utilizará la interfaz mínima temporal de `/prepayroll` para validaciones E2E técnicas, esperando el acoplamiento futuro con la UX de Natively.
