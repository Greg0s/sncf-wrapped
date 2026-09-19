# Stack technique — Wrapped SNCF

Contexte du projet : voir [CLAUDE.md](CLAUDE.md). Contraintes structurantes pour tous les choix ci-dessous : rendu 100% statique/client-side, aucune donnée envoyée à un serveur, hébergement gratuit (GitHub Pages).

## 1. Framework front — React + Vite + TypeScript

**Choix :** React 18 + Vite + TypeScript.

**Justification :** Vite produit un build 100% statique (HTML/CSS/JS), sans serveur, directement servable par GitHub Pages. React a l'écosystème le plus riche pour les briques spécifiques dont ce projet a besoin (carte, animations de scroll, export d'image) : les librairies recommandées aux points 2/4/5 sont toutes React-first et bien maintenues. TypeScript sécurise les transformations de données (CSV brut → stats agrégées), ce qui limite les bugs silencieux sur un format d'export dont le contenu peut varier.

*Alternative écartée :* Svelte/SvelteKit (bundle plus léger, transitions natives) — écosystème moins mûr côté carte et export d'image.

## 2. Animations de scroll et micro-animations — GSAP + ScrollTrigger

**Choix :** GSAP + plugin ScrollTrigger, via le binding `@gsap/react` (hook `useGSAP`).

**Justification :** C'est la référence pour le scrollytelling (sections pinnées, animations "scrubbées" sur la position de scroll), exactement le besoin pour une expérience façon Wrapped. Le plugin DrawSVG (dessin progressif d'un tracé SVG) — utile pour "les traits qui se dessinent sur la carte" — est gratuit depuis que Webflow a racheté GreenSock en 2025. GSAP est agnostique du framework, donc ne dépend pas du cycle de rendu React pour le timing des animations.

*Alternative écartée :* Framer Motion — plus simple pour de l'apparition au scroll basique (`whileInView`), mais moins adapté au pinning de sections et au scrubbing précis. Pourra être ajouté ponctuellement plus tard pour de petites micro-interactions UI, sans remplacer GSAP sur les séquences narratives.

## 3. Parsing CSV côté client — PapaParse

**Choix :** PapaParse.

