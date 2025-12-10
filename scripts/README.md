# Scripts

Collection of utility scripts for development and testing.

## 🧪 Testing Scripts

### `test-api-simple.bat`
Simple API endpoint test for the backend.
```bash
./test-api-simple.bat
```

### `test-local.bat`
Test local backend with both modes (with/without web search).
```bash
./test-local.bat
```

### `test-web-search-fix.bat`
Test the web search + JSON fix after gemini-2.5-flash migration.
```bash
./test-web-search-fix.bat
```

### `test-api-vps.ps1`
Test the production VPS deployment.
```powershell
.\test-api-vps.ps1
```

## 🔧 Maintenance Scripts

### `update-sdk.bat`
Update the Google Gemini SDK to latest version.
```bash
./update-sdk.bat
```

### `verifier-modele.bat`
Verify the current model configuration in backend.
```bash
./verifier-modele.bat
```

## 🎨 Asset Scripts

### `resize_icons.ps1`
Resize icons for the Excel add-in.
```powershell
.\resize_icons.ps1
```

---

**Note:** Windows batch files (.bat) work in CMD, PowerShell scripts (.ps1) require PowerShell.
