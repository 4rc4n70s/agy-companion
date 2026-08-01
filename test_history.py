import json
import os
import re

def test():
    conv_id = "4d911fc0-a529-4c73-b8ce-60781380d07b"
    transcript_path = os.path.join("/home/azanardi/.gemini/antigravity-cli/brain", conv_id, ".system_generated", "logs", "transcript.jsonl")
    messages = []
    logs = []
    
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            for line in f:
                data = json.loads(line)
                if data.get("type") == "USER_INPUT":
                    content = data.get("content", "")
                    if "<USER_REQUEST>" in content:
                        content = content.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0].strip()
                    messages.append({"role": "user", "text": content})
                    logs.append({"type": "sys", "text": f"Tú: \"{content}\""})
                    
                elif data.get("type") == "PLANNER_RESPONSE":
                    content = data.get("content", "")
                    tool_calls = data.get("tool_calls", [])
                    
                    if tool_calls:
                        for t in tool_calls:
                            t_name = t.get("name", "Tool")
                            t_args = t.get("args", {})
                            summary = t_args.get("toolSummary", t_name)
                            target = t_args.get("TargetFile", "")
                            
                            logs.append({"type": "tool", "text": f"{t_name}({summary})"})
                            
                            tool_text = f"> 🛠️ **{t_name}**: {summary}"
                            if target:
                                target = target.strip('"\'')
                                tool_text += f"\n> 📄 `{target}`"
                                
                            messages.append({"role": "agent", "text": tool_text, "is_tool": True})
                            
                    clean_content = re.sub(r'<thought>[\s\S]*?</thought>', '', content).strip()
                    clean_content = re.sub(r'94>call:[^\s]+(?:\s*\{[\s\S]*?\})?\s*94>', '', clean_content).strip()
                    
                    if clean_content:
                        if messages and messages[-1]["role"] == "agent" and not messages[-1].get("is_tool"):
                            messages[-1]["text"] += "\n\n" + clean_content
                        else:
                            messages.append({"role": "agent", "text": clean_content})
    except Exception as e:
        print("EXCEPTION:", e)
        
    print("Messages:", len(messages))
    print("Logs:", len(logs))
    if len(messages) > 0:
        print("Last MSG:", messages[-1])
test()
