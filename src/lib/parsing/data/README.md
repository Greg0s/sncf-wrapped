# Référentiel des gares (`gares.json`)

Données de référence **publiques** embarquées dans le site pour convertir un nom de gare du CSV en coordonnées GPS
et en ville. Ce ne sont jamais des données utilisateur.

- **Source** : SNCF Open Data, jeu « Gares de voyageurs » —
  <https://data.sncf.com/explore/dataset/gares-de-voyageurs/> (2 782 gares, export du 2026-09-19).
- **Licence** : ODbL 1.0 — <https://opendatacommons.org/licenses/odbl/1-0/>. La mention « Contient des données SNCF
  Open Data (licence ODbL) » doit figurer dans l'interface publique (pied de page).
- **Contenu** : `stations` = `[nom, latitude, longitude, index de ville]`, `cities` = `[libellé, latitude moyenne, longitude moyenne]`.
  Les coordonnées sont arrondies à 4 décimales (~10 m) ; seuls nom, position et code INSEE de l'export brut sont conservés.
- **Villes** : l'export ne donne que le code INSEE de la commune (pas son nom). Le libellé de ville est déduit des noms
  de gares de la même commune (« Lyon Part Dieu » et « Lyon Perrache » → « Lyon »), les arrondissements de Paris, Lyon
  et Marseille étant rattachés à leur commune. Limite connue : une ville à gare unique dont le nom porte un qualificatif
  garde son nom complet (« Bordeaux Saint-Jean », « Toulouse Matabiau »).

## Régénérer

```bash
curl -L -o gares-raw.json "https://ressources.data.sncf.com/api/explore/v2.1/catalog/datasets/gares-de-voyageurs/exports/json"
node scripts/build-stations.mjs gares-raw.json
```

Le fichier brut n'est pas versionné. Après régénération, relancer `npm test` (des tests vérifient quelques gares connues).
