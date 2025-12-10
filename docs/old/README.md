# Documentation

Project documentation and guides.

## 📚 Available Documents

### [roadmap.md](roadmap.md)
Feature roadmap and future improvements for AlgoSheet.

**Contents:**
- Clean le folder de code ou mieux reclasser surtout le main branch pour moi visuellement ✅
- Si en cours de run et que je relance la formule, que ca fasse pas de nouveau call API mais que ca attende la réponse d'avant ✅
- Mieux manager quand j'ai beaucoup de cells a générer (ex buyers list = 170 acheteurs x 7 colonnes) ✅
- Gérer les erreurs quand certains run ne marchent pas sur excel avec algosheets
- Exemple : Systeme dans le front qui montre la queue en temps réel ✅
- Quand jen lance beaucoup, y'en a qui reste en busy pendant beaucoup de min

### [FIX-WEB-SEARCH.md](FIX-WEB-SEARCH.md)
Documentation about the gemini-2.5-flash web search + JSON limitation and solution.

**Key points:**
- Problem: Tool use with `responseMimeType: 'application/json'` is unsupported
- Solution: Two-branch configuration (web search vs strict JSON)
- Implementation details and test cases

### [UPDATE-SDK-GEMINI.md](UPDATE-SDK-GEMINI.md)
Guide for updating the Google Gemini SDK.

**Covers:**
- Migration from gemini-3-pro-preview to gemini-2.5-flash
- SDK update from @google/genai 0.3.0 to 1.10.0
- Breaking changes and compatibility notes

### [UPDATE-VPS.md](UPDATE-VPS.md)
VPS deployment and update instructions.

**Contents:**
- SSH access to VPS (192.3.81.106)
- PM2 process management
- Environment variable configuration
- Deployment workflow

### [LANCEMENT.md](LANCEMENT.md)
Launch and startup guide for development.

**Instructions:**
- Starting the backend server
- Launching the Excel add-in
- Testing in Excel Desktop and Web

---

## 🔗 Quick Links

- [Main README](../README.md)
- [Backend README](../backend/README.md)
- [Excel Add-in README](../excel-addin-new/README.md)
- [Scripts](../scripts/README.md)

---

**Last updated:** December 2024
