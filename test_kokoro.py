import time
import soundfile as sf
from kokoro_onnx import Kokoro

print("Cargando modelo Kokoro-v1.0 INT8 en ONNX Runtime...")
kokoro = Kokoro(
    "/home/azanardi/kokoro-models/kokoro-v1.0.int8.onnx",
    "/home/azanardi/kokoro-models/voices-v1.0.bin"
)

text = "Hola, esta es una prueba de voz generada localmente en tiempo real con Kokoro ONNX."

start = time.time()
samples, sample_rate = kokoro.create(text, voice="ef_dora", speed=1.0, lang="es")
end = time.time()

print(f"✨ ¡Audio generado con éxito en {end - start:.3f} segundos! (Sample rate: {sample_rate}Hz)")
sf.write("output.wav", samples, sample_rate)
