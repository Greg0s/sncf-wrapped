# Wrapped SNCF

[![CI](https://github.com/Greg0s/wrapped-sncf/actions/workflows/ci.yml/badge.svg)](https://github.com/Greg0s/wrapped-sncf/actions/workflows/ci.yml)

Votre année sur les rails, façon « Wrapped » : importez l'export de vos données personnelles SNCF Connect et découvrez vos kilomètres, votre budget, vos villes, vos itinéraires et votre façon de réserver, écran par écran, avec une carte à partager.

> Projet personnel, non officiel : il n'est pas affilié à la SNCF.

## Confidentialité

**Tout se passe dans votre navigateur.** Le fichier n'est ni envoyé, ni stocké : pas de serveur, pas de compte, pas de traçage, pas de service de polices tiers. Vous fermez l'onglet, il ne reste rien. Cette garantie est une contrainte du projet, vérifiée par un test automatique (`src/lib/parsing/privacy.test.ts`) qui échoue si une API réseau apparaît dans le code de l'application.

## Obtenir ses données

SNCF Connect n'offre pas d'export en un clic. Le RGPD permet de demander ses données : un e-mail au délégué à la protection des données suffit, la réponse arrive sous un mois. Le site propose une page qui prépare le message (« Obtenir les données »).

## Ce que le fichier contient (et pas)

Le CSV liste les commandes de train : dates, gares, montants, mode de paiement. Il ne contient **ni retard, ni durée, ni distance**. Les kilomètres affichés sont donc une **estimation** : distance à vol d'oiseau entre les gares, majorée de 20 %. Les réservations « Option posée » (non payées) sont ignorées. Détails : [`docs/csv-format.md`](docs/csv-format.md).

## Développer

Prérequis : Node 20.19+ ou 22.12+.

```bash
npm ci
npm run dev
```

Le site est servi sur <http://localhost:5173/wrapped-sncf/>. Ajoutez `?debug` à l'adresse pour le panneau qui détaille les calculs.

| Commande | Rôle |
| --- | --- |
| `npm run check` | Typecheck + tests + build : à passer avant toute PR (la CI fait de même) |
| `npm test` | Tests seuls (dont des centaines d'exports aléatoires : `FUZZ_SEEDS=2500 npm test -- invariants`) |
| `npm run sample -- out.csv --profile tiny` | Génère un export **fictif** de test (profils : `lyon`, `regional`, `tiny`, `single`, `foreign`, `roundtrips`) |
| `npm run inspect -- out.csv` | Affiche dans la console ce que l'application calcule pour un export |

**N'ajoutez jamais un vrai export au dépôt** : il contient votre identité, votre adresse et votre téléphone. Les `*.csv` sont ignorés par git, et ne doivent pas non plus être placés dans `public/` (ce dossier est recopié dans le site déployé).

## Comment c'est fait

React 18, Vite, TypeScript, PapaParse, Vitest. Le CSV est lu par `src/lib/parsing/`, transformé en textes et écrans par `src/lib/wrapped/`, puis affiché par les composants de `src/components/` (la maquette portée en React, design et animations inchangés). Pour aller plus loin :

- [`docs/architecture.md`](docs/architecture.md) : flux de données, modules, décisions.
- [`docs/csv-format.md`](docs/csv-format.md) : structure de l'export et règles d'interprétation.
- [`STACK.md`](STACK.md) : choix techniques et leurs raisons.

## Suivi et amélioration continue

Les points à traiter sont des [issues](https://github.com/Greg0s/wrapped-sncf/issues). Celles qui portent le label `auto-improve` alimentent une **boucle d'auto-amélioration** : le skill `/improve` de Claude Code traite une issue à la fois, vérifie avec `npm run check`, et ouvre une PR en brouillon pour relecture. Le principe et les garde-fous sont dans [`docs/self-improvement.md`](docs/self-improvement.md).

## Données et licences

- Les coordonnées des gares viennent du jeu « Gares de voyageurs » de [SNCF Open Data](https://data.sncf.com/explore/dataset/gares-de-voyageurs/), sous licence [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). Le site affiche la mention *Contient des données SNCF Open Data (licence ODbL)*. Procédure de mise à jour : [`src/lib/parsing/data/README.md`](src/lib/parsing/data/README.md).
- Police Schibsted Grotesk, auto-hébergée via `@fontsource` (licence OFL).
