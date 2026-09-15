@echo off
title PC TRACKERS - WEB
cd /d "%~dp0"
echo Lancement de la version WEB ^(navigateur^)...
call npx expo start --web
pause
