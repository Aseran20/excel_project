# AlgoSheet – Implementation Guide for Codex

This document décrit ce que tu dois coder pour livrer un premier MVP fonctionnel d'AlgoSheet.

AlgoSheet est un add-in Excel qui permet à un analyste M&A d'appeler un modèle IA (Gemini 3) via une fonction Excel générique pour enrichir des listes d'entreprises (FTE estimés, indépendance, etc.), avec possibilité d'activer un mode websearch et de récupérer les sources.

---

## 1. Architecture générale

### 1.1 Composants

Tu dois mettre en place trois blocs principaux

- Excel (fichiers utilisateurs)  
  Utilisation de formules personnalisées `ALGOSHEET` et `ALGOSHEET_PARSE`

- Add-in Excel  
  Implémenté en TypeScript avec Office.js (custom functions)  
  Rôle  
  - exposer les fonctions Excel  
  - envoyer les requêtes au backend  
  - parser certains résultats JSON côté client (pour `ALGOSHEET_PARSE`)

- Backend HTTP  
  Implémenté en Node.js + TypeScript, avec Fastify (ou Express)  
  Rôle  
  - exposer un endpoint `POST /algosheet`  
  - appeler l'API Gemini 3 selon le guide disponible dans le fichier `/mnt/data/gemini_3_api_guide.md`  
  - gérer le websearch (via tools Gemini)  
  - structurer les réponses au format JSON que l'add-in exploite

### 1.2 Stack technique

- Langage principal  
  - TypeScript sur l'ensemble du projet

- Backend  
  - Node  
  - Framework  
    - Fastify recommandé (Express acceptable si plus simple pour toi)  
  - Client HTTP pour Gemini  
    - soit client officiel Gemini pour Node  
    - soit `fetch` ou `axios` si nécessaire

- Add-in Excel  
  - Office.js  
  - Custom functions  
  - UI optionnelle en React pour un taskpane simple

- Gestion de la configuration  
  - Variables d'environnement pour les secrets, notamment la clé API Gemini

---

## 2. Structure de projet

Utilise un monorepo simple avec deux packages principaux

```text
algosheet/
  package.json

  backend/
    package.json
    src/
      index.ts
      routes/
        algosheet.ts
      services/
        gemini.ts
        prompt.ts
      types/
        algosheet.ts
    .env        (non versionné, GEMINI_API_KEY etc.)

  excel-addin/
    package.json
    manifest.xml
    src/
      functions/
        index.ts
      taskpane/
        App.tsx
      utils/
        jsonParse.ts
        http.ts
```

Contraintes

- Le backend se lance indépendamment de l'add-in  
- L'add-in suppose le backend disponible sur un host configurable (par défaut `http://localhost:3000`)

---

## 3. API fonctionnelle côté Excel

Deux fonctions Excel sont exposées

1. `ALGOSHEET`  
   - Fonction asynchrone  
   - Appelle le backend  
   - Retourne un texte JSON dans la cellule (colonne technique) ou un message d'erreur simple

2. `ALGOSHEET_PARSE`  
   - Fonction synchrone  
   - Ne fait pas d'appel réseau  
   - Parse le JSON généré par `ALGOSHEET`  
   - Extrait des champs spécifiques pour les cellules métier (valeur, sources, etc.)

### 3.1 Signature de ALGOSHEET

Signature Excel

```excel
=ALGOSHEET(Prompt, [ResponseMode], [Schema], [Options])
```

Paramètres

- `Prompt`  
  Type  texte  
  Contenu  consignes métier, généralement construites à partir de cellules (concaténation). Exemple  
  `"Tu es un analyste M&A. Donne un entier pour le nombre d'employés de l'entreprise " & A2 & " basée en " & B2 & "."`

- `ResponseMode` (optionnel)  
  Type  texte  
  Valeurs supportées  
  - `"free"`  réponse libre, texte naturel  
  - `"structured"`  réponse structurée conforme à `Schema`  
  Défaut  `"free"`

