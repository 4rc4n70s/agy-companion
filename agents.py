import asyncio
import json
import os
from typing import Dict, List, Any, Optional
from orchestrator import global_state_manager, global_event_bus

class BaseAgent:
    def __init__(self, name: str, role: str, working_dir: str):
        self.name = name
        self.role = role
        self.working_dir = working_dir
        self.state = global_state_manager.spawn_agent(agent_id=name, role=role)
        
    async def run(self, prompt: str, conversation_id: Optional[str] = None, direct: bool = False):
        global_state_manager.update_agent_status(self.name, "running", current_task=prompt)
        await global_event_bus.publish("agent_started", {"task": prompt}, agent_id=self.name)
        
        cmd = [
            "agy", 
            "--dangerously-skip-permissions",
            "--output-format", "stream-json"
        ]
        
        if direct:
            cmd.extend(["-p", prompt])
        else:
            cmd.extend(["-p", f"Role: {self.role}\n\nTask: {prompt}"])
        
        # Subagentes usan un ID de conversacion derivado para no mezclar el historial principal
        if conversation_id:
            if direct:
                cmd.extend(["--conversation", conversation_id])
            else:
                cmd.extend(["--conversation", f"{conversation_id}-{self.name}"])

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.working_dir
        )
        
        full_output = ""
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            line_str = line.decode('utf-8').strip()
            if line_str:
                try:
                    data = json.loads(line_str)
                    if "content" in data:
                        full_output += data["content"]
                    elif "step_update" in data and "text_delta" in data["step_update"]:
                        full_output += data["step_update"]["text_delta"]
                    elif "result" in data and "response" in data["result"]:
                        if not full_output:
                            full_output = data["result"]["response"]
                        continue # Skip publishing this raw result block
                        
                    await global_event_bus.publish("thought_stream", data, agent_id=self.name)
                except Exception:
                    pass
                    
        await process.wait()
        global_state_manager.update_agent_status(self.name, "completed")
        global_state_manager.record_agent_output(self.name, full_output)
        await global_event_bus.publish("agent_completed", {"result": full_output}, agent_id=self.name)
        
        return full_output


class SupervisorAgent(BaseAgent):
    def __init__(self, working_dir: str):
        super().__init__("Supervisor", "Lead Orchestrator", working_dir)
        self.workers: Dict[str, BaseAgent] = {}

    async def orchestrate(self, user_request: str, conversation_id: str, custom_workflow: Optional[str] = None):
        # 1. Armar el plan delegando a subagentes como un grafo (DAG)
        if custom_workflow:
            prompt_context = f"Use this manual workflow: {custom_workflow}\nRequest: {user_request}"
        else:
            prompt_context = f"Design an autonomous workflow to solve this request: {user_request}"
            
        plan_prompt = (
            f"You are a Lead Orchestrator. {prompt_context}\n"
            f"First, explain your plan to the user in a short, conversational manner (in the same language as the user's request).\n"
            f"Then, you MUST output a raw JSON block describing the workflow.\n"
            f"DO NOT use any tools like define_subagent.\n"
            f"The JSON MUST be inside a markdown block (```json ... ```) with this exact structure:\n"
            f"```json\n"
            f"{{\n"
            f"  \"agents\": [\"Supervisor\", \"Coder\", \"Auditor\"],\n"
            f"  \"connections\": [{{\"from\": \"Supervisor\", \"to\": \"Coder\"}}, {{\"from\": \"Coder\", \"to\": \"Auditor\"}}, {{\"from\": \"Auditor\", \"to\": \"Supervisor\"}}],\n"
            f"  \"tasks\": [{{\"agent\": \"Coder\", \"task\": \"write code...\"}}, {{\"agent\": \"Auditor\", \"task\": \"review code...\"}}]\n"
            f"}}\n"
            f"```"
        )
        plan_output = await self.run(plan_prompt, conversation_id)
        
        # Limpiar tags de pensamiento para parsear JSON correctamente
        clean_output = plan_output
        if "</thought>" in clean_output:
            clean_output = clean_output.split("</thought>")[-1]
            
        try:
            if "```json" in clean_output:
                json_str = clean_output.split("```json")[1].split("```")[0]
            else:
                start_idx = clean_output.find("{")
                end_idx = clean_output.rfind("}") + 1
                json_str = clean_output[start_idx:end_idx]
            
            workflow_json = json.loads(json_str)
        except Exception:
            # Fallback simple
            workflow_json = {
                "agents": ["Supervisor", "Worker"],
                "connections": [{"from": "Supervisor", "to": "Worker"}, {"from": "Worker", "to": "Supervisor"}],
                "tasks": [{"agent": "Worker", "task": user_request}]
            }

        # 2. Emitir el mapa de dependencias al UI para dibujar el cuadro sinoptico
        await global_event_bus.publish("workflow_map", workflow_json, agent_id=self.name)

        results = []
        # 3. Ejecucion de los trabajadores segun el orden definido en tasks
        # En una version mas avanzada, esto seguiria el orden topologico de las conexiones.
        for i, t in enumerate(workflow_json.get("tasks", [])):
            agent_name = t.get("agent", f"Worker_{i}")
            worker = BaseAgent(name=agent_name, role=agent_name, working_dir=self.working_dir)
            self.workers[agent_name] = worker
            
            # Avisamos que el flujo se movio a este agente
            await global_event_bus.publish("workflow_transition", {"active_agent": agent_name}, agent_id=self.name)
            
            res = await worker.run(t.get('task', ''), conversation_id)
            results.append(f"Result from {agent_name}:\n{res}")
            
        # 4. Retorno al supervisor y Sintesis final
        await global_event_bus.publish("workflow_transition", {"active_agent": "Supervisor"}, agent_id=self.name)
        synthesis_prompt = f"Synthesize these subagent results into a final cohesive answer for the user:\n\n" + "\n---\n".join(results)
        final_answer = await self.run(synthesis_prompt, conversation_id)
        return final_answer
