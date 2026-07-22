const {laadKern}=require("./kern.js");
const {bouw}=require("./data.js");

let goed=0, fout=0;
const norm=t=>String(t==null?"":t).replace(/\u00a0/g," ");
function check(naam,voorwaarde,extra){
  if(voorwaarde){goed++;console.log("  ok   "+naam);}
  else{fout++;console.log("  FOUT "+naam+(extra?"   -> "+extra:""));}
}
function groep(n){console.log("\n"+n);}

/* 1. stand van zon en maan */
groep("Astronomie");
{
  const {api}=laadKern();
  const lat=52.3508, lon=5.2647;
  const naar=(d,off)=>new Date(d.getTime?d.getTime():d).toISOString();
  const gevallen=[["2026-07-22",2,344,1306],["2026-12-21",1,527,989],["2026-06-21",2,319,1324]];
  let grootste=0;
  for(const [dag,uur,opRef,onderRef] of gevallen){
    const [y,m,d2]=dag.split("-").map(Number);
    const off=uur*3600000;
    const r=api.opOnder("zon",Date.UTC(y,m-1,d2)-off,lat,lon);
    const min=x=>{const t=new Date(x+off);return t.getUTCHours()*60+t.getUTCMinutes();};
    grootste=Math.max(grootste,Math.abs(min(r.op)-opRef),Math.abs(min(r.onder)-onderRef));
  }
  check("zonsopkomst en ondergang binnen 4 minuten van de referentie",grootste<=4,"afwijking "+grootste+" min");
  const m1=api.maan(new Date("2024-01-11T11:57:00Z"));
  const m2=api.maan(new Date("2024-01-25T17:54:00Z"));
  check("nieuwe maan geeft bijna nul procent verlicht",m1.ill<0.03,(m1.ill*100).toFixed(1)+"%");
  check("volle maan geeft bijna honderd procent verlicht",m2.ill>0.97,(m2.ill*100).toFixed(1)+"%");
  check("maanfase heet correct bij volle maan",m2.naam==="volle maan",m2.naam);
}

/* 2. windkracht */
groep("Windkracht");
{
  const {api}=laadKern();
  check("0 km/u is 0 Bft",api.bft(0)===0);
  check("25 km/u is 4 Bft",api.bft(25)===4);
  check("70 km/u is 8 Bft",api.bft(70)===8);
  check("120 km/u is 12 Bft",api.bft(120)===12);
  check("benaming bij 5 Bft is volledig",api.BFTNAAM[5]==="vrij krachtige wind",api.BFTNAAM[5]);
}

/* 3. getalnotatie */
groep("Notatie");
{
  const {api}=laadKern();
  check("decimaal met komma",api.nl(1.6)==="1,6",api.nl(1.6));
  check("nul netjes",api.nl(0)==="0,0",api.nl(0));
  check("ontbrekende waarde",api.nl(null)==="–",api.nl(null));
}

/* 4. briefingzinnen in verschillende weersituaties */
groep("Briefing");
function brief(opties,breedte){
  const {api,bak}=laadKern(breedte);
  Object.assign(api.S,{d:bouw(opties),i0:14,op:Date.now(),lat:52.35,lon:5.26,label:"Test",dag:null,bereik:24});
  api.meters();api.briefing();api.nowcast();api.etmaal(14,24);api.dagen();api.nachten();
  const proxy=new Proxy(bak,{get:(o,k)=>{const e=o[k];if(!e)return e;
    return {get textContent(){return norm(e.textContent);},get innerHTML(){return norm(e.innerHTML);},
            getAttribute:x=>e.getAttribute(x)};}});
  return {tekst:norm(bak.brief.innerHTML).replace(/<[^>]+>/g,""),bak:proxy,api:api};
}
{
  const droog=brief({pp:()=>5,pr:()=>0,som:0}).tekst;
  check("droog etmaal meldt droog",/blijft het droog/.test(droog),droog);
  const bui=brief({pp:(u)=>u===18?80:5,pr:(u)=>u===18?2:0,som:2}).tekst;
  check("duidelijke bui krijgt tijd en kans",/tot 18:00.*80% kans/.test(bui),bui);
  const klein=brief({pp:(u)=>u===16?37:5,pr:()=>0,som:0}).tekst;
  check("kleine kans wordt genoemd, niet verzwegen",/grotendeels droog.*37%/.test(klein),klein);
  const regent=brief({nu:0.6,pp:(u)=>u<17?85:5,pr:(u)=>u<17?0.6:0,som:3}).tekst;
  check("het regent nu, met eindtijd",/Het regent nu, rond 17:00/.test(regent),regent);
  check("geen punt als decimaalteken in de briefing",!/\d\.\d/.test(bui),bui);
}

