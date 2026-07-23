// Haalt bij het KNMI op welke lagen en tijdstappen de neerslagverwachting heeft.
// De browser kan dat niet zelf doen omdat het KNMI geen CORS-headers meegeeft,
// vandaar deze tussenstap. De kaartbeelden zelf haalt de browser wel rechtstreeks op,
// want voor het tekenen van een afbeelding is geen CORS nodig.

const BASIS = "https://anonymous.api.dataplatform.knmi.nl/wms/adaguc-server";
const DATASETS = ["radar_forecast_2.0", "radar_forecast"];

function tijdenUit(waarde) {
  const uit = [];
  for (const deel of String(waarde).split(",")) {
    const stuk = deel.trim();
    if (!stuk) continue;
    if (stuk.includes("/")) {
      // vorm: begin/eind/PT5M
      const [van, tot, stap] = stuk.split("/");
      const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(stap || "PT5M");
      const ms = ((+(m && m[1] || 0)) * 60 + (+(m && m[2] || 5))) * 60000;
      let t = Date.parse(van), eind = Date.parse(tot);
      if (!isFinite(t) || !isFinite(eind) || ms <= 0) continue;
      let veiligheid = 0;
      while (t <= eind && veiligheid++ < 200) {
        uit.push(new Date(t).toISOString().replace(/\.\d+Z$/, "Z"));
        t += ms;
      }
    } else {
      uit.push(stuk);
    }
  }
  return uit;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=240, stale-while-revalidate=600");

  for (const dataset of DATASETS) {
    const url = BASIS + "?DATASET=" + dataset + "&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities";
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Weerbriefing/1.0" }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const xml = await r.text();

      // eerste laag met een naam en een tijddimensie
      const lagen = xml.split(/<Layer[\s>]/).slice(1);
      for (const laag of lagen) {
        const naam = (laag.match(/<Name>([^<]+)<\/Name>/) || [])[1];
        if (!naam) continue;
        const dim = laag.match(/<Dimension[^>]*name="time"[^>]*>([\s\S]*?)<\/Dimension>/i);
        if (!dim) continue;
        const tijden = tijdenUit(dim[1]);
        if (tijden.length < 2) continue;
        return res.status(200).json({
          dataset: dataset,
          laag: naam,
          basis: BASIS + "?DATASET=" + dataset,
          tijden: tijden.slice(-30)
        });
      }
    } catch (e) {
      // volgende dataset proberen
    }
  }
  return res.status(200).json({ dataset: null, laag: null, basis: null, tijden: [] });
}