- `Schema` (optionnel, utilisé si `ResponseMode = "structured"`)  
  Type  texte  
  Valeurs supportées en V1  
  - `"number"`  valeur numérique  
  - `"text"`  valeur texte  
  - `"enum(option1,option2,option3)"`  valeur texte appartenant à la liste fournie  
  Défaut  `"text"` si `ResponseMode = "structured"` et que ce paramètre est vide

- `Options` (optionnel)  
  Type  texte, liste de paires clé=valeur séparées par point-virgule  
  Format  `"key1=value1;key2=value2"`  
  Clés supportées en V1  
  - `web`  `true` ou `false` (active ou non le websearch)  
  - `sources`  `true` ou `false` (demande ou non le détail des sources)  
  - `lang`  langue dans laquelle l'IA doit répondre (`"fr"`, `"en"`, etc.)  
  Défauts  
  - `web=false`  
  - `sources=false`  
  - `lang=fr`

Comportement attendu

- La fonction envoie une requête JSON au backend avec ces paramètres  
- Si succès  
  - la cellule reçoit un texte qui est le JSON renvoyé par le backend (voir format plus bas)  
- Si erreur réseau ou backend  
  - la cellule reçoit un texte du type `"ALGOSHEET_ERROR: <message>"`  
  - tu peux éventuellement renvoyer un code d'erreur spécifique, mais garde un format humainement lisible

Exemples d'utilisation

- Estimation FTE avec websearch et sources

```excel
=ALGOSHEET(C2; "structured"; "number"; "web=true;sources=true")
```

- Classification indépendance / groupe / fonds PE

```excel
=ALGOSHEET(C2; "structured"; "enum(Indépendant,Groupe,Fonds PE)"; "web=true;sources=true")
```

- Description libre d'activité

```excel
=ALGOSHEET(C2; "free"; ""; "web=true")
```

### 3.2 Signature de ALGOSHEET_PARSE

Signature Excel

```excel
=ALGOSHEET_PARSE(JsonText, Field)
```

Paramètres

- `JsonText`  
  Texte contenant un JSON produit par `ALGOSHEET` (supposé valide)  

- `Field`  
  Texte identifiant le champ à extraire  
  Valeurs supportées en V1  
  - `"value"`  renvoie la valeur principale  
  - `"confidence"`  renvoie la confiance si présente (numérique)  
  - `"sources_urls"`  renvoie une chaîne avec les URLs des sources, séparées par `"; "`  
  - `"sources_titles"`  renvoie une chaîne avec les titres des sources  
  - `"sources_snippets"`  renvoie une chaîne avec les snippets des sources  
  - `"raw"`  renvoie le JSON brut (équivalent à `JsonText`)

Comportement attendu

- La fonction parse le JSON côté client (Office.js)  
- Elle renvoie la valeur correspondante  
- Si `JsonText` n'est pas un JSON valide ou si le champ demandé n'existe pas  
  - renvoyer une chaîne du type `"#PARSE_ERROR"` ou `"#FIELD_NOT_FOUND"`

Exemples d'utilisation

- JSON technique en D2 via `ALGOSHEET`, valeur métier en E2

```excel
D2  =ALGOSHEET(C2; "structured"; "number"; "web=true;sources=true")
E2  =ALGOSHEET_PARSE(D2; "value")
F2  =ALGOSHEET_PARSE(D2; "sources_urls")
```

Les colonnes techniques (JSON) peuvent être masquées dans les fichiers de travail utilisateurs.

---

## 4. API backend `/algosheet`

### 4.1 Endpoint

- Méthode  `POST`  
- URL  `/algosheet`

### 4.2 Requête

Body JSON

```json
{
  "prompt": "string",
  "responseMode": "free" | "structured" | null,
  "schema": "string or null",
  "options": "string or null"
}
```

Valeurs par défaut côté backend si absent ou vide

- `responseMode`  `"free"`
- `schema`  `"text"` si `responseMode = "structured"`  
- `options`  considéré comme chaîne vide  

### 4.3 Réponse

En cas de succès, le backend renvoie un JSON avec le format générique suivant

