@echo off
chcp 65001 >nul
title PC TRACKERS - Envoi sur GitHub
cd /d "%~dp0"
echo.
echo ================================================
echo   ENVOI DU TRAVAIL SUR GITHUB
echo ================================================
echo.
echo Une fenetre de connexion GitHub va peut-etre s ouvrir.
echo Si c est le cas : cliquez sur "Sign in with your browser"
echo et connectez-vous avec votre compte GitHub.
echo.
echo Cela n arrive que la premiere fois.
echo.
pause
echo.
git push -u origin feat/alertes-rapport-web
echo.
if %errorlevel%==0 (
  echo ================================================
  echo   ENVOI REUSSI
  echo ================================================
  echo.
  echo Votre travail est maintenant sur GitHub.
  echo Prevenez Claude : il pourra mettre le site en ligne.
) else (
  echo ================================================
  echo   ECHEC DE L ENVOI
  echo ================================================
  echo.
  echo Copiez le message rouge ci-dessus et montrez-le a Claude.
)
echo.
pause
