# Canvas – Résumé Gemini 3 API (paramètres, tools, usage Python)

## 1. Modèles Gemini 3 (génération texte / multimodal)

- Modèle principal (texte + vision)
  - `gemini-3-pro-preview`
  - Entrées: texte, images, fichiers, URLs (via tools)
  - Sorties: texte, éventuellement JSON structuré

- Appels API typiques
  - `generateContent` (ou équivalent SDK)
  - `streamGenerateContent` pour le streaming

---

## 2. Paramètres de génération principaux

### 2.1 Paramètres spécifiques à Gemini 3

- `thinking_level`
  - Rôle: profondeur / coût du raisonnement
  - Valeurs typiques
    - `"low"` – plus rapide, moins cher, moins de raisonnement
    - `"high"` – plus lent, plus cher, meilleure qualité (défaut)
  - Ne doit pas être utilisé avec l’ancien `thinking_budget` en même temps

- `media_resolution`
  - Rôle: qualité de traitement des images / vidéos
  - Valeurs
    - `"media_resolution_low"`
    - `"media_resolution_medium"`
    - `"media_resolution_high"`
  - Règles d’usage
    - Images importantes (détails, texte) → `high`
    - PDFs / docs → `medium` en général
    - Vidéos longues → `low` ou `medium`

- Thought signatures (`thoughtSignature`)
  - Le modèle renvoie des métadonnées internes de raisonnement
  - Tu dois les renvoyer dans l’historique pour les tours suivants
  - Obligatoire surtout si
    - tu utilises des tools (functions, Search, etc.)
    - tu fais de la génération / édition d’images

### 2.2 Paramètres classiques (`generation_config`)

- `temperature`
  - Recommandation: laisser `1.0` sur Gemini 3
  - Baisser trop peut dégrader le raisonnement

- Autres paramètres classiques
  - `max_output_tokens`
  - `top_p`
  - `top_k`
  - `stop_sequences`
  - `candidate_count`

- Champs du body
  - `contents` – historique (messages user / model)
  - `system_instruction` – rôle / règles globales
  - `safety_settings` – niveaux de filtre par catégorie
  - `tools` – définition des outils utilisables
  - `tool_config` – stratégie d’appel des tools

---

## 3. Tools de l’API (built-in et custom)

### 3.1 Tools intégrés (built-in)

- `googleSearch`
  - Recherche web temps réel, grounding factual

- `googleMaps`
  - Recherche de lieux, adresses, itinéraires

- `codeExecution`
  - Exécution de Python côté Google (calculs, parsing, data)

- `urlContext`
  - Le modèle lit / résume le contenu d’URLs fournies

- `computerUse` (preview)
  - Pilotage d’un navigateur / UI pour automatiser des workflows

- `fileSearch`
  - RAG managé sur tes propres documents indexés

Tous ces tools se déclarent dans le champ `tools` avec la forme adaptée (selon SDK).

### 3.2 Tools custom via Function Calling

- Tu définis des fonctions sous forme de schéma JSON
- Chaque function a
  - `name`
  - `description`
  - `parameters` (schema JSON type / properties / required)
- Le modèle peut proposer d’appeler la fonction avec des arguments JSON
- Tu exécutes la fonction côté backend, puis renvoies la réponse au modèle

- Configuration
  - `tools`: contient tes `functionDeclarations`
  - `tool_config.function_calling_config.mode`
    - `"auto"` – le modèle décide quand appeler
    - `"any"` – il doit appeler une des fonctions
    - `"none"` – pas de function calling

---

## 4. Structured Outputs (JSON) + tools

- Possibilité de forcer un retour JSON structuré
  - `response_mime_type = "application/json"`
  - `response_schema` (décrit la structure)
- Peut être combiné avec
  - Tools (Search, URL, function calling, etc.)
- Très utile pour
  - Extraction d’info
  - Remplissage de tableaux (Excel-like)
  - Pipelines M&A (enrichissement de lignes)

---

## 5. Exemple d’utilisation en Python (SDK Gemini)

### 5.1 Préparation

Prérequis
- Avoir une API key Gemini dans la variable d’environnement `GEMINI_API_KEY`
- Installer le SDK Python

```bash
pip install google-genai
```

### 5.2 Exemple simple: appel texte avec `thinking_level` et Search

```python
import os
from google import genai

# 1) Initialisation du client
api_key = os.environ["GEMINI_API_KEY"]
client = genai.Client(api_key=api_key)

# 2) Choix du modèle
model_name = "gemini-3-pro-preview"

# 3) Contenu utilisateur
user_prompt = "Explique moi en 5 bullet points les tendances récentes en M&A dans les software B2B en Europe"

# 4) Appel au modèle avec paramètres + tool Google Search
response = client.models.generate_content(
    model=model_name,
    contents=[{
        "role": "user",
        "parts": [{"text": user_prompt}]
    }],
    generation_config={
        "thinking_level": "high",        # Raisonnement profond
        "max_output_tokens": 1024,
        "temperature": 1.0
    },
    tools=[
        {"googleSearch": {}}
    ],
    tool_config={
        "function_calling_config": {
            "mode": "auto"  # Le modèle décide quand utiliser Search
        }
    }
)

# 5) Récupérer et afficher le texte
print(response.text)
```

