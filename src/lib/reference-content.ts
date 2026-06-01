// Original, evergreen DateLore reference blurbs. These are hand-written once for
// the finite sets (12 signs, 12 months, 12 birthstones, 12 birth flowers) and
// reused across the day/month pages — genuine editorial depth without per-date
// scaled text. Pure data + simple accessors.

const ZODIAC: Record<string, string> = {
  Aries: 'The zodiac’s first sign, Aries is the ram — cardinal fire, known for initiative, courage, and a head-first eagerness to begin.',
  Taurus: 'Taurus the bull is fixed earth: steady, sensual, and patient, with a well-earned reputation for loyalty and a love of life’s comforts.',
  Gemini: 'Gemini, the twins, is mutable air — curious, quick-witted, and endlessly conversational, forever chasing the next idea.',
  Cancer: 'Cancer the crab is cardinal water: tender, intuitive, and deeply tied to home, memory, and the people it loves.',
  Leo: 'Leo the lion is fixed fire — warm, generous, and made for the spotlight, ruled by the Sun itself.',
  Virgo: 'Virgo is mutable earth: precise, practical, and quietly devoted to doing things well and being of use.',
  Libra: 'Libra the scales is cardinal air — drawn to balance, beauty, and fairness, and happiest in good company.',
  Scorpio: 'Scorpio is fixed water: intense, perceptive, and unafraid of depth, with a gift for transformation.',
  Sagittarius: 'Sagittarius the archer is mutable fire — restless, optimistic, and forever aimed at the next horizon.',
  Capricorn: 'Capricorn the sea-goat is cardinal earth: disciplined, ambitious, and built for the long climb.',
  Aquarius: 'Aquarius the water-bearer is fixed air — inventive, independent, and tuned to the future and the common good.',
  Pisces: 'Pisces the fish is mutable water: imaginative, empathetic, and a little dreamy, with one fin always in deeper currents.',
};

// Index 0 = January.
const MONTHS: string[] = [
  'January opens the year, named for Janus, the Roman god of doorways who looks both back and ahead — a fitting start to a fresh calendar.',
  'February, the year’s shortest month, takes its name from Februa, an ancient Roman festival of purification held as winter loosened its grip.',
  'March once began the Roman year and carries the name of Mars, god of war — the month spring stirs and the days tip toward light.',
  'April, when the Northern Hemisphere blooms, likely springs from the Latin aperire, “to open” — buds, blossoms, and the year opening up.',
  'May is named for Maia, a Roman goddess of growth, and lives up to it — the fullest, greenest stretch of spring.',
  'June honors Juno, queen of the Roman gods and protector of marriage, which is partly why the month is still a favorite for weddings.',
  'July was renamed for Julius Caesar, who was born in this month — high summer, long days, and the year at its warmest.',
  'August takes its name from Augustus, Rome’s first emperor, who wanted a month as grand as Caesar’s; it sits at the peak of summer.',
  'September means “seventh” in Latin — a holdover from the old Roman calendar — though it now marks the turn toward autumn.',
  'October, “eighth month” in the Roman count, brings the harvest, shortening days, and the first real chill of fall.',
  'November, the “ninth month” of Rome’s older calendar, is the quiet, leaf-bare run-up to winter.',
  'December closes the year — “tenth month” by its Latin root — wrapped in the season’s longest nights and its brightest festivals.',
];

// Index 0 = January (paired with the month’s birthstone).
const BIRTHSTONES: string[] = [
  'January’s garnet glows deep red and has long been carried as a stone of protection, friendship, and safe return from travel.',
  'February’s amethyst, a violet quartz, was prized by the ancients as a guard against overindulgence and a steadier of the mind.',
  'March’s aquamarine takes its name from seawater and was once a sailor’s talisman for calm waters and a safe voyage.',
  'April’s diamond, the hardest natural gem, has stood for endurance, clarity, and unbreakable bonds since antiquity.',
  'May’s emerald, a lush green beryl, was a favorite of Cleopatra and has symbolized renewal and the heart of spring ever since.',
  'June’s pearl is the rare gem made by a living creature — a quiet emblem of purity and the sea.',
  'July’s ruby burns a deep red and was once believed to hold an inner fire: a stone of passion, vitality, and protection.',
  'August’s peridot is born of volcanoes and glows olive-green — the ancients called it the gem of the sun.',
  'September’s sapphire, most famously a royal blue, has long stood for wisdom, loyalty, and the heavens.',
  'October’s opal flickers with every color at once, a play of light that earned it a reputation for imagination and hope.',
  'November’s topaz, often a warm golden hue, was thought to carry the strength and glow of the sun into the darkening year.',
  'December’s turquoise, sky-blue and ancient, was treasured across many cultures as a stone of good fortune and protection.',
];

// Index 0 = January (paired with the month’s birth flower).
const FLOWERS: string[] = [
  'January’s carnation, hardy enough to bloom in the cold, carries old meanings of love, fascination, and devotion.',
  'February’s violet, low and modest, has long stood for faithfulness, humility, and quiet, steadfast affection.',
  'March’s daffodil is spring’s first trumpet — a bright herald of renewal, hope, and brighter days ahead.',
  'April’s daisy, simple and sunny, has come to mean innocence, cheerfulness, and new beginnings.',
  'May’s lily of the valley, with its tiny white bells, signals the return of happiness and the sweetness of spring.',
  'June’s rose needs little introduction — the enduring flower of love, in a different shade for nearly every feeling.',
  'July’s larkspur rises in tall summer spires and has long carried meanings of an open heart and lightness of spirit.',
  'August’s gladiolus, named for the Latin for sword, stands for strength of character and remembrance.',
  'September’s aster, star-shaped and late-blooming, has stood for wisdom, patience, and enduring affection.',
  'October’s marigold glows gold and orange and is woven through autumn festivals as a flower of warmth and remembrance.',
  'November’s chrysanthemum, the last great bloom of the year, carries meanings of friendship, joy, and long life.',
  'December’s holly, evergreen and berry-bright, has crowned midwinter celebrations for centuries as a symbol of hope through the cold.',
];

export function zodiacBlurb(sign: string): string {
  return ZODIAC[sign] ?? '';
}
export function monthBlurb(month: number): string {
  return MONTHS[month - 1] ?? '';
}
export function birthstoneBlurb(month: number): string {
  return BIRTHSTONES[month - 1] ?? '';
}
export function flowerBlurb(month: number): string {
  return FLOWERS[month - 1] ?? '';
}
