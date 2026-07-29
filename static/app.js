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
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveCfgBtn = document.getElementById('save-cfg-btn');
    const cfgCharName = document.getElementById('cfg-char-name');
    const cfgSystemPrompt = document.getElementById('cfg-system-prompt');
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

    let currentAudio = null;
    let lipSyncInterval = null;
    let activeConfig = {};

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
        // sidebarOverlay.classList.remove('hidden'); // Eliminado para permitir interaccion
        loadConversations();
    }
    
    historyToggleBtn.addEventListener('click', openHistorySidebar);
    closeHistoryBtn.addEventListener('click', closeSidebar);
    
    newChatBtn.addEventListener('click', () => {
        currentConversationId = null;
        chatHistory.innerHTML = '';
        status.textContent = 'Hola, en que te puedo ayudar hoy?';
        appendLog('sys', 'Nueva conversación iniciada.');
        closeSidebar();
        loadConversations(); // Actualiza selección
    });
    
    async function loadConversations() {
        try {
            const res = await fetch('/api/conversations');
            const data = await res.json();
            
            conversationsList.innerHTML = '';
            if (data.length === 0) {
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
        } catch (e) {
            console.error(e);
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
                const msgDiv = document.createElement('div');
                msgDiv.className = `chat-message ${msg.role}`;
                msgDiv.textContent = msg.text;
                chatHistory.appendChild(msgDiv);
            });
            
            if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg.role === 'agent') {
                    status.textContent = lastMsg.text;
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

    if (docsBtn) {
        docsBtn.addEventListener('click', () => {
            switchView('workspace');
            openWorkspaceFile('/home/azanardi/Projects/AGY-companion/DOCUMENTACION_TECNICA.md');
        });
    }

    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    saveCfgBtn.addEventListener('click', async () => {
        const payload = {
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
            settingsModal.classList.add('hidden');
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
    const speakTTS = async (text, engine, voice) => {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        clearInterval(lipSyncInterval);
        characterImage.src = closedMouthImg;

        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, engine, voice })
            });

            const data = await res.json();
            if (!data.audio) return;

            currentAudio = new Audio(data.audio);

            currentAudio.onplay = () => {
                let mouthOpen = true;
                lipSyncInterval = setInterval(() => {
                    characterImage.src = mouthOpen ? openMouthImg : closedMouthImg;
                    mouthOpen = !mouthOpen;
                }, 140);
            };

            currentAudio.onended = () => {
                clearInterval(lipSyncInterval);
                characterImage.src = closedMouthImg;
            };

            currentAudio.onerror = () => {
                clearInterval(lipSyncInterval);
                characterImage.src = closedMouthImg;
            };

            await currentAudio.play();
        } catch (e) {
            console.error('TTS playback error:', e);
            clearInterval(lipSyncInterval);
            characterImage.src = closedMouthImg;
        }
    };

    let currentConversationId = null;
    let ws = null;
    let currentResponseText = "";
    
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
    const avatarView = document.getElementById('avatar-view');
    const chatView = document.getElementById('chat-view');
    const chatHistory = document.getElementById('chat-history');
    const artifactsView = document.getElementById('artifacts-view');
    const workspaceView = document.getElementById('workspace-view');
    
    let currentView = 'avatar'; // 'avatar', 'chat', 'artifacts', 'workspace'
    
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
        } else {
            avatarView.classList.remove('hidden-view');
            avatarView.classList.add('active-view');
        }
    }
    
    viewToggleBtn.addEventListener('click', () => {
        switchView(currentView === 'chat' ? 'avatar' : 'chat');
    });
    
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
                    bubble.textContent = text;
                } else {
                    lastMsg.textContent = text; // Fallback
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
        bubbleDiv.textContent = text;
        
        msgDiv.appendChild(headerDiv);
        msgDiv.appendChild(bubbleDiv);
        chatHistory.appendChild(msgDiv);
        
        updateMessageVisibility();
        chatView.scrollTop = chatView.scrollHeight;
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
                
                if (data.event === "init" && data.conversation_id) {
                    currentConversationId = data.conversation_id;
                } 
                else if (data.event === "step_update" && data.step_update) {
                    const step = data.step_update;
                    if (step.step_type === "agent_response" && step.text_delta) {
                        // Limpiar tags de pensamiento para la UI principal
                        let text = step.text_delta;
                        if (text.includes("<thought>")) return; // skip thought start
                        if (text.includes("</thought>")) return; // skip thought end
                        
                        currentResponseText += text;
                        const cleanText = currentResponseText.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();
                        
                        // Actualizar Avatar View
                        status.textContent = cleanText;
                        
                        // Actualizar Chat View (streaming mode)
                        appendChatMessage('agent', cleanText, true);
                    }
                    if (step.step_type === "tool_call") {
                        appendLog('tool', `Ejecutando herramienta...`);
                    }
                }
                else if (data.event === "result" && data.result) {
                    const finalResponse = data.result.response || "";
                    const cleanFinal = finalResponse.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();
                    
                    status.textContent = cleanFinal;
                    appendChatMessage('agent', cleanFinal, true);
                    
                    appendLog('res', `Respuesta finalizada.`);
                    
                    const selectedEngine = activeConfig.tts_engine || 'edge';
                    const selectedVoice = selectedEngine === 'kokoro' ? (activeConfig.kokoro_voice || 'ef_dora') : (activeConfig.tts_voice || 'es-AR-ElenaNeural');
                    
                    speakTTS(cleanFinal, selectedEngine, selectedVoice);
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
        
        const req = {
            message: message,
            conversation_id: currentConversationId,
            working_dir: projectPathInput ? projectPathInput.value.trim() : ""
        };
        ws.send(JSON.stringify(req));
    }

    // --- Workspace Logic ---
    const workspaceList = document.getElementById('workspace-list');
    const workspaceSearchInput = document.getElementById('workspace-search-input');
    let monacoEditorInstance = null;
    let monacoDiffEditorInstance = null;
    let currentWorkspaceFile = null;
    
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
                
                item.innerHTML = `${icon} ${file.name}`;
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
                
                monacoDiffEditorInstance = monaco.editor.createDiffEditor(container, {
                    theme: 'vs-dark',
                    readOnly: true,
                    automaticLayout: true
                });
                
                monacoDiffEditorInstance.setModel({
                    original: monaco.editor.createModel(originalContent, lang),
                    modified: monaco.editor.createModel(currentContent, lang)
                });
            });
        } else {
            container.innerHTML = `<pre style="padding: 20px;"><code>${currentContent}</code></pre>`;
        }
    }
    // Botones de diff se pueden dejar o eliminar, pero por defecto mostramos Diff Editor
    
    document.getElementById('show-diff-btn')?.addEventListener('click', async () => {
        if (!projectPathInput) return;
        const path = projectPathInput.value.trim();
        const res = await fetch(`/api/workspace/git_diff?path=${encodeURIComponent(path)}`);
        const data = await res.json();
        
        const container = document.getElementById('monaco-editor-container');
        container.innerHTML = '';
        
        if (!data.diff) {
            container.innerHTML = `<div style="padding: 20px; color: var(--text-muted);">No hay diferencias en el repositorio git actual.</div>`;
            return;
        }
        
        if (window.require) {
            require(['vs/editor/editor.main'], function() {
                // Parseamos diff y mostramos diff original vs modificado
                // Para una integración simple, mostramos el raw diff en monaco
                monacoEditorInstance = monaco.editor.create(container, {
                    value: data.diff,
                    language: 'diff',
                    theme: 'vs-dark',
                    readOnly: true,
                    automaticLayout: true
                });
            });
        }
    });
    
    document.getElementById('show-code-btn')?.addEventListener('click', () => {
        if (currentWorkspaceFile) {
            openWorkspaceFile(currentWorkspaceFile);
        }
    });

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
