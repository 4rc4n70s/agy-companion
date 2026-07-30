import asyncio
import subprocess

async def main():
    proc = await asyncio.create_subprocess_exec('agy', 'models', stdout=asyncio.subprocess.PIPE)
    stdout, _ = await proc.communicate()
    print("RAW:", repr(stdout))
    
asyncio.run(main())
