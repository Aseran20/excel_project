@echo off
echo ========================================
echo   Test local (https://localhost:3100)
echo ========================================
echo.

echo Test 1: Sans web search (JSON strict)
curl -k -X POST "https://localhost:3100/algosheet" -H "Content-Type: application/json" -d "{\"prompt\":\"What is 2+2?\",\"schema\":\"number\"}"
echo.
echo.

echo Test 2: Avec web search (JSON soft)
curl -k -X POST "https://localhost:3100/algosheet" -H "Content-Type: application/json" -d "{\"prompt\":\"Latest news about Microsoft\",\"options\":\"web=true\"}"
echo.
echo.

pause
