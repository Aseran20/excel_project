@echo off
echo ========================================
echo   Test AlgoSheet API (Production)
echo ========================================
echo.

echo Test 1: Simple prompt...
curl -X POST "https://algosheet.auraia.ch/api/algosheet" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"What is 2+2?\"}"
echo.
echo.

echo Test 2: Schema number...
curl -X POST "https://algosheet.auraia.ch/api/algosheet" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Population of France in millions\",\"schema\":\"number\"}"
echo.
echo.

echo Test 3: Web search...
curl -X POST "https://algosheet.auraia.ch/api/algosheet" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Latest news about Microsoft\",\"options\":\"web=true\"}"
echo.
echo.

echo ========================================
echo   Tests termines
echo ========================================
echo.
echo Si vous voyez des reponses JSON avec "value", ca marche !
echo.
pause
