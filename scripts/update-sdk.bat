@echo off
echo ========================================
echo   Mise a jour SDK @google/genai
echo   Version 0.3.0 -^> 1.10.0 (securite)
echo ========================================
echo.

cd backend

echo [1/4] Installation de la nouvelle version du SDK...
call npm install
if errorlevel 1 (
    echo.
    echo ERREUR lors de npm install !
    pause
    exit /b 1
)
echo.

echo [2/4] Verification de la version installee...
call npm list @google/genai
echo.

echo [3/4] Compilation TypeScript...
call npm run build
if errorlevel 1 (
    echo.
    echo ERREUR lors de la compilation !
    pause
    exit /b 1
)
echo.

echo [4/4] Test du backend...
echo Demarrage du backend en mode dev pour tester...
echo Appuyez sur Ctrl+C pour arreter apres le test
echo.
start "Backend Test" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo Test de l'API (attendez que le serveur demarre)...
timeout /t 3 /nobreak >nul

curl -X POST "http://localhost:3100/algosheet" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Test after SDK update to 1.10.0\"}"

echo.
echo.
echo ========================================
echo   Mise a jour terminee localement !
echo ========================================
echo.
echo Prochaines etapes :
echo   1. Verifiez que le test ci-dessus a retourne du JSON
echo   2. Arretez le serveur de test (Ctrl+C dans l'autre fenetre)
echo   3. Commitez les changements : git add . ^&^& git commit -m "Update SDK"
echo   4. Pushez sur GitHub : git push
echo   5. Deployez sur le VPS (voir UPDATE-SDK-GEMINI.md)
echo.
pause