```json
{
  "value": <string or number>,
  "confidence": <number between 0 and 1 or null>,
  "sources": [
    {
      "url": "string",
      "title": "string or null",
      "snippet": "string or null"
    }
  ]
}
```

Notes

- `sources` peut être absent ou vide si `options.sources = false` ou si aucune source n'a été collectée  
- `confidence` est optionnel, mais si Gemini le renvoie tu le passes tel quel  
- Ce JSON est renvoyé tel quel à l'add-in, qui le place dans la cellule de sortie de `ALGOSHEET`

En cas d'erreur

- Code HTTP adapté  
  - 400 si requête invalide  
  - 500 si erreur interne ou erreur Gemini  
- Body JSON de type

```json
{
  "error": "Short human readable message",
  "details": {}
}
```

L'add-in transforme ensuite cette erreur en texte `"ALGOSHEET_ERROR: ..."` dans la cellule.

---

## 5. Logique interne backend

### 5.1 Parsing des options

Implémenter un parseur générique pour la chaîne `Options` du type `"key1=value1;key2=value2"`.

Étapes

- Split par `;` pour obtenir des paires  
- Split chaque paire par `=`  
- Nettoyer espaces éventuels  
- Mettre les clés en minuscules  

Options supportées en V1

- `web`  booléen  
  - `"true"` ou `"1"`  valeur vraie  
  - `"false"` ou `"0"`  valeur fausse  
- `sources`  booléen  
- `lang`  chaîne (`"fr"`, `"en"`)  

Valeurs par défaut

- `web`  false  
- `sources`  false  
- `lang`  `"fr"`

Expose un type TypeScript

```ts
interface ParsedOptions {
  web: boolean
  sources: boolean
  lang: string
}
```

### 5.2 Construction du schema de réponse Gemini

Tu dois convertir le paramètre `schema` (string) en un `response_schema` JSON pour Gemini, de façon à ce que Gemini renvoie toujours un objet avec au minimum `value`.

Cas supportés

1. `schema = "number"`

```ts
const responseSchema = {
  type: "object",
  properties: {
    value: { type: "number" },
    confidence: { type: "number" },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          snippet: { type: "string" }
        },
        required: ["url"]
      }
    }
  },
  required: ["value"]
}
```

2. `schema = "text"` ou `ResponseMode = "free"`

Même structure mais avec `value` de type string

```ts
const responseSchema = {
  type: "object",
  properties: {
    value: { type: "string" },
    confidence: { type: "number" },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          snippet: { type: "string" }
        },
        required: ["url"]
      }
    }
  },
  required: ["value"]
}
```

3. `schema = "enum(option1,option2,option3)"`

- Tu dois parser la liste des options  
- Construire un schema avec `value` de type string et `enum`

```ts
const options = ["option1", "option2", "option3"]

const responseSchema = {
  type: "object",
  properties: {
    value: { type: "string", enum: options },
    confidence: { type: "number" },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          snippet: { type: "string" }
        },
        required: ["url"]
      }
    }
  },
  required: ["value"]
}
```

Expose une fonction utilitaire

```ts
function buildResponseSchema(responseMode: string, schema: string): any
```

### 5.3 Construction du prompt Gemini

Le backend construit deux informations pour Gemini

- `system_instruction`  rôle de l'assistant  
- `contents`  qui intègre le `Prompt` utilisateur

Guidelines pour le `system_instruction`

- Décrire le rôle  
  - assistant pour analystes M&A / finance  
- Expliquer la structure de sortie  
  - tu dois toujours renvoyer un objet JSON conforme au `response_schema`  
  - `value` contient la réponse principale  
  - si `options.sources = true`, renseigner les `sources` avec 1 à 3 éléments  
- Si `options.lang` est défini  
  - préciser que `value` doit être dans cette langue

Exemple de `system_instruction` (texte libre, anglais ou français, à toi de choisir, cohérent avec `lang`)

```text
You are an assistant for M&A analysts.
Always answer using a JSON object that conforms to the provided response_schema.
The main answer must be placed in the "value" field.
If sources are requested, fill the "sources" array with 1 to 3 web pages that support your answer.
Do not output anything else than the JSON object.
```

