// dates.js — the data source for the /day/[date] route.
//
// "05-31" is the real, curated content lifted verbatim from the day.html
// prototype. The other entries ("01-01", "07-04", "12-25") are SHORT SEED
// SAMPLES of a few well-known, verifiable facts, present only so the static
// route builds multiple pages during development. They are placeholders to be
// REPLACED by the real Wikipedia (CC BY-SA) data pipeline.
//
// Field shapes (match what [date].astro renders):
//   dayOfYear   number  — ordinal day of the year (e.g. 151 for May 31)
//   lede        string  — intro sentence under the date header
//   zodiac      string
//   birthstone  string
//   birthFlower string
//   events      [{ year, title, desc, tag }]
//   births      [{ monogram, name, year, line }]   // "famous birthday twins"
//   deaths      [{ year, text }]                     // text may contain <b>…</b>
//   observances [{ text }]                           // text may contain <b>…</b>

export const DATES = {
  "05-31": {
    dayOfYear: 151,
    lede:
      "A clock that started ticking, an ocean liner sliding into the water, and a poet who sang of America — all on this date. Here's what the almanac remembers about May 31.",
    zodiac: "Gemini",
    birthstone: "Emerald",
    birthFlower: "Lily of the Valley",
    events: [
      {
        year: 1911,
        title: "The Titanic is launched",
        desc:
          "The hull of the RMS Titanic slides into the River Lagan at Harland &amp; Wolff in Belfast, before more than 100,000 spectators — fitting-out would take another ten months.",
        tag: "Maritime history",
      },
      {
        year: 1889,
        title: "The Johnstown Flood",
        desc:
          "The South Fork Dam fails after days of heavy rain, sending 20 million tons of water into Johnstown, Pennsylvania — one of the deadliest disasters in U.S. history.",
        tag: "Disaster",
      },
      {
        year: 1859,
        title: "Big Ben begins keeping time",
        desc:
          "The Great Clock of Westminster starts ticking above the Houses of Parliament in London — its chimes have marked the hour for the city ever since.",
        tag: "London",
      },
      {
        year: 1790,
        title: "The U.S. Copyright Act is signed",
        desc:
          'President George Washington signs the first federal copyright law, protecting "maps, charts, and books" for a term of fourteen years.',
        tag: "Law",
      },
      {
        year: 1669,
        title: "Samuel Pepys closes his diary",
        desc:
          "Fearing for his failing eyesight, the London diarist writes his final entry, ending one of the most vivid first-hand records of 17th-century life.",
        tag: "Letters",
      },
    ],
    births: [
      {
        monogram: "C",
        name: "Clint Eastwood",
        year: 1930,
        line: "Actor and Oscar-winning director.",
      },
      {
        monogram: "W",
        name: "Walt Whitman",
        year: 1819,
        line: "Poet, author of <em>Leaves of Grass</em>.",
      },
      {
        monogram: "B",
        name: "Brooke Shields",
        year: 1965,
        line: "Actor and model.",
      },
      {
        monogram: "C",
        name: "Colin Farrell",
        year: 1976,
        line: "Irish screen actor.",
      },
      {
        monogram: "R",
        name: "Prince Rainier III",
        year: 1923,
        line: "Sovereign Prince of Monaco.",
      },
      {
        monogram: "D",
        name: "Denholm Elliott",
        year: 1922,
        line: "British character actor.",
      },
    ],
    deaths: [
      {
        year: 1809,
        text:
          "<b>Joseph Haydn</b>, composer who shaped the symphony and string quartet.",
      },
      {
        year: 1832,
        text:
          "<b>Évariste Galois</b>, mathematician, killed in a duel at twenty.",
      },
      {
        year: 2011,
        text: "<b>Jack Kevorkian</b>, pathologist and right-to-die advocate.",
      },
    ],
    observances: [
      { text: "<b>World No Tobacco Day</b> — observed worldwide by the WHO." },
      { text: "<b>National Smile Day</b> (United States)." },
      { text: "<b>Día de Castilla-La Mancha</b> (Spain)." },
    ],
  },

  // ----- Seed samples below: replace with the Wikipedia (CC BY-SA) pipeline -----

  "01-01": {
    dayOfYear: 1,
    lede:
      "New Year's Day — the calendar resets and the almanac turns its first page. A short sampling of what history records for January 1.",
    zodiac: "Capricorn",
    birthstone: "Garnet",
    birthFlower: "Carnation",
    events: [
      {
        year: 1801,
        title: "The Act of Union takes effect",
        desc:
          "Great Britain and Ireland are joined to form the United Kingdom of Great Britain and Ireland.",
        tag: "Politics",
      },
      {
        year: 1959,
        title: "The Cuban Revolution succeeds",
        desc:
          "Fulgencio Batista flees Cuba as Fidel Castro's forces take control of the country.",
        tag: "Revolution",
      },
    ],
    births: [
      {
        monogram: "P",
        name: "Paul Revere",
        year: 1735,
        line: "American patriot and silversmith.",
      },
      {
        monogram: "J",
        name: "J. Edgar Hoover",
        year: 1895,
        line: "First director of the FBI.",
      },
    ],
    deaths: [
      {
        year: 1953,
        text: "<b>Hank Williams</b>, pioneering country music singer-songwriter.",
      },
    ],
    observances: [
      { text: "<b>New Year's Day</b> — observed worldwide." },
    ],
  },

  "07-04": {
    dayOfYear: 185,
    lede:
      "Independence Day in the United States — fireworks and founding documents. A short sampling of what history records for July 4.",
    zodiac: "Cancer",
    birthstone: "Ruby",
    birthFlower: "Larkspur",
    events: [
      {
        year: 1776,
        title: "The U.S. Declaration of Independence is adopted",
        desc:
          "The Second Continental Congress adopts the Declaration of Independence in Philadelphia, announcing the thirteen colonies' separation from Britain.",
        tag: "Founding",
      },
      {
        year: 1826,
        title: "Two presidents die on the same day",
        desc:
          "John Adams and Thomas Jefferson both die on the fiftieth anniversary of the Declaration's adoption.",
        tag: "Politics",
      },
    ],
    births: [
      {
        monogram: "C",
        name: "Calvin Coolidge",
        year: 1872,
        line: "30th President of the United States.",
      },
      {
        monogram: "L",
        name: "Louis Armstrong",
        year: 1901,
        line: "Jazz trumpeter and vocalist (date he long claimed).",
      },
    ],
    deaths: [
      {
        year: 1826,
        text: "<b>Thomas Jefferson</b>, third U.S. president and Declaration author.",
      },
      {
        year: 1934,
        text: "<b>Marie Curie</b>, physicist and two-time Nobel laureate.",
      },
    ],
    observances: [
      { text: "<b>Independence Day</b> (United States)." },
    ],
  },

  "12-25": {
    dayOfYear: 359,
    lede:
      "Christmas Day — bells, candles, and a long list of history's December births. A short sampling of what the almanac records for December 25.",
    zodiac: "Capricorn",
    birthstone: "Turquoise",
    birthFlower: "Holly",
    events: [
      {
        year: 800,
        title: "Charlemagne is crowned emperor",
        desc:
          "Pope Leo III crowns Charlemagne as Emperor of the Romans in St. Peter's Basilica in Rome.",
        tag: "Medieval",
      },
      {
        year: 1066,
        title: "William the Conqueror is crowned",
        desc:
          "William I is crowned King of England at Westminster Abbey, following the Norman Conquest.",
        tag: "England",
      },
    ],
    births: [
      {
        monogram: "I",
        name: "Isaac Newton",
        year: 1642,
        line: "Mathematician and physicist (Old Style calendar).",
      },
      {
        monogram: "H",
        name: "Humphrey Bogart",
        year: 1899,
        line: "American film actor.",
      },
    ],
    deaths: [
      {
        year: 1977,
        text: "<b>Charlie Chaplin</b>, comic actor and filmmaker.",
      },
    ],
    observances: [
      { text: "<b>Christmas Day</b> — observed in much of the world." },
    ],
  },
};
