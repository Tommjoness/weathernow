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
| luchtkwaliteit en pollen | air-quality-api.open-meteo.com | CAMS, pollen alleen in Europa |
| plaatsnamen | geocoding-api.open-meteo.com | |
| omgekeerd zoeken | api.bigdatacloud.net | bij Mijn locatie |
| radar | api.rainviewer.com | beelden per tien minuten |
| kaartondergrond | basemaps.cartocdn.com | |
| waarschuwingen | feeds.meteoalarm.org | via de eigen serverless functie |

Zon- en maanstand worden lokaal berekend, niet opgehaald.

De gratis laag van RainViewer levert alleen gemeten radarbeelden. De sleutel
`nowcast` staat wel in de JSON maar blijft leeg, want vooruitberekende beelden
zijn een betaalde functie.

Voor Nederland wordt dat gat gevuld met de neerslagverwachting van het KNMI,
tot twee uur vooruit per vijf minuten. Die komt binnen als kaartbeeld via WMS.
De functie `api/radarverwachting.js` haalt eenmalig op welke laag en welke
tijdstappen beschikbaar zijn, omdat het KNMI geen CORS-headers meegeeft. De
kaartbeelden zelf haalt de browser rechtstreeks op, want voor het tekenen van
een afbeelding is geen CORS nodig. Buiten Nederland valt dit weg en zie je
alleen gemeten beelden.

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

## KNMI-verwachting, wat je moet weten

Geverifieerd tegen de capabilities van het KNMI op 23 juli 2026:

    DATASET  radar_forecast_2.0
    LAYERS   precipitation_nowcast
    CRS      EPSG:3857 wordt ondersteund
    tijd     <Dimension name="time" ...>begin/eind/PT5M</Dimension>

De tijddimensie is een reeks over vele dagen, niet alleen de komende twee uur.
Lees hem daarom van achteren naar voren: het laatste moment in de reeks is het
nieuwste beschikbare beeld. Vanaf het begin lezen levert weken oude tijdstippen
op, en die vallen allemaal weg in het filter.

Op het moment van bouwen liep de anonieme WMS van het KNMI achter: het nieuwste
beeld was drie weken oud. De app meldt dat zelf onder de radar. Wordt de bron
weer bijgewerkt, dan verschijnt de vooruitblik vanzelf zonder aanpassing.
