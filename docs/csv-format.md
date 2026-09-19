# SNCF Connect export: format and interpretation rules

Read this before touching `src/lib/parsing/parseSncfCsv.ts`. The format was validated on **one** real export; other variants are tracked in issue #2.

## Shape of the file

- CSV export of a GDPR access request, **Windows-1252**, CRLF, delimiter `;` (the parser also accepts `,` and tab).
- **Multi-section**: a title line (`Données - Commandes train bus;;;;`), a header row, data rows, then blank lines, then the next section. Sections seen: customer info, account, newsletter, *train/bus orders*, subscription/card orders, TER catalogue, communications. **Only the train/bus orders section is read**; the others hold personal data (identity, address, phone) and are never interpreted or kept.
- The section is found by its **columns**, not its title: a header row containing `date voyage`, `lieu origine` and `lieu destination` (case, accents, `_` ignored). Rows run until a blank line or the next `Données - …` title.

## Trips section columns

| Column | Use |
| --- | --- |
| `date voyage` | Departure, `2026-09-13T15:56:00.000Z`. The hour is the **local** departure time despite the `Z`; it is read as written |
| `lieu origine`, `lieu destination` | Station labels: uppercase ASCII, no hyphens (`SAINT ETIENNE CHATEAUCREUX`) |
| `date commande` | Order date (`YYYY-MM-DD`) → how far ahead tickets are bought |
| `montant_brut` | Gross amount, decimal comma (`13,4`); before any refund the file does not describe |
| `mode de paiement` | `Payé en ligne` = paid; `Option posée` = unpaid hold (excluded); other values count as paid and show up in the debug panel |
| `est_aller_retour` | `oui` = round trip → 2 trips |
| `nombre_passagers`, `dossier voyage`, `numéro de commande`, `mode de retrait`, `classe`, `email` | Read when useful (references for merged tickets) or ignored |

## Rules the parser applies

1. Rows with no station, or an unreadable departure date, are skipped and counted in the report.
2. **Options** (`Option posée`) are excluded; an option never adds to a paid amount.
3. Rows with the same departure timestamp + origin + destination become **one trip**; amounts add up, the earliest order date is kept.
4. Upcoming departures (after "today") are kept aside and excluded from statistics.
5. Stations are matched to the referential: exact name → without a coach-station suffix (`… GARE ROUTIERE`) → unique name prefix (`PARIS BERCY`) → city name prefix (`SAINT ETIENNE CHTX …`). Unknown stations (typically foreign) keep their name but have no distance and no map position.

## Not in the file

Delay/punctuality, journey duration and distance. Distances are estimated (see `architecture.md`); nothing derived from duration or delay may be shown.
