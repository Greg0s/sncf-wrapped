# Wrapped SNCF

## Contexte du projet

"Wrapped SNCF" est un site qui génère un récapitulatif personnalisé (façon Spotify Wrapped) à partir du CSV que SNCF Connect fournit à ses utilisateurs sur demande RGPD (export de leurs données personnelles / historique de trajets).

L'utilisateur importe son CSV, et le site affiche des statistiques et visualisations sur ses trajets en train (villes visitées, distances, itinéraires favoris, etc.), dans un format engageant inspiré du Spotify Wrapped.

## Contraintes clés (ne jamais perdre de vue)

### 1. Confidentialité — traitement 100% côté client
- Aucune donnée utilisateur n'est stockée ni envoyée à un serveur.
- Tout le traitement du CSV (parsing, calculs, agrégations) doit se faire côté client, dans le navigateur.
- C'est un argument de confidentialité mis en avant sur la landing page : il doit rester vrai à tout moment de l'implémentation. Toute fonctionnalité future doit être vérifiée contre cette contrainte avant d'être ajoutée (pas d'upload du fichier vers une API, pas d'analytics qui capturerait le contenu du CSV, etc.).

### 2. Responsive
- Le site doit fonctionner aussi bien sur mobile que sur desktop.
- Attention particulière aux pages à scroll animées (type scrollytelling) : les animations et transitions doivent rester fluides et lisibles sur petit écran, pas seulement sur desktop.

### 3. Classements adaptatifs selon le volume de données
- Le nombre de trajets dans le CSV d'un utilisateur peut être faible.
- Les classements (top villes, top itinéraires, etc.) doivent s'adapter dynamiquement au volume réel de données disponibles.
- Ne jamais afficher un "top 5" s'il n'y a que 3 trajets (ou plus généralement, un top N où N dépasse le nombre d'éléments distincts disponibles) : adapter N en conséquence, ou changer la présentation si les données sont trop pauvres pour ce type de classement.

## État actuel

Projet pas encore démarré — pas de code écrit. Ce fichier sert de mémo de contexte pour les prochaines sessions.
