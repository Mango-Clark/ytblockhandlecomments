<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# 📌 YouTube Comment Blocker — v1.5.4

[English (US)](README.md) | [한국어](README.ko.md) | [日本語](README.ja-jp.md) | [Deutsch](README.de-de.md) | [简体中文](README.zh-cn.md) | [繁體中文](README.zh-tw.md) | [Français](README.fr-fr.md) | [Português (Brasil)](README.pt-br.md) | [Русский](README.ru-ru.md) | [Bahasa Indonesia](README.id-id.md)

Un script Tampermonkey qui masque les commentaires YouTube selon leur chaîne sur les vidéos et Shorts. Gérez les règles d’identifiant, d’UCID et de regex, avec automatisation et stockage local.

## Installation et utilisation

1. Installez [Tampermonkey](https://www.tampermonkey.net/).
2. Ouvrez l’URL brute ci-dessous ou collez `ytblockhandlecomments.js` dans un nouveau script.
3. Sur une vidéo ou un Short, faites un clic droit sur l’identifiant de l’auteur ou utilisez le menu `⋯` pour bloquer/débloquer sa chaîne.
4. Ouvrez le menu Tampermonkey du script pour gérer la liste, les paramètres ou la langue.

<https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

## Fonctionnalités

- **Blocage :** règles d’identifiant par défaut, paires UCID facultatives, regex indépendantes et respect de la casse. Seules les interactions avec les auteurs de commentaires sont enrichies.
- **Commentaires et automatisation :** masquage, remplacement gris ou cliquable ; avis négatif automatique, ajout par regex et mots-clés dans le texte, les identifiants ou les libellés épinglés. Les nœuds réutilisés sont retraités.
- **Liste de blocage :** recherche, filtres par type/étiquette, sélection, actions groupées et import/export JSON ou texte. Les résultats regex sont comptés, sélectionnés et paginés sans reconstruire toute la liste.
- **Paramètres :** huit sections uniformes : correspondance, commentaires, automatisation, paires, clé API, affichage/thème, journaux/diagnostic, réinitialisation. La navigation passe en haut sur petit écran. Enregistrement automatique et valeurs par défaut indiquées.
- **Apparence :** cinq tailles de texte/interface et thèmes clair, sombre, système, inversé, YouTube ou personnalisé. La synchronisation suit l’état sombre natif de YouTube ; seules les couleurs du script changent.
- **Performance :** correspondances en cache et recherche bornée des conteneurs de commentaires. 100 entrées par page ; le mode faible performance utilise 50, de petits lots, une recherche différée et des paires manuelles une par une. Les recherches ignorées ne sont pas relancées.
- **Journaux :** sorties locale et console séparées, niveau, conservation, préfixe, fuseau et dates ISO/personnalisées, test, téléchargement, effacement confirmé et détail V0–V5. Les données sensibles sont masquées ; aucun journal par commentaire.
- **État :** brouillons, recherche, filtres, sélection, page et défilement sont conservés à la navigation et au changement de langue. La navigation SPA réinitialise les observateurs temporaires ; les dialogues gèrent le focus clavier.

## Paires UCID

1. Le blocage est immédiat. La création de paire est activée par défaut et asynchrone ; un échec préserve les blocages et liens.
2. La création résout **identifiant → UCID** et sauvegarde la paire et une règle `id`. La mise à jour résout **UCID → nouvel identifiant**, conserve l’UCID et remplace l’ancien identifiant. Sans UCID, le chemin de création est utilisé.
3. Réglez séparément création, mises à jour et appairage immédiat : page seule, API seule ou page puis API en cas d’échec. La page ne demande aucune clé ; l’API exige une clé enregistrée.
4. Pour les UCID, activez la détection et les règles de paires. Utilisez le mode identifiant tant que la règle UCID manque. Les paires par mots-clés suivent la politique de création ; le mode faible performance autorise les actions manuelles.
5. Choisissez l’intervalle ou des secondes personnalisées (minimum une). Par défaut : 10 minutes pour les pages, une semaine pour l’API. L’actualisation globale respecte l’intervalle ; la sélection force la recherche.
6. Exécutez les paires dans la liste de blocage. Consultez états, résultats, filtres, tri, copie/export des échecs, progression et bannière vidéo. Les tests API donnent des conseils sur les échecs de quota répétés.
7. La page fournit les métadonnées de la chaîne ciblée. L’API exige un UCID identique et une URL personnalisée `@handle`. Données manquantes, conflits, annulations et échecs préservent les liens.

## Langues

L’interface et le README prennent en charge `en-us`, `ko-kr`, `ja-jp`, `de-de`, `zh-cn`, `zh-tw`, `fr-fr`, `pt-br`, `ru-ru` et `id-id`. Choisissez dans Paramètres → Affichage/thème ou le menu Tampermonkey. Le choix enregistré prime ; le mode automatique suit le navigateur, puis `en-us`.

Les variantes régionales suivent la langue disponible (`en-GB` → `en-us`, `pt-PT` → `pt-br`). Chinois : Hans/CN/SG → `zh-cn`, Hant/TW/HK/MO → `zh-tw` ; `zh` seul est simplifié. Les anciens choix `en`/`ko` restent valides. Wiki et changelog restent anglais/coréen ; les autres guides gardent leurs langues.

## Stockage et confidentialité

- `blocked_v2` : règles `handle`, `id` (UCID), `regex`. Formats JSON/texte inchangés, y compris `/pattern/flags`.
- `pair_meta_v1` : liens UCID et vérifications ; `app_settings_v1` : paramètres ; `youtube_data_api_v3_config` : clé, tests et quota ; `lang` : langue.
- Les paires et clés API sont exclues des imports/exports. Les clés restent locales et sont envoyées uniquement à l’API officielle. Les journaux téléchargés utilisent UTC ISO ; le navigateur choisit leur destination.
- La synchronisation utilise révisions et marqueurs de suppression pour fusionner les ajouts sans restaurer les suppressions. Un échec de lecture bloque les écritures ; une écriture refusée préserve les données.
- Les anciennes listes migrent seulement en l’absence de données actuelles valides. UID devient UCID sans modifier clés, révisions, suppressions ni dates. Rechargez les onglets utilisant l’ancien script.
- Les schémas, jetons de date et détails d’implémentation sont dans le Wiki ci-dessous.

## Valeurs par défaut

- Identifiants, masquage complet, avis négatifs désactivés, paires immédiates activées. Les trois politiques utilisent les pages à l’installation.
- Taille texte/interface 3 ; 2 correspond à l’ancienne. Diagnostic V3 : V0/V1 sans détails, V2 1 champ, V3 3, V4 6, V5 10.
- Mode faible performance et journaux désactivés. Les mots-clés ignorent la casse, ciblent le texte et n’agissent qu’après activation.
- Les mises à jour préservent réglages et intervalles personnalisés. Changer recherche ou langue ne réinitialise ni règles ni brouillons.

## Limites et remarques

- La page utilise une méthode non documentée, sensible aux changements HTML. L’API consomme du quota ; les règles UCID sont ensuite locales. Les tests utilisent une chaîne publique fixe.
- Les anciens identifiants peuvent être en minuscules ; réenregistrez-les pour garantir la casse. Les regex ciblent les identifiants, les mots-clés les champs sélectionnés.
- Les regex sont validées pour longueur, drapeaux et complexité ; les cibles sont limitées à 128 caractères. Traitement limité aux vidéos/Shorts pris en charge ; bannière sur vidéos seulement.
- Les réponses YouTube/API, contenus utilisateur, identifiants, protocoles et journaux machine ne sont pas traduits. Les lecteurs intégrés sont exclus ; seules les permissions indiquées sont utilisées.

## Documentation

- Wiki: [English](docs/WIKI.md) / [한국어](docs/WIKI.ko.md)
- Changelog: [English](docs/CHANGELOG.md) / [한국어](docs/CHANGELOG.ko.md)
- Guide de contribution: [English](CONTRIBUTING.md) / [한국어](CONTRIBUTING.ko.md)
- [TODO](docs/TODO.md) / [Aide à la revue](docs/ABOUT.md)

## Développement et vérification

- Sur `dev`, modifiez les modules TypeScript de `src/`. Les numéros guident la lecture, les imports ES l’exécution. Stockage partagé : `03a-gm-backed-store.ts` ; gestionnaire : `12a`–`12e`.
- Modifiez `src/template/`, pas les fichiers générés. `npm run build` régénère tous les README et `ytblockhandlecomments.js` compact en une transaction ; Tampermonkey charge ce script racine uniquement.
- Alignez les dix catalogues et README. `en.ts` définit les messages ; `locales.ts`, noms, chemins et contributeurs ; `i18n-mason.toml`, le périmètre. Préservez paramètres et texte machine.
- `npm run verify` lance lint, lint Markdown, types, tests déterministes `node:test`, build et contrôle des fichiers générés. Les commandes restent séparées ; signalez les contrôles omis.
- Commitez sources et fichiers générés ensemble avec Conventional Commits et une revue indépendante. Version et push exigent une autorisation. Publication : `npm run bump:version -- <MAJOR.MINOR.PATCH>`.

```sh
npm run lint
npm run lint:markdown
npm run typecheck
npm run build
npm run check:build
npm run verify
```

Les futurs contrôles navigateur restent séparés ; les tests automatiques ne demandent aucune session YouTube réelle.

## Contributeurs aux traductions

- 한국어 - Mango-Clark
- 日本語 - GPT-6.1 Sol
- Deutsch - GPT-6.1 Sol
- 简体中文 - GPT-6.1 Sol
- 繁體中文 - GPT-6.1 Sol
- Français - GPT-6.1 Sol
- Português (Brasil) - GPT-6.1 Sol
- Русский - GPT-6.1 Sol
- Bahasa Indonesia - GPT-6.1 Sol

## Auteur

- **Mango_Clark**
- Licence: MIT
