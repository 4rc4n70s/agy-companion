@echo off
echo ==============================================
echo    AGY Companion - Setup e Instalador (Windows)
echo ==============================================
echo.

if not exist "venv" (
    echo [1/3] Creando entorno virtual Python (venv)...
    python -m venv venv
)

call venv\Scripts\activate

echo [2/3] Instalando dependencias de Python...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ==============================================
echo  Instalación completada con éxito en Windows!
echo  Para iniciar ejecuta: launch.bat
echo ==============================================
pause
