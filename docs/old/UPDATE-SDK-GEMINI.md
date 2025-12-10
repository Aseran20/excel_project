# Mise à jour du SDK @google/genai (correction vulnérabilité)

## ⚠️ Contexte

La version actuelle `@google/genai 0.3.0` a une **vulnérabilité de sécurité** (exposition d'informations sensibles).

Source : https://intel.aikido.dev/packages/npm/@google%2Fgenai

Versions concernées : `0.3.0` à `1.9.0`

## 🎯 Objectif

Passer de `0.3.0` à `1.10.0+` (dernière version stable et sécurisée)

---

## 📋 Étape 1 : Mise à jour locale (sur Windows)

### 1.1 Modifier package.json

```bash
cd c:\Users\AdrianTurion\devprojects\excel_project\backend
```

Ouvrez `backend/package.json` et changez :
```json
"dependencies": {
    "@google/genai": "^0.3.0",
    ...
}
```

En :
```json
"dependencies": {
    "@google/genai": "^1.10.0",
    ...
}
```

### 1.2 Installer la nouvelle version

```bash
cd backend
npm install
```

### 1.3 Vérifier la version installée

```bash
npm list @google/genai
```

Devrait afficher : `@google/genai@1.10.x`

---

## 🔍 Étape 2 : Vérifier la compatibilité du code

### 2.1 Vérifier les breaking changes

D'après la documentation Gemini, le SDK 1.x utilise la même API que 0.3.0 pour :
- `GoogleGenAI({ apiKey })`
- `models.generateContent()`
- `responseMimeType`, `responseSchema`, `tools`

**Notre code devrait fonctionner sans modification.**

### 2.2 Tester localement

Lancez le backend local pour tester :

```bash
cd backend
npm run dev
```

Dans un autre terminal, testez l'API :

```bash
curl -X POST "http://localhost:3100/algosheet" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"Test after SDK update\"}"
```

Si vous obtenez une réponse JSON avec `"value"`, c'est bon ! ✅

### 2.3 Vérifier les logs

Regardez dans le terminal du backend s'il y a des warnings ou erreurs liés au SDK.

---

## 🏗️ Étape 3 : Recompiler TypeScript

```bash
cd backend
npm run build
```

Vérifiez qu'il n'y a pas d'erreurs de compilation.

---

## 📦 Étape 4 : Commit et push sur GitHub

```bash
cd c:\Users\AdrianTurion\devprojects\excel_project

git add backend/package.json backend/package-lock.json
git commit -m "Security: Update @google/genai to 1.10.0 (fix vulnerability)"
git push
```

---

## 🚀 Étape 5 : Déployer sur le VPS

### 5.1 Connexion SSH

```bash
ssh root@192.3.81.106
```

### 5.2 Pull des changements

```bash
cd /var/www/algosheet
git pull
```

### 5.3 Installer la nouvelle version du SDK

```bash
cd backend
npm install
```

Cela va installer `@google/genai@1.10.0` sur le VPS.

### 5.4 Recompiler TypeScript

```bash
npm run build
```

### 5.5 Redémarrer PM2

```bash
pm2 restart algosheet-backend
```

### 5.6 Vérifier les logs

```bash
pm2 logs algosheet-backend --lines 30
```

Cherchez :
- ✅ `Server listening on http://localhost:3100`
- ✅ `GEMINI_API_KEY: Set (39 chars)`
- ❌ Pas d'erreurs de module ou de dépendances

---

## ✅ Étape 6 : Test de production

### Depuis le VPS

```bash
curl -X POST http://localhost:3100/algosheet \
  -H "Content-Type: application/json" \
  -d '{"prompt":"SDK update test"}'
```

### Depuis Windows

Double-cliquez sur `test-api-simple.bat` ou :

```bash
curl -X POST "https://algosheet.auraia.ch/api/algosheet" ^
  -H "Content-Type: application/json" ^
  -d "{\"prompt\":\"SDK 1.10 production test\"}"
```

Si vous obtenez une réponse JSON avec `"value"`, **c'est terminé** ! 🎉

---

## 🆘 En cas de problème

### Problème 1 : Erreur "Cannot find module @google/genai"

```bash
# Sur le VPS
cd /var/www/algosheet/backend
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart algosheet-backend
```

### Problème 2 : Erreur TypeScript "Property 'xyz' does not exist"

Si le SDK 1.10 a changé des interfaces TypeScript :

```bash
# Vérifiez la doc officielle
# https://ai.google.dev/gemini-api/docs/get-started/node

# Adaptez le code si nécessaire (peu probable)
```

### Problème 3 : L'API ne répond plus

```bash
# Revenez à l'ancienne version temporairement
cd /var/www/algosheet/backend
git checkout HEAD~1 backend/package.json
npm install
npm run build
pm2 restart algosheet-backend

# Puis ouvrez un ticket sur GitHub @google/genai
```

---

## 📊 Vérification finale

### Checklist de déploiement

- [ ] `package.json` mis à jour avec `"@google/genai": "^1.10.0"`
- [ ] `npm install` exécuté localement (Windows)
- [ ] Tests locaux réussis (`npm run dev` + curl)
- [ ] Compilation TypeScript réussie (`npm run build`)
- [ ] Commit poussé sur GitHub
- [ ] `git pull` sur le VPS
- [ ] `npm install` sur le VPS
- [ ] `npm run build` sur le VPS
- [ ] `pm2 restart algosheet-backend`
- [ ] Tests production réussis (curl depuis VPS et Windows)
- [ ] Pas d'erreurs dans `pm2 logs`

### Vérification de la version installée

Sur le VPS :
```bash
cd /var/www/algosheet/backend
npm list @google/genai
```

Devrait afficher : `@google/genai@1.10.x` ✅

---

## 💡 Bonus : Activer les mises à jour automatiques

Pour éviter ce genre de problème à l'avenir, vous pouvez :

### Option 1 : Dependabot (GitHub)

Créez `.github/dependabot.yml` :
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

### Option 2 : npm-check-updates

```bash
# Installer globalement
npm install -g npm-check-updates

# Vérifier les mises à jour
cd backend
ncu

# Mettre à jour package.json
ncu -u

# Installer
npm install
```

---

## 📚 Ressources

- Documentation officielle Gemini Node.js : https://ai.google.dev/gemini-api/docs/get-started/node
- Changelog @google/genai : https://github.com/google/generative-ai-js/releases
- Vulnérabilité détectée : https://intel.aikido.dev/packages/npm/@google%2Fgenai

---

**Une fois terminé, votre add-in Excel sera plus sécurisé et utilisera le modèle gemini-2.5-flash plus rapide et moins cher ! 🚀**
