import asyncio
import json
import os
import time
from typing import Dict, List, Any, Optional

class AgentState:
    def __init__(self, agent_id: str, role: str, parent_id: Optional[str] = None):
        self.agent_id = agent_id
        self.role = role
        self.parent_id = parent_id
        self.status = "initialized"  # initialized, running, completed, failed
        self.current_task = ""
        self.outputs: List[str] = []
        self.created_at = time.time()
        self.updated_at = time.time()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "role": self.role,
            "parent_id": self.parent_id,
            "status": self.status,
            "current_task": self.current_task,
            "outputs_count": len(self.outputs),
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

class StateManager:
    def __init__(self, brain_dir: Optional[str] = None):
        self.brain_dir = brain_dir or os.path.expanduser("~/.gemini/antigravity-cli/brain")
        self.agents: Dict[str, AgentState] = {}
        self.active_session_id: Optional[str] = None
        self.pending_plans: Dict[str, Any] = {}

    def set_session(self, session_id: str):
        self.active_session_id = session_id
        self.agents.clear()

    def spawn_agent(self, agent_id: str, role: str, parent_id: Optional[str] = None) -> AgentState:
        state = AgentState(agent_id=agent_id, role=role, parent_id=parent_id)
        self.agents[agent_id] = state
        self._persist_event("agent_spawned", state.to_dict())
        return state

    def update_agent_status(self, agent_id: str, status: str, current_task: Optional[str] = None):
        if agent_id in self.agents:
            state = self.agents[agent_id]
            state.status = status
            if current_task is not None:
                state.current_task = current_task
            state.updated_at = time.time()
            self._persist_event("agent_status", state.to_dict())

    def record_agent_output(self, agent_id: str, output: str):
        if agent_id in self.agents:
            state = self.agents[agent_id]
            state.outputs.append(output)
            state.updated_at = time.time()

    def get_agent(self, agent_id: str) -> Optional[AgentState]:
        return self.agents.get(agent_id)

    def get_all_agents(self) -> List[Dict[str, Any]]:
        return [a.to_dict() for a in self.agents.values()]

    def set_pending_plan(self, session_id: str, plan: Dict[str, Any]):
        self.pending_plans[session_id] = plan

    def get_pending_plan(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self.pending_plans.get(session_id)

    def clear_pending_plan(self, session_id: str):
        if session_id in self.pending_plans:
            del self.pending_plans[session_id]

    def _persist_event(self, event_type: str, data: Dict[str, Any]):
        if not self.active_session_id:
            return
        session_log_dir = os.path.join(self.brain_dir, self.active_session_id, ".system_generated", "logs")
        os.makedirs(session_log_dir, exist_ok=True)
        log_file = os.path.join(session_log_dir, "agent_state.jsonl")
        payload = {
            "timestamp": time.time(),
            "event_type": event_type,
            "data": data
        }
        try:
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(payload) + "\n")
        except Exception as e:
            print(f"Error guardando registro de estado: {e}")

class EventBus:
    def __init__(self):
        self._subscribers: List[asyncio.Queue] = []

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        if q in self._subscribers:
            self._subscribers.remove(q)

    async def publish(self, event_type: str, data: Dict[str, Any], agent_id: Optional[str] = None):
        event_payload = {
            "event": event_type,
            "timestamp": time.time(),
            "agent_id": agent_id,
            "data": data
        }
        for q in list(self._subscribers):
            try:
                await q.put(event_payload)
            except Exception:
                pass

# Instancias globales
global_event_bus = EventBus()
global_state_manager = StateManager()
