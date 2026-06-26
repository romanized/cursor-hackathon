# Reverse-engineering — hoe hookm.ai het doet

Doel: het "recept" achter hookm.ai blootleggen zodat we het zelf kunnen nabouwen.

> Sluit aan op **stap 3-6** in [../PROJECT.md](../PROJECT.md).

## Wat we al zien (de logica)
- Je scrapet een product en levert: **productnaam**, **probleem** (waar is het goed voor), **wie gebruikt het**, benefits.
- Het programma kiest een viraal format (bv. Skeleton AI, Simpsons-achtige cartoon) en toont daar een voorbeeld/uitleg bij.
- Uit het probleem → een **script** (voiceover). Het script wordt opgedeeld in **beats**.
- Per beat → een **visuele prompt** → een **afbeelding**.
- We krijgen dus: het script + de afbeeldingen.

## Wat we NIET zien (zelf bedenken)
- Wat het doet voor de **video's / motion** (beeld → bewegende clip). Hiervoor eigen inspiratie/research.

## Reverse-engineering sessie (later — door gebruiker)
Neem 5-6 verschillende producten. Houd de variabelen vast (zelfde template + runtime) zodat de output vergelijkbaar is. Leg per product vast:

| # | Input (naam / probleem / wie / benefits) | Output: voiceover-script | # beats | Per-beat visuele prompt | Beeldstijl |
|---|------------------------------------------|--------------------------|---------|-------------------------|------------|
| 1 |                                          |                          |         |                         |            |
| 2 |                                          |                          |         |                         |            |
| 3 |                                          |                          |         |                         |            |
| 4 |                                          |                          |         |                         |            |
| 5 |                                          |                          |         |                         |            |

→ Hieruit destilleren we de vaste **formule** (script-structuur, aantal beats, prompt-patroon, beeldstijl) voor ons eigen systeem.