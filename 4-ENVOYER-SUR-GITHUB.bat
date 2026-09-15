@echo off
chcp 65001 >nul
title PC TRACKERS - Envoi sur GitHub
cd /d "%~dp0"
echo.
echo ================================================
echo   ENVOI DU TRAVAIL SUR GITHUB
echo ================================================
echo.
echo Si une fenetre de connexion GitHub s ouvre :
echo cliquez sur "Sign in with your browser".
echo.
pause
echo.
git push origin main
git push origin feat/alertes-rapport-web
echo.
if %errorlevel%==0 (
  echo ================================================
  echo   ENVOI REUSSI
  echo ================================================
  echo.
  echo Dites a Claude : "envoye"
  echo Il pourra mettre le site en ligne.
) else (
  echo ================================================
  echo   ECHEC DE L ENVOI
  echo ================================================
  echo.
  echo Copiez le message ci-dessus et montrez-le a Claude.
)
echo.
pause
