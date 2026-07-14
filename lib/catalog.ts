/* ============================================================
   PixelRent — game catalog (server-side source of truth)

   Cover art is hotlinked from Steam's public CDN for titles that
   exist on Steam. Titles not on Steam (PlayStation/Nintendo
   exclusives, Minecraft) have coverUrl: "" — the UI renders a
   styled placeholder for those. Paste any image URL into COVERS
   below to fill them in.
   ============================================================ */

export type Platform = "PS5" | "XBOX" | "PC" | "SWITCH";

export type Game = {
  id: string;
  name: string;
  platform: Platform;
  price: number;
  rating: number;
  gradient: { from: string; to: string };
  coverUrl: string;
  publisher: string;
  description: string;
  itemsLeft: number; // starting stock — live stock lives in Firestore (games collection)
  sales: number;
  addedAt: number;
  reviewCount?: number; // total RAWG ratings; rating is their average
  ratingBreakdown?: Record<string, number>; // { "5": n, "4": n, "3": n, "2": n, "1": n } from RAWG
  archived?: boolean; // hidden from the storefront (admin-archived) but kept for order history
};

const steamCover = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;

/** Cover art sources. Non-Steam titles are blank on purpose —
    drop any image URL in and it will render. */
const COVERS: Record<string, string> = {
  "ps-1": steamCover(2001120), // Split Fiction
  "ps-2": steamCover(2651280), // Marvel's Spider-Man 2 (PC release)
  "ps-3": steamCover(3489700), // Stellar Blade
  "ps-4": steamCover(2947440), // SILENT HILL f
  "ps-5":
    "https://cdn2.steamgriddb.com/thumb/00cdbd4c5ac2a3510eed9336cf0447b8.jpg", // Gran Turismo 7 — PS exclusive, no Steam CDN
  "ps-6": steamCover(2420110), // Horizon Forbidden West
  "xb-1":
    "https://cdn2.steamgriddb.com/thumb/0ed5055450adbd836945761a6fa43ee0.jpg", // Minecraft — not on Steam
  "xb-2": steamCover(1943950), // Escape the Backrooms
  "xb-3": steamCover(1172620), // Sea of Thieves
  "xb-4": steamCover(2001120), // Split Fiction
  "xb-5": steamCover(1240440), // Halo Infinite
  "xb-6": steamCover(1551360), // Forza Horizon 5
  "pc-1": steamCover(2322010), // God of War Ragnarök
  "pc-2": steamCover(1222670), // The Sims 4
  "pc-3": steamCover(1245620), // Elden Ring
  "pc-4": steamCover(1091500), // Cyberpunk 2077
  "pc-5": steamCover(1086940), // Baldur's Gate 3
  "pc-6": steamCover(413150), // Stardew Valley
  "sw-1":
    "https://cdn2.steamgriddb.com/thumb/198c300f91ddf49d200638e8e5edd87c.jpg", // Zelda: Tears of the Kingdom — Nintendo exclusive
  "sw-2":
    "https://cdn2.steamgriddb.com/thumb/078d2a1275f0d53cda67d165440aeb50.jpg", // Animal Crossing: New Horizons
  "sw-3":
    "https://cdn2.steamgriddb.com/thumb/2ef85f2ae5e56041ded26f67e18136be.jpg", // Super Smash Bros. Ultimate
  "sw-4":
    "https://cdn2.steamgriddb.com/thumb/ce098cf158927e2cea10919e1e2b36a3.jpg", // Pokémon Legends: Arceus
  "sw-5":
    "https://cdn2.steamgriddb.com/thumb/9cd6d894098e748716960bfcf9dbe115.jpg", // Mario Kart 8 Deluxe
  "sw-6":
    "https://cdn2.steamgriddb.com/thumb/da20bc895d056545743499a08a22455e.jpg", // Splatoon 3
};

const g = (
  id: string,
  name: string,
  platform: Platform,
  from: string,
  to: string,
  publisher: string,
  description: string,
  itemsLeft: number,
  sales: number,
  addedAt: number,
): Game => ({
  id,
  name,
  platform,
  price: 150,
  rating: 4.8,
  gradient: { from, to },
  coverUrl: COVERS[id] ?? "",
  publisher,
  description,
  itemsLeft,
  sales,
  addedAt,
});

