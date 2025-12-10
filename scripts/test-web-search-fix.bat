@echo off
echo ========================================
echo   Test Fix Web Search + JSON
echo   gemini-2.5-flash
echo ========================================
echo.

set API_URL=https://algosheet.auraia.ch/api/algosheet

echo [Test 1] Sans web search (JSON strict)
echo ----------------------------------------
curl -X POST "%API_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"What is 2+2?\",\"schema\":\"number\"}"
echo.
echo.
timeout /t 2 /nobreak >nul

echo [Test 2] Avec web search (JSON soft)
echo ----------------------------------------
curl -X POST "%API_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Latest news about Microsoft\",\"options\":\"web=true\"}"
echo.
echo.
timeout /t 2 /nobreak >nul

echo [Test 3] Number + web search
echo ----------------------------------------
curl -X POST "%API_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Current population of France\",\"schema\":\"number\",\"options\":\"web=true\"}"
echo.
echo.
timeout /t 2 /nobreak >nul

echo [Test 4] Multi-field + web search
echo ----------------------------------------
curl -X POST "%API_URL%" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Apple Inc company info\",\"schema\":\"multi(revenue,employees,ceo)\",\"options\":\"web=true\"}"
echo.
echo.

echo ========================================
echo   Tests termines
echo ========================================
echo.
echo Verifications :
echo   - Test 1 : Doit retourner un JSON avec value=4
echo   - Test 2 : Doit retourner un JSON avec sources[]
echo   - Test 3 : Doit retourner un JSON avec value=nombre
echo   - Test 4 : Doit retourner un JSON avec value={revenue,employees,ceo}
echo.
echo Si tous les tests retournent du JSON valide, le fix fonctionne !
echo.
pause