/* 5. metersteksten */
groep("Meters");
{
  const {bak}=brief({});
  const teksten=["windsub","gustsub","precsub","popsub","humsub","pressub","cloudsub","vissub"]
    .map(k=>bak[k].textContent);
  check("elke meter heeft een zin die eindigt op een punt",teksten.every(t=>/\.$/.test(t)),teksten.find(t=>!/\.$/.test(t)));
  check("geen punt als decimaalteken",teksten.every(t=>!/\d\.\d/.test(t)),teksten.find(t=>/\d\.\d/.test(t)));
  check("windrichting voluit",/noordwesten/.test(bak.windsub.textContent),bak.windsub.textContent);
  // de briefing en de meter mogen niet twee verschillende richtingen noemen
  const richtingen=["noorden","noordnoordoosten","noordoosten","oostnoordoosten","oosten","oostzuidoosten",
    "zuidoosten","zuidzuidoosten","zuiden","zuidzuidwesten","zuidwesten","westzuidwesten","westen",
    "westnoordwesten","noordwesten","noordnoordwesten"];
  const uitZin=t=>richtingen.filter(r=>new RegExp("uit het "+r+"\\b").test(t))[0];
  const {bak:b2}=brief({});
  const brf=b2.brief.innerHTML.replace(/<[^>]+>/g,"");
  check("briefing en windmeter noemen dezelfde richting",
    uitZin(brf)===uitZin(b2.windsub.textContent),
    "briefing: "+uitZin(brf)+", meter: "+uitZin(b2.windsub.textContent));
  // wind die draait wordt als draaiing beschreven, niet als andere beginrichting
  const {api:a3,bak:b3}=laadKern(1280);
  const d3=bouw({});
  const i3=d3.hourly.time.findIndex(t=>t.slice(0,13)===d3.current.time.slice(0,13));
  d3.hourly.wind_direction_10m=d3.hourly.wind_direction_10m.map((v,i)=>i>i3+2?200:315);
  d3.hourly.wind_speed_10m=d3.hourly.wind_speed_10m.map((v,i)=>i===i3+5?34:v);
  Object.assign(a3.S,{d:d3,op:Date.now(),lat:52.35,lon:5.26,label:"T",dag:null,bereik:24,i0:i3});
  a3.meters();a3.briefing();
  const t3=b3.brief.innerHTML.replace(/<[^>]+>/g,"");
  check("draaiende wind wordt als draaiing benoemd",/draaiend naar het zuidzuidwesten/.test(t3),t3);
  check("draaiende wind begint bij de huidige richting",uitZin(t3)==="noordwesten",uitZin(t3));
}

/* 6. randgevallen */
groep("Randgevallen");
{
  const gevallen=[["zonder kwartierdata",{geenKwartier:true}],["zonder zichtgegevens",{zicht:null}],
                  ["poolzomer",{poolzon:true}],["volledig bewolkt en mistig",{cc:()=>100,spreiding:0.5}]];
  for(const [naam,opties] of gevallen){
    let ok=true,mld="";
    try{ brief(opties); }catch(e){ ok=false; mld=e.message; }
    check(naam+" loopt niet vast",ok,mld);
  }
}