Contenu utilisateur pour Gemini

- Tu passes le `Prompt` reçu du client tel quel comme message utilisateur principal  
- Tu peux aussi injecter des précisions si nécessaire (par exemple rappel sur type attendu) mais l'objectif est que le schema et le `system_instruction` suffisent

### 5.4 Gestion du websearch avec Gemini

Lorsque `options.web = true`, le backend doit activer le tool `googleSearch` de Gemini selon les instructions du guide `/mnt/data/gemini_3_api_guide.md`.

Attendu

- Le client Gemini doit être configuré avec la liste des tools, incluant googleSearch  
- Le modèle `gemini-3` décidera quand appeler la recherche  
- Tu n'as pas besoin de parser toi-même les résultats du moteur de recherche  
- Tu te contentes de récupérer la réponse finale structurée conforme au `response_schema`

Important

- Garde la même interface de sortie que ce soit avec ou sans websearch  
- Le champ `sources` doit être rempli avec des URLs cohérentes quand `options.sources = true`  
- Si le modèle ne peut pas trouver d'information fiable, il doit quand même renvoyer un JSON avec `value` éventuellement null ou une valeur spéciale, mais conforme au schema

### 5.5 Appel à l'API Gemini

Détails à respecter

- Utiliser l'endpoint et le format indiqués dans `/mnt/data/gemini_3_api_guide.md`  
- Utiliser un modèle adapté type `gemini-3.0-pro` ou `gemini-3.0-pro-preview`  
- Passer  
  - `response_mime_type = "application/json"`  
  - `response_schema` construit par `buildResponseSchema`  
  - `system_instruction`  
  - `contents` contenant le message utilisateur avec le `Prompt`

Gestion des erreurs

- Timeout raisonnable (par exemple 15 secondes)  
- Si l'appel renvoie une erreur ou du JSON invalide  
  - log côté serveur  
  - renvoyer au client une erreur 500 avec un message simple

---

## 6. Implémentation de l'add-in Excel

### 6.1 Custom function ALGOSHEET

Fichier  `excel-addin/src/functions/index.ts`

Esquisse TypeScript (interface)

```ts
export async function ALGOSHEET(
  prompt: string,
  responseMode?: string,
  schema?: string,
  options?: string
): Promise<string> {
  // 1. Construire le body de la requête
  // 2. Appeler le backend via fetch
  // 3. Si succès, retourner JSON stringify de la réponse
  // 4. Si erreur, retourner "ALGOSHEET_ERROR: ..."
}
```

Détails

- Normaliser les valeurs par défaut  
  - `responseMode` par défaut `"free"` si non fourni  
  - `schema` peut être laissé tel quel pour le backend  
- L'URL du backend doit être configurable  
  - via variable d'environnement au build  
  - ou via un fichier de config  
- Utiliser `fetch` côté client  
- Ne pas jeter les exceptions  
  - si erreur, renvoyer une chaîne d'erreur exploitable dans Excel

### 6.2 Custom function ALGOSHEET_PARSE

Fichier  `excel-addin/src/functions/index.ts`

Esquisse TypeScript

```ts
export function ALGOSHEET_PARSE(jsonText: string, field: string): any {
  try {
    const obj = JSON.parse(jsonText)
    switch (field) {
      case "value":
        return obj.value ?? "#FIELD_NOT_FOUND"
      case "confidence":
        return obj.confidence ?? "#FIELD_NOT_FOUND"
      case "sources_urls":
        if (!Array.isArray(obj.sources)) return ""
        return obj.sources.map((s: any) => s.url).join("; ")
      case "sources_titles":
        if (!Array.isArray(obj.sources)) return ""
        return obj.sources.map((s: any) => s.title ?? "").join("; ")
      case "sources_snippets":
        if (!Array.isArray(obj.sources)) return ""
        return obj.sources.map((s: any) => s.snippet ?? "").join(" | ")
      case "raw":
        return jsonText
      default:
        return "#FIELD_NOT_FOUND"
    }
  } catch (e) {
    return "#PARSE_ERROR"
  }
}
```

