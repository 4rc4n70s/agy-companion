import asyncio
import subprocess

async def main():
    proc = await asyncio.create_subprocess_exec('agy', 'models', stdout=asyncio.subprocess.PIPE)
    stdout, _ = await proc.communicate()
    print("RAW:", repr(stdout))
    
asyncio.run(main())

# Este es un comentario agregado para probar el diff en el Explorador del Proyecto.
# Prueba extra de modificacion para generar diff.# Test
# Una prueba mas para que veas el circulo verde!