/* 7. grafiek blijft binnen zijn kader */
groep("Grafiek");
for(const breedte of [390,1280]){
  const {bak}=brief({},breedte);
  const vb=bak.chart.getAttribute("viewBox").split(" ").map(Number);
  const h=bak.chart.innerHTML;
  const X=[...h.matchAll(/(?:\sx|x1|x2|cx)="(-?[\d.]+)"/g)].map(m=>+m[1]);
  const Y=[...h.matchAll(/(?:\sy|y1|y2|cy)="(-?[\d.]+)"/g)].map(m=>+m[1]);
  check("bij "+breedte+"px valt niets buiten het kader",
    Math.min(...X)>=-14&&Math.max(...X)<=vb[2]+2&&Math.min(...Y)>=-2&&Math.max(...Y)<=vb[3]+2,
    "x "+Math.min(...X).toFixed(0)+" tot "+Math.max(...X).toFixed(0)+" in "+vb[2]);
}

/* 7b. aslabels mogen elkaar niet raken, bij geen enkel bereik */
groep("Leesbaarheid van de grafiek");
for(const [naam,n,br] of [["24 uur op de desktop",24,1280],["48 uur op de desktop",48,1280],
                          ["7 dagen op de desktop",168,1280],["24 uur op de telefoon",24,390],
                          ["7 dagen op de telefoon",168,390]]){
  const {api,bak}=laadKern(br);
  Object.assign(api.S,{d:bouw({}),op:Date.now(),lat:52.35,lon:5.26,label:"T",dag:null,bereik:n});
  api.S.i0=api.S.d.hourly.time.findIndex(t=>t.slice(0,13)===api.S.d.current.time.slice(0,13));
  api.etmaal(api.S.i0,n);
  const h=bak.chart.innerHTML;
  const as=[...h.matchAll(/<text x="([\d.]+)" y="[\d.]+" text-anchor="middle"[^>]*font-size="([\d.]+)">([^<]+)</g)]
    .filter(m=>/^(\d\d|ma|di|wo|do|vr|za|zo)$/.test(m[3]))
    .map(m=>({x:+m[1],b:m[3].length*(+m[2])*0.6}));
  as.sort((a,b)=>a.x-b.x);
  let botsing=0;
  for(let i=1;i<as.length;i++) if(as[i].x-as[i-1].x<(as[i].b+as[i-1].b)/2) botsing++;
  check(naam+": aslabels overlappen niet",botsing===0,botsing+" botsingen bij "+as.length+" labels");
}

/* 8. tabellen */
groep("Tabellen");
{
  const {bak}=brief({});
  check("zeven dagen heeft een kopregel",/class="row day kop"/.test(bak.days.innerHTML));
  check("zeven dagen heeft zeven rijen",(bak.days.innerHTML.match(/class="row day"/g)||[]).length===7);
  check("nachtzicht toont maantijden",/maan op|maan onder|maan /.test(bak.nights.innerHTML));
}

/* 7c. nachtzicht reageert op bewolking en op de stand van de maan */
groep("Nachtzicht");
{
  const helder=brief({cc:(u)=>u<6||u>20?8:60});
  const bewolkt=brief({cc:()=>100});
  const rij=h2=>[...h2.matchAll(/class="score"[^>]*>([^<]*)<[\s\S]*?class="nmeta wide">([^<]*)/g)].filter(m=>/^\d/.test(m[1]));
  const rh=rij(helder.bak.nights.innerHTML), rb=rij(bewolkt.bak.nights.innerHTML);
  const score=t=>parseFloat(String(t).replace(",","."));
  check("heldere nacht geeft een hoge score",score(rh[0][1])>7,rh[0][1]);
  check("bewolkte nacht geeft een lage score",score(rb[0][1])<1,rb[0][1]);
  check("heldere nacht krijgt een waarneemvenster",/helder \d\d:\d\d/.test(rh[0][2]),rh[0][2]);
  check("bewolkte nacht krijgt geen venster",/geen venster/.test(rb[0][2]),rb[0][2]);
  check("maantijden staan er altijd bij",/maan \d\d:\d\d/.test(rh[0][2])&&/maan \d\d:\d\d/.test(rb[0][2]));
}