### 6.3 Taskpane minimal (optionnel mais souhaitable)

- Composant React simple  
  - Affiche  
    - URL du backend actuellement configurée  
    - Rappel de la signature des fonctions  
  - Optionnel  
    - bouton "Tester ALGOSHEET" qui prend la cellule active, ouvre un prompt et affiche le JSON de retour

Le taskpane n'est pas critique pour le MVP mais utile pour le debug et l'onboarding utilisateur.

---

## 7. Exemples de scénarios utilisateurs à tester

### 7.1 Estimation de FTE pour une liste d'entreprises

Colonnes de l'utilisateur

- A  Nom de l'entreprise  
- B  Pays  
- C  Prompt  
- D  JSON (technique, masqué)  
- E  FTE estimés  
- F  Sources URLs

Formules

- C2

```excel
="Tu es un analyste M&A. Donne uniquement un entier pour le nombre d'employés de l'entreprise " & A2 & " basée en " & B2 & "."
```

- D2

```excel
=ALGOSHEET(C2; "structured"; "number"; "web=true;sources=true")
```

- E2

```excel
=ALGOSHEET_PARSE(D2; "value")
```

- F2

```excel
=ALGOSHEET_PARSE(D2; "sources_urls")
```

Drag down sur les lignes et vérifier que les valeurs sont cohérentes et qu'au moins une source est remontée.

### 7.2 Classification indépendance / groupe / fonds PE

- Prompt en C2  

```excel
="Pour l'entreprise " & A2 & " basée en " & B2 & ", indique si elle est indépendante, filiale d'un groupe industriel, ou détenue par un fonds de Private Equity. Répond uniquement par un mot parmi: Indépendant, Groupe, Fonds PE."
```

- D2

```excel
=ALGOSHEET(C2; "structured"; "enum(Indépendant,Groupe,Fonds PE)"; "web=true;sources=true")
```

- E2

```excel
=ALGOSHEET_PARSE(D2; "value")
```

- F2

```excel
=ALGOSHEET_PARSE(D2; "sources_urls")
```

### 7.3 Réponse libre

- Prompt en C2

```excel
="Donne en une phrase la description de l'activité principale de l'entreprise " & A2 & " basée en " & B2 & "."
```

- D2

```excel
=ALGOSHEET(C2; "free"; ""; "web=true")
```

- E2 (si besoin)

```excel
=ALGOSHEET_PARSE(D2; "value")
```

---

## 8. Non objectifs V1 (à ne pas implémenter maintenant)

Pour garder le MVP simple, ne pas implémenter pour l'instant

- Authentification utilisateur et gestion de comptes  
- Cache persistant en base de données (un cache mémoire simple est acceptable mais non nécessaire)  
- Enrichissement multi champs en une seule requête  
- Intégrations directes avec un CRM ou d'autres systèmes  
- Interface web séparée hors Excel

---

## 9. Critères de réussite du MVP

Le MVP est considéré comme réussi si

- Un utilisateur peut installer l'add-in et  
  - appeler `ALGOSHEET` sur une liste de quelques entreprises  
  - obtenir un JSON structuré par ligne avec `value` et éventuellement `sources`

- `ALGOSHEET_PARSE` permet  
  - d'extraire `value`  
  - de voir les URLs des sources dans une colonne séparée

- Les erreurs sont gérées proprement  
  - aucune exception non gérée ne remonte chez l'utilisateur  
  - les cellules affichent un texte explicite en cas de problème

- Le code  
  - est structuré comme indiqué  
  - est suffisamment clair pour être prolongé plus tard (ajout d'autres schémas, options, etc.)

Ce guide doit suffire pour que tu puisses implémenter l'ensemble du système sans avoir à faire de choix d'architecture supplémentaires. Les points non explicitement couverts (formatage exact des logs, style interne du code) sont laissés à ta discrétion, tant que l'interface externe reste conforme à cette spécification.

