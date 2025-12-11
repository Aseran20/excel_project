📋 Phase 1 : Restructuration en Monorepo (Le squelette)
Objectif : Nettoyer la racine et lier proprement le front et le back.

Prompt pour l'Agent : "Nous allons transformer ce projet en un Monorepo propre utilisant NPM Workspaces.

Structure de dossiers :

Crée un dossier apps/.

Déplace le dossier backend actuel vers apps/backend.

Déplace le dossier excel-addin-new vers apps/frontend.

Crée un dossier packages/shared pour le code partagé.

Crée un dossier _archive à la racine et déplace-y tous les vieux scripts (.bat, .ps1), les dossiers .archive et docs/old.

Configuration Racine :

Crée un package.json à la racine qui définit les workspaces : ["apps/*", "packages/*"].

Configure un tsconfig.json racine avec des références vers les workspaces.

Package Shared :

Initialise packages/shared avec son propre package.json (nom: @project/shared).

Déplace les types de backend/src/types/algosheet.ts et shared/ ici.

Fais en sorte que apps/backend et apps/frontend aient @project/shared dans leurs dépendances."

💾 Phase 2 : Persistance & Logique Cache (Le cerveau)
Objectif : Configurer SQLite pour 30 jours et préparer le backup temps réel.

Prompt pour l'Agent : "Focus sur apps/backend. Nous devons sécuriser le cache SQLite.

Mise à jour Retention : Ouvre src/services/sqliteCache.ts (ou équivalent). Trouve la logique de nettoyage. Change la durée de conservation de 7 jours à 30 jours. Ajoute une constante explicite CACHE_RETENTION_DAYS = 30.

Sécurisation Données :

Nous allons utiliser Litestream pour la réplication.

Crée un fichier litestream.yml dans apps/backend/.

Configure-le pour répliquer le fichier audit.db vers un bucket S3 (utilise des variables d'environnement LITESTREAM_ACCESS_KEY_ID, etc. pour les secrets, ne mets rien en dur).

Validation Env :rese

Installe zod et dotenv dans le backend.

Crée src/config/env.ts qui valide strictement toutes les variables (y compris celles de Litestream et la clé Gemini). L'app doit crasher au démarrage si une clé manque."

🔌 Phase 3 : Migration API vers tRPC (Le système nerveux)
Objectif : Remplacer l'API REST fragile par tRPC (TypeScript complet de bout en bout).

Prompt pour l'Agent : "Nous migrons de REST vers tRPC.

Backend (Installation) :

Installe @trpc/server et zod dans apps/backend.

Crée src/trpc.ts pour initialiser tRPC.

Crée un routeur src/routers/appRouter.ts. Migre la logique de routes/algosheet.ts dans ce routeur tRPC (transforme les endpoints REST en procédures tRPC publicProcedure).

Expose le middleware tRPC express dans src/index.ts et supprime les anciennes routes REST manuelles une fois migrées.

Exporte le type AppRouter.

Frontend (Consommation) :

Installe @trpc/client, @trpc/react-query, @tanstack/react-query dans apps/frontend.

Configure le TrpcProvider dans App.tsx.

Remplace les appels fetch() dans tes services par les hooks tRPC (ex: trpc.algosheet.analyze.useMutation).

Vérifie que les types sont bien inférés depuis le backend (plus besoin d'interfaces manuelles pour les réponses API)."

🐳 Phase 4 : Dockerisation & Déploiement (Le vaisseau)
Objectif : Préparer le déploiement Coolify avec backup.

Prompt pour l'Agent : "Prépare les conteneurs pour le déploiement.

Dockerfile Backend :

Crée apps/backend/Dockerfile. Utilise une image Node légère.

Ajoute les instructions pour télécharger et installer le binaire Litestream dans l'image.

Le CMD final doit lancer un script shell run.sh qui démarre Litestream en arrière-plan (litestream replicate -exec "node dist/index.js") pour que la base soit restaurée/sauvegardée automatiquement.

Dockerfile Frontend :

Crée apps/frontend/Dockerfile. Build l'app React (Vite) et sers les fichiers statiques avec un serveur léger (nginx ou serve).

Docker Compose Racine :

Crée un docker-compose.yml à la racine du monorepo.

Il doit builder les deux services.

Pour le backend, monte un volume persistant pour SQLite."

🛠️ Phase 5 : Qualité & Tooling (La police)
Objectif : Empêcher le code sale.

Prompt pour l'Agent : "Finalisation de la qualité du code.

Installe @biomejs/biome à la racine du monorepo.

Crée un fichier biome.json configuré pour le formatage et le linting.

Installe husky et ajoute un hook pre-commit qui lance biome check --apply sur les fichiers modifiés.

Crée un fichier PROJECT_CONTEXT.md à la racine qui documente cette nouvelle architecture (Monorepo, tRPC, Litestream) pour les futures sessions."

💡 Conseil Stratégique pour toi (User)
Cette migration est conséquente.

Commence par la Phase 1 ce soir. Vérifie que le npm install fonctionne à la racine.

Ensuite, fais la Phase 2.

La Phase 3 (tRPC) est la plus longue. Si l'Agent bloque, dis-lui de faire endpoint par endpoint (d'abord gemini, puis algosheet).

Pour Litestream (le backup), tu auras besoin d'un stockage "S3 compatible". Je te recommande Cloudflare R2 (c'est gratuit jusqu'à 10Go et c'est très rapide). L'agent saura générer la config pour R2 si tu lui demandes.