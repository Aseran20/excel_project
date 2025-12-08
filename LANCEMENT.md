# Guide de Lancement - AlgoSheet Add-in Excel

## 🚀 Lancement Rapide sur Excel Desktop

### Étape 1 : Démarrer le serveur frontend (Terminal 1)

```bash
cd excel-addin-new
npm run dev-server
```

Attendez que le message suivant apparaisse :
```
webpack compiled successfully
Server running at https://localhost:3000/
```

### Étape 2 : Démarrer le serveur backend (Terminal 2)

```bash
cd backend
npm run dev
```

Attendez que le message suivant apparaisse :
```
Server listening on https://localhost:3100
```

### Étape 3 : Lancer Excel avec l'add-in (Terminal 3)

```bash
cd excel-addin-new
npm start
```

Cette commande va :
1. Builder l'add-in
2. Ouvrir Excel Desktop automatiquement
3. Charger l'add-in AlgoSheet dans Excel

### Étape 4 : Tester l'add-in dans Excel

Une fois Excel ouvert :
1. Allez dans l'onglet **Accueil** (Home)
2. Cherchez le groupe **AlgoSheet** dans le ruban
3. Cliquez sur **Open AlgoSheet** pour ouvrir le panneau latéral

### Utiliser la fonction ALGOSHEET

Dans une cellule Excel, tapez :
```excel
=ALGOSHEET("What is the capital of France?")
```

Ou avec plus d'options :
```excel
=ALGOSHEET("Revenue of Apple Inc", "structured", "number", "web=true")
```

## 🛑 Arrêter l'add-in

Dans le terminal 3 (où vous avez lancé `npm start`), utilisez :
```bash
npm stop
```

Ou depuis n'importe quel terminal dans le dossier `excel-addin-new` :
```bash
cd excel-addin-new
npm stop
```

## 🔧 Commandes Utiles

### Valider le manifest
```bash
cd excel-addin-new
npm run validate
```

### Rebuilder après modifications
```bash
cd excel-addin-new
npm run build:dev
```

### Watch mode (rebuild automatique)
```bash
cd excel-addin-new
npm run watch
```

## ❗ Résolution de Problèmes

### Excel n'affiche pas l'add-in
1. Vérifiez que le dev-server tourne sur https://localhost:3000
2. Vérifiez que le backend tourne sur https://localhost:3100
3. Fermez complètement Excel et relancez `npm start`
4. Vérifiez les certificats : `npx office-addin-dev-certs verify`

### La fonction ALGOSHEET retourne une erreur
1. Ouvrez le panneau latéral AlgoSheet pour voir les logs
2. Vérifiez que le backend est accessible : ouvrez https://localhost:3100/ dans votre navigateur
3. Vérifiez les logs dans le terminal backend

### Port 3000 déjà utilisé
```bash
# Trouvez le processus qui utilise le port 3000
netstat -ano | findstr :3000
# Tuez le processus (remplacez PID par le numéro de processus)
taskkill /PID <PID> /F
```

### Port 3100 déjà utilisé
```bash
# Trouvez le processus qui utilise le port 3100
netstat -ano | findstr :3100
# Tuez le processus
taskkill /PID <PID> /F
```

## 📝 Note

Les certificats HTTPS sont déjà installés dans :
- `C:\Users\AdrianTurion\.office-addin-dev-certs\localhost.crt`
- `C:\Users\AdrianTurion\.office-addin-dev-certs\localhost.key`
