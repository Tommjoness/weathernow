# Weerbriefing

Statische weer-app op basis van Open-Meteo. Geen build, geen dependencies, geen API-sleutels.

## Draaien

Open `index.html` rechtstreeks in de browser, of zet alles op een statische host.
De service worker en het installeren als app werken alleen via https.

## Structuur

    index.html                de volledige app: opmaak, logica en tekst
    sw.js                     service worker, cachet de app maar nooit de weerdata
    manifest.json             gegevens voor het installeren als app
    icon-*.png                pictogrammen
    *.woff2                   Bodoni Moda, Instrument Sans en DM Mono, lokaal gehost
    api/waarschuwingen.js     serverless functie voor de MeteoAlarm-feed
    test/                     testsuite die de echte code uit index.html draait

## Bronnen

| onderdeel | bron | opmerking |
|---|---|---|
| uur- en dagverwachting | api.open-meteo.com | mix van ECMWF en DWD ICON |
| kwartierneerslag | api.open-meteo.com | alleen Europa en Noord-Amerika |
| spreiding | ensemble-api.open-meteo.com | ICON, veertig leden, drie dagen |
| luchtkwaliteit en pollen | air-quality-api.open-meteo.com | CAMS, pollen alleen in Europa |
| plaatsnamen | geocoding-api.open-meteo.com | |
| omgekeerd zoeken | api.bigdatacloud.net | bij Mijn locatie |
| radar | api.rainviewer.com | beelden per tien minuten |
| kaartondergrond | basemaps.cartocdn.com | |
| waarschuwingen | feeds.meteoalarm.org | via de eigen serverless functie |

Zon- en maanstand worden lokaal berekend, niet opgehaald.

De gratis laag van RainViewer levert alleen gemeten radarbeelden. De sleutel
`nowcast` staat wel in de JSON maar blijft leeg, want vooruitberekende beelden
zijn een betaalde functie. De app toont daarom vrijwel nooit stappen met het
label "verwachting". Dat is geen storing.

Bronvermelding is een voorwaarde bij RainViewer, CARTO en OpenStreetMap en
staat in de voettekst van de app. Laat die staan.

## Testen

    npm test

De suite leest `index.html` in en draait de echte functies, dus een wijziging in
de app wordt meteen meegenomen. Getoetst worden onder meer de zonstijden tegen
bekende referenties, de maanfase tegen bekende nieuwe en volle maan, de
briefingzinnen in vier weersituaties, vier randgevallen waaronder poolzomer en
ontbrekende data, en of de grafiek binnen zijn kader blijft op telefoon en desktop.

## Cache verversen

Na een wijziging het versienummer in `sw.js` ophogen, anders serveert de oude
service worker de vorige versie.
