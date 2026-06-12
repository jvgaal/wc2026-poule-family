// data.js — 2026 FIFA World Cup Tournament Data

// ISO 3166-1 alpha-2 flag image URLs (flagcdn.com)
const FLAG = (code) => `https://flagcdn.com/w80/${code.toLowerCase()}.png`;

const WC = {
  name: "FIFA World Cup 2026",
  host: "USA · Canada · Mexico",
  start: "2026-06-11",
  end: "2026-07-19",
  finalVenue: "MetLife Stadium, New York / New Jersey",

  // Auto-lock schedule. A round locks once its date passes (admin can also
  // lock early via the lock grid). June = UTC+2 for both Amsterdam (CEST) and
  // Zambia (CAT), so these are the same instant for everyone. KO rounds carry
  // their own `lockDate` on each WC.koRounds entry below.
  groupLockDate: "2026-06-11T17:00:00+02:00", // first group match kickoff
  bonusLockDate: "2026-06-13T12:00:00+02:00",

  teams: {
    // Group A
    MEX: { name: "Mexico",              flag: FLAG('mx') },
    RSA: { name: "South Africa",        flag: FLAG('za') },
    KOR: { name: "Korea Republic",      flag: FLAG('kr') },
    CZE: { name: "Czechia",             flag: FLAG('cz') },
    // Group B
    CAN: { name: "Canada",              flag: FLAG('ca') },
    SUI: { name: "Switzerland",         flag: FLAG('ch') },
    QAT: { name: "Qatar",               flag: FLAG('qa') },
    BIH: { name: "Bosnia & Herz.",      flag: FLAG('ba') },
    // Group C
    BRA: { name: "Brazil",              flag: FLAG('br') },
    MAR: { name: "Morocco",             flag: FLAG('ma') },
    HAI: { name: "Haiti",               flag: FLAG('ht') },
    SCO: { name: "Scotland",            flag: FLAG('gb') },  // no Scotland-specific on flagcdn
    // Group D
    USA: { name: "USA",                 flag: FLAG('us') },
    PAR: { name: "Paraguay",            flag: FLAG('py') },
    AUS: { name: "Australia",           flag: FLAG('au') },
    TUR: { name: "Türkiye",             flag: FLAG('tr') },
    // Group E
    GER: { name: "Germany",             flag: FLAG('de') },
    CUW: { name: "Curaçao",             flag: FLAG('cw') },
    CIV: { name: "Côte d'Ivoire",       flag: FLAG('ci') },
    ECU: { name: "Ecuador",             flag: FLAG('ec') },
    // Group F
    NED: { name: "Netherlands",         flag: FLAG('nl') },
    JPN: { name: "Japan",               flag: FLAG('jp') },
    TUN: { name: "Tunisia",             flag: FLAG('tn') },
    SWE: { name: "Sweden",               flag: FLAG('se') },
    // Group G
    BEL: { name: "Belgium",             flag: FLAG('be') },
    EGY: { name: "Egypt",               flag: FLAG('eg') },
    IRN: { name: "Iran",                flag: FLAG('ir') },
    NZL: { name: "New Zealand",         flag: FLAG('nz') },
    // Group H
    ESP: { name: "Spain",               flag: FLAG('es') },
    CPV: { name: "Cabo Verde",           flag: FLAG('cv') },
    KSA: { name: "Saudi Arabia",        flag: FLAG('sa') },
    URU: { name: "Uruguay",             flag: FLAG('uy') },
    // Group I
    FRA: { name: "France",              flag: FLAG('fr') },
    SEN: { name: "Senegal",             flag: FLAG('sn') },
    NOR: { name: "Norway",              flag: FLAG('no') },
    IRQ: { name: "Iraq",                flag: FLAG('iq') },
    // Group J
    ARG: { name: "Argentina",           flag: FLAG('ar') },
    ALG: { name: "Algeria",             flag: FLAG('dz') },
    AUT: { name: "Austria",             flag: FLAG('at') },
    JOR: { name: "Jordan",              flag: FLAG('jo') },
    // Group K
    POR: { name: "Portugal",            flag: FLAG('pt') },
    UZB: { name: "Uzbekistan",          flag: FLAG('uz') },
    COL: { name: "Colombia",            flag: FLAG('co') },
    COD: { name: "Congo DR",            flag: FLAG('cd') },
    // Group L
    ENG: { name: "England",             flag: FLAG('gb') },  // no England-specific on flagcdn
    CRO: { name: "Croatia",             flag: FLAG('hr') },
    GHA: { name: "Ghana",               flag: FLAG('gh') },
    PAN: { name: "Panama",               flag: FLAG('pa') },
  },

  groups: [
    { id: "A", teams: ["MEX", "RSA", "KOR", "CZE"] },
    { id: "B", teams: ["CAN", "SUI", "QAT", "BIH"] },
    { id: "C", teams: ["BRA", "MAR", "HAI", "SCO"] },
    { id: "D", teams: ["USA", "PAR", "AUS", "TUR"] },
    { id: "E", teams: ["GER", "CUW", "CIV", "ECU"] },
    { id: "F", teams: ["NED", "JPN", "TUN", "SWE"] },
    { id: "G", teams: ["BEL", "EGY", "IRN", "NZL"] },
    { id: "H", teams: ["ESP", "CPV", "KSA", "URU"] },
    { id: "I", teams: ["FRA", "SEN", "NOR", "IRQ"] },
    { id: "J", teams: ["ARG", "ALG", "AUT", "JOR"] },
    { id: "K", teams: ["POR", "UZB", "COL", "COD"] },
    { id: "L", teams: ["ENG", "CRO", "GHA", "PAN"] },
  ],

  scoring: {
    groupExact:  2,
    groupResult: 1,
    thirdQualifier: 2,   // points per correctly predicted qualifying 3rd-placed team
    ko: { r32: 2, r16: 3, qf: 4, sf: 5, third: 3, final: 8 },
    bonus: {
      winner: 10, runner_up: 5, golden_boot: 8, golden_ball: 5,
      total_goals_3: 5, total_goals_8: 3, total_goals_15: 1,
      first_out: 3, top_scoring_team: 4
    }
  },

  koRounds: [
    { id: "r32",   name: "Round of 32",    short: "R32", matches: 16, pts: 2, lockDate: "2026-06-28", startMatch: 73  },
    { id: "r16",   name: "Round of 16",    short: "R16", matches: 8,  pts: 3, lockDate: "2026-07-05", startMatch: 89  },
    { id: "qf",    name: "Quarter-Finals", short: "QF",  matches: 4,  pts: 4, lockDate: "2026-07-10", startMatch: 97  },
    { id: "sf",    name: "Semi-Finals",    short: "SF",  matches: 2,  pts: 5, lockDate: "2026-07-14", startMatch: 101 },
    { id: "third", name: "3rd Place",      short: "3rd", matches: 1,  pts: 3, lockDate: "2026-07-18", startMatch: 103 },
    { id: "final", name: "Final",          short: "F",   matches: 1,  pts: 8, lockDate: "2026-07-19", startMatch: 104 },
  ],

  bonusQuestions: [
    {
      id: "winner", emoji: "🏆",
      question: "Who will win the 2026 World Cup?",
      type: "team", points: 10,
      tip: "Spain (+450) · France (+550) · England (+650) · Brazil (+850) · Argentina (+850)",
      links: [
        { label: "Oddschecker",    url: "https://www.oddschecker.com/football/world-cup/winner" },
        { label: "ESPN Betting",   url: "https://www.espn.com/espn/betting/story/_/id/48386952/espn-soccer-futbol-world-cup-betting-odds-championship-groups" },
        { label: "Covers.com",     url: "https://www.covers.com/world-cup/odds" },
        { label: "Polymarket",     url: "https://polymarket.com/event/2026-fifa-world-cup-winner-595" },
      ]
    },
    {
      id: "runner_up", emoji: "🥈",
      question: "Who will be the runner-up (reach the Final)?",
      type: "team", points: 5,
      tip: "Which bracket half has the weaker route to the final? Big teams on opposite sides increases your odds.",
      links: [
        { label: "Bracket analysis – Rotowire", url: "https://www.rotowire.com/soccer/article/2026-world-cup-group-previews-lineups-odds-predictions-and-tactics-for-all-12-groups-111248" },
        { label: "Tournament odds",             url: "https://www.oddschecker.com/football/world-cup/winner" },
      ]
    },
    {
      id: "golden_boot", emoji: "👟",
      question: "Who wins the Golden Boot (top scorer)?",
      type: "player", points: 8,
      tip: "Mbappé (+650) · Kane (+700) · Messi (+1200) · Haaland (+1400) · Yamal (+1800)",
      links: [
        { label: "Top scorer odds – NBC Sports",  url: "https://www.nbcsports.com/soccer/news/betting-odds-for-2026-world-cup-who-are-the-favorites-dark-horses-top-scorers" },
        { label: "Yahoo Sports full preview",     url: "https://sports.yahoo.com/soccer/betting/article/ultimate-2026-world-cup-betting-preview-odds-best-bets-for-every-group-golden-boot-and-winner-195049054.html" },
        { label: "Player stats – Transfermarkt",  url: "https://www.transfermarkt.com" },
      ]
    },
    {
      id: "golden_ball", emoji: "🌟",
      question: "Who wins the Golden Ball (best player of the tournament)?",
      type: "player", points: 5,
      tip: "Usually a playmaker or key scorer from a team that goes deep — but it can go to someone from a losing side. Messi won it in 2014 despite Argentina losing the final.",
      links: [
        { label: "Golden Ball odds – NBC Sports", url: "https://www.nbcsports.com/soccer/news/betting-odds-for-2026-world-cup-who-are-the-favorites-dark-horses-top-scorers" },
        { label: "Yahoo Sports full preview",     url: "https://sports.yahoo.com/soccer/betting/article/ultimate-2026-world-cup-betting-preview-odds-best-bets-for-every-group-golden-boot-and-winner-195049054.html" },
        { label: "Player form – Sofascore",       url: "https://www.sofascore.com" },
      ]
    },
    {
      id: "total_goals", emoji: "⚽",
      question: "How many total goals will be scored in the entire tournament?",
      type: "number", points: "5 pts (±3) · 3 pts (±8) · 1 pt (±15)",
      tip: "2022 World Cup: 172 goals in 64 games (2.69/game). With 104 games in 2026, estimate is ~280 goals.",
      links: [
        { label: "Historical WC stats – Wikipedia", url: "https://en.wikipedia.org/wiki/FIFA_World_Cup_statistics" },
      ]
    },
    {
      id: "first_out", emoji: "🃏",
      question: "Which team will be eliminated first?",
      type: "team", points: 3,
      tip: "Tough draws for: Haiti (Group C with Brazil/Morocco), Jordan (Group J with Argentina), Uzbekistan, Curaçao.",
      links: [
        { label: "Group odds",             url: "https://www.oddschecker.com/football/world-cup" },
        { label: "Group previews – Rotowire", url: "https://www.rotowire.com/soccer/article/2026-world-cup-group-previews-lineups-odds-predictions-and-tactics-for-all-12-groups-111248" },
      ]
    },
    {
      id: "top_scoring_team", emoji: "⚡",
      question: "Which team will score the most goals in the whole tournament?",
      type: "team", points: 4,
      tip: "Usually (but not always) the champion. Attacking powerhouses: France, Germany, Spain, Brazil all have strong firepower.",
      links: [
        { label: "Team odds – Covers", url: "https://www.covers.com/world-cup/odds" },
      ]
    },
  ],
};

