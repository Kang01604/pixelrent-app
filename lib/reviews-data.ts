/* ============================================================
   PixelRent — review generator (seed-time only).

   Produces made-up, IGN-style reviews for a game: a random count
   (8–25), weighted star ratings (skewed high, like real launch
   review aggregates), and varied reviewer handles + text. The
   game's displayed rating is the average of these, to 1 decimal.
   ============================================================ */

export type SeedReview = {
  user: string;
  stars: number; // 1–5 whole stars per review
  line1: string; // headline
  line2: string; // supporting line
};

const HANDLES = [
  "PixelPusher", "RetroRaven", "NoScopeNina", "CouchCoOpKid", "FramePerfect",
  "LootGoblin", "SaveStateSam", "AchievementHana", "SplitScreenSteve", "QuestQueen",
  "GG_Gabby", "BossRushBen", "RespawnRico", "DungeonDiver", "CritHitCarlo",
  "SpeedrunSofia", "ControllerKing", "TrophyTina", "MetaMarco", "LagSwitchLuis",
  "OpenWorldOwen", "NPC_Whisperer", "HeadshotHazel", "GrindGuru", "CozyGamerCleo",
  "ArcadeAce", "SidequestSid", "PatchNotesPia", "EndgameEli", "ComboBreaker",
];

// Headlines weighted by tier. Index roughly maps to star band.
const TITLES_HIGH = [
  "An instant classic", "A near-flawless experience", "Worth every peso",
  "Sets a new standard", "Absolutely essential", "A masterclass in design",
  "Polished to a mirror shine", "One of the year's best", "Simply outstanding",
  "Raises the bar for the genre", "I couldn't put it down", "Pure joy from start to finish",
];
const TITLES_GOOD = [
  "Great fun with minor flaws", "Ambitious and mostly succeeds", "A rock-solid entry",
  "Very good, not quite perfect", "Highly recommended", "Confident and well-crafted",
  "A satisfying ride", "Rough edges, big heart", "Delivers where it counts",
];
const TITLES_MID = [
  "Good but uneven", "Enjoyable if flawed", "Has ups and downs",
  "Solid foundation, shaky execution", "Fun in bursts", "Worth a rental at least",
];
const TITLES_LOW = [
  "A letdown in places", "Didn't quite click for me", "Promising but frustrating",
];

const BODIES = [
  "The moment-to-moment gameplay stays satisfying, and the world is packed with detail.",
  "Tight controls and a killer soundtrack make every session fly by.",
  "Pacing dips in the middle, but the highs are genuinely spectacular.",
  "Combat feels weighty and responsive, with plenty of room to experiment.",
  "Gorgeous art direction carries even the quieter stretches.",
  "There's a real sense of craft here that keeps you coming back.",
  "Some technical hiccups aside, the core loop is deeply addictive.",
  "Exploration is rewarding and never feels like busywork.",
  "The story took a while to hook me, but the payoff was worth it.",
  "Difficulty spikes can frustrate, yet nailing a tough section feels amazing.",
  "Runs smoothly and looks stunning on the big screen.",
  "A generous amount of content for the price — you'll get your hours in.",
  "Menus could be cleaner, but that's a small gripe in an otherwise great package.",
  "Multiplayer is a blast once you get a squad together.",
  "It borrows familiar ideas but executes them with real polish.",
  "The soundtrack alone is worth the price of admission.",
  "A few repetitive stretches keep it from perfection, but I loved my time with it.",
  "Every system clicks together in a way that just feels right.",
  "Load times are quick and the world stitches together seamlessly.",
  "Rough launch bugs are mostly patched now — jump in.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* Weighted star draw: skewed toward 4–5 like real aggregate scores,
   with the occasional 3 and a rare 2. */
function drawStars(): number {
  const r = Math.random();
  if (r < 0.5) return 5;
  if (r < 0.82) return 4;
  if (r < 0.95) return 3;
  return 2;
}

function titleFor(stars: number): string {
  if (stars >= 5) return pick(TITLES_HIGH);
  if (stars === 4) return pick(TITLES_GOOD);
  if (stars === 3) return pick(TITLES_MID);
  return pick(TITLES_LOW);
}

/** Generate a random set of reviews for one game. */
export function generateReviews(): SeedReview[] {
  const count = 8 + Math.floor(Math.random() * 18); // 8–25 inclusive
  const usedHandles = new Set<string>();
  const reviews: SeedReview[] = [];

  for (let i = 0; i < count; i++) {
    // Prefer unique handles; fall back to a numbered handle if we run out.
    let handle = pick(HANDLES);
    if (usedHandles.has(handle)) handle = `${handle}${Math.floor(Math.random() * 90) + 10}`;
    usedHandles.add(handle);

    const stars = drawStars();
    reviews.push({
      user: handle,
      stars,
      line1: titleFor(stars),
      line2: pick(BODIES),
    });
  }
  return reviews;
}

/** Average of star ratings, rounded to one decimal (out of 5). */
export function averageStars(reviews: SeedReview[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((s, r) => s + r.stars, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
