# Fix: Web Search + JSON avec gemini-2.5-flash

## 🐛 Problème

`gemini-2.5-flash` ne supporte pas l'utilisation simultanée de :
- `tools: [{ googleSearch: {} }]` (Web Search)
- `responseMimeType: "application/json"` (JSON strict)

Erreur obtenue :
```
Tool use with a response mime type: 'application/json' is unsupported
```

## ✅ Solution implémentée

### **Approche à deux branches**

#### **Branche 1 : web=false (JSON strict)**
```typescript
config = {
    systemInstruction: "...",
    responseMimeType: "application/json",  // ✅ JSON strict
    responseSchema: responseSchema          // ✅ Schéma forcé
    // Pas de tools
}
```

- JSON strictement respecté par le modèle
- Parsing fiable à 100%
- Pas de recherche web

#### **Branche 2 : web=true (JSON soft + Web Search)**
```typescript
config = {
    systemInstruction: systemInstruction +
        "\n\nIMPORTANT: You MUST respond with ONLY a valid JSON object matching this exact schema. " +
        "No additional text, no markdown formatting, just the raw JSON:\n" +
        JSON.stringify(responseSchema, null, 2),
    tools: [{ googleSearch: {} }]          // ✅ Web Search activé
    // Pas de responseMimeType
}
```

- Web Search activé
- JSON demandé via prompt (soft enforcement)
- Parsing défensif avec extraction du JSON depuis la prose si nécessaire

## 🔧 Améliorations du parsing

### **Extraction défensive du JSON**

En mode `web=true`, si le modèle ajoute du texte autour du JSON, on extrait le JSON :

```typescript
// Si le texte ne commence pas par { ou [, chercher le JSON dedans
if (options.web && !cleanedText.startsWith('{') && !cleanedText.startsWith('[')) {
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
        cleanedText = jsonMatch[0];
        console.log('🔍 Extracted JSON from prose response');
    }
}
```

### **Meilleurs messages d'erreur**

Si le parsing échoue :
```typescript
return {
    value: text || "No response",
    reasoning: options.web
        ? "Response could not be parsed as JSON (web search mode)"
        : "Invalid JSON response",
    confidence: null,
    sources: []
};
```

## 📊 Logs améliorés

Nouveaux logs pour diagnostiquer :
```
🔧 Mode: Web Search (JSON soft)        // ou "JSON strict"
🔍 Extracted JSON from prose response  // Si extraction nécessaire
```

## 🧪 Tests recommandés

### Test 1 : Sans web search (JSON strict)
```bash
curl -X POST "https://algosheet.auraia.ch/api/algosheet" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is 2+2?","schema":"number"}'
```

Attendu :
```json
{
  "value": 4,
  "reasoning": "...",
  "confidence": 1,
  "sources": []
}
```

### Test 2 : Avec web search (JSON soft)
```bash
curl -X POST "https://algosheet.auraia.ch/api/algosheet" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Latest stock price of Apple","schema":"number","options":"web=true"}'
```

Attendu :
```json
{
  "value": 123.45,
  "reasoning": "Based on recent search results...",
  "confidence": 0.9,
  "sources": [
    {"url": "...", "title": "...", "snippet": "..."}
  ]
}
```

### Test 3 : Multi-field avec web
```bash
curl -X POST "https://algosheet.auraia.ch/api/algosheet" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Company info for Microsoft","schema":"multi(revenue,employees,founded)","options":"web=true"}'
```

Attendu :
```json
{
  "value": {
    "revenue": "211 billion USD",
    "employees": "221,000",
    "founded": "1975"
  },
  "reasoning": "...",
  "confidence": 0.95,
  "sources": [...]
}
```

## 🚀 Déploiement

### Étape 1 : Test local
```bash
cd backend
npm run build
npm run dev

# Dans un autre terminal
curl -X POST "http://localhost:3100/algosheet" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test","options":"web=true"}'
```

### Étape 2 : Commit
```bash
git add backend/src/services/gemini.ts
git commit -m "Fix: Handle gemini-2.5-flash web search + JSON limitation"
git push
```

### Étape 3 : Déploiement VPS
```bash
ssh root@192.3.81.106
cd /var/www/algosheet
git pull
cd backend
npm run build
pm2 restart algosheet-backend
pm2 logs algosheet-backend --lines 30
```

### Étape 4 : Tests production
Utilisez `test-api-simple.bat` avec différentes options.

## 📋 Checklist de validation

- [ ] Test local sans web search (JSON strict) : ✅ JSON valide
- [ ] Test local avec web search : ✅ JSON extrait, sources présentes
- [ ] Logs montrent "Web Search (JSON soft)" ou "JSON strict"
- [ ] Code compilé sans erreurs TypeScript
- [ ] Déployé sur VPS
- [ ] Tests production réussis
- [ ] PM2 logs ne montrent pas d'erreurs "Tool use with response mime type"

## 💡 Notes importantes

### Quand utiliser web=true ?
- Données en temps réel (cours de bourse, news récentes)
- Informations qui changent fréquemment
- Vérification de faits actuels

### Quand utiliser web=false ?
- Calculs mathématiques
- Questions sur des faits établis
- Extraction de données structurées depuis le prompt
- Meilleure performance (cache + rapidité)

### Compromis
- **web=false** : JSON 100% fiable, pas de recherche web, plus rapide
- **web=true** : Données actuelles, JSON ~95% fiable (parsing défensif), un peu plus lent

## 🔍 Debug

Si vous avez des erreurs :

```bash
# Sur le VPS, vérifiez les logs complets
pm2 logs algosheet-backend --lines 100 | grep -A5 -B5 "Error"

# Vérifiez le mode utilisé
pm2 logs algosheet-backend --lines 50 | grep "Mode:"

# Vérifiez si l'extraction JSON a fonctionné
pm2 logs algosheet-backend --lines 50 | grep "Extracted JSON"
```

Si un appel échoue systématiquement, ajoutez plus de contexte dans le system instruction pour guider le modèle vers le format JSON attendu.