### 5.3 Exemple plus “data”: structured output JSON pour Excel

Objectif: demander une liste de 5 acquéreurs potentiels M&A pour un secteur, au format JSON propre

```python
import os
from google import genai

api_key = os.environ["GEMINI_API_KEY"]
client = genai.Client(api_key=api_key)

model_name = "gemini-3-pro-preview"

user_prompt = (
    "Pour le secteur des éditeurs de logiciels de gestion de trésorerie en Europe, "
    "génère une liste de 5 acquéreurs potentiels (stratégiques ou fonds) avec : "
    "nom, type (stratégique/fonds), pays, rational, taille_approx (CA ou AUM)."
)

response = client.models.generate_content(
    model=model_name,
    contents=[{
        "role": "user",
        "parts": [{"text": user_prompt}]
    }],
    generation_config={
        "thinking_level": "high",
        "max_output_tokens": 1024,
        "temperature": 1.0,
        "response_mime_type": "application/json",
        "response_schema": {
            "type": "object",
            "properties": {
                "acquerreurs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "nom": {"type": "string"},
                            "type": {"type": "string"},
                            "pays": {"type": "string"},
                            "rationale": {"type": "string"},
                            "taille_approx": {"type": "string"}
                        },
                        "required": ["nom", "type", "pays"]
                    }
                }
            },
            "required": ["acquerreurs"]
        }
    },
    tools=[
        {"googleSearch": {}}
    ],
    tool_config={
        "function_calling_config": {"mode": "auto"}
    }
)

# Ici, response.text est déjà un JSON valide selon le schema
print(response.text)
```

---

## 6. Checklist mentale pour utiliser l’API

1) Choisir le modèle
   - `gemini-3-pro-preview` pour texte + vision avancée

2) Définir le contexte et les objectifs
   - `system_instruction` si tu veux un style / rôle précis
   - `contents` avec historique user / assistant

3) Régler les paramètres
   - `thinking_level` = `high` par défaut
   - `max_output_tokens` en fonction de la longueur cible
   - `temperature` ≈ `1.0` sauf cas spéciaux

4) Activer les tools si besoin
   - Search / URL / code / fileSearch / Maps / computerUse
   - Ou tes propres functions (function calling)

5) (Optionnel) Forcer un retour structuré
   - `response_mime_type = "application/json"`
   - `response_schema` pour décrire la structure

6) Parser la réponse côté backend
   - Texte simple → `response.text`
   - JSON → `json.loads(response.text)` puis injection dans Excel / DB

Ce canvas te donne la vue d’ensemble et les snippets pour démarrer rapidement avec Gemini 3 en Python et pour tes use cases M&A / enrichissement de listes dans Excel.

### 5.4 Exemple de réponse et parsing côté Python

#### Exemple de `response.text` pour l’output structuré

Pour l’exemple M&A en JSON ci-dessus, `response.text` pourra ressembler à quelque chose comme ceci:

```json
{
  "acquerreurs": [
    {
      "nom": "Hg Capital",
      "type": "fonds",
      "pays": "Royaume-Uni",
      "rationale": "Historique d’investissements dans les logiciels B2B et la fintech",
      "taille_approx": "> 40 Mds EUR d’actifs sous gestion"
    },
    {
      "nom": "EQT",
      "type": "fonds",
      "pays": "Suède",
      "rationale": "Plateforme pan-européenne active sur les logiciels et services financiers",
      "taille_approx": "> 100 Mds EUR d’actifs sous gestion"
    }
  ]
}
```

#### Parsing minimal côté Python

```python
import json

# On part de la réponse du SDK
raw_text = response.text  # string JSON

# 1) Parsing JSON → dict Python
payload = json.loads(raw_text)

# 2) Accès aux acquéreurs
acqs = payload.get("acquerreurs", [])

for acq in acqs:
    nom = acq.get("nom", "")
    pays = acq.get("pays", "")
    type_ = acq.get("type", "")
    rationale = acq.get("rationale", "")
    taille = acq.get("taille_approx", "")

    print(nom, pays, type_, rationale, taille)

# 3) Exemple de préparation pour un insert en base ou un export Excel
rows_for_excel = [
    [
        acq.get("nom", ""),
        acq.get("type", ""),
        acq.get("pays", ""),
        acq.get("rationale", ""),
        acq.get("taille_approx", ""),
    ]
    for acq in acqs
]

# rows_for_excel est une liste de lignes prêtes à être poussées dans un DataFrame / CSV / Excel
```

#### Variante avec propriété dédiée (si le SDK évolue)

Certains SDK Gemini exposent aussi un champ déjà parsé (par exemple `response.parsed` quand `response_mime_type` est en JSON). Dans ce cas le pseudo-code devient:

```python
payload = response.parsed  # dict déjà parsé
acqs = payload["acquerreurs"]
```

Ton dev peut partir de cet exemple et brancher directement `rows_for_excel` sur pandas, un writer Excel ou un INSERT SQL.

