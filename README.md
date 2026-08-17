# InnerSpark Workforce AI 🚀

Plataforma inteligente de gestión de asistencia, control de personal, pre-nómina automatizada y analítica de datos impulsada por inteligencia artificial (Gemini Agent). Desarrollada como solución real de producción para clientes corporativos (incluyendo **PC Doctor**, **FEMAR S.A.** e **IA PRO**) y optimizada para la evaluación del hackathon NativeBuilder / Build with Gemini XPRIZE.

---

## 🌟 Características Principales del Producto

### 1. Control de Asistencia y Marcación Multi-Canal
* **Biométricos ADMS:** Integración directa con equipos de hardware físico ZKTeco (SenseFace 2A) mediante sincronización nativa de comandos e inserción en tiempo real.
* **Marcación Remota Móvil:** Web App adaptada con geocercas por GPS, verificación de cámara web, y almacenamiento seguro y cifrado en Google Cloud Storage.

### 2. Validación de Documentos Inteligente y Localizada
* **Ecuador Modulo 10:** Validación matemática avanzada y estricta para números de cédula ecuatorianos.
* **Formatos Internacionales / Sandbox:** Soporte nativo para pasaportes, identificaciones alfanuméricas de sandbox y el identificador especial de evaluación `DEVPOST-JUDGE`.

### 3. Sincronización de Idioma Global
* Traducción simultánea unificada (Español / Inglés) integrada en toda la interfaz de usuario (Login, Registro, Selección de Módulos, Dashboard y Menús de Control).

### 4. Asistente Inteligente Gemini Agent (AI Review)
* Barra de comandos inteligente con reconocimiento de voz integrado en el dashboard.
* Capacidad de consultar bases de datos de empleados en tiempo real, calcular nóminas automáticamente, detectar atrasos o novedades, y resolver dudas administrativas mediante procesamiento del lenguaje natural.

---

## 🛠️ Arquitectura y Tecnologías en Producción

El proyecto está diseñado bajo un modelo serverless moderno y de alta escalabilidad en la nube:

* **Backend / API Core (Next.js):** Alojado en **Google Cloud Run** bajo el servicio `femar-mvp-core` en la región `us-central1`.
* **Base de Datos (Google Firestore):** Persistencia NoSQL segura y en tiempo real para empleados, registros de asistencia, dispositivos y novedades.
* **Almacenamiento (Google Cloud Storage):** Repositorio privado para almacenar fotos de registro tomadas por los empleados en marcaciones móviles.
* **Procesamiento de Lenguaje Natural (Gemini AI SDK):** Motor inteligente de análisis y llamadas de función automatizadas.

---

## 📦 Despliegue en la Nube (Google Cloud)

El despliegue está configurado para ejecutarse mediante Google Cloud Build directo a Google Cloud Run, reduciendo el tamaño de transferencia al excluir dependencias pesadas:

```bash
# Comando de Despliegue Oficial en Producción:
gcloud run deploy femar-mvp-core \
  --source=. \
  --region=us-central1 \
  --project=innerspark-workforce-ai
```

---

> [!NOTE]
> **Afinación de Detalles para Clientes**: Nos encontramos actualmente refinando detalles de experiencia de usuario, seguridad biométrica y sincronización en tiempo real directamente con nuestros clientes activos de PC Doctor y FEMAR para garantizar la máxima estabilidad y performance en entornos reales.
