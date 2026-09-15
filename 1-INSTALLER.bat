@echo off
title INSTALLATION PC TRACKERS
cd /d "%~dp0"
echo ========================================
echo   INSTALLATION DES DEPENDANCES
echo ========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERREUR : Node.js n'est pas installe.
  echo Telechargez-le sur https://nodejs.org ^(version LTS^) puis relancez ce fichier.
  pause
  exit /b 1
)
node -v
echo.
echo Installation en cours ^(5 a 10 minutes^)...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo Nouvelle tentative en mode compatibilite...
  call npm install --legacy-peer-deps --no-audit --no-fund
)
echo.
echo ========================================
echo   INSTALLATION TERMINEE
echo ========================================
pause
