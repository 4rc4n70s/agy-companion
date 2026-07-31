document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const sendButton = document.getElementById('send-button');
    const micButton = document.getElementById('mic-button');
    const characterImage = document.getElementById('character-image');
    const status = document.getElementById('status');
    const charHeading = document.getElementById('char-name-heading');
    const healthDot = document.getElementById('health-dot');
    const healthReport = document.getElementById('health-report');

    // Sidebar & Terminal Elements
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const cliToggleBtn = document.getElementById('cli-toggle-btn');
    const consoleSidebar = document.getElementById('console-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const consoleOutput = document.getElementById('console-output');
    const terminalInput = document.getElementById('terminal-input');

    // Theme Toggle Elements
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const iconSun = document.getElementById('theme-icon-sun');
    const iconMoon = document.getElementById('theme-icon-moon');

    // Settings Modal Elements
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const docsBtn = document.getElementById('docs-btn');
    const docsModal = document.getElementById('docs-modal');
    const closeDocsBtn = document.getElementById('close-docs-btn');
    const docsContent = document.getElementById('docs-content');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveCfgBtn = document.getElementById('save-cfg-btn');
    const cfgAvatarMode = document.getElementById('cfg-avatar-mode');
    const vtuberSettings = document.getElementById('vtuber-settings');
    const cfgVrmUpload = document.getElementById('cfg-vrm-upload');
    const cfgVrmFlip = document.getElementById('cfg-vrm-flip');
    const cfgVrmArms = document.getElementById('cfg-vrm-arms');
    let customVrmDataUrl = localStorage.getItem('customVrmDataUrl') || null;

    const cfgCharName = document.getElementById('cfg-char-name');
    const cfgSystemPrompt = document.getElementById('cfg-system-prompt');
    const cfgEnableTts = document.getElementById('enable-tts');
    const cfgEnableNotifications = document.getElementById('enable-notifications');
    const cfgTtsEngine = document.getElementById('cfg-tts-engine');
    const cfgTtsVoice = document.getElementById('cfg-tts-voice');
    const cfgKokoroVoice = document.getElementById('cfg-kokoro-voice');
    const edgeVoiceGroup = document.getElementById('edge-voice-group');
    const kokoroVoiceGroup = document.getElementById('kokoro-voice-group');
    const runBenchmarkBtn = document.getElementById('run-benchmark-btn');
    const benchmarkResult = document.getElementById('benchmark-result');

    // Avatar Generator Elements
    const cfgAvatarPrompt = document.getElementById('cfg-avatar-prompt');
    const genAvatarBtn = document.getElementById('gen-avatar-btn');
    const genAvatarStatus = document.getElementById('gen-avatar-status');

    let openMouthImg = `/static/images/char-mouth-open.png?v=${Date.now()}`;
    let closedMouthImg = `/static/images/char-mouth-closed.png?v=${Date.now()}`;

    if (characterImage) characterImage.src = closedMouthImg;
                if (window.vrmSetTalking) window.vrmSetTalking(0);

    let currentAudio = null;
    let lipSyncInterval = null;
    let audioCtx = null;
    let audioAnalyser = null;
    let audioDataArray = null;

    function setupAudioAnalysis(audioElement) {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioAnalyser = audioCtx.createAnalyser();
            audioAnalyser.fftSize = 256;
            audioDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
        }
        if (!audioElement._hasAudioSource) {
            audioElement._hasAudioSource = true;
            try {
                // crossOrigin is needed if audio is loaded from another domain, but ours is local
                const source = audioCtx.createMediaElementSource(audioElement);
                source.connect(audioAnalyser);
                audioAnalyser.connect(audioCtx.destination);
            } catch (e) {
                console.warn('Audio routing error', e);
            }
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }
    let activeConfig = {};

    // Modo Orquestador Toggle
    const agentModeBtn = document.getElementById('agent-mode-btn');
    const iconMultiAgent = document.getElementById('icon-multi-agent');
    const iconSingleAgent = document.getElementById('icon-single-agent');
    
    if (agentModeBtn) {
        agentModeBtn.addEventListener('click', () => {
            const isActive = agentModeBtn.getAttribute('data-active') === 'true';
            if (isActive) {
                agentModeBtn.setAttribute('data-active', 'false');
                agentModeBtn.title = "Modo Directo activado";
                iconMultiAgent.style.display = 'none';
                iconSingleAgent.style.display = 'block';
                agentModeBtn.style.color = 'var(--text-muted)';
                agentModeBtn.style.borderColor = 'var(--text-muted)';
            } else {
                agentModeBtn.setAttribute('data-active', 'true');
                agentModeBtn.title = "Modo Orquestador activado";
                iconMultiAgent.style.display = 'block';
                iconSingleAgent.style.display = 'none';
                agentModeBtn.style.color = 'var(--primary-color)';
                agentModeBtn.style.borderColor = 'var(--primary-color)';
            }
        });
    }

    // Sidebar Console Log Helper
    function appendLog(type, text) {
        const timeStr = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.className = `log-line ${type}`;

        let prefix = '[SYS]';
        if (type === 'thought') prefix = '[THOUGHT]';
        if (type === 'tool') prefix = '[TOOL CALL]';
        if (type === 'res') prefix = '[RESPONSE]';

        line.textContent = `[${timeStr}] ${prefix} ${text}`;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Sidebar Toggle Logic
    function openSidebar() {
        consoleSidebar.classList.remove('closed');
        historySidebar.classList.add('closed');
        // sidebarOverlay.classList.remove('hidden'); // Eliminado para permitir interaccion
    }

    function closeSidebar() {
        consoleSidebar.classList.add('closed');
        historySidebar.classList.add('closed');
        // sidebarOverlay.classList.add('hidden');
    }

    sidebarToggleBtn.addEventListener('click', () => {
        if (consoleSidebar.classList.contains('closed')) {
            openSidebar();
        } else {
            closeSidebar();
        }
    });

    if (cliToggleBtn) {
        cliToggleBtn.addEventListener('click', () => {
            if (consoleSidebar.classList.contains('closed')) {
                openSidebar();
                setTimeout(() => terminalInput.focus(), 300);
            } else {
                closeSidebar();
            }
        });
    }
    
    closeSidebarBtn.addEventListener('click', closeSidebar);
    // sidebarOverlay.addEventListener('click', closeSidebar);
    
    // History Sidebar Logic
    const historyToggleBtn = document.getElementById('history-toggle-btn');
    const historySidebar = document.getElementById('history-sidebar');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const conversationsList = document.getElementById('conversations-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    
    function openHistorySidebar() {
        historySidebar.classList.remove('closed');
        consoleSidebar.classList.add('closed');
        // sidebarOverlay.classList.remove('hidden'); // Eliminado para permitir interaccion
        loadConversations();
    }
    
    historyToggleBtn.addEventListener('click', () => {
        if (historySidebar.classList.contains('closed')) {
            openHistorySidebar();
        } else {
            closeSidebar();
        }
    });
    closeHistoryBtn.addEventListener('click', closeSidebar);
    
    newChatBtn.addEventListener('click', () => {
        currentConversationId = null;
        chatHistory.innerHTML = '';
        status.textContent = 'Hola, en que te puedo ayudar hoy?';
        appendLog('sys', 'Nueva conversación iniciada.');
        closeSidebar();
        loadConversations(); // Actualiza selección
    });

    let currentHistorySkip = 0;
    const HISTORY_LIMIT = 20;

    async function loadConversations(append = false) {
        if (!append) {
            currentHistorySkip = 0;
        }
        
        try {
            const res = await fetch(`/api/conversations?skip=${currentHistorySkip}&limit=${HISTORY_LIMIT}`);
            const data = await res.json();
            
            if (!append) {
                conversationsList.innerHTML = '';
            } else {
                const loadMoreBtn = document.getElementById('load-more-history-btn');
                if (loadMoreBtn) loadMoreBtn.remove();
            }
            
            if (data.length === 0 && !append) {
                conversationsList.innerHTML = '<div style="color: var(--text-muted); text-align: center;">No hay conversaciones guardadas.</div>';
                return;
            }
            
            data.forEach(conv => {
                const item = document.createElement('div');
                item.className = 'history-item';
                if (conv.id === currentConversationId) {
                    item.classList.add('active');
                }
                
                const date = new Date(conv.timestamp * 1000).toLocaleString();
                
                item.innerHTML = `
                    <div class="history-title">${conv.title}</div>
                    <div class="history-date">${date}</div>
                `;
                
                item.addEventListener('click', () => loadConversationMessages(conv.id));
                conversationsList.appendChild(item);
            });
            
            if (data.length === HISTORY_LIMIT) {
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.id = 'load-more-history-btn';
                loadMoreBtn.className = 'flat-btn';
                loadMoreBtn.style.width = '100%';
                loadMoreBtn.style.marginTop = '10px';
                loadMoreBtn.style.justifyContent = 'center';
                loadMoreBtn.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Cargar más';
                loadMoreBtn.addEventListener('click', () => {
                    currentHistorySkip += HISTORY_LIMIT;
                    loadConversations(true);
                });
                conversationsList.appendChild(loadMoreBtn);
            }
        } catch (e) {
            console.error('Error cargando historial:', e);
            conversationsList.innerHTML = '<div style="color: red; text-align: center;">Error al cargar el historial.</div>';
        }
    }
    
    async function loadConversationMessages(id) {
        try {
            const res = await fetch(`/api/conversations/${id}/messages`);
            const messages = await res.json();
            
            currentConversationId = id;
            chatHistory.innerHTML = ''; // Limpiamos y recreamos el botón
            visibleMessages = MAX_VISIBLE_MSGS;
            
            const loadMoreBtn = document.createElement('button');
            loadMoreBtn.className = 'load-more-btn hidden-btn';
            loadMoreBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> Cargar anteriores';
            chatHistory.appendChild(loadMoreBtn);

            loadMoreBtn.addEventListener('click', () => {
                visibleMessages += MAX_VISIBLE_MSGS;
                updateMessageVisibility();
            });
            
            messages.forEach(msg => {
                let text = msg.text;
                if (msg.role === 'agent') {
                    text = text.replace(/<thought>[\s\S]*?<\/thought>/g, '').replace(/94>call:[^\s]+(?:\s*\{[\s\S]*?\})?\s*94>/g, '').trim();
                }
                appendChatMessage(msg.role, text);
                
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                    msg.tool_calls.forEach(t => {
                        const tName = t.name || "Tool";
                        const args = t.args || {};
                        const summary = args.toolSummary || args.toolAction || JSON.stringify(args).substring(0, 50);
                        appendLog('tool', `${tName}(${summary})`);
                    });
                }
            });
            
            if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg.role === 'agent') {
                    status.textContent = lastMsg.text.replace(/<thought>[\s\S]*?<\/thought>/g, '').replace(/94>call:[^\s]+(?:\s*\{[\s\S]*?\})?\s*94>/g, '').trim();
                }
            } else {
                status.textContent = 'Hola, en que te puedo ayudar hoy?';
            }
            
            updateMessageVisibility();
            chatView.scrollTop = chatView.scrollHeight;
            
            closeSidebar();
            appendLog('sys', `Cargada conversación: ${id}`);
            
            // Re-renderizar la UI para resaltar la activa
            setTimeout(loadConversations, 100);
            
        } catch (e) {
            console.error(e);
            alert("Error al cargar mensajes.");
        }
    }

    // Terminal Input Interactive Send
    const toggleWrapBtn = document.getElementById('toggle-wrap-btn');
    if (toggleWrapBtn) {
        toggleWrapBtn.addEventListener('click', () => {
            consoleOutput.classList.toggle('no-wrap');
        });
    }

    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = terminalInput.value.trim();
            if (!val) return;
            terminalInput.value = '';
            textInput.value = val;
            handleSendMessage();
        }
    });

    // Theme Management
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            iconSun.classList.remove('hidden');
            iconMoon.classList.add('hidden');
        } else {
            iconSun.classList.add('hidden');
            iconMoon.classList.remove('hidden');
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    // Health Check Audit
    async function checkHealth() {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            
            if (data.missing.length === 0) {
                healthDot.className = 'status-dot';
                healthDot.title = 'Sistema OK: Todas las dependencias instaladas';
                healthReport.innerHTML = '<strong>Todo listo para andar</strong>. Todas las dependencias y componentes estan presentes.';
            } else {
                healthDot.className = 'status-dot warning';
                healthDot.title = 'Faltan dependencias opcionales u obligatorias';
                healthReport.innerHTML = `<strong>Dependencias faltantes:</strong><br>• ${data.missing.join('<br>• ')}`;
            }
        } catch (e) {
            healthDot.className = 'status-dot error';
            healthDot.title = 'Error al conectar con el servidor backend';
            healthReport.innerHTML = '<strong>Error:</strong> No se pudo comprobar el estado del backend.';
        }
    }

    checkHealth();

    // AI Avatar Generator Handler
    genAvatarBtn.addEventListener('click', async () => {
        const promptText = cfgAvatarPrompt.value.trim() || 'cute AI mascot avatar portrait';
        genAvatarStatus.classList.remove('hidden');
        genAvatarStatus.textContent = 'Generando imagen con IA... Por favor espera unos segundos.';
        appendLog('sys', `Iniciando generacion de avatar IA: "${promptText}"`);

        try {
            const res = await fetch('/api/generate-avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText })
            });

            const data = await res.json();
            if (data.status === 'ok') {
                openMouthImg = `/static/images/char-mouth-open.png?v=${data.timestamp}`;
                closedMouthImg = `/static/images/char-mouth-closed.png?v=${data.timestamp}`;
                characterImage.src = closedMouthImg;
                if (window.vrmSetTalking) window.vrmSetTalking(0);
                genAvatarStatus.textContent = 'Imagen generada y aplicada con exito.';
                appendLog('sys', 'Nueva imagen del personaje cargada y aplicada.');
            } else {
                genAvatarStatus.textContent = `Error: ${data.error || 'No se pudo generar la imagen'}`;
            }
        } catch (e) {
            console.error('Error generating avatar:', e);
            genAvatarStatus.textContent = 'Error al conectar con el generador de imagen';
        }
    });

    // Engine Selection Toggle
    cfgTtsEngine.addEventListener('change', () => {
        if (cfgTtsEngine.value === 'kokoro') {
            edgeVoiceGroup.classList.add('hidden');
            kokoroVoiceGroup.classList.remove('hidden');
        } else {
            edgeVoiceGroup.classList.remove('hidden');
            kokoroVoiceGroup.classList.add('hidden');
        }
    });

    // Benchmark Execution
    runBenchmarkBtn.addEventListener('click', async () => {
        benchmarkResult.classList.remove('hidden');
        benchmarkResult.textContent = 'Ejecutando prueba de velocidad en CPU... Por favor espera.';
        appendLog('tool', 'Iniciando Benchmark de Kokoro ONNX...');

        try {
            const res = await fetch('/api/benchmark-kokoro', { method: 'POST' });
            const data = await res.json();
            if (data.error) {
                benchmarkResult.textContent = `Error: ${data.error}`;
                appendLog('sys', `Benchmark fallo: ${data.error}`);
            } else {
                benchmarkResult.textContent = `Resultado: ${data.elapsed_seconds}s por frase. ${data.recommendation}`;
                appendLog('sys', `Benchmark completado en ${data.elapsed_seconds}s.`);
            }
        } catch (e) {
            benchmarkResult.textContent = 'Error al ejecutar el benchmark';
        }
    });

    // Load Configuration
    async function loadConfig() {
        try {
            const res = await fetch('/api/config');
            const cfg = await res.json();
            
            activeConfig = cfg;
            if (cfgEnableTts) cfgEnableTts.checked = cfg.enable_tts !== false;
            if (cfgEnableNotifications) cfgEnableNotifications.checked = cfg.enable_notifications !== false;
            cfgCharName.value = cfg.character_name || 'AGY Companion';
            cfgSystemPrompt.value = cfg.system_prompt || '';
            cfgTtsEngine.value = cfg.tts_engine || 'edge';
            if (cfg.tts_voice) cfgTtsVoice.value = cfg.tts_voice;
            if (cfg.kokoro_voice) cfgKokoroVoice.value = cfg.kokoro_voice;
            
            const modelSelect = document.getElementById('model-select');
            if (cfg.model && modelSelect) {
                // If there's a saved model, add it as an option so it shows up even before fetching all models
                const opt = document.createElement('option');
                opt.value = cfg.model;
                opt.textContent = cfg.model;
                modelSelect.appendChild(opt);
                modelSelect.value = cfg.model;
            }
            
            charHeading.textContent = cfg.character_name || 'AGY Companion';
            cfgTtsEngine.dispatchEvent(new Event('change'));
        } catch (e) {
            console.error('Error loading config:', e);
        }
    }

    loadConfig();

    const loadModelsBtn = document.getElementById('load-models-btn');
    if (loadModelsBtn) {
        loadModelsBtn.addEventListener('click', async () => {
            const originalText = loadModelsBtn.textContent;
            loadModelsBtn.textContent = 'Cargando...';
            loadModelsBtn.disabled = true;
            try {
                const modelsRes = await fetch('/api/models');
                const modelsData = await modelsRes.json();
                const modelSelect = document.getElementById('model-select');
                if (modelSelect && modelsData.models) {
                    modelSelect.innerHTML = '';
                    modelsData.models.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.id;
                        opt.textContent = m.name;
                        modelSelect.appendChild(opt);
                    });
                    if (activeConfig.model) modelSelect.value = activeConfig.model;
                }
            } catch (e) {
                console.error('Error fetching models', e);
            } finally {
                loadModelsBtn.textContent = originalText;
                loadModelsBtn.disabled = false;
            }
        });
    }

    // Modal Control
    settingsToggleBtn.addEventListener('click', () => {
        checkHealth();
        settingsModal.classList.remove('hidden');
    });

    // VTuber settings toggle
    if (cfgAvatarMode) {
        cfgAvatarMode.addEventListener('change', (e) => {
            if (vtuberSettings) {
                vtuberSettings.style.display = e.target.value === 'vtuber' ? 'flex' : 'none';
            }
        });
    }

    const cfgVrmModel = document.getElementById('cfg-vrm-model');
    const customVrmUploadLabel = document.getElementById('custom-vrm-upload-label');
    
    if (cfgVrmModel) {
        // Load initial state
        const savedVrmUrl = localStorage.getItem('vrmModelUrl') || '/static/models/sample.vrm';
        if (savedVrmUrl.startsWith('data:')) {
            cfgVrmModel.value = 'custom';
            if (customVrmUploadLabel) customVrmUploadLabel.style.display = 'flex';
        } else {
            cfgVrmModel.value = savedVrmUrl;
        }
        
        if (cfgVrmFlip) {
            const savedFlip = localStorage.getItem('vrmFlip_' + cfgVrmModel.value) === 'true';
            cfgVrmFlip.checked = savedFlip;
        }
        if (cfgVrmArms) {
            const savedArms = parseFloat(localStorage.getItem('vrmArms_' + cfgVrmModel.value)) || 0;
            cfgVrmArms.value = savedArms;
        }

        cfgVrmModel.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'custom') {
                if (customVrmUploadLabel) customVrmUploadLabel.style.display = 'flex';
            } else {
                if (customVrmUploadLabel) customVrmUploadLabel.style.display = 'none';
                customVrmDataUrl = null; // Clear custom model since a prebuilt one is selected
            }
            if (cfgVrmFlip) {
                const savedFlip = localStorage.getItem('vrmFlip_' + val) === 'true';
                cfgVrmFlip.checked = savedFlip;
            }
            if (cfgVrmArms) {
                const savedArms = parseFloat(localStorage.getItem('vrmArms_' + val)) || 0;
                cfgVrmArms.value = savedArms;
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
                    if (window.vrmController && cfgVrmModel && cfgVrmModel.value === 'custom') {
                        window.vrmController.loadModel(customVrmDataUrl);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Camera Settings UI
    const avatarEditBtn = document.getElementById('avatar-edit-btn');
    const avatarEditMenu = document.getElementById('avatar-edit-menu');
    const closeAvatarEditBtn = document.getElementById('close-avatar-edit-btn');
    const vrmYOffsetInput = document.getElementById('vrm-y-offset');
    const vrmZoomInput = document.getElementById('vrm-zoom');
    
    if (avatarEditBtn) {
        avatarEditBtn.addEventListener('click', () => {
            avatarEditMenu.style.display = avatarEditMenu.style.display === 'none' ? 'flex' : 'none';
        });
        
        closeAvatarEditBtn.addEventListener('click', () => {
            avatarEditMenu.style.display = 'none';
        });
        
        // Load saved camera settings
        const savedY = parseFloat(localStorage.getItem('vrmCameraOffsetY')) || -0.2;
        const savedZ = parseFloat(localStorage.getItem('vrmCameraZoom')) || 2.0;
        vrmYOffsetInput.value = savedY;
        vrmZoomInput.value = savedZ;
        
        const updateCamera = () => {
            const y = parseFloat(vrmYOffsetInput.value);
            const z = parseFloat(vrmZoomInput.value);
            localStorage.setItem('vrmCameraOffsetY', y);
            localStorage.setItem('vrmCameraZoom', z);
            if (window.vrmController) {
                window.vrmController.setCamera(y, z);
            }
        };
        
        vrmYOffsetInput.addEventListener('input', updateCamera);
        vrmZoomInput.addEventListener('input', updateCamera);
        
        if (cfgVrmFlip) {
            cfgVrmFlip.addEventListener('change', () => {
                const currentVrmUrl = localStorage.getItem('vrmModelUrl') || '/static/models/sample.vrm';
                localStorage.setItem('vrmFlip_' + currentVrmUrl, cfgVrmFlip.checked);
                if (window.vrmController) {
                    window.vrmController.setFlip(cfgVrmFlip.checked);
                }
            });
        }
        
        if (cfgVrmArms) {
            cfgVrmArms.addEventListener('input', () => {
                const currentVrmUrl = localStorage.getItem('vrmModelUrl') || '/static/models/sample.vrm';
                const val = parseFloat(cfgVrmArms.value);
                localStorage.setItem('vrmArms_' + currentVrmUrl, val);
                if (window.vrmController) {
                    window.vrmController.setArmsDown(val);
                }
            });
        }
    }

    // Apply avatar mode on load
    const savedAvatarMode = localStorage.getItem('avatarMode') || 'classic';
    if (cfgAvatarMode) {
        cfgAvatarMode.value = savedAvatarMode;
        if (vtuberSettings) vtuberSettings.style.display = savedAvatarMode === 'vtuber' ? 'flex' : 'none';
    }
    
    // Wait for vrmController to be defined by module
    if (savedAvatarMode === 'vtuber') {
        const checkInterval = setInterval(() => {
            if (window.vrmController) {
                clearInterval(checkInterval);
                window.vrmController.init();
                
                const savedVrmUrl = localStorage.getItem('vrmModelUrl') || '/static/models/sample.vrm';
                
                const isFlipped = localStorage.getItem('vrmFlip_' + savedVrmUrl) === 'true';
                window.vrmController.setFlip(isFlipped);
                
                const isArmsDown = parseFloat(localStorage.getItem('vrmArms_' + savedVrmUrl)) || 0;
                window.vrmController.setArmsDown(isArmsDown);
                
                if (savedVrmUrl.startsWith('data:') || customVrmDataUrl) {
                    window.vrmController.loadModel(customVrmDataUrl || savedVrmUrl);
                } else {
                    window.vrmController.loadModel(savedVrmUrl);
                }
                
                if (avatarEditBtn) avatarEditBtn.style.display = 'flex';
                const y = parseFloat(localStorage.getItem('vrmCameraOffsetY')) || -0.2;
                const z = parseFloat(localStorage.getItem('vrmCameraZoom')) || 2.0;
                window.vrmController.setCamera(y, z);
            }
        }, 100);
        // Timeout after 10s
        setTimeout(() => clearInterval(checkInterval), 10000);
    }

    if (docsBtn) {
        docsBtn.addEventListener('click', async () => {
            docsModal.classList.remove('hidden');
            docsContent.innerHTML = 'Cargando documentación...';
            try {
                const res = await fetch(`/api/workspace/file?filepath=${encodeURIComponent('/home/azanardi/Projects/AGY-companion/DOCUMENTACION_TECNICA.md')}`);
                const data = await res.json();
                if (data.error) {
                    docsContent.innerHTML = `<div style="color:red;">Error: ${data.error}</div>`;
                } else {
                    if (window.marked) {
                        docsContent.innerHTML = window.marked.parse(data.content);
                        if (window.hljs) {
                            docsContent.querySelectorAll('pre code').forEach((block) => {
                                hljs.highlightElement(block);
                            });
                        }
                    } else {
                        docsContent.innerHTML = `<pre>${data.content}</pre>`;
                    }
                }
            } catch (err) {
                docsContent.innerHTML = `<div style="color:red;">Error al cargar la documentación.</div>`;
            }
        });
    }

    if (closeDocsBtn) {
        closeDocsBtn.addEventListener('click', () => {
            docsModal.classList.add('hidden');
        });
    }

    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });


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
        
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (avatarMode === 'vtuber') {
            const vrmVal = cfgVrmModel ? cfgVrmModel.value : null;
            if (vrmVal) {
                if (vrmVal !== 'custom') {
                    localStorage.setItem('vrmModelUrl', vrmVal);
                }
            }
            // Hide modal before loading so the overlay shows properly over everything
            settingsModal.classList.add('hidden');
            
            if (window.vrmController) {
                window.vrmController.init();
                const loadUrl = (vrmVal === 'custom' && customVrmDataUrl) ? customVrmDataUrl : vrmVal;
                if (loadUrl) {
                    appendLog('sys', 'Iniciando carga de personaje...');
                    window.vrmController.loadModel(loadUrl);
                }
            }
            if (avatarEditBtn) avatarEditBtn.style.display = 'flex';
        } else {
            settingsModal.classList.add('hidden');
            if (window.vrmController) {
                window.vrmController.disable();
            }
            if (avatarEditBtn) avatarEditBtn.style.display = 'none';
            if (avatarEditMenu) avatarEditMenu.style.display = 'none';
        }

        const payload = {
            enable_tts: cfgEnableTts ? cfgEnableTts.checked : true,
            enable_notifications: cfgEnableNotifications ? cfgEnableNotifications.checked : true,
            character_name: cfgCharName.value.trim() || 'AGY Companion',
            system_prompt: cfgSystemPrompt.value.trim(),
            tts_engine: cfgTtsEngine.value,
            tts_voice: cfgTtsVoice.value,
            kokoro_voice: cfgKokoroVoice.value,
            model: document.getElementById('model-select').value
        };

        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            activeConfig = payload;
            charHeading.textContent = payload.character_name;
            if (payload.enable_notifications && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                Notification.requestPermission();
            }
            if (avatarMode !== 'vtuber') {
                settingsModal.classList.add('hidden');
            }
            appendLog('sys', 'Configuracion del personaje actualizada.');
        } catch (e) {
            console.error('Error saving config:', e);
            alert('Error al guardar la configuracion');
        }
    });

    // Typewriter effect
    const typewriter = (text, element, speed = 30) => {
        if (window.Intl && Intl.Segmenter) {
            const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
            const segments = Array.from(segmenter.segment(text)).map(s => s.segment);
            let i = 0;
            element.innerHTML = "";

            function type() {
                if (i < segments.length) {
                    element.innerHTML += segments[i];
                    i++;
                    setTimeout(type, speed);
                }
            }
            type();
        } else {
            let i = 0;
            element.innerHTML = "";
            function type() {
                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                }
            }
            type();
        }
    };

    // TTS Player (Edge / Kokoro)
    const speakTTS = async (text, engine, voice, msgDiv = null) => {
        let playBtn = null;
        if (msgDiv) {
            const header = msgDiv.querySelector('.message-header');
            if (header) {
                playBtn = document.createElement('button');
                playBtn.className = 'tts-play-btn outline-btn';
                playBtn.style.padding = '0 6px';
                playBtn.style.marginLeft = '8px';
                playBtn.style.fontSize = '12px';
                playBtn.style.borderRadius = '4px';
                playBtn.innerHTML = '⏳';
                header.appendChild(playBtn);
            }
        }

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        clearInterval(lipSyncInterval);
        characterImage.src = closedMouthImg;
                if (window.vrmSetTalking) window.vrmSetTalking(0);

        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, engine, voice })
            });

            const data = await res.json();
            if (!data.audio) {
                if (playBtn) playBtn.innerHTML = '❌';
                return;
            }

            const thisAudio = new Audio(data.audio);
            currentAudio = thisAudio;

            if (playBtn) {
                playBtn.innerHTML = '▶';
                playBtn.title = 'Reproducir';
                
                const togglePlay = () => {
                    if (thisAudio.paused) {
                        if (currentAudio && currentAudio !== thisAudio) {
                            currentAudio.pause();
                        }
                        clearInterval(lipSyncInterval);
                        currentAudio = thisAudio;
                        thisAudio.play();
                    } else {
                        thisAudio.pause();
                        thisAudio.currentTime = 0;
                        if (playBtn) playBtn.innerHTML = '▶';
                        clearInterval(lipSyncInterval);
                        characterImage.src = closedMouthImg;
                if (window.vrmSetTalking) window.vrmSetTalking(0);
                    }
                };
                playBtn.onclick = togglePlay;
            }

            thisAudio.onplay = () => {
                if (playBtn) {
                    playBtn.innerHTML = '⏹';
                    playBtn.title = 'Detener audio';
                }
                
                setupAudioAnalysis(thisAudio);
                
                lipSyncInterval = setInterval(() => {
                    if (audioAnalyser && audioDataArray) {
                        // Use time-domain data (waveform) to get the actual momentary volume
                        audioAnalyser.getByteTimeDomainData(audioDataArray);
                        
                        let sumOfSquares = 0;
                        for (let i = 0; i < audioDataArray.length; i++) {
                            // 128 is the zero-point (silence)
                            const amplitude = (audioDataArray[i] - 128) / 128.0;
                            sumOfSquares += amplitude * amplitude;
                        }
                        // RMS (Root Mean Square) is the standard way to measure audio volume
                        const rms = Math.sqrt(sumOfSquares / audioDataArray.length);
                        
                        // Scale RMS to 0.0 - 1.0 (speech RMS is usually around 0.1 to 0.3)
                        let vol = rms * 4.0; 
                        
                        // Apply a non-linear curve to make it snap open faster but allow closing
                        vol = Math.pow(vol, 1.2);
                        
                        if (vol > 1.0) vol = 1.0;
                        if (vol < 0.1) vol = 0.0; // noise gate
                        
                        if (window.vrmSetTalking) window.vrmSetTalking(vol);
                        if (characterImage) characterImage.src = vol > 0.3 ? openMouthImg : closedMouthImg;
                    } else {
                        // Fallback if no audio context
                        let mouthOpen = Math.random() > 0.5;
                        if (characterImage) characterImage.src = mouthOpen ? openMouthImg : closedMouthImg;
                        if (window.vrmSetTalking) window.vrmSetTalking(mouthOpen ? 1 : 0);
                    }
                }, 33); // 30 FPS for much faster polling of the waveform
            };

            thisAudio.onpause = () => {
                if (playBtn) {
                    playBtn.innerHTML = '▶';
                    playBtn.title = 'Reproducir';
                }
                clearInterval(lipSyncInterval);
                characterImage.src = closedMouthImg;
                if (window.vrmSetTalking) window.vrmSetTalking(0);
            };

            thisAudio.onended = () => {
                if (playBtn) {
                    playBtn.innerHTML = '▶';
                    playBtn.title = 'Reproducir';
                }
                clearInterval(lipSyncInterval);
                characterImage.src = closedMouthImg;
                if (window.vrmSetTalking) window.vrmSetTalking(0);
            };

            thisAudio.onerror = () => {
                clearInterval(lipSyncInterval);
                characterImage.src = closedMouthImg;
                if (window.vrmSetTalking) window.vrmSetTalking(0);
                if (playBtn) playBtn.innerHTML = '❌';
            };

            await thisAudio.play();
        } catch (e) {
            console.error('TTS playback error:', e);
            clearInterval(lipSyncInterval);
            characterImage.src = closedMouthImg;
                if (window.vrmSetTalking) window.vrmSetTalking(0);
            if (playBtn) playBtn.innerHTML = '❌';
        }
    };

    let currentConversationId = null;
    let ws = null;
    let currentResponseText = "";
    let isThinking = false;
    let currentThought = "";
    
    // Pagination settings
    const MAX_VISIBLE_MSGS = 10;
    let visibleMessages = MAX_VISIBLE_MSGS;
    
    // Workspace & Settings
    const projectPathInput = document.getElementById('project-path-input');
    const enableDiffsCheckbox = document.getElementById('enable-diffs');
    
    // View Toggle Logic
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const artifactsToggleBtn = document.getElementById('artifacts-toggle-btn');
    const workspaceToggleBtn = document.getElementById('workspace-toggle-btn');
    const workflowViewBtn = document.getElementById('workflow-view-btn');
    const multiagentViewBtn = document.getElementById('multiagent-view-btn');
    
    const avatarView = document.getElementById('avatar-view');
    const chatView = document.getElementById('chat-view');
    const chatHistory = document.getElementById('chat-history');
    const artifactsView = document.getElementById('artifacts-view');
    const workspaceView = document.getElementById('workspace-view');
    const workflowView = document.getElementById('workflow-view');
    const multiagentView = document.getElementById('multiagent-view');
    
    let currentView = 'avatar'; // 'avatar', 'chat', 'artifacts', 'workspace', 'workflow', 'multiagent'
    
    function switchView(newView) {
        currentView = newView;
        
        avatarView.classList.add('hidden-view');
        avatarView.classList.remove('active-view');
        chatView.classList.add('hidden-view');
        chatView.classList.remove('active-view');
        artifactsView.classList.add('hidden-view');
        artifactsView.classList.remove('active-view');
        workspaceView.classList.add('hidden-view');
        workspaceView.classList.remove('active-view');
        if (workflowView) {
            workflowView.classList.add('hidden-view');
            workflowView.classList.remove('active-view');
        }
        if (multiagentView) {
            multiagentView.classList.add('hidden-view');
            multiagentView.classList.remove('active-view');
        }
        
        if (newView === 'chat') {
            chatView.classList.remove('hidden-view');
            chatView.classList.add('active-view');
            chatView.scrollTop = chatView.scrollHeight;
        } else if (newView === 'artifacts') {
            artifactsView.classList.remove('hidden-view');
            artifactsView.classList.add('active-view');
            if (currentConversationId) {
                loadArtifactsList(currentConversationId);
            } else {
                document.getElementById('artifacts-list').innerHTML = '<div style="color:var(--text-muted); font-size: 0.9rem;">No hay conversación activa.</div>';
            }
        } else if (newView === 'workspace') {
            workspaceView.classList.remove('hidden-view');
            workspaceView.classList.add('active-view');
            loadWorkspaceFiles();
        } else if (newView === 'workflow') {
            if (workflowView) {
                workflowView.classList.remove('hidden-view');
                workflowView.classList.add('active-view');
                drawWorkflowEdges(); // Redibujar flechas si hay redimension
            }
        } else if (newView === 'multiagent') {
            if (multiagentView) {
                multiagentView.classList.remove('hidden-view');
                multiagentView.classList.add('active-view');
            }
        } else {
            avatarView.classList.remove('hidden-view');
            avatarView.classList.add('active-view');
        }
    }
    
    viewToggleBtn.addEventListener('click', () => {
        switchView(currentView === 'chat' ? 'avatar' : 'chat');
    });
    
    if (workflowViewBtn) {
        workflowViewBtn.addEventListener('click', () => switchView(currentView === 'workflow' ? 'avatar' : 'workflow'));
    }
    
    if (multiagentViewBtn) {
        multiagentViewBtn.addEventListener('click', () => switchView(currentView === 'multiagent' ? 'avatar' : 'multiagent'));
    }
    
    if (artifactsToggleBtn) {
        artifactsToggleBtn.addEventListener('click', () => {
            switchView(currentView === 'artifacts' ? 'avatar' : 'artifacts');
        });
    }

    if (workspaceToggleBtn) {
        workspaceToggleBtn.addEventListener('click', () => {
            const artifactsSidebar = document.querySelector('#workspace-view .artifacts-sidebar');
            if (currentView !== 'workspace') {
                switchView('workspace');
                if (artifactsSidebar) artifactsSidebar.classList.remove('collapsed');
            } else {
                if (artifactsSidebar) artifactsSidebar.classList.toggle('collapsed');
            }
        });
    }
    // Artifacts Logic
    const artifactsList = document.getElementById('artifacts-list');
    const artifactContent = document.getElementById('artifact-content');
    let currentArtifactName = null;

    async function loadArtifactsList(convId) {
        try {
            artifactsList.innerHTML = '<div style="color:var(--text-muted); font-size: 0.9rem;">Cargando...</div>';
            const res = await fetch(`/api/artifacts/${convId}`);
            const data = await res.json();
            
            artifactsList.innerHTML = '';
            if (!data || data.length === 0) {
                artifactsList.innerHTML = '<div style="color:var(--text-muted); font-size: 0.9rem;">No hay archivos.</div>';
                return;
            }
            
            data.forEach(file => {
                const item = document.createElement('div');
                item.className = 'artifact-item';
                if (file.name === currentArtifactName) item.classList.add('active');
                
                // Un ícono simple de archivo
                item.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> ${file.name}`;
                
                item.addEventListener('click', () => {
                    document.querySelectorAll('.artifact-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    loadArtifactContent(convId, file.name);
                });
                artifactsList.appendChild(item);
            });
        } catch (e) {
            artifactsList.innerHTML = '<div style="color:red; font-size: 0.9rem;">Error.</div>';
        }
    }

    async function loadArtifactContent(convId, filename) {
        try {
            currentArtifactName = filename;
            artifactContent.innerHTML = '<p style="color: var(--text-muted);">Cargando contenido...</p>';
            const res = await fetch(`/api/artifacts/${convId}/${filename}`);
            const data = await res.json();
            
            if (data.error) {
                artifactContent.innerHTML = `<p style="color: red;">${data.error}</p>`;
                return;
            }
            
            // Usamos marked para parsear markdown
            if (window.marked) {
                artifactContent.innerHTML = window.marked.parse(data.content);
                // Resaltar sintaxis de bloques de código
                if (window.hljs) {
                    artifactContent.querySelectorAll('pre code').forEach((block) => {
                        window.hljs.highlightElement(block);
                    });
                }
            } else {
                artifactContent.innerHTML = `<pre><code>${data.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
            }
        } catch (e) {
            artifactContent.innerHTML = '<p style="color: red;">Error al cargar archivo.</p>';
        }
    }
    
    // Create Load More Button
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'load-more-btn hidden-btn';
    loadMoreBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg> Cargar anteriores';
    chatHistory.appendChild(loadMoreBtn);

    loadMoreBtn.addEventListener('click', () => {
        visibleMessages += MAX_VISIBLE_MSGS;
        updateMessageVisibility();
    });

    function updateMessageVisibility() {
        // Obtenemos todos los mensajes (excluyendo el botón que está como primer/último elemento o lo buscamos por clase)
        const msgs = Array.from(chatHistory.querySelectorAll('.chat-message'));
        const total = msgs.length;
        
        if (total > visibleMessages) {
            loadMoreBtn.classList.remove('hidden-btn');
            chatHistory.insertBefore(loadMoreBtn, chatHistory.firstChild);
        } else {
            loadMoreBtn.classList.add('hidden-btn');
        }

        msgs.forEach((msg, index) => {
            // Los más nuevos están al final. 
            // Si el índice es menor que (total - visibleMessages), lo ocultamos.
            if (index < total - visibleMessages) {
                msg.classList.add('hidden-msg');
            } else {
                msg.classList.remove('hidden-msg');
            }
        });
    }



    function appendChatMessage(role, text, isStreaming = false) {
        if (isStreaming) {
            let lastMsg = chatHistory.lastElementChild;
            if (lastMsg && lastMsg.classList.contains(role)) {
                let bubble = lastMsg.querySelector('.message-bubble');
                if (bubble) {
                    if (role === 'agent' && window.marked) {
                        bubble.innerHTML = window.marked.parse(text);
                    } else {
                        bubble.textContent = text;
                    }
                } else {
                    lastMsg.textContent = text; // Fallback
                }
                
                if (role === 'agent' && !text.trim()) {
                    lastMsg.style.display = 'none';
                } else {
                    lastMsg.style.display = '';
                }
                
                chatView.scrollTop = chatView.scrollHeight;
                return;
            }
        }
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${role}`;
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = role === 'user' ? 'Tú' : (activeConfig.character_name || 'AGY Companion');
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        if (role === 'agent' && window.marked) {
            bubbleDiv.innerHTML = window.marked.parse(text);
        } else {
            bubbleDiv.textContent = text;
        }
        
        if (role === 'agent' && !text.trim()) {
            msgDiv.style.display = 'none';
        } else {
            msgDiv.style.display = '';
        }
        
        msgDiv.appendChild(headerDiv);
        msgDiv.appendChild(bubbleDiv);
        chatHistory.appendChild(msgDiv);
        
        updateMessageVisibility();
        chatView.scrollTop = chatView.scrollHeight;
    }
    
    // --- Workflow DAG Logic ---
    let currentWorkflowMap = null;
    function renderWorkflowMap(data) {
        currentWorkflowMap = data;
        const nodesContainer = document.getElementById('workflow-nodes');
        const edgesContainer = document.getElementById('workflow-edges');
        if(!nodesContainer || !edgesContainer) return;
        
        nodesContainer.innerHTML = '';
        edgesContainer.innerHTML = '';
        nodesContainer.style.display = 'flex';
        nodesContainer.style.justifyContent = 'center';
        nodesContainer.style.alignItems = 'center';
        nodesContainer.style.gap = '50px';
        nodesContainer.style.flexWrap = 'wrap';

        const nodeElements = {};
        
        // Crear Nodos
        if (data.agents) {
            data.agents.forEach(agent => {
                const card = document.createElement('div');
                card.className = 'agent-card';
                card.style.padding = '15px 25px';
                card.style.background = 'var(--surface-color)';
                card.style.border = '2px solid var(--border-color)';
                card.style.borderRadius = '8px';
                card.style.color = 'var(--text-color)';
                card.style.fontWeight = 'bold';
                card.style.zIndex = '2';
                card.id = `node-${agent}`;
                card.textContent = agent;
                nodesContainer.appendChild(card);
                nodeElements[agent] = card;
            });
        }
        
        // Dibujar Flechas de forma rapida despues de renderizar
        setTimeout(() => drawWorkflowEdges(), 100);
    }
    
    window.drawWorkflowEdges = function() {
        if(!currentWorkflowMap || !currentWorkflowMap.connections) return;
        const edgesContainer = document.getElementById('workflow-edges');
        edgesContainer.innerHTML = '';
        
        const containerRect = document.getElementById('workflow-view').getBoundingClientRect();
        
        currentWorkflowMap.connections.forEach(conn => {
            const fromNode = document.getElementById(`node-${conn.from}`);
            const toNode = document.getElementById(`node-${conn.to}`);
            
            if(fromNode && toNode) {
                const rect1 = fromNode.getBoundingClientRect();
                const rect2 = toNode.getBoundingClientRect();
                
                const x1 = rect1.left + rect1.width/2 - containerRect.left;
                const y1 = rect1.top + rect1.height/2 - containerRect.top;
                const x2 = rect2.left + rect2.width/2 - containerRect.left;
                const y2 = rect2.top + rect2.height/2 - containerRect.top;
                
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                line.setAttribute('stroke', 'var(--accent-color)');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('marker-end', 'url(#arrowhead)');
                
                edgesContainer.appendChild(line);
            }
        });
    }
    
    // Configurar arrowhead
    const svgEdges = document.getElementById('workflow-edges');
    if (svgEdges) {
        svgEdges.innerHTML = `
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-color)"/>
                </marker>
            </defs>
        `;
    }
    
    function updateWorkflowTransition(agentName) {
        document.querySelectorAll('.agent-card').forEach(card => {
            card.style.borderColor = 'var(--border-color)';
            card.style.boxShadow = 'none';
        });
        const activeCard = document.getElementById(`node-${agentName}`);
        if(activeCard) {
            activeCard.style.borderColor = 'var(--accent-color)';
            activeCard.style.boxShadow = '0 0 10px var(--accent-color)';
        }
    }

    // --- Multi-Agent Split View Logic ---
    function handleMultiagentStream(agentId, data) {
        const list = document.getElementById('active-agents-list');
        const container = document.getElementById('multiagent-chats-container');
        if(!list || !container) return;
        
        let sidebarItem = document.getElementById(`sidebar-item-${agentId}`);
        if(!sidebarItem) {
            sidebarItem = document.createElement('div');
            sidebarItem.id = `sidebar-item-${agentId}`;
            sidebarItem.style.padding = '8px';
            sidebarItem.style.cursor = 'pointer';
            sidebarItem.style.border = '1px solid var(--border-color)';
            sidebarItem.style.borderRadius = '4px';
            sidebarItem.textContent = agentId;
            sidebarItem.onclick = () => toggleAgentChat(agentId);
            list.appendChild(sidebarItem);
        }
        
        let chatWin = document.getElementById(`chat-win-${agentId}`);
        if(chatWin) {
            const body = chatWin.querySelector('.chat-win-body');
            let content = "";
            if (data.content) content = data.content;
            if (data.step_update && data.step_update.text_delta) content = data.step_update.text_delta;
            if (content) {
                body.textContent += content;
                body.scrollTop = body.scrollHeight;
            }
        }
    }
    
    function toggleAgentChat(agentId) {
        const container = document.getElementById('multiagent-chats-container');
        let chatWin = document.getElementById(`chat-win-${agentId}`);
        
        if(chatWin) {
            chatWin.remove();
        } else {
            chatWin = document.createElement('div');
            chatWin.id = `chat-win-${agentId}`;
            chatWin.style.flex = '1';
            chatWin.style.minWidth = '300px';
            chatWin.style.border = '1px solid var(--border-color)';
            chatWin.style.margin = '10px';
            chatWin.style.display = 'flex';
            chatWin.style.flexDirection = 'column';
            
            const header = document.createElement('div');
            header.style.padding = '8px';
            header.style.background = 'var(--surface-color)';
            header.style.borderBottom = '1px solid var(--border-color)';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.innerHTML = `<strong>${agentId}</strong> <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:white;cursor:pointer;">X</button>`;
            
            const body = document.createElement('div');
            body.className = 'chat-win-body';
            body.style.flex = '1';
            body.style.padding = '10px';
            body.style.overflowY = 'auto';
            body.style.whiteSpace = 'pre-wrap';
            body.style.fontFamily = 'monospace';
            
            chatWin.appendChild(header);
            chatWin.appendChild(body);
            container.appendChild(chatWin);
        }
    }

    function connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`);
        
        ws.onopen = () => {
            appendLog('sys', 'Conexión WebSocket en tiempo real establecida.');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Eventos Multiagente Nuevos
                if (data.event === "workflow_map" && data.data) {
                    renderWorkflowMap(data.data);
                }
                else if (data.event === "workflow_transition" && data.data) {
                    updateWorkflowTransition(data.data.active_agent);
                }
                else if (data.event === "thought_stream" || data.event === "agent_started") {
                    if (data.agent_id === "Direct" && data.data) {
                        let innerData = data.data;
                        if (!innerData.event && innerData.step_update) {
                            innerData.event = "step_update";
                        }
                        Object.assign(data, innerData);
                    } else if (data.agent_id !== "Direct") {
                        handleMultiagentStream(data.agent_id || "Worker", data.data || {});
                        return;
                    }
                }
                
                if (data.event === "init" && data.conversation_id) {
                    currentConversationId = data.conversation_id;
                } 
                else if (data.event === "step_update" && data.step_update) {
                    const step = data.step_update;
                    if (step.step_type === "agent_response" && step.text_delta) {
                        let text = step.text_delta;
                        currentResponseText += text;

                        if (text.includes("<thought>")) {
                            isThinking = true;
                            currentThought = text.split("<thought>")[1] || "";
                        } 
                        
                        if (isThinking && text.includes("</thought>")) {
                            isThinking = false;
                            if (!text.includes("<thought>")) {
                                currentThought += text.split("</thought>")[0] || "";
                            } else {
                                currentThought = currentThought.split("</thought>")[0] || "";
                            }
                            if (currentThought.trim()) {
                                appendLog('thought', currentThought.trim());
                            }
                            currentThought = "";
                        } else if (isThinking && !text.includes("<thought>")) {
                            currentThought += text;
                        }
                        
                        const cleanText = currentResponseText.replace(/<thought>[\s\S]*?<\/thought>/g, '').replace(/94>call:[^\s]+(?:\s*\{[\s\S]*?\})?\s*94>/g, '').trim();
                        
                        // Actualizar Avatar View
                        status.textContent = cleanText;
                        
                        // Actualizar Chat View (streaming mode)
                        appendChatMessage('agent', cleanText, true);
                    }
                    if (step.step_type === "tool" && step.state === "ACTIVE") {
                        let summary = "Ejecutando herramienta...";
                        if (step.tool_info && step.tool_info.parameters) {
                            summary = step.tool_info.parameters.toolSummary || step.tool_info.parameters.toolAction || JSON.stringify(step.tool_info.parameters).substring(0, 50);
                        }
                        const toolName = step.tool_name || "Tool";
                        appendLog('tool', `${toolName}(${summary})`);
                        
                        currentResponseText += `\n\n> 🛠️ **${toolName}**: ${summary}\n\n`;
                        const cleanText = currentResponseText.replace(/<thought>[\s\S]*?<\/thought>/g, '').replace(/94>call:[^\s]+(?:\s*\{[\s\S]*?\})?\s*94>/g, '').trim();
                        appendChatMessage('agent', cleanText, true);
                    }
                }
                else if (data.event === "result" && data.result) {
                    let finalResponse = currentResponseText;
                    if (!finalResponse.trim()) {
                        finalResponse = data.result.response || "";
                    }
                    const cleanFinal = finalResponse.replace(/<thought>[\s\S]*?<\/thought>/g, '').replace(/94>call:[^\s]+(?:\s*\{[\s\S]*?\})?\s*94>/g, '').trim();
                    
                    status.textContent = cleanFinal;
                    appendChatMessage('agent', cleanFinal, true);
                    
                    const lastMsgForHighlight = chatHistory.lastElementChild;
                    if (lastMsgForHighlight && window.hljs) {
                        lastMsgForHighlight.querySelectorAll('pre code').forEach((block) => {
                            window.hljs.highlightElement(block);
                        });
                    }
                    
                    appendLog('res', `Respuesta finalizada.`);
                    
                    const selectedEngine = activeConfig.tts_engine || 'edge';
                    const selectedVoice = selectedEngine === 'kokoro' ? (activeConfig.kokoro_voice || 'ef_dora') : (activeConfig.tts_voice || 'es-AR-ElenaNeural');
                    
                    const lastMsg = chatHistory.lastElementChild;
                    if (activeConfig.enable_tts !== false) {
                        speakTTS(cleanFinal, selectedEngine, selectedVoice, lastMsg);
                    }
                    
                    if (activeConfig.enable_notifications !== false) {
                        if (Notification.permission === 'granted') {
                            new Notification('AGY Companion', { body: cleanFinal, icon: closedMouthImg });
                        } else if (Notification.permission !== 'denied') {
                            Notification.requestPermission().then(permission => {
                                if (permission === 'granted') {
                                    new Notification('AGY Companion', { body: cleanFinal, icon: closedMouthImg });
                                }
                            });
                        }
                    }
                }
                else if (data.event === "done") {
                    // Subproceso agy finalizado
                }
            } catch (e) {
                console.error("Error parseando WS", e, event.data);
            }
        };
        
        ws.onclose = () => {
            appendLog('sys', 'WebSocket desconectado. Reconectando...');
            setTimeout(connectWebSocket, 2000);
        };
    }
    
    connectWebSocket();

    const handleSendMessage = async () => {
        const message = textInput.value.trim();
        if (!message) return;

        textInput.value = '';
        textInput.style.height = 'auto';
        status.textContent = "Pensando...";
        currentResponseText = "";

        appendLog('sys', `Tú: "${message}"`);
        appendChatMessage('user', message);
        appendChatMessage('agent', "Pensando...", true); // Placeholder to be replaced by stream
        
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            status.textContent = "Error: Conexión WebSocket no disponible. Intentando reconectar...";
            connectWebSocket();
            return;
        }
        
        const agentModeBtn = document.getElementById('agent-mode-btn');
        const useAgents = agentModeBtn ? agentModeBtn.getAttribute('data-active') === 'true' : true;
        
        const req = {
            message: message,
            conversation_id: currentConversationId,
            working_dir: projectPathInput ? projectPathInput.value.trim() : "",
            use_agents: useAgents
        };
        ws.send(JSON.stringify(req));
    }

    // --- Workspace Logic ---
    const workspaceList = document.getElementById('workspace-list');
    const workspaceSearchInput = document.getElementById('workspace-search-input');
    let monacoEditorInstance = null;
    let monacoDiffEditorInstance = null;
    let currentWorkspaceFile = null;
    window.reviewedFiles = new Set();
    
    document.getElementById('mark-reviewed-btn')?.addEventListener('click', () => {
        if (currentWorkspaceFile) {
            window.reviewedFiles.add(currentWorkspaceFile);
            loadWorkspaceFiles();
        }
    });
    
    if (workspaceSearchInput) {
        let searchTimeout;
        workspaceSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(async () => {
                if (!query) {
                    loadWorkspaceFiles();
                    return;
                }
                const path = projectPathInput.value.trim();
                workspaceList.innerHTML = '<div style="color:var(--text-muted); font-size: 0.9rem;">Buscando...</div>';
                try {
                    const res = await fetch(`/api/workspace/search?path=${encodeURIComponent(path)}&query=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    
                    workspaceList.innerHTML = '';
                    if (data.files.length === 0) {
                        workspaceList.innerHTML = '<div style="color:var(--text-muted); font-size: 0.9rem;">Sin resultados</div>';
                    }
                    data.files.forEach(file => {
                        const item = document.createElement('div');
                        item.className = 'artifact-item';
                        item.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> ${file.name}`;
                        item.addEventListener('click', () => {
                            document.querySelectorAll('#workspace-list .artifact-item').forEach(el => el.classList.remove('active'));
                            item.classList.add('active');
                            openWorkspaceFile(file.path);
                        });
                        workspaceList.appendChild(item);
                    });
                } catch(e) {
                    workspaceList.innerHTML = `<div style="color:red; font-size: 0.9rem;">Error al buscar</div>`;
                }
            }, 300);
        });
    }
    
    async function loadWorkspaceFiles() {
        if (!workspaceList) return;
        if (workspaceSearchInput) workspaceSearchInput.value = '';
        const path = projectPathInput.value.trim();
        workspaceList.innerHTML = '<div style="color:var(--text-muted); font-size: 0.9rem;">Cargando archivos...</div>';
        try {
            const res = await fetch(`/api/workspace/files?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            
            const modifiedList = document.getElementById('modified-files-list');
            if (modifiedList && currentConversationId) {
                try {
                    const modRes = await fetch(`/api/conversations/${currentConversationId}/modified_files`);
                    const modFiles = await modRes.json();
                    modifiedList.innerHTML = '';
                    if (modFiles.length === 0) {
                        modifiedList.innerHTML = '<span style="font-size: 0.8em; color: var(--text-muted);">Ninguno</span>';
                    } else {
                        modFiles.forEach(file => {
                            const item = document.createElement('div');
                            item.className = 'artifact-item';
                            const diffDot = !window.reviewedFiles.has(file.path) ? `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#2ea043; margin-right:5px; flex-shrink:0;"></span>` : '';
                            const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`;
                            item.innerHTML = `<div style="display:flex; align-items:center;">${diffDot}${icon} <span style="margin-left:5px;">${file.name}</span></div>`;
                            item.addEventListener('click', () => {
                                document.querySelectorAll('#workspace-list .artifact-item, #modified-files-list .artifact-item').forEach(el => el.classList.remove('active'));
                                item.classList.add('active');
                                openWorkspaceFile(file.path);
                            });
                            item.title = file.path;
                            modifiedList.appendChild(item);
                        });
                    }
                } catch(e) {
                    console.error("Error cargando archivos modificados:", e);
                }
            }
            
            if (data.error) {
                workspaceList.innerHTML = `<div style="color:red; font-size: 0.9rem;">Error: ${data.error}</div>`;
                return;
            }
            
            workspaceList.innerHTML = '';
            data.files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'artifact-item';
                
                const icon = file.is_dir ? 
                    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>` : 
                    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
                
                const diffDot = (file.has_diff && !window.reviewedFiles.has(file.path)) ? `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#2ea043; margin-right:5px; flex-shrink:0;"></span>` : '';
                
                item.innerHTML = `<div style="display:flex; align-items:center;">${diffDot}${icon} <span style="margin-left:5px;">${file.name}</span></div>`;
                item.addEventListener('click', () => {
                    if (file.is_dir) {
                        projectPathInput.value = file.path;
                        loadWorkspaceFiles();
                    } else {
                        document.querySelectorAll('#workspace-list .artifact-item').forEach(el => el.classList.remove('active'));
                        item.classList.add('active');
                        openWorkspaceFile(file.path);
                    }
                });
                workspaceList.appendChild(item);
            });
            
            // Si hay un botón para retroceder un nivel
            if (path !== "/") {
                const upBtn = document.createElement('div');
                upBtn.className = 'artifact-item';
                upBtn.innerHTML = `.. (Subir un nivel)`;
                upBtn.onclick = () => {
                    const parts = path.split('/');
                    parts.pop();
                    projectPathInput.value = parts.join('/') || '/';
                    loadWorkspaceFiles();
                };
                workspaceList.prepend(upBtn);
            }
            
        } catch(e) {
            workspaceList.innerHTML = `<div style="color:red; font-size: 0.9rem;">Error al cargar directorio.</div>`;
        }
    }
    
    document.getElementById('refresh-workspace-btn')?.addEventListener('click', loadWorkspaceFiles);
    
    async function openWorkspaceFile(filepath) {
        currentWorkspaceFile = filepath;
        
        const filePathBar = document.getElementById('file-path-bar');
        const filePathDisplay = document.getElementById('file-path-display');
        if (filePathBar && filePathDisplay) {
            filePathBar.style.display = 'flex';
            filePathDisplay.textContent = filepath;
        }
        
        // Fetch current content
        const resCurrent = await fetch(`/api/workspace/file?filepath=${encodeURIComponent(filepath)}`);
        const dataCurrent = await resCurrent.json();
        
        // Fetch original content from git
        const resOriginal = await fetch(`/api/workspace/file_original?filepath=${encodeURIComponent(filepath)}`);
        const dataOriginal = await resOriginal.json();
        
        if (dataCurrent.error) {
            alert(dataCurrent.error);
            return;
        }
        
        const currentContent = dataCurrent.content || "";
        const originalContent = dataOriginal.content || currentContent;
        
        initMonacoDiffEditor(originalContent, currentContent, filepath);
    }
    
    function initMonacoDiffEditor(originalContent, currentContent, filepath) {
        const container = document.getElementById('monaco-editor-container');
        container.innerHTML = '';
        
        if (window.require) {
            require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.40.0/min/vs' }});
            require(['vs/editor/editor.main'], function() {
                const ext = filepath.split('.').pop();
                let lang = 'plaintext';
                if (ext === 'js') lang = 'javascript';
                else if (ext === 'py') lang = 'python';
                else if (ext === 'html') lang = 'html';
                else if (ext === 'css') lang = 'css';
                else if (ext === 'json') lang = 'json';
                else if (ext === 'md') lang = 'markdown';
                
                if (originalContent === currentContent) {
                    monacoEditorInstance = monaco.editor.create(container, {
                        value: currentContent,
                        language: lang,
                        theme: 'vs-dark',
                        readOnly: true,
                        automaticLayout: true
                    });
                } else {
                    monacoDiffEditorInstance = monaco.editor.createDiffEditor(container, {
                        theme: 'vs-dark',
                        readOnly: true,
                        automaticLayout: true
                    });
                    
                    monacoDiffEditorInstance.setModel({
                        original: monaco.editor.createModel(originalContent, lang),
                        modified: monaco.editor.createModel(currentContent, lang)
                    });
                }
            });
        } else {
            container.innerHTML = `<pre style="padding: 20px;"><code>${currentContent}</code></pre>`;
        }
    }

    // Custom Markdown Parsing con diff2html
    if (window.marked) {
        const renderer = new marked.Renderer();
        const originalCodeRenderer = renderer.code.bind(renderer);
        renderer.code = function(code, language, isEscaped) {
            if (language === 'diff' && enableDiffsCheckbox && enableDiffsCheckbox.checked) {
                // Usar diff2html
                try {
                    // Validar si es formato diff unificado (necesita header a veces)
                    let diffText = code;
                    if (!diffText.startsWith('---') && !diffText.startsWith('diff --git')) {
                        diffText = `--- a/file\n+++ b/file\n@@ -1,1 +1,1 @@\n` + code;
                    }
                    const html = Diff2Html.html(diffText, {
                        drawFileList: false,
                        matching: 'lines',
                        outputFormat: 'side-by-side',
                        theme: 'dark'
                    });
                    return `<div class="diff-container">${html}</div>`;
                } catch(e) {
                    return originalCodeRenderer(code, language, isEscaped);
                }
            }
            return originalCodeRenderer(code, language, isEscaped);
        };
        marked.setOptions({ renderer: renderer });
    };

    sendButton.addEventListener('click', handleSendMessage);

    textInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    textInput.addEventListener('input', () => {
        textInput.style.height = 'auto';
        textInput.style.height = `${Math.min(textInput.scrollHeight, 100)}px`;
    });

    // Real-Time STT Recording Logic
    let isRecording = false;
    let recognition;
    let audioContext;
    let analyser;
    let microphone;
    let reqAnimFrame;
    let audioStream;

    if (micButton) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'es-AR';

            let finalTranscript = '';

            recognition.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                textInput.value = finalTranscript + interimTranscript;
                
                // Ajustar altura del textInput
                textInput.style.height = 'auto';
                textInput.style.height = `${Math.min(textInput.scrollHeight, 100)}px`;
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                appendLog('sys', `Error en reconocimiento de voz: ${event.error}`);
                stopRecording();
            };

            recognition.onend = () => {
                if (isRecording) {
                    recognition.start();
                }
            };
        } else {
            appendLog('sys', 'Web Speech API no soportada en este navegador.');
        }

        const volumeIndicator = document.getElementById('volume-indicator-container');
        const volBars = [
            document.getElementById('vol-bar-1'),
            document.getElementById('vol-bar-2'),
            document.getElementById('vol-bar-3'),
            document.getElementById('vol-bar-4'),
            document.getElementById('vol-bar-5')
        ];

        async function startRecording() {
            if (!recognition) return;
            isRecording = true;
            finalTranscript = textInput.value ? textInput.value + ' ' : '';
            recognition.start();
            
            micButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"></rect></svg>';
            micButton.classList.add('recording');
            appendLog('sys', 'Escuchando...');

            try {
                audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                microphone = audioContext.createMediaStreamSource(audioStream);
                microphone.connect(analyser);
                analyser.fftSize = 64; // Menos resolución para menos barras
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                
                if (volumeIndicator) volumeIndicator.style.display = 'flex';

                function drawVolume() {
                    if (!isRecording) return;
                    analyser.getByteFrequencyData(dataArray);
                    
                    // Simple logic to animate 5 bars based on lower frequencies
                    for(let i=0; i<5; i++) {
                        let val = dataArray[i * 2] || 0; // Take every 2nd bin
                        let height = Math.max(4, (val / 255) * 20); // 4px to 20px
                        if (volBars[i]) volBars[i].style.height = `${height}px`;
                    }

                    reqAnimFrame = requestAnimationFrame(drawVolume);
                }
                drawVolume();

            } catch (err) {
                console.error("Error accediendo al audio para analizador visual", err);
            }
        }

        function stopRecording() {
            isRecording = false;
            if (recognition) {
                recognition.stop();
            }
            if (reqAnimFrame) {
                cancelAnimationFrame(reqAnimFrame);
            }
            if (audioContext) {
                audioContext.close();
                audioContext = null;
            }
            if (audioStream) {
                audioStream.getTracks().forEach(track => track.stop());
                audioStream = null;
            }
            
            if (volumeIndicator) volumeIndicator.style.display = 'none';
            micButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>';
            micButton.classList.remove('recording');
            appendLog('sys', 'Escucha finalizada.');
        }

        micButton.addEventListener('click', () => {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }
});
