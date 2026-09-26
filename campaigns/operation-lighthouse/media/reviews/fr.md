# Revue du contenu français

**Statut :** Approuvé  
**Revue :** 25 septembre 2026  
**Périmètre :** Contenu participant, commandes de l'animateur, interface du
centre de commandement, narration de campagne, missions, médias, narration,
sous-titres et métadonnées d'accessibilité.

## Décisions terminologiques

- Employer **agent** uniquement pour le comportement logiciel limité construit
  par les participants.
- Employer **élément probant** pour une observation traçable et **ancrage** pour
  le lien explicite entre une affirmation et cet élément.
- Employer **outil** pour une opération de simulateur externe et **transfert**
  pour le passage structuré entre spécialistes.
- Employer **approbation humaine** dans les consignes destinées aux
  participants, plutôt que l'expression anglaise « human in the loop ».
- Décrire le **rétablissement** comme une progression mesurable fondée sur les
  preuves, jamais comme une garantie de sécurité totale.
- Conserver exactement `Port Azure`, `Mission Commander`, `Maya Chen`,
  `Jules Martin`, `Aurora` et le nom de l'interface `Mission Control`.

## Revue linguistique et accessibilité

- Les phrases suivent une syntaxe française naturelle et évitent les calques
  inutiles de l'anglais.
- Les commandes utilisent un registre opérationnel cohérent, direct et inclusif.
- Les informations essentielles ne dépendent jamais uniquement de la couleur,
  du son ou du mouvement.
- Les vidéos narrées disposent de sous-titres français synchronisés.
- Les descriptions de crise évitent la panique, la culpabilisation et le
  sensationnalisme.

## Surfaces examinées

- `apps/command-center/src/messages.ts`
- `apps/participant-cli/src/translations.ts`
- `campaigns/operation-lighthouse/src/narrative.ts`
- `campaigns/operation-lighthouse/src/missions/`
- `campaigns/operation-lighthouse/media/localization/fr.json`
- `campaigns/operation-lighthouse/media/captions/*.fr.vtt`

Aucun problème bloquant ne subsiste dans la localisation française.
