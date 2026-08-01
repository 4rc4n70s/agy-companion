import os
import time
from typing import Optional
from orchestrator import global_state_manager, global_event_bus

class SessionArtifactStore:
    def __init__(self):
        pass
        
    def _get_session_dir(self, session_id: str) -> str:
        # Aseguramos que los artefactos internos vayan a la carpeta oculta
        base_dir = global_state_manager.brain_dir
        session_dir = os.path.join(base_dir, session_id, ".system_generated", "artifacts")
        os.makedirs(session_dir, exist_ok=True)
        return session_dir

    async def save_internal_artifact(self, session_id: str, agent_name: str, task_name: str, content: str) -> str:
        """Guarda un reporte intermedio de un agente en el historial oculto de la sesion"""
        safe_task = "".join(c if c.isalnum() else "_" for c in task_name)[:30]
        timestamp = int(time.time())
        filename = f"{agent_name}_{safe_task}_{timestamp}.md"
        
        session_dir = self._get_session_dir(session_id)
        filepath = os.path.join(session_dir, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
        await global_event_bus.publish(
            "internal_artifact_created", 
            {"filename": filename, "path": filepath, "agent": agent_name}, 
            agent_id=agent_name
        )
        return filepath

class WorkspaceWriter:
    def __init__(self):
        pass

    async def write_final_deliverable(self, project_dir: str, filename: str, content: str, agent_name: str) -> bool:
        """Filtro de seguridad que solo escribe el entregable final en el proyecto del usuario"""
        if not os.path.isdir(project_dir):
            return False
            
        # Evitar path traversal guardando solo en la raiz del proyecto por defecto
        safe_filename = os.path.basename(filename)
        filepath = os.path.join(project_dir, safe_filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
        await global_event_bus.publish(
            "final_deliverable_created", 
            {"filename": safe_filename, "path": filepath, "project_dir": project_dir},
            agent_id=agent_name
        )
        return True

global_artifact_store = SessionArtifactStore()
global_workspace_writer = WorkspaceWriter()
