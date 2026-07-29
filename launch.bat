@echo off
echo Iniciando servidor backend AGY Companion...
call venv\Scripts\activate
start /B python app.py
timeout /t 2 /nobreak >nul
start http://127.0.0.1:5000
