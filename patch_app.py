import sys

filepath = '/home/azanardi/Projects/AGY-companion/static/app.js'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add variable bindings at the top around line 33
var_injection = """    const saveCfgBtn = document.getElementById('save-cfg-btn');
    const cfgAvatarMode = document.getElementById('cfg-avatar-mode');
    const vtuberSettings = document.getElementById('vtuber-settings');
    const cfgVrmUpload = document.getElementById('cfg-vrm-upload');
    let customVrmDataUrl = localStorage.getItem('customVrmDataUrl') || null;
"""
content = content.replace("    const saveCfgBtn = document.getElementById('save-cfg-btn');", var_injection)

# 2. Add event listeners inside DOMContentLoaded
event_injection = """
    // VTuber settings toggle
    if (cfgAvatarMode) {
        cfgAvatarMode.addEventListener('change', (e) => {
            if (vtuberSettings) {
                vtuberSettings.style.display = e.target.value === 'vtuber' ? 'flex' : 'none';
            }
        });
    }

    if (cfgVrmUpload) {
        cfgVrmUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    customVrmDataUrl = ev.target.result;
                    appendLog('sys', 'Modelo VRM cargado en memoria temporal.');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Apply avatar mode on load
    const savedAvatarMode = localStorage.getItem('avatarMode') || 'classic';
    if (cfgAvatarMode) {
        cfgAvatarMode.value = savedAvatarMode;
        if (vtuberSettings) vtuberSettings.style.display = savedAvatarMode === 'vtuber' ? 'flex' : 'none';
    }
    
    // Wait for vrmController to be defined by module
    setTimeout(() => {
        if (savedAvatarMode === 'vtuber' && window.vrmController) {
            window.vrmController.init();
            if (customVrmDataUrl) {
                window.vrmController.loadModel(customVrmDataUrl);
            } else {
                window.vrmController.loadModel('/static/models/sample.vrm');
            }
        }
    }, 1000);
"""
# Insert after `settingsModal.classList.remove('hidden');`
content = content.replace(
    "    settingsToggleBtn.addEventListener('click', () => {\n        settingsModal.classList.remove('hidden');\n    });",
    "    settingsToggleBtn.addEventListener('click', () => {\n        settingsModal.classList.remove('hidden');\n    });\n" + event_injection
)

# 3. Update save button
save_injection = """
    saveCfgBtn.addEventListener('click', async () => {
        const avatarMode = cfgAvatarMode.value;
        localStorage.setItem('avatarMode', avatarMode);
        if (customVrmDataUrl) {
            try {
                localStorage.setItem('customVrmDataUrl', customVrmDataUrl);
            } catch (e) {
                console.warn('El VRM es muy grande para localStorage, se perdera al recargar.');
            }
        }

        if (avatarMode === 'vtuber') {
            if (window.vrmController) {
                window.vrmController.init();
                if (customVrmDataUrl) {
                    window.vrmController.loadModel(customVrmDataUrl);
                } else {
                    window.vrmController.loadModel('/static/models/sample.vrm');
                }
            }
        } else {
            if (window.vrmController) {
                window.vrmController.disable();
            }
        }
"""
content = content.replace("    saveCfgBtn.addEventListener('click', async () => {", save_injection)

with open(filepath, 'w') as f:
    f.write(content)
print("Patched app.js successfully")
