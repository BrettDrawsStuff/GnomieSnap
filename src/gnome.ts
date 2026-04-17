// ─── Seeded deterministic RNG (mulberry32) ────────────────────────────────────
export function seededRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ─── Layout (identical for all gnomes) ───────────────────────────────────────
//   row0:    ^        ^ at col3
//   row1:  / X \      / at col1, X at col3 (either '*' or ' '), \ at col5
//   row2: <(LML)>     < at col0
//   row3:  / S \      / at col1, S at col3, \ at col5

// ─── Part pools ──────────────────────────────────────────────────────────────

// Individual eyes — picked independently so left/right can mismatch
const EYES = [
  "o", "x", "°", "ò", "ó", "×", "©", "ö",
  "•", "O", "≥", "≤", ">", "<", "@", "Ô", "^",
] as const;

// Matched pairs used ~60% of the time for familiar expressions
const EYE_PAIRS: Array<{ l: string; r: string }> = [
  { l: "o",  r: "o"  },
  { l: "x",  r: "x"  },
  { l: "°",  r: "°"  },
  { l: "ò",  r: "ó"  },
  { l: "×",  r: "×"  },
  { l: "©",  r: "©"  },
  { l: "ö",  r: "ö"  },
  { l: "•",  r: "•"  },
  { l: "O",  r: "O"  },
  { l: "≥",  r: "≤"  },
  { l: ">",  r: "<"  },
  { l: "@",  r: "@"  },
  { l: "Ô",  r: "Ô"  },
  { l: "^",  r: "^"  },
];

const MOUTHS = ["_", "~", "w", "×", "¬", "-", "3", "ω", "^", "u", "v", "o"] as const;

// () weighted heaviest, {} and [] as rarer variants
const BRACKETS: Array<["(", ")"] | ["{", "}"] | ["[", "]"]> = [
  ["(", ")"], ["(", ")"], ["(", ")"],
  ["{", "}"],
  ["[", "]"],
];

const BODY_SYMBOLS = [
  // from your originals
  "x", "¥", "Ï", "¦", "¶", "§",
  // latin extended
  "Ø", "Æ", "ß", "þ", "ð", "œ", "ƒ", "ŧ", "ħ", "ŋ",
  // greek
  "Ψ", "Σ", "Ω", "Δ", "Λ", "Φ", "Θ", "Ξ", "Π", "Γ",
  // currency / symbols
  "€", "₿", "¢", "£", "¤", "¿", "¡",
  // misc single-width
  "†", "‡", "※", "¬", "±", "÷", "≈",
] as const;

// ─── Generator ───────────────────────────────────────────────────────────────

export interface GnomeData {
  [key: string]: string;
  art: string;
  name: string;
}

export function generateGnome(fid: number): GnomeData {
  const rng  = seededRng(fid);
  const rng2 = seededRng(fid * 31337);

  // Hat brim: * inside at col3, or plain space
  const hasStar = rng() < 0.5;
  const brim    = hasStar ? `/ * \\` : `/ _ \\`;

  // Face — Noggles (⌐◨-◨) is a fixed special case (~8%)
  const isNoggles = rng() < 0.08;
  let faceInner: string;
  let [o, c]: [string, string] = ["(", ")"];

  if (isNoggles) {
    faceInner = `⌐◨-◨`;  // mouth is the - between the two ◨
    [o, c] = ["(", ")"];
  } else {
    [o, c] = pick(rng, BRACKETS);
    // ~60% matched pair, ~40% fully independent eyes
    const useMatched = rng() < 0.6;
    let eyeL: string;
    let eyeR: string;
    if (useMatched) {
      const pair = pick(rng, EYE_PAIRS);
      eyeL = pair.l;
      eyeR = pair.r;
    } else {
      eyeL = pick(rng, EYES);
      eyeR = pick(rng, EYES);
    }
    const mouth = pick(rng, MOUTHS);
    faceInner = `${eyeL}${mouth}${eyeR}`;
  }

  const face = `<${o}${faceInner}${c}>`;
  const body = pick(rng, BODY_SYMBOLS);

  const art = [
    `     ^`,
    `   ${brim}`,
    `${face}`,
    `   / ${body} \\`,
  ].join("\n");

  // ─── Name ─────────────────────────────────────────────────────────────────
  const ADJECTIVES = [
    // earthy / weathered
    "Mossy", "Muddy", "Mossy", "Frosty", "Dusty", "Ashy", "Boggy",
    "Soggy", "Damp", "Murky", "Briny", "Grimy", "Sooty", "Chalky",
    // size / shape
    "Lanky", "Squat", "Lumpy", "Knobby", "Spindly", "Stout", "Wiry",
    "Gnarled", "Crooked", "Lopsided", "Hunched", "Stubby", "Gangly",
    // temperament
    "Grumpy", "Jolly", "Bitter", "Sleepy", "Grouchy", "Drowsy", "Sulky",
    "Cranky", "Snappy", "Glum", "Cheery", "Broody", "Wistful", "Wary",
    // age / condition
    "Ancient", "Withered", "Weathered", "Crumbling", "Rusted", "Mossy",
    "Timeworn", "Haggard", "Rickety", "Decrepit", "Mouldy", "Tattered",
    // texture / appearance
    "Speckled", "Tufted", "Tangled", "Matted", "Frayed", "Scruffy",
    "Shaggy", "Bristly", "Prickly", "Scraggly", "Knotted", "Patchy",
    // magical / nature
    "Glowing", "Wandering", "Hollow", "Spry", "Rusty", "Ancient",
    "Mossbacked", "Rootbound", "Ferncloaked", "Dusklit", "Dawnwoken",
  ] as const;

  const NOUNS = [
    // hat / head themed
    "Thistlecap", "Moldcap", "Mosshat", "Brimstone", "Acornhelm",
    "Pebblecrown", "Fernhood", "Barkhat", "Twigcap", "Sootcap",
    // beard / face themed
    "Rootbeard", "Muddlebeard", "Snaggle", "Crumbhorn", "Tangletusk",
    "Grubwhisker", "Bristlechin", "Moldwhisker", "Knotbeard", "Driftwhisker",
    // name / place suffixes
    "Bogsworth", "Fernwick", "Loamwick", "Moldwick", "Brackenfur",
    "Grubsworth", "Stumblewick", "Willowknot", "Cloverfoot", "Sootpatch",
    "Driftcap", "Muddlepot", "Twigsworth", "Gnarledtoe", "Pebblesnout",
    "Crumbhorn", "Willowknot", "Brackenfur", "Loamwick", "Grubsworth",
    // creature / body parts
    "Cloverfoot", "Toadback", "Burrowshin", "Stumpshanks", "Nettleknee",
    "Puddlejowl", "Boulderback", "Thornshin", "Mossbelly", "Rootfoot",
    // single-word flavour
    "Snagsworth", "Fernwick", "Murkwell", "Darkhollow", "Grimshaw",
    "Bogmire", "Ashwick", "Cragsworth", "Duskhollow", "Mirefoot",
  ] as const;

  const name = `${pick(rng2, ADJECTIVES)} ${pick(rng2, NOUNS)}`;

  return { art, name };
}