/* 8b. teksten noemen altijd een waarde en waar het kan een tijdstip */
groep("Volledigheid van de teksten");
{
  const {bak}=brief({temp:(u)=>u<14?22-Math.abs(u-13):16});   // piek lag om 13:00, dus in het verleden
  const t=bak.brief.innerHTML.replace(/<[^>]+>/g,"");
  check("warmste moment in het verleden krijgt tijd en temperatuur",/warmst rond \d\d:\d\d met \d+ graden/.test(t),t);
  const nat=brief({pr:(u)=>u<12?0.4:0,pp:(u)=>u<12?70:5,som:2.4}).bak;
  check("neerslag die al gevallen is heet 'viel'",/viel er/.test(nat.precsub.textContent),nat.precsub.textContent);
  const komt=brief({pr:(u)=>u===20?1.5:0,pp:(u)=>u===20?70:5,som:1.5}).bak;
  check("neerslag die nog komt heet 'verwacht'",/nog .* verwacht/.test(komt.precsub.textContent),komt.precsub.textContent);
  const alle=["windsub","gustsub","precsub","popsub","humsub","pressub","cloudsub","vissub"].map(k=>bak[k].textContent);
  check("geen enkele meter meldt een piek zonder tijdstip",
    alle.every(x=>!/(piekte|was|Toppen|meeste)/.test(x)||/\d\d:\d\d/.test(x)),
    alle.find(x=>/(piekte|was|Toppen|meeste)/.test(x)&&!/\d\d:\d\d/.test(x)));
}