export const CATALOG: Game[] = [
  /* ---------------- PlayStation ---------------- */
  g(
    "ps-1",
    "Split Fiction",
    "PS5",
    "#1a3e7d",
    "#f6d472",
    "Electronic Arts",
    "The story follows Mio and Zoe, two aspiring writers with completely different creative styles. Mio specializes in science fiction, while Zoe prefers fantasy. After becoming trapped inside a machine that brings their stories to life, they must work together to escape by traveling through constantly changing worlds filled with puzzles, platforming challenges, combat, and unique gameplay mechanics.",
    40,
    320,
    6,
  ),
  g(
    "ps-2",
    "Marvel's Spider-Man 2",
    "PS5",
    "#490303",
    "#a90405",
    "Sony Interactive Entertainment",
    "Swing through Marvel's New York as Peter Parker and Miles Morales in the next chapter of the acclaimed Spider-Man franchise. Face Venom, Kraven, and a city under siege with new symbiote powers and instant hero-switching.",
    28,
    540,
    5,
  ),
  g(
    "ps-3",
    "Stellar Blade",
    "PS5",
    "#000000",
    "#54afe4",
    "Sony Interactive Entertainment",
    "A story-driven action adventure set on a ruined Earth. As EVE, wield elegant, devastating combat skills to reclaim the planet from the Naytiba and uncover the truth behind humanity's fall.",
    35,
    410,
    4,
  ),
  g(
    "ps-4",
    "Silent Hill f",
    "PS5",
    "#6d141a",
    "#5a8486",
    "Konami",
    "A new chapter of psychological horror set in 1960s Japan. Wander a fog-drenched town consumed by beautiful yet terrifying blooms, where dread grows petal by petal.",
    22,
    290,
    3,
  ),
  g(
    "ps-5",
    "Gran Turismo 7",
    "PS5",
    "#0e2a4d",
    "#c23b3b",
    "Sony Interactive Entertainment",
    "The real driving simulator returns with over 400 cars, legendary tracks, dynamic weather, and a deep tuning scene for motorsport fans of every level.",
    31,
    260,
    2,
  ),
  g(
    "ps-6",
    "Horizon Forbidden West",
    "PS5",
    "#7c2f10",
    "#2fa3a0",
    "Sony Interactive Entertainment",
    "Join Aloy as she braves the Forbidden West, a majestic but deadly frontier full of mysterious new threats, towering machines, and a land on the brink of collapse.",
    26,
    380,
    1,
  ),

  /* ---------------- Xbox ---------------- */
  g(
    "xb-1",
    "Minecraft",
    "XBOX",
    "#bfcdfc",
    "#9fbf3f",
    "Mojang Studios",
    "Explore infinite worlds and build everything from the simplest of homes to the grandest of castles. Play in creative mode with unlimited resources or mine deep into the world in survival mode.",
    50,
    610,
    6,
  ),
  g(
    "xb-2",
    "Escape the Backrooms",
    "XBOX",
    "#362d06",
    "#bfae2f",
    "Fancy Games",
    "A co-op horror exploration game. Traverse the unsettling levels of the Backrooms with friends, solving puzzles and evading entities while trying to find a way out.",
    18,
    240,
    5,
  ),
  g(
    "xb-3",
    "Sea of Thieves",
    "XBOX",
    "#0e4a5c",
    "#d9a441",
    "Xbox Game Studios",
    "Set sail on a shared pirate adventure across a vast open ocean. Hunt treasure, battle rival crews and legendary krakens, and forge your pirate legend — alone or with a crew of friends.",
    32,
    460,
    4,
  ),
  g(
    "xb-4",
    "Split Fiction",
    "XBOX",
    "#338faf",
    "#fee676",
    "Electronic Arts",
    "Split Fiction is a cooperative action-adventure game from Hazelight Studios — designed exclusively for two players through local split-screen or online co-op, leaping between sci-fi and fantasy worlds.",
    33,
    320,
    3,
  ),
  g(
    "xb-5",
    "Halo Infinite",
    "XBOX",
    "#0f3b2e",
    "#58c1d6",
    "Xbox Game Studios",
    "The Master Chief returns in the most expansive Halo campaign yet, plus a free-to-play multiplayer suite. Explore the massive Zeta Halo ring and confront the Banished.",
    29,
    450,
    2,
  ),
  g(
    "xb-6",
    "Forza Horizon 5",
    "XBOX",
    "#c78a1e",
    "#3f7fbf",
    "Xbox Game Studios",
    "Lead breathtaking expeditions across the vibrant open world of Mexico with the greatest cars ever made. Race, stunt, create, and explore in hundreds of the world's greatest cars.",
    37,
    500,
    1,
  ),

  /* ---------------- PC ---------------- */
  g(
    "pc-1",
    "God of War Ragnarök",
    "PC",
    "#a8c3e6",
    "#324e6c",
    "Sony Interactive Entertainment",
    "Kratos and Atreus journey through the Nine Realms in search of answers as Asgardian forces prepare for a prophesied battle that will end the world. Fimbulwinter is well underway.",
    27,
    470,
    6,
  ),
  g(
    "pc-2",
    "The Sims™  4",
    "PC",
    "#9fecff",
    "#0198ec",
    "Electronic Arts",
    "Create unique Sims, build the perfect home, and shape their lives. Explore vibrant worlds and play with life in a limitless sandbox of stories, careers, and chaos.",
    44,
    520,
    5,
  ),
  g(
    "pc-3",
    "Elden Ring",
    "PC",
    "#113633",
    "#b68753",
    "Bandai Namco",
    "Rise, Tarnished, and journey through the Lands Between. A vast fantasy world crafted by Hidetaka Miyazaki and George R. R. Martin awaits, dense with danger and wonder.",
    21,
    590,
    4,
  ),
  g(
    "pc-4",
    "Cyberpunk 2077",
    "PC",
    "#f2e701",
    "#7d1827",
    "CD Projekt Red",
    "An open-world action-adventure RPG set in Night City, a megalopolis obsessed with power, glamour and body modification. Play as V, a mercenary chasing a one-of-a-kind implant.",
    30,
    430,
    3,
  ),
  g(
    "pc-5",
    "Baldur's Gate 3",
    "PC",
    "#3b1330",
    "#c7883b",
    "Larian Studios",
    "Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal. Mysterious abilities are awakening inside you, drawn from a mind flayer parasite.",
    19,
    560,
    2,
  ),
  g(
    "pc-6",
    "Stardew Valley",
    "PC",
    "#2c6e31",
    "#a9d16a",
    "ConcernedApe",
    "You've inherited your grandfather's old farm plot. Armed with hand-me-down tools and a few coins, you set out to begin your new life — farm, fish, mine, and befriend the town.",
    48,
    390,
    1,
  ),

  /* ---------------- Nintendo Switch ---------------- */
  g(
    "sw-1",
    "The Legend of Zelda: Tears of the Kingdom",
    "SWITCH",
    "#145076",
    "#2c806c",
    "Nintendo",
    "An epic adventure across the land and skies of Hyrule. Harness the power of Link's new abilities to fight back against the malevolent forces that threaten the kingdom.",
    25,
    600,
    6,
  ),
  g(
    "sw-2",
    "Animal Crossing",
    "SWITCH",
    "#37a0eb",
    "#be9420",
    "Nintendo",
    "Escape to a deserted island and create your own paradise as you explore, create, and customize. Befriend adorable villagers and shape your island life however you like.",
    41,
    480,
    5,
  ),
  g(
    "sw-3",
    "Super Smash Bros.™ Ultimate",
    "SWITCH",
    "#4489c2",
    "#b22562",
    "Nintendo",
    "The biggest crossover in gaming history. Every fighter ever featured in the series is here, battling across iconic stages with items, assist trophies, and pure chaos.",
    34,
    550,
    4,
  ),
  g(
    "sw-4",
    "Pokemon™ Legends: Arceus",
    "SWITCH",
    "#90c0c1",
    "#9aa971",
    "Nintendo",
    "Survey, catch, and research wild Pokémon in a long-gone era of the Sinnoh region. A new challenge and a new frontier await in this bold reimagining of the series.",
    23,
    420,
    3,
  ),
  g(
    "sw-5",
    "Mario Kart 8 Deluxe",
    "SWITCH",
    "#c62828",
    "#2f6fd6",
    "Nintendo",
    "Hit the road with the definitive version of Mario Kart 8. Race and battle friends across 96 courses, with every character, kart, and DLC track included.",
    39,
    530,
    2,
  ),
  g(
    "sw-6",
    "Splatoon 3",
    "SWITCH",
    "#d6d21f",
    "#7b2fd6",
    "Nintendo",
    "Enter the Splatlands, a sun-scorched desert inhabited by battle-hardened Inklings and Octolings. Ink it up in 4v4 Turf War battles and a full single-player campaign.",
    36,
    360,
    1,
  ),
];

export const getGame = (id: string) => CATALOG.find((g) => g.id === id);
