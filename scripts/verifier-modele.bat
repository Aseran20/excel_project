@echo off
echo ========================================
echo   Verification du modele Gemini utilise
echo ========================================
echo.

echo [1] Code source TypeScript (local) :
findstr "modelId" backend\src\services\gemini.ts
echo.

echo [2] Code compile JavaScript (local) :
if exist backend\dist\services\gemini.js (
    findstr "gemini" backend\dist\services\gemini.js | findstr "flash\|pro"
) else (
    echo   Le fichier compile n'existe pas encore.
    echo   Executez: cd backend ^&^& npm run build
)
echo.

echo [3] Verification sur le VPS :
echo   Connectez-vous en SSH et executez :
echo   ssh root@192.3.81.106
echo   grep "modelId" /var/www/algosheet/backend/dist/services/gemini.js
echo.

echo [4] Test en production (regarder les logs) :
echo   Sur le VPS, executez une requete puis :
echo   pm2 logs algosheet-backend --lines 30
echo   Cherchez une ligne avec le nom du modele dans les logs Gemini
echo.

echo ========================================
pause
