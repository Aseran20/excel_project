# Guide de Déploiement Production - BulkExcel AlgoSheet

## 🎯 Vue d'ensemble

**Ce guide vous permet de déployer BulkExcel AlgoSheet sur votre VPS Racknerd avec Coolify.**

**Durée totale**: 20-30 minutes

**Architecture finale**:
```
Internet → Cloudflare DNS → VPS Racknerd → Coolify → Docker Containers
                                              ├── Backend (api.bulkexcel.arclen.app)
                                              └── Frontend (app.bulkexcel.arclen.app)
```

## 📋 Prérequis

### Ce qui est déjà fait ✅

- [x] DNS Cloudflare configuré (DNS Only - gray cloud)
  - `api.bulkexcel.arclen.app → 192.3.81.106`
  - `app.bulkexcel.arclen.app → 192.3.81.106`
- [x] Images Docker Hub publiées
  - `aseran20/algosheet-backend:1.0.1`
  - `aseran20/algosheet-frontend:1.0.1`
- [x] Code backend/frontend mis à jour avec domaines production
- [x] CORS configuré pour production

### Ce dont vous avez besoin maintenant

- **VPS SSH**: `ssh root@192.3.81.106` (port 22)
- **Gemini API Key**: Votre clé de production
- **Litestream credentials**: Les mêmes que dev (R2)

---

## 📝 Étape 1: Connexion au VPS et vérifications

### 1.1 Connexion SSH

Ouvrez votre terminal (Git Bash, PowerShell, ou Terminal):

```bash
ssh root@192.3.81.106
```

**Vérification**: Vous devez voir quelque chose comme:
```
Welcome to Ubuntu 24.04 LTS
Last login: ...
root@vps:~#
```

### 1.2 Vérifier les specs du VPS

```bash
# Vérifier RAM disponible
free -h

# Vérifier espace disque
df -h

# Vérifier Ubuntu version
lsb_release -a
```

**Attendu**:
- RAM: ~1GB disponible
- Disk: ~25GB total, >20GB libre
- Ubuntu: 24.04 LTS

### 1.3 Mettre à jour le système

```bash
apt update && apt upgrade -y
```

**Attendez que ça finisse** (2-3 minutes). Si demandé de redémarrer des services, appuyez sur Entrée pour accepter les valeurs par défaut.

---

## 🐳 Étape 2: Installation Docker

### 2.1 Installer Docker (méthode officielle)

```bash
curl -fsSL https://get.docker.com | sh
```

**Attendez** (2-3 minutes). Vous verrez beaucoup de lignes défiler.

### 2.2 Vérifier l'installation Docker

```bash
docker --version
```

**Attendu**: `Docker version 27.x.x, build ...` (ou version supérieure)

### 2.3 Tester Docker

```bash
docker run hello-world
```

**Attendu**: Vous devez voir "Hello from Docker!" avec un message explicatif.

**Si erreur**: Attendez 30 secondes et réessayez. Docker prend parfois du temps à démarrer.

---

## ☁️ Étape 3: Installation Coolify

### 3.1 Installer Coolify (commande officielle)

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

**Attendez** (3-5 minutes). L'installation va:
1. Télécharger Coolify
2. Créer la base de données
3. Configurer les services
4. Démarrer Coolify

**Messages à surveiller**:
- ✅ "Coolify installed successfully"
- ✅ "Access Coolify at http://192.3.81.106:8080"

### 3.2 Vérifier que Coolify tourne

```bash
docker ps
```

**Attendu**: Vous devez voir plusieurs containers Coolify:
```
CONTAINER ID   IMAGE                    STATUS
abc123         coolify/coolify:latest   Up X minutes
def456         postgres:16-alpine       Up X minutes
...
```

### 3.3 Premier accès à Coolify

**Ouvrez votre navigateur** et allez sur:
```
http://192.3.81.106:8080
```

**Attendu**: Page de configuration initiale Coolify

**Note**: Le port 8080 est utilisé au lieu de 8000 (déjà occupé par un autre service sur le VPS)

