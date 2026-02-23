@echo off
cd /d "%~dp0"
set URL=http://127.0.0.1:3000/Wordex.html

rem inicia o servidor (ajuste o exe/porta)
start "" /B static-web-server.exe --host 127.0.0.1 --port 3000 --root "%cd%"
timeout /t 3 >nul
rem abre no navegador padrão
start "" "%URL%"