// Generate all 72 group stage matches
(() => {
  // Standard FIFA group-stage pairing order: R1=[0v1,2v3] R2=[0v2,1v3] R3=[0v3,1v2]
  const pairings = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
  const rounds   = [   1,   1,   2,   2,   3,   3];

  WC.matches   = [];
  WC.matchById = {};

  WC.groups.forEach(g => {
    pairings.forEach(([i, j], idx) => {
      const m = {
        id:    `${g.id}${idx + 1}`,
        group: g.id,
        round: rounds[idx],
        home:  g.teams[i],
        away:  g.teams[j],
      };
      WC.matches.push(m);
      WC.matchById[m.id] = m;
    });
  });

  // Alphabetical sorted team list for dropdowns
  WC.teamList = Object.entries(WC.teams)
    .map(([code, t]) => ({ code, ...t }))
    .sort((a, b) => a.name.localeCompare(b.name));

  WC.playerList = [
    "Kylian Mbappé","Harry Kane","Erling Haaland","Lamine Yamal","Lionel Messi",
    "Vinicius Jr.","Rodri","Jude Bellingham","Phil Foden","Bukayo Saka",
    "Pedri","Ferran Torres","Alejandro Garnacho","Florian Wirtz","Jamal Musiala",
    "Cristiano Ronaldo","Bruno Fernandes","Rafael Leão","Bernardo Silva","Rúben Dias",
    "Neymar Jr.","Raphinha","Endrick","Rodrygo","Gabriel Martinelli",
    "Federico Valverde","Darwin Núñez","Antoine Griezmann","Ousmane Dembélé","Marcus Thuram",
    "Victor Osimhen","Sébastien Haller","Sadio Mané","Mohamed Salah","Achraf Hakimi",
    "Riyad Mahrez","Son Heung-min","Takefusa Kubo","Robert Lewandowski","Dusan Vlahovic",
    "Cody Gakpo","Memphis Depay","Virgil van Dijk","Donyell Malen","Xavi Simons",
    "Álvaro Morata","Dani Olmo","Mikel Merino","Nico Williams","Gavi",
    "Paulo Dybala","Lautaro Martínez","Julián Álvarez","Ángel Di María","Nicolás González",
    "Richarlison","Gabriel Jesus","Paquetá","Casemiro","Militão",
    "Ivan Toney","Cole Palmer","Ollie Watkins","Declan Rice","Trent Alexander-Arnold",
    "Serge Gnabry","Kai Havertz","Thomas Müller","Leroy Sané","Antonio Rüdiger",
    "Niclas Füllkrug","Christopher Nkunku","Khvicha Kvaratskhelia","Giorgio Scalvini","Sandro Tonali",
    "Jonathan David","Alphonso Davies","Tajon Buchanan","Cyle Larin","Milan Borjan",
    "Christian Pulisic","Tyler Adams","Weston McKennie","Ricardo Pepi","Folarin Balogun",
    "Hirving Lozano","Santiago Giménez","Edson Álvarez","Alexis Vega","Julio González",
    "Tim Weah","Nicolas Jackson","Kofi Boateng","Emmanuel Gyasi",
    "Ismaïla Sarr","Krépin Diatta","Kalidou Koulibaly","Idrissa Gana Gueye",
  ].sort();

  // Matches per group lookup
  WC.matchesByGroup = {};
  WC.groups.forEach(g => {
    WC.matchesByGroup[g.id] = WC.matches.filter(m => m.group === g.id);
  });
})();
// Official FIFA 2026 third-place allocation (Annex C of tournament regulations).
// 495 combinations: key = the 8 qualifying-third groups (sorted A..L);
// value = which group's 3rd-placed team faces each first-place seed, in seed order
// 1A,1B,1D,1E,1G,1I,1K,1L. Source: Wikipedia 'Template:2026 FIFA World Cup third-place table'.
const THIRD_PLACE_SEED_ORDER = ['A','B','D','E','G','I','K','L'];
const THIRD_PLACE_ALLOCATION = {
  ABCDEFGH:"HGBCAFDE", ABCDEFGI:"CGBDAFEI", ABCDEFGJ:"CGBDAFEJ", ABCDEFGK:"CGBDAFEK", ABCDEFGL:"CGBDAFLE",
  ABCDEFHI:"HEBCAFDI", ABCDEFHJ:"HJBCAFDE", ABCDEFHK:"HEBCAFDK", ABCDEFHL:"HFBCADLE", ABCDEFIJ:"CJBDAFEI",
  ABCDEFIK:"CEBDAFIK", ABCDEFIL:"CEBDAFLI", ABCDEFJK:"CJBDAFEK", ABCDEFJL:"CJBDAFLE", ABCDEFKL:"CEBDAFLK",
  ABCDEGHI:"HGBCADEI", ABCDEGHJ:"HGBCADEJ", ABCDEGHK:"HGBCADEK", ABCDEGHL:"HGBCADLE", ABCDEGIJ:"EGBCADIJ",
  ABCDEGIK:"EGBCADIK", ABCDEGIL:"EGBCADLI", ABCDEGJK:"EGBCADJK", ABCDEGJL:"EGBCADLJ", ABCDEGKL:"EGBCADLK",
  ABCDEHIJ:"HJBCADEI", ABCDEHIK:"HEBCADIK", ABCDEHIL:"HEBCADLI", ABCDEHJK:"HJBCADEK", ABCDEHJL:"HJBCADLE",
  ABCDEHKL:"HEBCADLK", ABCDEIJK:"EJBCADIK", ABCDEIJL:"EJBCADLI", ABCDEIKL:"EIBCADLK", ABCDEJKL:"EJBCADLK",
  ABCDFGHI:"HGBCAFDI", ABCDFGHJ:"HGBCAFDJ", ABCDFGHK:"HGBCAFDK", ABCDFGHL:"CGBDAFLH", ABCDFGIJ:"CGBDAFIJ",
  ABCDFGIK:"CGBDAFIK", ABCDFGIL:"CGBDAFLI", ABCDFGJK:"CGBDAFJK", ABCDFGJL:"CGBDAFLJ", ABCDFGKL:"CGBDAFLK",
  ABCDFHIJ:"HJBCAFDI", ABCDFHIK:"HFBCADIK", ABCDFHIL:"HFBCADLI", ABCDFHJK:"HJBCAFDK", ABCDFHJL:"CJBDAFLH",
  ABCDFHKL:"HFBCADLK", ABCDFIJK:"CJBDAFIK", ABCDFIJL:"CJBDAFLI", ABCDFIKL:"CIBDAFLK", ABCDFJKL:"CJBDAFLK",
  ABCDGHIJ:"HGBCADIJ", ABCDGHIK:"HGBCADIK", ABCDGHIL:"HGBCADLI", ABCDGHJK:"HGBCADJK", ABCDGHJL:"HGBCADLJ",
  ABCDGHKL:"HGBCADLK", ABCDGIJK:"CJBDAGIK", ABCDGIJL:"CJBDAGLI", ABCDGIKL:"IGBCADLK", ABCDGJKL:"CJBDAGLK",
  ABCDHIJK:"HJBCADIK", ABCDHIJL:"HJBCADLI", ABCDHIKL:"HIBCADLK", ABCDHJKL:"HJBCADLK", ABCDIJKL:"IJBCADLK",
  ABCEFGHI:"HGBCAFEI", ABCEFGHJ:"HGBCAFEJ", ABCEFGHK:"HGBCAFEK", ABCEFGHL:"HGBCAFLE", ABCEFGIJ:"EGBCAFIJ",
  ABCEFGIK:"EGBCAFIK", ABCEFGIL:"EGBCAFLI", ABCEFGJK:"EGBCAFJK", ABCEFGJL:"EGBCAFLJ", ABCEFGKL:"EGBCAFLK",
  ABCEFHIJ:"HJBCAFEI", ABCEFHIK:"HEBCAFIK", ABCEFHIL:"HEBCAFLI", ABCEFHJK:"HJBCAFEK", ABCEFHJL:"HJBCAFLE",
  ABCEFHKL:"HEBCAFLK", ABCEFIJK:"EJBCAFIK", ABCEFIJL:"EJBCAFLI", ABCEFIKL:"EIBCAFLK", ABCEFJKL:"EJBCAFLK",
  ABCEGHIJ:"HJBCAGEI", ABCEGHIK:"EGBCAHIK", ABCEGHIL:"EGBCAHLI", ABCEGHJK:"HJBCAGEK", ABCEGHJL:"HJBCAGLE",
  ABCEGHKL:"EGBCAHLK", ABCEGIJK:"EJBCAGIK", ABCEGIJL:"EJBCAGLI", ABCEGIKL:"EGBAICLK", ABCEGJKL:"EJBCAGLK",
  ABCEHIJK:"EJBCAHIK", ABCEHIJL:"EJBCAHLI", ABCEHIKL:"EIBCAHLK", ABCEHJKL:"EJBCAHLK", ABCEIJKL:"EJBAICLK",
  ABCFGHIJ:"HGBCAFIJ", ABCFGHIK:"HGBCAFIK", ABCFGHIL:"HGBCAFLI", ABCFGHJK:"HGBCAFJK", ABCFGHJL:"HGBCAFLJ",
  ABCFGHKL:"HGBCAFLK", ABCFGIJK:"CJBFAGIK", ABCFGIJL:"CJBFAGLI", ABCFGIKL:"IGBCAFLK", ABCFGJKL:"CJBFAGLK",
  ABCFHIJK:"HJBCAFIK", ABCFHIJL:"HJBCAFLI", ABCFHIKL:"HIBCAFLK", ABCFHJKL:"HJBCAFLK", ABCFIJKL:"IJBCAFLK",
  ABCGHIJK:"HJBCAGIK", ABCGHIJL:"HJBCAGLI", ABCGHIKL:"IGBCAHLK", ABCGHJKL:"HJBCAGLK", ABCGIJKL:"IJBCAGLK",
  ABCHIJKL:"IJBCAHLK", ABDEFGHI:"HGBDAFEI", ABDEFGHJ:"HGBDAFEJ", ABDEFGHK:"HGBDAFEK", ABDEFGHL:"HGBDAFLE",
  ABDEFGIJ:"EGBDAFIJ", ABDEFGIK:"EGBDAFIK", ABDEFGIL:"EGBDAFLI", ABDEFGJK:"EGBDAFJK", ABDEFGJL:"EGBDAFLJ",
  ABDEFGKL:"EGBDAFLK", ABDEFHIJ:"HJBDAFEI", ABDEFHIK:"HEBDAFIK", ABDEFHIL:"HEBDAFLI", ABDEFHJK:"HJBDAFEK",
  ABDEFHJL:"HJBDAFLE", ABDEFHKL:"HEBDAFLK", ABDEFIJK:"EJBDAFIK", ABDEFIJL:"EJBDAFLI", ABDEFIKL:"EIBDAFLK",
  ABDEFJKL:"EJBDAFLK", ABDEGHIJ:"HJBDAGEI", ABDEGHIK:"EGBDAHIK", ABDEGHIL:"EGBDAHLI", ABDEGHJK:"HJBDAGEK",
  ABDEGHJL:"HJBDAGLE", ABDEGHKL:"EGBDAHLK", ABDEGIJK:"EJBDAGIK", ABDEGIJL:"EJBDAGLI", ABDEGIKL:"EGBAIDLK",
  ABDEGJKL:"EJBDAGLK", ABDEHIJK:"EJBDAHIK", ABDEHIJL:"EJBDAHLI", ABDEHIKL:"EIBDAHLK", ABDEHJKL:"EJBDAHLK",
  ABDEIJKL:"EJBAIDLK", ABDFGHIJ:"HGBDAFIJ", ABDFGHIK:"HGBDAFIK", ABDFGHIL:"HGBDAFLI", ABDFGHJK:"HGBDAFJK",
  ABDFGHJL:"HGBDAFLJ", ABDFGHKL:"HGBDAFLK", ABDFGIJK:"FJBDAGIK", ABDFGIJL:"FJBDAGLI", ABDFGIKL:"IGBDAFLK",
  ABDFGJKL:"FJBDAGLK", ABDFHIJK:"HJBDAFIK", ABDFHIJL:"HJBDAFLI", ABDFHIKL:"HIBDAFLK", ABDFHJKL:"HJBDAFLK",
  ABDFIJKL:"IJBDAFLK", ABDGHIJK:"HJBDAGIK", ABDGHIJL:"HJBDAGLI", ABDGHIKL:"IGBDAHLK", ABDGHJKL:"HJBDAGLK",
  ABDGIJKL:"IJBDAGLK", ABDHIJKL:"IJBDAHLK", ABEFGHIJ:"HJBFAGEI", ABEFGHIK:"EGBFAHIK", ABEFGHIL:"EGBFAHLI",
  ABEFGHJK:"HJBFAGEK", ABEFGHJL:"HJBFAGLE", ABEFGHKL:"EGBFAHLK", ABEFGIJK:"EJBFAGIK", ABEFGIJL:"EJBFAGLI",
  ABEFGIKL:"EGBAIFLK", ABEFGJKL:"EJBFAGLK", ABEFHIJK:"EJBFAHIK", ABEFHIJL:"EJBFAHLI", ABEFHIKL:"EIBFAHLK",
  ABEFHJKL:"EJBFAHLK", ABEFIJKL:"EJBAIFLK", ABEGHIJK:"EJBAHGIK", ABEGHIJL:"EJBAHGLI", ABEGHIKL:"EGBAIHLK",
  ABEGHJKL:"EJBAHGLK", ABEGIJKL:"EJBAIGLK", ABEHIJKL:"EJBAIHLK", ABFGHIJK:"HJBFAGIK", ABFGHIJL:"HJBFAGLI",
  ABFGHIKL:"HGBAIFLK", ABFGHJKL:"HJBFAGLK", ABFGIJKL:"IJBFAGLK", ABFHIJKL:"HJBAIFLK", ABGHIJKL:"HJBAIGLK",
  ACDEFGHI:"HGECAFDI", ACDEFGHJ:"HGJCAFDE", ACDEFGHK:"HGECAFDK", ACDEFGHL:"HGFCADLE", ACDEFGIJ:"CGJDAFEI",
  ACDEFGIK:"CGEDAFIK", ACDEFGIL:"CGEDAFLI", ACDEFGJK:"CGJDAFEK", ACDEFGJL:"CGJDAFLE", ACDEFGKL:"CGEDAFLK",
  ACDEFHIJ:"HJECAFDI", ACDEFHIK:"HEFCADIK", ACDEFHIL:"HEFCADLI", ACDEFHJK:"HJECAFDK", ACDEFHJL:"HJFCADLE",
  ACDEFHKL:"HEFCADLK", ACDEFIJK:"CJEDAFIK", ACDEFIJL:"CJEDAFLI", ACDEFIKL:"CEIDAFLK", ACDEFJKL:"CJEDAFLK",
  ACDEGHIJ:"HGJCADEI", ACDEGHIK:"HGECADIK", ACDEGHIL:"HGECADLI", ACDEGHJK:"HGJCADEK", ACDEGHJL:"HGJCADLE",
  ACDEGHKL:"HGECADLK", ACDEGIJK:"EGJCADIK", ACDEGIJL:"EGJCADLI", ACDEGIKL:"EGICADLK", ACDEGJKL:"EGJCADLK",
  ACDEHIJK:"HJECADIK", ACDEHIJL:"HJECADLI", ACDEHIKL:"HEICADLK", ACDEHJKL:"HJECADLK", ACDEIJKL:"EJICADLK",
  ACDFGHIJ:"HGJCAFDI", ACDFGHIK:"HGFCADIK", ACDFGHIL:"HGFCADLI", ACDFGHJK:"HGJCAFDK", ACDFGHJL:"CGJDAFLH",
  ACDFGHKL:"HGFCADLK", ACDFGIJK:"CGJDAFIK", ACDFGIJL:"CGJDAFLI", ACDFGIKL:"CGIDAFLK", ACDFGJKL:"CGJDAFLK",
  ACDFHIJK:"HJFCADIK", ACDFHIJL:"HJFCADLI", ACDFHIKL:"HFICADLK", ACDFHJKL:"HJFCADLK", ACDFIJKL:"CJIDAFLK",
  ACDGHIJK:"HGJCADIK", ACDGHIJL:"HGJCADLI", ACDGHIKL:"HGICADLK", ACDGHJKL:"HGJCADLK", ACDGIJKL:"IGJCADLK",
  ACDHIJKL:"HJICADLK", ACEFGHIJ:"HGJCAFEI", ACEFGHIK:"HGECAFIK", ACEFGHIL:"HGECAFLI", ACEFGHJK:"HGJCAFEK",
  ACEFGHJL:"HGJCAFLE", ACEFGHKL:"HGECAFLK", ACEFGIJK:"EGJCAFIK", ACEFGIJL:"EGJCAFLI", ACEFGIKL:"EGICAFLK",
  ACEFGJKL:"EGJCAFLK", ACEFHIJK:"HJECAFIK", ACEFHIJL:"HJECAFLI", ACEFHIKL:"HEICAFLK", ACEFHJKL:"HJECAFLK",
  ACEFIJKL:"EJICAFLK", ACEGHIJK:"EGJCAHIK", ACEGHIJL:"EGJCAHLI", ACEGHIKL:"EGICAHLK", ACEGHJKL:"EGJCAHLK",
  ACEGIJKL:"EJICAGLK", ACEHIJKL:"EJICAHLK", ACFGHIJK:"HGJCAFIK", ACFGHIJL:"HGJCAFLI", ACFGHIKL:"HGICAFLK",
  ACFGHJKL:"HGJCAFLK", ACFGIJKL:"IGJCAFLK", ACFHIJKL:"HJICAFLK", ACGHIJKL:"HJICAGLK", ADEFGHIJ:"HGJDAFEI",
  ADEFGHIK:"HGEDAFIK", ADEFGHIL:"HGEDAFLI", ADEFGHJK:"HGJDAFEK", ADEFGHJL:"HGJDAFLE", ADEFGHKL:"HGEDAFLK",
  ADEFGIJK:"EGJDAFIK", ADEFGIJL:"EGJDAFLI", ADEFGIKL:"EGIDAFLK", ADEFGJKL:"EGJDAFLK", ADEFHIJK:"HJEDAFIK",
  ADEFHIJL:"HJEDAFLI", ADEFHIKL:"HEIDAFLK", ADEFHJKL:"HJEDAFLK", ADEFIJKL:"EJIDAFLK", ADEGHIJK:"EGJDAHIK",
  ADEGHIJL:"EGJDAHLI", ADEGHIKL:"EGIDAHLK", ADEGHJKL:"EGJDAHLK", ADEGIJKL:"EJIDAGLK", ADEHIJKL:"EJIDAHLK",
  ADFGHIJK:"HGJDAFIK", ADFGHIJL:"HGJDAFLI", ADFGHIKL:"HGIDAFLK", ADFGHJKL:"HGJDAFLK", ADFGIJKL:"IGJDAFLK",
  ADFHIJKL:"HJIDAFLK", ADGHIJKL:"HJIDAGLK", AEFGHIJK:"EGJFAHIK", AEFGHIJL:"EGJFAHLI", AEFGHIKL:"EGIFAHLK",
  AEFGHJKL:"EGJFAHLK", AEFGIJKL:"EJIFAGLK", AEFHIJKL:"EJIFAHLK", AEGHIJKL:"EJIAHGLK", AFGHIJKL:"HJIFAGLK",
  BCDEFGHI:"CGBDHFEI", BCDEFGHJ:"HGBCJFDE", BCDEFGHK:"CGBDHFEK", BCDEFGHL:"CGBDHFLE", BCDEFGIJ:"CGBDJFEI",
  BCDEFGIK:"CGBDEFIK", BCDEFGIL:"CGBDEFLI", BCDEFGJK:"CGBDJFEK", BCDEFGJL:"CGBDJFLE", BCDEFGKL:"CGBDEFLK",
  BCDEFHIJ:"CJBDHFEI", BCDEFHIK:"CEBDHFIK", BCDEFHIL:"CEBDHFLI", BCDEFHJK:"CJBDHFEK", BCDEFHJL:"CJBDHFLE",
  BCDEFHKL:"CEBDHFLK", BCDEFIJK:"CJBDEFIK", BCDEFIJL:"CJBDEFLI", BCDEFIKL:"CEBDIFLK", BCDEFJKL:"CJBDEFLK",
  BCDEGHIJ:"HGBCJDEI", BCDEGHIK:"EGBCHDIK", BCDEGHIL:"EGBCHDLI", BCDEGHJK:"HGBCJDEK", BCDEGHJL:"HGBCJDLE",
  BCDEGHKL:"EGBCHDLK", BCDEGIJK:"EGBCJDIK", BCDEGIJL:"EGBCJDLI", BCDEGIKL:"EGBCIDLK", BCDEGJKL:"EGBCJDLK",
  BCDEHIJK:"EJBCHDIK", BCDEHIJL:"EJBCHDLI", BCDEHIKL:"EIBCHDLK", BCDEHJKL:"EJBCHDLK", BCDEIJKL:"EJBCIDLK",
  BCDFGHIJ:"HGBCJFDI", BCDFGHIK:"CGBDHFIK", BCDFGHIL:"CGBDHFLI", BCDFGHJK:"HGBCJFDK", BCDFGHJL:"CGBDHFLJ",
  BCDFGHKL:"CGBDHFLK", BCDFGIJK:"CGBDJFIK", BCDFGIJL:"CGBDJFLI", BCDFGIKL:"CGBDIFLK", BCDFGJKL:"CGBDJFLK",
  BCDFHIJK:"CJBDHFIK", BCDFHIJL:"CJBDHFLI", BCDFHIKL:"CIBDHFLK", BCDFHJKL:"CJBDHFLK", BCDFIJKL:"CJBDIFLK",
  BCDGHIJK:"HGBCJDIK", BCDGHIJL:"HGBCJDLI", BCDGHIKL:"HGBCIDLK", BCDGHJKL:"HGBCJDLK", BCDGIJKL:"IGBCJDLK",
  BCDHIJKL:"HJBCIDLK", BCEFGHIJ:"HGBCJFEI", BCEFGHIK:"EGBCHFIK", BCEFGHIL:"EGBCHFLI", BCEFGHJK:"HGBCJFEK",
  BCEFGHJL:"HGBCJFLE", BCEFGHKL:"EGBCHFLK", BCEFGIJK:"EGBCJFIK", BCEFGIJL:"EGBCJFLI", BCEFGIKL:"EGBCIFLK",
  BCEFGJKL:"EGBCJFLK", BCEFHIJK:"EJBCHFIK", BCEFHIJL:"EJBCHFLI", BCEFHIKL:"EIBCHFLK", BCEFHJKL:"EJBCHFLK",
  BCEFIJKL:"EJBCIFLK", BCEGHIJK:"EJBCHGIK", BCEGHIJL:"EJBCHGLI", BCEGHIKL:"EGBCIHLK", BCEGHJKL:"EJBCHGLK",
  BCEGIJKL:"EJBCIGLK", BCEHIJKL:"EJBCIHLK", BCFGHIJK:"HGBCJFIK", BCFGHIJL:"HGBCJFLI", BCFGHIKL:"HGBCIFLK",
  BCFGHJKL:"HGBCJFLK", BCFGIJKL:"IGBCJFLK", BCFHIJKL:"HJBCIFLK", BCGHIJKL:"HJBCIGLK", BDEFGHIJ:"HGBDJFEI",
  BDEFGHIK:"EGBDHFIK", BDEFGHIL:"EGBDHFLI", BDEFGHJK:"HGBDJFEK", BDEFGHJL:"HGBDJFLE", BDEFGHKL:"EGBDHFLK",
  BDEFGIJK:"EGBDJFIK", BDEFGIJL:"EGBDJFLI", BDEFGIKL:"EGBDIFLK", BDEFGJKL:"EGBDJFLK", BDEFHIJK:"EJBDHFIK",
  BDEFHIJL:"EJBDHFLI", BDEFHIKL:"EIBDHFLK", BDEFHJKL:"EJBDHFLK", BDEFIJKL:"EJBDIFLK", BDEGHIJK:"EJBDHGIK",
  BDEGHIJL:"EJBDHGLI", BDEGHIKL:"EGBDIHLK", BDEGHJKL:"EJBDHGLK", BDEGIJKL:"EJBDIGLK", BDEHIJKL:"EJBDIHLK",
  BDFGHIJK:"HGBDJFIK", BDFGHIJL:"HGBDJFLI", BDFGHIKL:"HGBDIFLK", BDFGHJKL:"HGBDJFLK", BDFGIJKL:"IGBDJFLK",
  BDFHIJKL:"HJBDIFLK", BDGHIJKL:"HJBDIGLK", BEFGHIJK:"EJBFHGIK", BEFGHIJL:"EJBFHGLI", BEFGHIKL:"EGBFIHLK",
  BEFGHJKL:"EJBFHGLK", BEFGIJKL:"EJBFIGLK", BEFHIJKL:"EJBFIHLK", BEGHIJKL:"EJIBHGLK", BFGHIJKL:"HJBFIGLK",
  CDEFGHIJ:"CGJDHFEI", CDEFGHIK:"CGEDHFIK", CDEFGHIL:"CGEDHFLI", CDEFGHJK:"CGJDHFEK", CDEFGHJL:"CGJDHFLE",
  CDEFGHKL:"CGEDHFLK", CDEFGIJK:"CGEDJFIK", CDEFGIJL:"CGEDJFLI", CDEFGIKL:"CGEDIFLK", CDEFGJKL:"CGEDJFLK",
  CDEFHIJK:"CJEDHFIK", CDEFHIJL:"CJEDHFLI", CDEFHIKL:"CEIDHFLK", CDEFHJKL:"CJEDHFLK", CDEFIJKL:"CJEDIFLK",
  CDEGHIJK:"EGJCHDIK", CDEGHIJL:"EGJCHDLI", CDEGHIKL:"EGICHDLK", CDEGHJKL:"EGJCHDLK", CDEGIJKL:"EGICJDLK",
  CDEHIJKL:"EJICHDLK", CDFGHIJK:"CGJDHFIK", CDFGHIJL:"CGJDHFLI", CDFGHIKL:"CGIDHFLK", CDFGHJKL:"CGJDHFLK",
  CDFGIJKL:"CGIDJFLK", CDFHIJKL:"CJIDHFLK", CDGHIJKL:"HGICJDLK", CEFGHIJK:"EGJCHFIK", CEFGHIJL:"EGJCHFLI",
  CEFGHIKL:"EGICHFLK", CEFGHJKL:"EGJCHFLK", CEFGIJKL:"EGICJFLK", CEFHIJKL:"EJICHFLK", CEGHIJKL:"EJICHGLK",
  CFGHIJKL:"HGICJFLK", DEFGHIJK:"EGJDHFIK", DEFGHIJL:"EGJDHFLI", DEFGHIKL:"EGIDHFLK", DEFGHJKL:"EGJDHFLK",
  DEFGIJKL:"EGIDJFLK", DEFHIJKL:"EJIDHFLK", DEGHIJKL:"EJIDHGLK", DFGHIJKL:"HGIDJFLK", EFGHIJKL:"EJIFHGLK",
};
