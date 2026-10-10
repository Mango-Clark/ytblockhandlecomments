<!-- Generated from src/template templates by npm run build. Edit the templates instead. -->
# 📌 YouTube Comment Blocker — v1.5.4

[English (US)](../../README.md) | [한국어](../ko-kr/README.md) | [日本語](../ja-jp/README.md) | [Deutsch](README.md) | [简体中文](../zh-cn/README.md) | [繁體中文](../zh-tw/README.md) | [Français](../fr-fr/README.md) | [Português (Brasil)](../pt-br/README.md) | [Русский](../ru-ru/README.md) | [Bahasa Indonesia](../id-id/README.md)

Ein Tampermonkey-Skript zum Ausblenden von YouTube-Kommentaren nach Kanal auf Video- und Shorts-Seiten. Handle-, UCID- und Regex-Regeln mit konfigurierbarer Automatik und lokalem Speicher.

## Installation und Nutzung

1. [Tampermonkey](https://www.tampermonkey.net/) installieren.
2. Die folgende Raw-URL öffnen oder `ytblockhandlecomments.js` in ein neues Benutzerskript einfügen.
3. Auf einer Video- oder Shorts-Seite den Handle eines Kommentarautors rechts anklicken oder das `⋯`-Menü zum Sperren/Entsperren nutzen.
4. Über das Tampermonkey-Menü des Skripts Sperrliste, Einstellungen oder UI-Sprache öffnen.

<https://raw.githubusercontent.com/Mango-Clark/ytblockhandlecomments/refs/heads/master/ytblockhandlecomments.js>

## Funktionen

- **Sperren:** standardmäßig Handle-Regeln, optional UCID-Paare, unabhängige Regex-Regeln und Groß-/Kleinschreibung. Erweitert werden nur Aktionen für Kommentarautoren.
- **Kommentare und Automatik:** Ausblenden, grauer oder anklickbarer Platzhalter, automatische negative Bewertung, Regex-Autoaufnahme sowie Schlüsselwörter in Text, Handles und Anheftungslabels. Wiederverwendete Knoten werden erneut verarbeitet.
- **Sperrliste:** Suche, Typ-/Tagfilter, Auswahl, Stapelaktionen und JSON-/Textimport und -export. Regex-Treffer werden gezählt, ausgewählt, aufgeklappt und seitenweise angezeigt, ohne die ganze Liste neu aufzubauen.
- **Einstellungen:** acht einheitliche Bereiche: Abgleich, Kommentare, Automatik, Paare, API-Schlüssel, Anzeige/Design, Protokolle/Diagnose, Zurücksetzen. Auf schmalen Bildschirmen steht die Navigation oben. Änderungen werden automatisch gespeichert; Standardwerte sind markiert.
- **Darstellung:** fünf Text-/UI-Größen und helle, dunkle, System-, invertierte, YouTube- oder eigene Designs. Synchronisierung nutzt native YouTube-Dunkelsignale; Farben betreffen nur das Skript.
- **Leistung:** zwischengespeicherter Abgleich und begrenzte Kommentarhost-Suche. 100 Einträge pro Seite; der optionale Sparmodus nutzt 50, kleinere Stapel, verzögerte Suche und manuelle Einzelanfragen. Übersprungene automatische Suchen werden nicht nachgeholt.
- **Protokolle:** lokale und Konsolenausgabe, Stufe, Aufbewahrung, Präfix, Zeitzone und ISO-/eigene Zeitformate, Test, Download, bestätigtes Löschen sowie V0–V5. Sensible Werte werden entfernt; einzelne Kommentarprüfungen werden nicht protokolliert.
- **Zustand:** Entwürfe sowie Suche, Filter, Auswahl, Seite und Scrollposition bleiben bei Navigation und Sprachwechsel erhalten. SPA-Navigation setzt temporäre Beobachter zurück; Dialoge verwalten den Tastaturfokus.

## UCID-Paare

1. Handle-Sperren gelten sofort. Sofortige Paarerstellung ist standardmäßig aktiv und asynchron; Fehler erhalten bestehende Sperren und Links.
2. Erstellen löst **Handle → UCID** auf und speichert Paar und `id`-Regel. Aktualisieren löst **UCID → aktueller Handle** auf, behält die UCID und ersetzt alte Handles. Ohne UCID wird erstellt.
3. Erstellen, Aktualisieren und Sofortverknüpfung separat auf Seite, offizielle API oder Seite mit API-Ersatz einstellen. Seitensuche braucht keinen Schlüssel; API-Anfragen schon.
4. Für UCID-Abgleich Erkennung und Paarregeln aktivieren. Bis die UCID-Regel existiert, Handle-Modus nutzen. Schlüsselwortpaare folgen der Erstellungspolitik; im Sparmodus sind manuelle Aktionen erlaubt.
5. Intervall oder eigene Sekunden wählen (mindestens eine Sekunde). Standard: Seite 10 Minuten, API eine Woche. Gesamtläufe beachten das Intervall; ausgewählte Handles werden erzwungen aktualisiert.
6. Paaraktionen in der Sperrliste ausführen. Status, Einzelergebnisse, Filter, Sortierung, Fehlerexport, Fortschritt und Videobanner prüfen. Schlüsseltests zeigen Hinweise bei wiederholten Kontingentfehlern.
7. Seitensuche liest eigene Kanalmetadaten. API-Updates benötigen passende UCID und eine `@handle`-URL. Fehlende Daten, Konflikte, Abbruch und Suchfehler erhalten bestehende Links.

## Sprachen

UI und README unterstützen `en-us`, `ko-kr`, `ja-jp`, `de-de`, `zh-cn`, `zh-tw`, `fr-fr`, `pt-br`, `ru-ru` und `id-id`. Auswahl unter Einstellungen → Anzeige/Design oder im Tampermonkey-Sprachmenü. Gespeicherte Auswahl hat Vorrang; automatisch gelten Browserpräferenzen, danach `en-us`.

Regionale Varianten werden zugeordnet (`en-GB` → `en-us`, `pt-PT` → `pt-br`). Chinesisch: Hans/CN/SG → `zh-cn`, Hant/TW/HK/MO → `zh-tw`; `zh` allein nutzt vereinfacht. Gespeichertes `en`/`ko` bleibt gültig. Wiki und Changelog bleiben Englisch/Koreanisch; andere Anleitungen behalten ihre Sprachen.

## Speicher und Datenschutz

- `blocked_v2`: Regeln für `handle`, `id` (UCID), `regex`. JSON-/Textformat einschließlich `/pattern/flags` bleibt erhalten.
- `pair_meta_v1`: UCID-Verknüpfungen und Prüfungen; `app_settings_v1`: Einstellungen; `youtube_data_api_v3_config`: Schlüssel und Tests/Kontingent; `lang`: Sprachwahl.
- Paardaten und API-Schlüssel sind vom Listenimport/-export ausgeschlossen. Schlüssel werden lokal gespeichert und nur für offizielle API-Anfragen gesendet. Downloads verwenden UTC-ISO-Zeit; der Browser bestimmt den Zielort.
- Tabs synchronisieren über Revisionen und Löschmarkierungen, damit Ergänzungen zusammengeführt und gelöschte Regeln/Logs nicht wiederhergestellt werden. Lesefehler sperren Schreibzugriffe; abgelehnte Schreibzugriffe erhalten Daten.
- Alte Listen migrieren nur ohne gültige aktuelle Daten. UID wird zu UCID, während Schlüssel, Revisionen, Löschmarker und Zeiten erhalten bleiben. Tabs mit älteren Versionen nach Updates neu laden.
- Detaillierte Schemas, Zeitformat-Tokens und Implementierungsverhalten stehen im folgenden Wiki.

## Standardwerte

- Handle-Abgleich, vollständig ausblenden, negative Bewertung aus, Sofortpaare ein. Neue Installationen nutzen für alle drei Suchen Kanalseiten.
- Text/UI Stufe 3; Stufe 2 entspricht früher. Diagnose V3; V0/V1 ohne Payload, V2 1 Feld, V3 3, V4 6, V5 10.
- Sparmodus und Protokolle aus. Schlüsselwörter ignorieren Groß-/Kleinschreibung, prüfen standardmäßig Kommentartext und handeln erst nach Aktivierung.
- Updates erhalten Einstellungen und eigene Intervalle. Such- und Sprachwechsel setzen Regeln und Entwürfe nicht zurück.

## Grenzen und Hinweise

- Seitensuche ist undokumentiert und kann nach HTML-Änderungen fehlschlagen. API nutzt Kontingent; vorhandene UCID-Regeln werden lokal abgeglichen. Schlüsseltests verwenden einen festen öffentlichen Kanal.
- Ältere Handles können kleingeschrieben sein; exakte Großschreibung ist erst nach erneutem Speichern garantiert. Regex prüft Handles; Schlüsselwörter nur gewählte Felder.
- Regex wird auf Länge, Flags und Struktur geprüft; Ziele sind auf 128 Zeichen begrenzt. Kommentare nur in unterstützten Video-/Shorts-Bereichen; Prüfbanner nur auf Videoseiten.
- YouTube-/API-Antworten, Nutzerinhalte, Kanal-IDs, Protokollfelder und maschinenlesbare Logs werden nicht übersetzt. Eingebettete Player sind ausgeschlossen; nur aufgeführte Tampermonkey-Rechte werden genutzt.

## Dokumentation

- Wiki: [English](../WIKI.md) / [한국어](../ko-kr/WIKI.md)
- Changelog: [English](../CHANGELOG.md) / [한국어](../ko-kr/CHANGELOG.md)
- Beitragsleitfaden: [English](../../CONTRIBUTING.md) / [한국어](../ko-kr/CONTRIBUTING.md)
- [TODO](../TODO.md) / [Review-Hilfe](../ABOUT.md)

## Entwicklung und Prüfung

- Auf `dev` die TypeScript-Module in `src/` bearbeiten. Nummern geben Lesereihenfolge vor, ES-Imports die Laufzeit. Gemeinsamer Speicher: `03a-gm-backed-store.ts`; Manager: `12a`–`12e`.
- Dokumentvorlagen in `src/template/` bearbeiten, keine generierten Dateien. `npm run build` erzeugt alle READMEs und das kompakte `ytblockhandlecomments.js` transaktional; Tampermonkey lädt nur das Root-Skript.
- Alle zehn UI-Kataloge und READMEs abgleichen. `en.ts` definiert Nachrichten, `locales.ts` Namen, Pfade und Mitwirkende; `i18n-mason.toml` den Umfang. Platzhalter und Maschinenwerte erhalten.
- `npm run verify` führt Lint, Markdown-Lint, Typprüfung, deterministische `node:test`-Fälle, Build und Generierungsprüfung aus. Einzelbefehle bleiben verfügbar; ausgelassene Prüfungen melden.
- Quellen und Ausgabe gemeinsam mit Conventional Commits einreichen und unabhängig prüfen lassen. Versionen/Push nur mit Erlaubnis. Releases: `npm run bump:version -- <MAJOR.MINOR.PATCH>`.

```sh
npm run lint
npm run lint:markdown
npm run typecheck
npm run build
npm run check:build
npm run verify
```

Optionale spätere Browserprüfungen bleiben getrennt; automatische Tests benötigen keine echte YouTube-Sitzung.

## Übersetzungsmitwirkende

- 한국어 - Mango-Clark
- 日本語 - GPT-6.1 Sol
- Deutsch - GPT-6.1 Sol
- 简体中文 - GPT-6.1 Sol
- 繁體中文 - GPT-6.1 Sol
- Français - GPT-6.1 Sol
- Português (Brasil) - GPT-6.1 Sol
- Русский - GPT-6.1 Sol
- Bahasa Indonesia - GPT-6.1 Sol

## Autor

- **Mango_Clark**
- Lizenz: MIT
