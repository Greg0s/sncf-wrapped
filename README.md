# Wrapped SNCF

Rétrospective personnalisée de vos trajets en train, générée depuis l'export CSV
que SNCF Connect fournit sur demande RGPD.

**Tout le traitement se fait dans le navigateur.** Le CSV n'est ni envoyé à un
serveur, ni stocké : il est lu en mémoire et reste sur votre machine.

Contexte produit : [CLAUDE.md](CLAUDE.md) · Choix techniques : [STACK.md](STACK.md)

## Démarrer

Prérequis : Node 22+ et [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev
```

Le site est servi sur <http://localhost:5173/wrapped-sncf/> — le sous-chemin
`/wrapped-sncf/` reproduit en local le chemin de GitHub Pages (`base` dans
`vite.config.ts`).

| Script           | Effet                                       |
| ---------------- | ------------------------------------------- |
| `pnpm dev`       | Serveur de développement                     |
| `pnpm build`     | Typecheck puis build de production → `dist/` |
| `pnpm preview`   | Sert le build de production                  |
| `pnpm lint`      | oxlint                                       |
| `pnpm typecheck` | TypeScript seul                              |

## Structure

```
src/
├── assets/        images, icônes, polices
├── components/    briques d'UI, groupées par domaine
│   ├── landing/     hero, argumentaire confidentialité
│   ├── upload/      sélection du CSV
│   ├── story/       sections du récit scrollé
│   ├── map/         carte de France + tracés de trajets
│   ├── stats/       classements et visualisations
│   ├── share-card/  carte exportable en image
│   └── ui/          boutons, layout, génériques
├── lib/           logique pure, testable sans rendu
│   ├── csv/         parsing PapaParse + mapping des colonnes
│   ├── stats/       agrégations (top N adaptatif, distances…)
│   ├── geo/         gare → coordonnées, géométrie des tracés
│   └── export/      wrapper html-to-image
├── hooks/         hooks React réutilisables
├── pages/         écrans du parcours (landing → récit → partage)
├── types/         types métier partagés
├── App.tsx        état du parcours (pas de routeur, cf. STACK.md)
└── main.tsx
```

`pages/` contient les écrans ; `components/` les briques qui les composent.
Il n'y a pas de routeur : `App.tsx` choisit l'écran selon l'état d'avancement.

## État d'avancement

Scaffold initial. La landing est temporaire : un bouton d'import qui ouvre le
sélecteur de fichier et affiche le nom du CSV choisi. Le parsing, le récit
scrollé, la carte et l'export d'image restent à construire — les dossiers
correspondants sont en place mais vides.

## Déploiement

Un push sur `main` déclenche [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
qui build et publie sur GitHub Pages.

> À faire une fois : dans **Settings → Pages** du dépôt, régler *Source* sur
> **GitHub Actions**, sinon le job `deploy` échouera.
