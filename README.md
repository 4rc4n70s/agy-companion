# AGY Companion 🤖

**AGY Companion** es una aplicación conversacional de Inteligencia Artificial moderna, minimalista y multiplataforma alimentada por el motor de **Antigravity CLI (`agy`)**.

Incluye interfaz gráfica web con diseño plano, sincronización de labios (*lip-sync*), síntesis de voz multimotor (**Edge TTS** y **Kokoro ONNX 100% local**), consola interactiva en tiempo real con seguimiento de pensamientos y llamadas a herramientas (*thoughts & tool calls*), y un **bucle interactivo por línea de comandos (CLI)** basado en el SDK de `google.antigravity`.

---

## 🌟 Características Principales

* **Cero Claves de API Requeridas:** Utiliza directamente la sesión local de tu **Antigravity CLI (`agy`)**.
* **Diseño Plano Minimalista:** Modos Claro y Oscuro con avatar circular e interfaz sin distracciones.
* **Consola de Diagnóstico Lateral (`>_`):** Visualiza los pensamientos del modelo (*streaming thoughts*), tiempo de inferencia y llamadas a herramientas en una terminal embebida.
* **Síntesis de Voz Multimotor (TTS):**
  * **Edge TTS:** Voces neuronales de alta calidad ultra rápidas desde la nube.
  * **Kokoro ONNX:** Síntesis de voz 100% offline y local en CPU mediante ONNX cuantizado INT8.
  * **Benchmark Integrado:** Mide el rendimiento de inferencia de voz local en tu CPU con 1 clic.
* **Notificaciones de Sistema:** Alertas nativas de escritorio cuando la IA termina de procesar sus respuestas.
* **Generación de Avatares por IA:** Diseña nuevas imágenes de personaje escribiendo descripciones en texto.
* **Multiplataforma (Linux / Windows / Flatpak):** Scripts de instalación automatizados para Linux y Windows.

---

## 🚀 Instalación Rápida

### Linux (Arch, Hyprland, Ubuntu, Debian, etc.)

```bash
git clone https://github.com/azanardi/agy-companion.git
cd agy-companion
./setup.sh
```

### Windows (CMD / PowerShell)

```cmd
git clone https://github.com/azanardi/agy-companion.git
cd agy-companion
setup.bat
```

---

## 🖥️ Ejecución

### 1. Interfaz Web (Modo Aplicación)
- En Linux: `./launch.sh` (o desde el menú de aplicaciones buscando **AGY Companion**).
- En Windows: `launch.bat`

### 2. Bucle Interactivo por Terminal (CLI REPL)
```bash
./interactive_cli.sh
```

---

## 📦 Empaquetado Flatpak (Linux)

Para compilar y empaquetar un archivo ejecutable `.flatpak`:

```bash
cd flatpak
./build_flatpak.sh
```
Instala el paquete generado con:
```bash
flatpak install --user AGYCompanion.flatpak
```

---

## ⚙️ Estructura del Proyecto

* `main.py`: Servidor FastAPI backend asíncrono con endpoints de chat, TTS, generación de avatares y auditoría de salud.
* `config.json`: Persistencia de configuración (personaje, prompt, motor de voz).
* `templates/index.html`: Interfaz web con menú de hamburguesa, terminal lateral y modal de ajustes.
* `static/style.css`: Estilos CSS adaptativos (Light/Dark mode) sin librerías externas.
* `static/app.js`: Lógica cliente para voz, animación de boca (*lip-sync*), consolas y streaming.
* `flatpak/`: Manifiesto de compilación Flatpak oficial (`org.antigravity.AGYCompanion.json`).

---

## 📄 Licencia

MIT License.
