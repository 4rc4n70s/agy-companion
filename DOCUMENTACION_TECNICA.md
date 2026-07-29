# AGY-Companion V2: Documentación Técnica y Manual de Uso

## 1. Visión General del Sistema
**AGY-Companion V2** es una interfaz web moderna, altamente interactiva y de baja latencia construida alrededor del CLI de Inteligencia Artificial **Antigravity (AGY)**. Su objetivo es proporcionar un entorno visual unificado donde los usuarios puedan chatear con la IA, explorar código, generar archivos, previsualizar resultados y escuchar las respuestas, todo en tiempo real.

El proyecto está diseñado bajo una arquitectura de **Frontend Reactivo (Vanilla)** y un **Backend Asíncrono (FastAPI)**, evitando cuellos de botella síncronos y maximizando el rendimiento.

---

## 2. Arquitectura de Software (Bajo el Capó)

El sistema se compone de tres pilares fundamentales:

### 2.1 Backend (Python + FastAPI)
El archivo principal es `main.py`. Utiliza el framework ASGI **FastAPI** junto con `uvicorn` para manejar miles de conexiones simultáneas.
- **Rutas REST (`/api/...`)**: Manejan configuraciones, listado de modelos (`agy models`), y exploración del sistema de archivos local.
- **WebSocket (`/ws/chat`)**: Es el corazón del sistema de chat. En lugar de procesar la respuesta al final, abre un túnel bidireccional. Por dentro, lanza un subproceso asíncrono (`asyncio.create_subprocess_exec`) que invoca el comando:
  `agy -p "prompt" --output-format stream-json`
  A medida que el CLI devuelve tokens (pedacitos de palabras) en formato JSON, el backend se los empuja instantáneamente al navegador.

### 2.2 Frontend (HTML5, CSS3, Vanilla JS)
- **Cero frameworks pesados**: No usa React ni Vue, todo está escrito en `app.js` interactuando con el DOM directamente para extrema velocidad.
- **Efecto Typewriter**: A medida que los tokens JSON llegan por el WebSocket, una función de escritura los inyecta en el HTML, dando la sensación de que la IA está "tecleando".
- **Gestión de Temas (Modo Oscuro/Claro)**: Basado en variables CSS (`--bg-color`, `--surface-color`), que reaccionan de manera nativa sin recargar la página.

### 2.3 Motores de Voz (TTS)
Para darle vida al avatar, el sistema tiene integración nativa con dos motores de texto a voz:
- **Edge TTS (Nube)**: Utiliza la API de Microsoft Edge. Es rápido, de alta calidad y no requiere hardware pesado.
- **Kokoro ONNX (Local)**: Un motor neuronal de voz que corre localmente (`kokoro-v1.0.int8.onnx`). Ideal para privacidad absoluta y uso offline, aunque requiere más memoria RAM y CPU.

---

## 3. Capacidades y Características Principales

### 3.1 Chat Inteligente y Memoria (Brain)
El Companion no es solo un chat, es una interfaz sobre el "Cerebro" (Brain) de Antigravity.
- Los historiales no se guardan en una base de datos tradicional, sino en la ruta del sistema `~/.gemini/antigravity-cli/brain/`.
- Cada conversación es un UUID único con un archivo `transcript.jsonl`.
- Al seleccionar una conversación del historial en el menú lateral izquierdo, el sistema reanuda el contexto pasándole el flag `--conversation <id>` a AGY.

### 3.2 Explorador de Proyectos y Vistas Previas (Artifacts)
- **Archivos Estructurados (Artifacts)**: Cuando la IA genera código o documentos, los guarda en la carpeta de la conversación. La interfaz tiene un panel flotante derecho que permite listar y leer esos archivos sin abrir un editor de código.
- **Regla de Vista Dual HTML**: Si la IA genera documentación Markdown y luego se le pide un HTML, el sistema está instruido para crear una vista híbrida (Código original / Vista Renderizada) para revisión simultánea.

### 3.3 Generación Dinámica de Avatares
La interfaz cuenta con la habilidad de crear personajes visuales generados por IA (usando modelos de Inpainting a través del CLI de AGY).
- Genera una foto del "Avatar" en reposo (boca cerrada).
- Genera de forma paralela y usando Inpainting una versión con la "Boca abierta".
- Mediante JavaScript e intersección de audio, el avatar "habla" alternando ambas imágenes al ritmo del texto generado.

---

## 4. Guía de Uso (Tutorial Rápido)

1. **Configuración Inicial**:
   - Abre el modal de configuración en la esquina superior derecha (icono de engranaje).
   - Elige tu **Modelo Base de IA** pulsando "Cargar Lista". Recomendado: `Gemini 3.1 Pro (High)` para tareas complejas de código, o `Flash` para respuestas hiper rápidas.
   - Elige el motor de voz (Edge TTS para empezar rápido).

2. **Interactuando**:
   - Escribe en la barra inferior. Si quieres cambiar el directorio sobre el que trabaja la IA, fíjate en el panel izquierdo de **Explorador del Proyecto**.
   - Haz clic en cualquier archivo en el explorador para previsualizarlo instantáneamente.

3. **Ver la Terminal**:
   - Abre el panel lateral derecho para ver la salida cruda de los comandos y los registros internos del servidor FastAPI.

---

## 5. El Futuro (Fase 6 en Desarrollo)

Actualmente, el sistema opera de manera lineal por cada mensaje de chat. La arquitectura está preparada para implementar la **Orquestación de Subagentes**.
En el futuro, el WebSocket recibirá eventos de tipo `subagent_spawned`. El frontend renderizará múltiples hilos o burbujas donde podrás ver a 3 o 4 agentes paralelos analizando tu proyecto al mismo tiempo.
