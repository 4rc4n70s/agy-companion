document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const sendButton = document.getElementById('send-button');
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

    let openMouthImg = '/static/images/char-mouth-open.png';
    let closedMouthImg = '/static/images/char-mouth-closed.png';

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
        sidebarOverlay.classList.remove('hidden');
    }

    function closeSidebar() {
        consoleSidebar.classList.add('closed');
        sidebarOverlay.classList.add('hidden');
    }

    sidebarToggleBtn.addEventListener('click', openSidebar);
    cliToggleBtn.addEventListener('click', () => {
        openSidebar();
        setTimeout(() => terminalInput.focus(), 300);
    });
    closeSidebarBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);

    // Terminal Input Interactive Send
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
            
            charHeading.textContent = cfg.character_name || 'AGY Companion';
            cfgTtsEngine.dispatchEvent(new Event('change'));
        } catch (e) {
            console.error('Error loading config:', e);
        }
    }

    loadConfig();

    // Modal Control
    settingsToggleBtn.addEventListener('click', () => {
        checkHealth();
        settingsModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    saveCfgBtn.addEventListener('click', async () => {
        const payload = {
            character_name: cfgCharName.value.trim() || 'AGY Companion',
            system_prompt: cfgSystemPrompt.value.trim(),
            tts_engine: cfgTtsEngine.value,
            tts_voice: cfgTtsVoice.value,
            kokoro_voice: cfgKokoroVoice.value
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

    const handleSendMessage = async () => {
        const message = textInput.value.trim();
        if (!message) return;

        textInput.value = '';
        textInput.style.height = 'auto';
        status.textContent = "Pensando...";

        appendLog('sys', `Mensaje enviado por el usuario: "${message}"`);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message }),
            });

            if (!response.ok) {
                throw new Error('Network response error');
            }

            const data = await response.json();

            // Log thoughts and tool calls in sidebar console
            if (data.thoughts && data.thoughts.length > 0) {
                data.thoughts.forEach(th => appendLog('thought', th));
            }
            if (data.tool_calls && data.tool_calls.length > 0) {
                data.tool_calls.forEach(tc => appendLog('tool', tc));
            }

            appendLog('res', `Respuesta generada: "${data.response.substring(0, 80)}..."`);

            typewriter(data.response, status);
            
            const selectedEngine = activeConfig.tts_engine || 'edge';
            const selectedVoice = selectedEngine === 'kokoro' ? (activeConfig.kokoro_voice || 'ef_dora') : (activeConfig.tts_voice || 'es-AR-ElenaNeural');
            
            speakTTS(data.response, selectedEngine, selectedVoice);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = 'Lo siento, ocurrio un error al procesar el mensaje.';
            typewriter(errorMessage, status);
            appendLog('sys', `Error de red o backend: ${error.message}`);
        }
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
});
