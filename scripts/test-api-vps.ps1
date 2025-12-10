# Script PowerShell pour tester l'API AlgoSheet sur le VPS

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test AlgoSheet API (Production)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "https://algosheet.auraia.ch/api/algosheet"

Write-Host "URL testee : $apiUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1 : Simple prompt
Write-Host "[Test 1] Simple prompt..." -ForegroundColor Green
$body1 = @{
    prompt = "What is 2+2?"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body1 -ContentType "application/json" -ErrorAction Stop
    Write-Host "✓ Reponse recue !" -ForegroundColor Green
    Write-Host "  Value: $($response1.value)" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "✗ ERREUR !" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 2 : Avec schema number
Write-Host "[Test 2] Schema number..." -ForegroundColor Green
$body2 = @{
    prompt = "Population of France in millions"
    schema = "number"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body2 -ContentType "application/json" -ErrorAction Stop
    Write-Host "✓ Reponse recue !" -ForegroundColor Green
    Write-Host "  Value: $($response2.value)" -ForegroundColor White
    Write-Host "  Type: $($response2.value.GetType().Name)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "✗ ERREUR !" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 3 : Avec web search
Write-Host "[Test 3] Web search..." -ForegroundColor Green
$body3 = @{
    prompt = "Latest news about Microsoft"
    options = "web=true"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body3 -ContentType "application/json" -ErrorAction Stop
    Write-Host "✓ Reponse recue !" -ForegroundColor Green
    Write-Host "  Value: $($response3.value.Substring(0, [Math]::Min(100, $response3.value.Length)))..." -ForegroundColor White
    if ($response3.sources) {
        Write-Host "  Sources: $($response3.sources.Count)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "✗ ERREUR !" -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Tests termines" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si tous les tests passent, la nouvelle cle API fonctionne !" -ForegroundColor Green
Write-Host ""

Pause