**Si la page ne charge pas**:
1. Attendez 1-2 minutes (Coolify démarre lentement)
2. Vérifiez avec `docker ps` que les containers tournent
3. Vérifiez le firewall: `ufw status` (devrait être "inactive" sur un VPS neuf)

---

## 🔐 Étape 4: Configuration initiale Coolify

### 4.1 Créer le compte admin

**Sur la page web Coolify** (http://192.3.81.106:8080):

1. **Registration Form**:
   - Name: `Admin` (ou votre nom)
   - Email: Votre email
   - Password: **Choisissez un mot de passe FORT** (notez-le!)

2. Click **Register**

### 4.2 Se connecter

Utilisez l'email et le mot de passe que vous venez de créer.

**Attendu**: Vous êtes sur le Dashboard Coolify

---

## 🚀 Étape 5: Créer le projet et les services

### 5.1 Créer un nouveau projet

1. **Dashboard** → Click **+ New**
2. **Create a new Project**:
   - Project Name: `BulkExcel AlgoSheet`
   - Description: `Production deployment for BulkExcel`
3. Click **Continue**

### 5.2 Ajouter un environnement

1. **Environments** → Click **+ New**
2. **Create Environment**:
   - Name: `Production`
3. Click **Save**

---

## 🔧 Étape 6: Déployer le Backend

### 6.1 Créer le service backend

1. Dans le projet **BulkExcel AlgoSheet**
2. Click **+ New Resource**
3. Select **Docker Image**
4. **Configure**:
   - **Resource Name**: `backend`
   - **Docker Image**: `aseran20/algosheet-backend:1.0.1`
   - **Port Mappings**: `3100:3100`
   - **Domain**: `api.bulkexcel.arclen.app`

### 6.2 Configurer les variables d'environnement backend

Click **Environment Variables** → **+ Add**

Ajoutez ces variables **UNE PAR UNE**:

```bash
GEMINI_API_KEY=<votre_clé_gemini>

NODE_ENV=production

PORT=3100

LITESTREAM_BUCKET=arclen-backup

LITESTREAM_ENDPOINT=https://2e3227f02fa9490189e831839e991000.r2.cloudflarestorage.com

LITESTREAM_REGION=auto

LITESTREAM_ACCESS_KEY_ID=c37f242a61e14c1208837e510e7cdc07

LITESTREAM_SECRET_ACCESS_KEY=5c6b8828b048d791fd587792c700dda3fd9a10c3bd4acc24ff0a4847e4d6485a
```

**IMPORTANT**: Remplacez `<votre_clé_gemini>` par votre vraie clé!

### 6.3 Activer le SSL (Let's Encrypt)

1. **Settings** → **SSL/TLS**
2. **Enable SSL**: Toggle ON
3. **Certificate Type**: Let's Encrypt
4. Click **Save**

### 6.4 Déployer le backend

1. Click **Deploy** (bouton en haut à droite)
2. **Attendez** (2-3 minutes) - Vous verrez les logs défiler

**Logs attendus**:
```
✅ Pulling image aseran20/algosheet-backend:1.0.1
✅ Starting container
✅ Container started successfully
✅ Health check passed
✅ SSL certificate obtained
```

**Vérification**:
```bash
# Depuis votre terminal SSH
curl http://localhost:3100/health
```

**Attendu**: `{"status":"ok","timestamp":"2025-XX-XXTXX:XX:XX.XXXZ"}`

---

## 🎨 Étape 7: Déployer le Frontend

### 7.1 Créer le service frontend

1. **Retour au projet** → Click **+ New Resource**
2. Select **Docker Image**
3. **Configure**:
   - **Resource Name**: `frontend`
   - **Docker Image**: `aseran20/algosheet-frontend:1.0.1`
   - **Port Mappings**: `80:80`
   - **Domain**: `app.bulkexcel.arclen.app`

### 7.2 Activer le SSL

1. **Settings** → **SSL/TLS**
2. **Enable SSL**: Toggle ON
3. **Certificate Type**: Let's Encrypt
4. Click **Save**

### 7.3 Déployer le frontend

1. Click **Deploy**
2. **Attendez** (1-2 minutes)

**Logs attendus**:
```
✅ Pulling image aseran20/algosheet-frontend:1.0.1
✅ Starting container
✅ Container started successfully
✅ Health check passed
✅ SSL certificate obtained
```

---

## ✅ Étape 8: Tests de validation

### 8.1 Tester le backend

**Depuis votre PC** (pas le VPS):

```bash
curl https://api.bulkexcel.arclen.app/health
```

**Attendu**: `{"status":"ok","timestamp":"..."}`

**Si erreur**:
- Vérifier que DNS est propagé: `nslookup api.bulkexcel.arclen.app`
- Attendre 1-2 minutes pour le SSL
- Vérifier logs Coolify

### 8.2 Tester le frontend

**Ouvrez votre navigateur**:
```
https://app.bulkexcel.arclen.app
```

**Attendu**: Vous voyez l'interface Excel Add-in (taskpane HTML)

**Si page blanche**:
- F12 → Console → Vérifier les erreurs
- Vérifier que le backend répond (test 8.1)

### 8.3 Tester la communication frontend → backend

**Console navigateur** (F12):
```javascript
fetch('https://api.bulkexcel.arclen.app/health').then(r => r.json()).then(console.log)
```

**Attendu**: `{status: "ok", timestamp: "..."}`

**Si erreur CORS**:
- Vérifier que le frontend est sur `app.bulkexcel.arclen.app` (pas une autre URL)
- Vérifier les logs backend pour voir les requêtes CORS

### 8.4 Vérifier Litestream (backups R2)

**SSH sur le VPS**:
```bash
docker logs <backend_container_id> | grep -i litestream
```

**Attendu**:
```
✅ Litestream configured - Backup replication enabled
✅ Litestream replication started
```

**Vérifier dans Cloudflare R2**:
- Dashboard → R2 → Bucket `arclen-backup`
- Vous devez voir: `algosheet/cache.db` avec des snapshots récents

---

## 🎉 Étape 9: Post-déploiement

### 9.1 URLs de production

Notez ces URLs quelque part:

```
Frontend:  https://app.bulkexcel.arclen.app
Backend:   https://api.bulkexcel.arclen.app
Coolify:   http://192.3.81.106:8080
```

### 9.2 Monitoring

**Coolify Dashboard**:
- Resources → backend → **Metrics** (CPU, RAM, Logs)
- Resources → frontend → **Metrics**

**Healthchecks automatiques**:
- Backend: Vérifié toutes les 30 secondes
- Si down → Coolify redémarre automatiquement

### 9.3 Backup quotidien

**Vérifier Litestream**:
```bash
# SSH sur VPS
docker exec <backend_container> litestream snapshots /app/cache.db
```

**Attendu**: Liste des snapshots avec timestamps

---

## 🔄 Mises à jour futures

### Pour mettre à jour le backend ou frontend:

1. **Build et push nouvelle version**:
```bash
# Local
docker-compose build
docker tag excel_project-backend:latest aseran20/algosheet-backend:1.0.2
docker push aseran20/algosheet-backend:1.0.2
```

2. **Update dans Coolify**:
   - Resources → backend → Settings
   - Change image tag: `1.0.1` → `1.0.2`
   - Click **Redeploy**

**Downtime**: 10-30 secondes (le temps de pull + restart)

---

## 🚨 Troubleshooting

### Problème: "Cannot connect to backend"

**Vérifications**:
```bash
# 1. Backend tourne?
docker ps | grep backend

# 2. Backend répond?
curl http://localhost:3100/health

# 3. SSL OK?
curl -I https://api.bulkexcel.arclen.app

# 4. Logs backend
docker logs <container_id>
```

**Solution commune**: Redémarrer le container Coolify → Resources → backend → Restart

### Problème: "SSL Certificate error"

**Cause**: Let's Encrypt rate limit ou DNS pas propagé

**Solution**:
1. Attendre 5 minutes (SSL prend du temps)
2. Vérifier DNS: `nslookup api.bulkexcel.arclen.app`
3. Si DNS incorrect → Attendre propagation (jusqu'à 1h max)
4. Coolify → Settings → SSL → **Force Renew Certificate**

### Problème: "CORS error in browser"

**Vérifier**:
```bash
# Backend logs
docker logs <backend_id> | grep CORS
```

**Si vous voyez**: `[CORS] Blocked request from origin: https://autre-domaine.com`

**Solution**: Le frontend n'est pas sur `app.bulkexcel.arclen.app`. Vérifiez l'URL dans votre navigateur.

### Problème: "Out of memory" (VPS)

**Vérifier**:
```bash
free -h
docker stats
```

**Si RAM > 90%**:
1. Redémarrer les services: `docker restart <container_id>`
2. **Solution permanente**: Upgrade VPS vers 2GB RAM

### Problème: "Litestream not replicating"

**Vérifier**:
```bash
docker exec <backend_id> litestream version
docker logs <backend_id> | grep -i litestream
```

**Vérifier R2 credentials**:
- Coolify → backend → Environment Variables
- Vérifier que toutes les variables LITESTREAM_* sont présentes

---

## 📊 Métriques de performance attendues

**Backend**:
- RAM usage: 150-200MB
- CPU idle: 1-5%
- Startup time: 10-15 secondes
- Health check response: <100ms

**Frontend**:
- RAM usage: 20-50MB
- CPU idle: <1%
- Startup time: 2-3 secondes
- Page load: <500ms

**Total VPS**:
- RAM usage: ~500MB (50% avec 1GB)
- Disk usage: ~5GB (20% avec 25GB)

---

## 🔐 Sécurité

### Recommandations immédiates:

1. **Firewall**: Coolify configure automatiquement iptables
2. **SSL**: Let's Encrypt auto-renew (tous les 60 jours)
3. **Updates**: `apt update && apt upgrade` tous les mois

### Recommandations futures:

1. **Fail2ban**: Protection anti-brute-force SSH
2. **Cloudflare Proxy**: Activer le proxy orange (cache + DDoS)
3. **Backups VPS**: Snapshots Racknerd manuels

---

## 📞 Support

**Si problème persistant**:

1. **Logs Coolify**: Coolify UI → Resources → Logs
2. **Logs Docker**: `docker logs <container_id>`
3. **System logs**: `journalctl -xe`

**Copier-coller les erreurs** pour debug.

---

## ✅ Checklist finale

Après déploiement, vérifiez:

- [ ] Backend répond: `curl https://api.bulkexcel.arclen.app/health`
- [ ] Frontend charge: Ouvrir `https://app.bulkexcel.arclen.app`
- [ ] SSL valide: Cadenas vert dans le navigateur
- [ ] CORS fonctionne: Console navigateur sans erreurs
- [ ] Litestream active: Logs montrent "replication enabled"
- [ ] R2 backups: Fichiers visibles dans Cloudflare R2
- [ ] Healthchecks OK: Coolify dashboard montre "healthy"

---

## 🎊 Prochaines étapes (optionnel)

**Phase 2 - Optimisations** (à faire plus tard):

1. **Activer Cloudflare Proxy** (orange cloud):
   - Cache CDN pour frontend
   - IP VPS cachée
   - DDoS protection gratuit

2. **Monitoring externe**:
   - UptimeRobot (gratuit) pour alertes downtime
   - Sentry pour tracking erreurs frontend

3. **CI/CD**:
   - GitHub Actions auto-deploy sur push
   - Tests automatiques avant deploy

**Mais pour l'instant, vous avez une app en production qui fonctionne! 🚀**

---

**Guide créé le**: 2025-12-10
**Version**: 1.0.1
**Architecture**: VPS Racknerd + Coolify + Docker Hub + Cloudflare DNS
