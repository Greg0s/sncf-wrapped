# Données de référence statiques

Ce dossier accueille les jeux de données **publics** embarqués au build et
servis avec le site (cf. STACK.md §4) :

| Fichier            | Contenu                                          | Source envisagée                            |
| ------------------ | ------------------------------------------------ | ------------------------------------------- |
| `france-map.json`  | Contours de la France (régions / départements)    | `gregoiredavid/france-geojson` (MIT)        |
| `gares-sncf.json`  | Référentiel des gares + coordonnées GPS           | Portail open data SNCF (licence ouverte)    |
| `.gitkeep`         | —                                                 | —                                           |

Les deux fichiers restent à récupérer : ils seront ajoutés avec la carte.

> ⚠️ Ce dossier ne contient **que** des données de référence publiques.
> Aucune donnée utilisateur n'y est écrite — le CSV importé ne quitte jamais
> la mémoire du navigateur (cf. CLAUDE.md, contrainte 1).
