import asyncio
import json
import os
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig
from google.antigravity.utils.interactive import run_interactive_loop

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')

def load_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "character_name": "AGY Companion",
        "system_prompt": "You are AGY Companion, a friendly, witty, and super intelligent AI assistant."
    }

async def main():
    cfg = load_config()
    char_name = cfg.get("character_name", "AGY Companion")
    system_prompt = cfg.get("system_prompt", "You are AGY Companion, a friendly AI assistant.")
    
    print(f"=== {char_name} - Modo Bucle Interactivo (CLI) ===")
    print("Escribe tus mensajes a continuacion. Escribe 'exit' o 'quit' para salir.\n")

    config = LocalAgentConfig(
        system_instructions=system_prompt,
        capabilities=CapabilitiesConfig()
    )

    async with Agent(config) as agent:
        await run_interactive_loop(agent)

if __name__ == "__main__":
    asyncio.run(main())