**Justification :** Standard de facto pour parser du CSV en JS. Peut tourner dans un Web Worker (ne bloque pas l'UI pendant le parsing), détecte automatiquement délimiteurs/encodages, types TypeScript disponibles. Fonctionne entièrement en mémoire dans le navigateur — cohérent avec la contrainte de confidentialité.

## 4. Carte de France + trajets — react-simple-maps (D3-geo) + données géo statiques embarquées

**Choix :** `react-simple-maps` (basé sur `d3-geo`) pour le rendu SVG de la carte, avec deux jeux de données statiques embarqués en asset local au build :
- un fond de carte de France (contours régions/départements) issu d'un GeoJSON libre (ex. le repo `gregoiredavid/france-geojson`, MIT) ;
- un référentiel des gares SNCF avec coordonnées GPS (portail open data SNCF, licence ouverte), pour convertir les noms de gares du CSV en points sur la carte.

**Justification :** Rendu 100% SVG, donc aucun appel réseau à un serveur de tuiles ni clé API. Les trajets sont de simples `<path>` SVG, directement animables avec GSAP/DrawSVG. Le style est entièrement personnalisable (fond sombre, dégradés, glow) pour coller à l'esthétique Wrapped — contrairement à un fond de carte réaliste (type Leaflet/OSM) qui imposerait un rendu "carte routière". Aucune donnée géographique n'est chargée depuis l'extérieur : tout est embarqué au build, dans l'esprit "rien ne sort du navigateur".

*Alternative écartée :* Leaflet + tuiles OpenStreetMap — nécessite des requêtes réseau vers un serveur de tuiles à l'usage, et un rendu moins stylisable pour un visuel de type Wrapped.

## 5. Export de l'image partageable — html-to-image

**Choix :** `html-to-image`.

**Justification :** Convertit un nœud DOM (le composant "carte de résultats" stylé en HTML/CSS) en PNG/JPEG directement dans le navigateur, sans rendu serveur. Plus léger et mieux maintenu que `html2canvas` sur les layouts modernes (flexbox/grid, polices web, dégradés CSS). API simple (`toPng(node)`), suffisante pour un composant à layout fixe, sans avoir à redessiner manuellement sur un `<canvas>`.

*Point d'attention pour l'implémentation :* précharger les polices web et éviter les images cross-origin non converties en data-URI, sinon le canvas peut être "tainted" et l'export échoue silencieusement.

## 6. Hébergement / déploiement — GitHub Pages + GitHub Actions

**Choix :** GitHub Pages, déployé via une GitHub Action (`actions/upload-pages-artifact` + `actions/deploy-pages`) à chaque push sur `main`.

**Justification :** Gratuit, déjà couplé au repo GitHub existant (`Greg0s/wrapped-sncf`), et suffisant puisque le site est 100% statique après build. Pas de backend à héberger, donc aucun coût ni maintenance serveur.

*Point d'attention pour l'implémentation :* un site de projet GitHub Pages (`greg0s.github.io/wrapped-sncf`) est servi sous un sous-chemin — penser à configurer `base: '/wrapped-sncf/'` dans `vite.config.ts`.

---

## Architecture de dossiers résultante

```
wrapped-sncf/
├── .github/
│   └── workflows/
│       └── deploy.yml          # build Vite + déploiement GitHub Pages
├── public/
│   └── data/
│       ├── france-map.json     # GeoJSON/TopoJSON des contours de France (asset statique)
│       └── gares-sncf.json     # référentiel gares + coordonnées GPS (asset statique)
├── src/
│   ├── assets/                 # images, icônes, polices
│   ├── components/
│   │   ├── landing/            # hero, argumentaire confidentialité, CTA d'upload
│   │   ├── upload/              # zone de dépôt / sélection du CSV
│   │   ├── story/                # sections du récit scrollé (façon Wrapped)
│   │   ├── map/                    # carte de France + tracés de trajets (react-simple-maps)
│   │   ├── stats/                    # classements/visualisations (top villes, itinéraires…)
│   │   ├── share-card/                 # composant de la carte exportable + bouton de partage
│   │   └── ui/                          # boutons, layout, éléments génériques
│   ├── lib/
│   │   ├── csv/                 # wrapper PapaParse + validation/mapping des colonnes attendues
│   │   ├── stats/                 # agrégations (top N adaptatif, distances, fréquences…)
│   │   ├── geo/                     # résolution nom de gare → coordonnées, géométrie des tracés
│   │   └── export/                    # wrapper html-to-image
│   ├── hooks/                   # ex. useGsapScrollTimeline, useCsvUpload
│   ├── types/                   # Trip, Station, WrappedStats, etc.
│   ├── App.tsx                  # état global simple : landing → story → résultats
│   └── main.tsx
├── CLAUDE.md
├── STACK.md
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

**Notes sur l'architecture :**
- Pas de routeur (react-router) : le parcours est un flux à état unique (landing → upload → story → partage), géré par du state React local plutôt que par des routes.
- `public/data/` ne contient que des données statiques de référence (géographie, gares) — jamais de données utilisateur.
- La logique d'adaptation des classements (contrainte CLAUDE.md sur le "top N" dynamique) vit dans `src/lib/stats/`, séparée des composants d'affichage, pour rester testable indépendamment du rendu.

---

## Points non demandés mais à trancher rapidement à la prochaine étape

Hors des 6 points demandés, mais nécessaires pour scaffolder :
- **Styling :** suggestion Tailwind CSS (rapide pour un design system Wrapped-like avec dégradés/dark mode) — à confirmer.
- **Gestionnaire de paquets :** npm par défaut (aucune install supplémentaire requise) — à confirmer si préférence contraire (pnpm/yarn).

---

## Écarts constatés à l'implémentation

Le projet est maintenant scaffoldé. Ce qui diffère de ce document :

- **Dossiers** : `src/lib/parsing/` (lecture du CSV, calculs, référentiel des gares) et `src/lib/wrapped/` (modèle d'affichage) remplacent `lib/csv`, `lib/stats` et `lib/geo`. Le référentiel des gares est `src/lib/parsing/data/gares.json`, chargé par import dynamique (et non `public/data/`).
- **Animations** : CSS + IntersectionObserver, portés tels quels de la maquette (pas de GSAP pour l'instant).
- **Styling** : ni Tailwind ni autre framework CSS ; les styles en ligne de la maquette sont conservés (`src/lib/css.ts`).
- **Carte** : SVG schématique de la maquette (projection affine des coordonnées), pas `react-simple-maps`.
- **Polices** : Schibsted Grotesk auto-hébergée (`@fontsource`), aucun service de polices tiers.
- **Export d'image** (`html-to-image`) : pas encore fait, voir l'issue #3. **Déploiement Pages** : voir l'issue #10.

Architecture à jour : `docs/architecture.md`.