/* 8c. elk getal in de tekst hoort een eenheid of een tijd te hebben */
groep("Eenheden");
{
  // toegestaan achter een getal: graadteken, procent, mm, km, m, hPa, Bft, uitgeschreven eenheden,
  // of het getal is deel van een tijdstip of een datum
  const eenheid=/(?:\s?(?:°|%|graden|graad|procent|mm|km\/u|km|meter|m\b|hPa|Bft|uur|minuut|minuten|korrels|µg)|:\d\d)/;
  const scenarios=[
    ["warmste moment geweest",{temp:(u)=>u<14?22-Math.abs(u-13):16}],
    ["regen op komst",{pr:(u)=>u===20?1.5:0,pp:(u)=>u===20?70:5,som:1.5}],
    ["regen gevallen",{pr:(u)=>u<12?0.4:0,pp:(u)=>u<12?70:5,som:2.4}],
    ["droog en rustig",{pp:()=>4,pr:()=>0,som:0}],
    ["mistig",{spreiding:0.6,cc:()=>100}],
    ["harde wind",{ws:62,wsNu:62,wg:()=>92}]
  ];
  const fout2=[];
  for(const [naam,opties] of scenarios){
    const {bak}=brief(opties);
    const teksten=[bak.brief.innerHTML.replace(/<[^>]+>/g,""),
      ...["windsub","gustsub","precsub","popsub","humsub","pressub","cloudsub","vissub","nctext"].map(k=>bak[k].textContent||"")];
    for(const t of teksten){
      // loop elk getal langs en kijk wat er direct achter staat
      for(const m2 of t.matchAll(/(\d+(?:[.,]\d+)?)/g)){
        const rest=t.slice(m2.index+m2[0].length);
        const voor=t.slice(Math.max(0,m2.index-1),m2.index);
        if(voor===":") continue;                 // tweede helft van een tijdstip
        if(/^:\d\d/.test(rest)) continue;        // eerste helft van een tijdstip
        const ervoor=t.slice(Math.max(0,m2.index-28),m2.index);
        if(/index[^.]*$/.test(ervoor)) continue;   // een index is dimensieloos, maar krijgt wel een duiding
        if(!eenheid.test(rest.slice(0,10))) fout2.push(naam+": \""+t.trim()+"\"");
      }
    }
  }
  check("elk getal in de teksten heeft een eenheid of is een tijdstip",fout2.length===0,fout2[0]);
  const alles=[];
  for(const [,opties] of scenarios){
    const {bak}=brief(opties);
    alles.push(bak.brief.innerHTML.replace(/<[^>]+>/g,""));
    ["windsub","gustsub","precsub","popsub","humsub","pressub","cloudsub","vissub","nctext"].forEach(k=>alles.push(bak[k].textContent||""));
  }
  const tekst=alles.join(" ");
  check("snelheid overal als km/u geschreven",!/km per uur/.test(tekst));
  check("percentage overal met het teken geschreven",!/\d\s?procent/.test(tekst));
  // getal en eenheid mogen niet over twee regels breken
  const ruw=[];
  for(const [,opties] of scenarios){
    const {api:a4}=laadKern();
    Object.assign(a4.S,{d:bouw(opties),op:Date.now(),lat:52.35,lon:5.26,label:"T",dag:null,bereik:24});
    a4.S.i0=a4.S.d.hourly.time.findIndex(t=>t.slice(0,13)===a4.S.d.current.time.slice(0,13));
    a4.meters();a4.briefing();
  }
  const html=require("fs").readFileSync(require("path").join(__dirname,"..","index.html"),"utf8");
  check("er is een functie die getal en eenheid aan elkaar houdt",/const nbsp=/.test(html));
  check("de onderschriften lopen via die functie",(html.match(/zetTekst\(/g)||[]).length>=8);
  for(const bron of ["Open-Meteo","RainViewer","CARTO","OpenStreetMap"])
    check("voettekst vermeldt "+bron,html.includes(bron));
  // niets mag horizontaal buiten beeld vallen
  const stijl=html.slice(html.indexOf("<style>"),html.indexOf("</style>"));
  check("pagina kan niet zijwaarts schuiven",/overflow-x:clip/.test(stijl));
  check("knoppenbalk krijgt de schermbreedte op de telefoon",/\.mastright\{[^}]*width:100%/.test(stijl));
  check("knoppenbalk breekt af op smalle schermen",/max-width:430px\)\{[\s\S]*?flex-wrap:wrap/.test(stijl));
}

/* 9. opmaak: variabelen die gebruikt worden moeten ook bestaan */
groep("Opmaak");
{
  const fs2=require("fs"),path2=require("path");
  const html=fs2.readFileSync(path2.join(__dirname,"..","index.html"),"utf8");
  const css=html.slice(html.indexOf("<style>"),html.indexOf("</style>"));
  const gebruikt=[...new Set([...css.matchAll(/var\((--[\w-]+)\)/g)].map(m=>m[1]))];
  const gedefinieerd=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
  const missend=gebruikt.filter(v=>!gedefinieerd.has(v));
  check("elke gebruikte CSS-variabele is ook gedefinieerd",missend.length===0,missend.join(", "));
  const jsDeel=html.slice(html.indexOf("<script>"));
  const inJs=[...new Set([...jsDeel.matchAll(/var\((--[\w-]+)\)/g)].map(m=>m[1]))];
  const missendJs=inJs.filter(v=>!gedefinieerd.has(v));
  check("elke variabele die de tekencode gebruikt bestaat ook",missendJs.length===0,missendJs.join(", "));
  const moetCentraal=[".dwind",".dmin,.dmax",".drain",".score",".nmeta","#aq .stat"];
  const nietCentraal=moetCentraal.filter(sel=>{
    const re2=new RegExp(sel.replace(/[.#*]/g,"\\$&")+"\\{([^}]*)\\}");
    const m2=css.match(re2);
    return !m2||!/text-align:center/.test(m2[1]);
  });
  check("alle getalkolommen staan gecentreerd",nietCentraal.length===0,nietCentraal.join(", "));
}

console.log("\n"+goed+" geslaagd, "+fout+" mislukt");
process.exit(fout?1:0);
