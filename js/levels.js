/* Grok Heist Crew - level layouts (2 m grid cells) + game data
 * Legend: ' ' outside  'w' water  '#' wall  '.' floor  'D' doorway  'L' locked door (Hacker)  'S' secret wall (lever)
 *         'G' glass  '=' low counter (Acrobat vaults)  '~' gap (Acrobat leaps / grapple)  'Z' laser  'C' heavy crate (Muscle)
 *         'K' skylight (roof route)  'R' grapple point to the roof  'E' start  'X' getaway vehicle  'T' main target
 *         'B' big loot (Muscle)  'b' small loot  'c' camera  'l' lever  '1'..'4' vent pairs (Acrobat)
 */
(function () {
  'use strict';
  const GH = window.GH = window.GH || {};
  const D = GH.D = {};
  D.CELL = 2; D.WALL_H = 3.6; D.ROOF_H = 6.4; // second storey facade above the rooms: buildings read as real 2-floor buildings outside

  D.ROLES = {
    hacker: { name: 'Hacker', icon: '💻', col: '#8b5cf6', ab: 'HACK', abIcon: '💻', desc: 'Opens locked doors, shuts off cameras and lasers with a quick mini-game.' },
    lookout: { name: 'Lookout', icon: '🔭', col: '#22c55e', ab: 'PING', abIcon: '📡', desc: 'Pings guards, cameras and loot so the crew sees them through walls.' },
    acrobat: { name: 'Acrobat', icon: '🤸', col: '#ff4fd8', ab: 'FLIP', abIcon: '🤸', desc: 'Vaults counters and lasers, wall-runs over gaps, squeezes through vents.' },
    muscle: { name: 'Muscle', icon: '💪', col: '#ff8a1f', ab: 'LIFT', abIcon: '💪', desc: 'Moves heavy crates and carries big loot.' }
  };
  D.ROLE_IDS = ['hacker', 'lookout', 'acrobat', 'muscle'];
  D.GADGETS = {
    hook: { name: 'Grappling Hook', icon: '🪝', desc: 'Zip across gaps and up to the roof.', base: 99 },
    banana: { name: 'Banana Peel', icon: '🍌', desc: 'Drop it - a guard who steps on it slips and naps.', base: 2 },
    smoke: { name: 'Smoke Bomb', icon: '💨', desc: 'A big pink cloud guards can\u2019t see through. Breaks a chase!', base: 2 },
    decoy: { name: 'Decoy Toy', icon: '🧸', desc: 'A wind-up toy that honks and walks - guards go look at it.', base: 2 },
    mirror: { name: 'Laser Mirror', icon: '🪞', desc: 'Use near lasers to bounce them away for good.', base: 1 }
  };
  D.GADGET_IDS = ['hook', 'banana', 'smoke', 'decoy', 'mirror'];
  D.UPGRADES = [
    { id: 'banana', name: 'Banana Bunch', icon: '🍌', desc: '+1 banana peel per heist', max: 3, cost: [120, 250, 400] },
    { id: 'smoke', name: 'Bigger Smoke', icon: '💨', desc: '+1 smoke bomb, bigger cloud', max: 3, cost: [150, 300, 450] },
    { id: 'decoy', name: 'Louder Decoys', icon: '🧸', desc: '+1 decoy, guards stay longer', max: 3, cost: [120, 250, 400] },
    { id: 'mirror', name: 'Mirror Kit', icon: '🪞', desc: '+1 laser mirror per heist', max: 2, cost: [200, 400] },
    { id: 'shoes', name: 'Sneaky Shoes', icon: '👟', desc: 'Guards spot you slower', max: 3, cost: [200, 350, 500] },
    { id: 'speed', name: 'Zoomy Sneakers', icon: '⚡', desc: 'Run a little faster', max: 2, cost: [250, 450] },
    { id: 'hackfast', name: 'Turbo Laptop', icon: '💻', desc: 'Hacks need fewer taps', max: 1, cost: [300] },
    { id: 'radar', name: 'Super Radar', icon: '📡', desc: 'Lookout pings last longer', max: 1, cost: [300] }
  ];
  D.OUTFITS = [
    { id: 'classic', name: 'Classic', cost: 0, tint: 0, hat: null },
    { id: 'midnight', name: 'Midnight', cost: 150, tint: 'midnight', hat: 'beanie' },
    { id: 'gold', name: 'Golden', cost: 300, tint: 'gold', hat: 'tophat' },
    { id: 'party', name: 'Party', cost: 200, tint: 'party', hat: 'party' },
    { id: 'royal', name: 'Royal', cost: 400, tint: 'royal', hat: 'crown' },
    { id: 'cowboy', name: 'Cowpoke', cost: 250, tint: 'cowboy', hat: 'cowboy' }
  ];

  // helper: build char grid from rooms + edits
  function grid(W, H, fill, rooms, edits) {
    const g = []; for (let z = 0; z < H; z++) { g.push(new Array(W).fill(fill || ' ')); }
    rooms.forEach((r) => { for (let z = r[2] + 1; z < r[4]; z++) for (let x = r[1] + 1; x < r[3]; x++) g[z][x] = '.'; });
    rooms.forEach((r) => { for (let x = r[1]; x <= r[3]; x++) { g[r[2]][x] = '#'; g[r[4]][x] = '#'; } for (let z = r[2]; z <= r[4]; z++) { g[z][r[1]] = '#'; g[z][r[3]] = '#'; } });
    edits.forEach((e) => { if (e.length === 3) g[e[1]][e[0]] = e[2]; else for (let z = e[1]; z <= e[3]; z++) for (let x = e[0]; x <= e[2]; x++) g[z][x] = e[4]; });
    return g.map((row) => row.join(''));
  }
  const pts = (ch, list) => list.map((p) => [p[0], p[1], ch]);

  D.LEVELS = {};
  /* ================= HIDEOUT ================= */
  D.LEVELS.hideout = {
    id: 'hideout', name: 'Crew Hideout', hub: true, sky: 'day', ground: '#7cd36b', W: 34, H: 28,
    rooms: [
      ['Planning Room', 2, 2, 16, 12, 'plan', '#c9874a', '#3fb5a8'], ['Gadget Lab', 16, 2, 32, 12, 'glab', '#9aa4b8', '#ff8a3d'],
      ['Crew Lounge', 2, 12, 12, 24, 'lounge', '#e9b872', '#ff6fa8'], ['Trophy Room', 12, 12, 22, 24, 'trophy', '#7a3fb8', '#ffd23f'], ['Garage', 22, 12, 32, 24, 'garage', '#8f96a3', '#4aa3ff']
    ],
    edits: [[16, 6, 'D'], [16, 7, 'D'], [7, 12, 'D'], [14, 12, 'D'], [27, 12, 'D'], [12, 18, 'D'], [22, 18, 'D'], [26, 24, 'D'], [27, 24, 'D'], [28, 24, 'D'], [7, 24, 'D'], [9, 10, 'E']],
    stations: [{ k: 'plan', x: 9, z: 6, label: '🗺️ PLAN A HEIST' }, { k: 'upgrade', x: 24, z: 5, label: '🔧 GADGET UPGRADES' }, { k: 'outfit', x: 4, z: 21, label: '👕 OUTFITS' },
      { k: 'crew', x: 7, z: 15, label: '🦹 PICK YOUR ROLE' }, { k: 'trophy', x: 17, z: 18, label: '🏆 TROPHY ROOM' }, { k: 'van', x: 27, z: 17, label: '🚐 HEIST VAN' }],
    guards: []
  };

  /* ================= 1. CANDY FACTORY ================= */
  D.LEVELS.candy = {
    id: 'candy', n: 1, name: 'Candy Factory', full: 'Sweet Tooth Candy Co.', icon: '🍬', sky: 'day', ground: '#8fe07a', street: '#ffd6ec', W: 42, H: 32,
    target: { name: 'Golden Gumball', icon: '🟡', model: 'gumball' }, vehicle: 'icecream', guard: 'guard', par: 240,
    story: 'Baron Grumble hid the town\u2019s Golden Gumball in his candy factory vault. Sneak in, grab it, and get to the ice-cream truck!',
    big: [{ name: 'Giant Jawbreaker', model: 'jawbreaker', v: 120 }, { name: 'Choco Crate', model: 'chococrate', v: 120 }],
    rooms: [
      ['Taffy Hall', 2, 4, 13, 15, 'taffy', '#ffc2e2', '#ff7ab8'], ['Wrapping Room', 2, 15, 13, 26, 'wrap', '#bfe8ff', '#4fb3ff'],
      ['Gumball Vault', 13, 4, 26, 10, 'vault', '#ffe9a8', '#c99a2e'], ['Storage', 26, 4, 39, 13, 'storage', '#e8d2b0', '#a8743f'],
      ['Chocolate River', 13, 10, 26, 19, 'river', '#ffe0f0', '#9b5de5'], ['Office', 26, 13, 39, 26, 'office', '#c8f0d0', '#2fbf71'],
      ['Lobby', 13, 19, 26, 26, 'lobby', '#fff0b8', '#ff5d8f']
    ],
    edits: [[19, 26, 'D'], [20, 26, 'D'], [15, 19, 'D'], [16, 19, 'D'], [23, 19, 'D'], [24, 19, 'D'], [14, 14, 25, 15, '~'], [19, 14, 20, 15, 'Z'],
      [19, 10, 'L'], [20, 10, 'L'], [13, 12, 'D'], [13, 23, 'D'], [5, 16, '1'], [5, 14, '1'], [26, 22, 'D'], [32, 13, 'S'], [33, 13, 'S'], [38, 24, 'l'],
      [26, 7, 'D'], [27, 7, 'C'], [33, 9, 'K'], [25, 18, '2'], [27, 18, '2'], [33, 3, 'R'], [20, 6, 'T'], [6, 8, 'B'], [36, 6, 'B'], [17, 22, 22, 22, '='],
      [25, 25, 'c'], [14, 11, 'c'], [38, 5, 'c'], [27, 14, 'c'], [14, 5, 'c'], [20, 30, 'E'], [8, 29, 'X']]
      .concat(pts('b', [[15, 6], [24, 8], [29, 11], [37, 11], [14, 12], [25, 17], [30, 20], [36, 16], [14, 21], [4, 24], [11, 18], [11, 6], [3, 13]])),
    guards: [[[15, 21], [24, 21], [24, 24], [15, 24]], [[14, 12], [25, 12]], [[4, 17], [11, 17], [11, 24], [4, 24]], [[28, 15], [37, 15], [37, 23], [28, 23]], [[28, 6], [37, 6], [37, 11], [28, 11]], [[4, 6], [11, 13]]],
    blink: []
  };

  /* ================= 2. CITY MUSEUM ================= */
  D.LEVELS.museum = {
    id: 'museum', n: 2, name: 'City Museum', full: 'Grand City Museum', icon: '🏛️', sky: 'sunset', ground: '#7fcf6a', street: '#e8dcc8', W: 44, H: 34,
    target: { name: 'Moonstone Diamond', icon: '💎', model: 'diamond' }, vehicle: 'van', guard: 'guard', par: 300,
    story: 'The Moonstone Diamond was "borrowed" by Baron Grumble and locked in the Gem Gallery. Get past the laser hall and bring it home!',
    big: [{ name: 'Dino Egg', model: 'dinoegg', v: 140 }, { name: 'Golden Mask', model: 'mask', v: 140 }, { name: 'Meteorite', model: 'meteor', v: 140 }],
    rooms: [
      ['Security Office', 2, 4, 14, 12, 'security', '#c9d3e0', '#4a6fa5'], ['Gem Gallery', 14, 4, 30, 12, 'gems', '#3b2a6b', '#7c4dff'], ['Space Exhibit', 30, 4, 42, 12, 'space', '#1e2a5a', '#3b82f6'],
      ['Dino Hall', 2, 12, 14, 30, 'dino', '#e9d6a8', '#d9883b'], ['Art Gallery', 14, 12, 30, 22, 'art', '#f2e6d8', '#e0475b'], ['Grand Entrance', 14, 22, 30, 30, 'entrance', '#f0e8dc', '#2bb3a3'],
      ['Egypt Wing', 30, 12, 42, 30, 'egypt', '#f2d48a', '#e0a020']
    ],
    edits: [[21, 30, 'D'], [22, 30, 'D'], [17, 22, 'D'], [18, 22, 'D'], [25, 22, 'Z'], [26, 22, 'Z'], [14, 26, 'D'], [30, 26, 'D'], [21, 12, 'L'], [22, 12, 'L'],
      [6, 12, 'D'], [7, 12, 'D'], [14, 8, 'S'], [3, 5, 'l'], [36, 12, 'D'], [31, 6, '1'], [29, 6, '1'], [14, 17, 'D'], [30, 14, 'G'], [30, 15, 'G'], [30, 19, 'G'], [30, 20, 'G'],
      [15, 15, 29, 15, 'Z'], [17, 18, 'G'], [21, 18, 'G'], [25, 18, 'G'], [17, 6, 'G'], [27, 6, 'G'], [22, 7, 'T'], [37, 8, 'K'], [38, 3, 'R'], [4, 28, 'B'], [40, 28, 'B'], [40, 6, 'B'],
      [15, 29, 'c'], [29, 23, 'c'], [15, 13, 'c'], [29, 5, 'c'], [41, 13, 'c'], [3, 13, 'c'], [22, 32, 'E'], [6, 32, 'X']]
      .concat(pts('b', [[16, 24], [28, 28], [3, 20], [12, 14], [15, 20], [29, 17], [31, 16], [41, 22], [35, 29], [31, 10], [41, 5], [12, 6], [3, 10], [17, 9], [27, 9]])),
    guards: [[[16, 24], [27, 24], [27, 28], [16, 28]], [[15, 13], [28, 13]], [[15, 20], [28, 20]], [[4, 14], [12, 14], [12, 28], [5, 28]], [[32, 14], [40, 14], [40, 27], [32, 27]], [[16, 10], [28, 10]], { sleep: true, at: [8, 7] }],
    blink: [[15, 15]]
  };

  /* ================= 3. CRUISE SHIP ================= */
  D.LEVELS.ship = {
    id: 'ship', n: 3, name: 'Cruise Ship', full: 'S.S. Sunny Sundae', icon: '🛳️', sky: 'day', ground: '#2fb5e8', street: '#c99a62', water: true, waterY: -2.2, W: 46, H: 30,
    target: { name: 'Golden Rubber Duck', icon: '🦆', model: 'duck' }, vehicle: 'boat', guard: 'sailor', par: 300,
    story: 'Baron Grumble is sailing off with the Golden Rubber Duck! It\u2019s locked in the Captain\u2019s Quarters. Sneak aboard and escape by speedboat!',
    big: [{ name: 'Giant Cake', model: 'cake', v: 150 }, { name: 'Treasure Chest', model: 'chest', v: 150 }, { name: 'Golden Anchor', model: 'anchor', v: 150 }],
    rooms: [
      ['Buffet', 1, 2, 10, 12, 'buffet', '#fff1d6', '#ff7a59'], ['Pool Deck', 10, 2, 30, 12, 'deck', '#d9a066', '#ffffff', true], ['Captain\u2019s Quarters', 30, 2, 44, 12, 'captain', '#7a2e3a', '#1f3a8a'],
      ['Cabin A', 1, 12, 8, 17, 'cabin', '#bfe3ff', '#ffffff'], ['Cabin B', 8, 12, 16, 17, 'cabin', '#ffd9e8', '#ffffff'], ['Corridor', 1, 17, 16, 22, 'hall', '#3a6fd8', '#fff3e0'],
      ['Grand Atrium', 16, 12, 30, 22, 'atrium', '#f5e1c8', '#e0b04a'], ['Engine Room', 30, 12, 44, 22, 'engine', '#8a94a6', '#5b6475']
    ],
    edits: [[8, 23, 40, 29, ' '], [22, 22, 'D'], [23, 22, 'D'], [20, 12, 'D'], [21, 12, 'D'], [27, 12, 'D'], [30, 18, 'D'], [16, 19, 'D'], [4, 17, 'D'], [12, 17, 'D'], [4, 12, 'D'], [10, 7, 'D'],
      [30, 6, 'L'], [30, 7, 'L'], [40, 12, 'S'], [41, 12, 'S'], [43, 21, 'l'], [42, 21, 'C'], [43, 20, 'C'], [14, 13, '1'], [17, 13, '1'], [31, 13, '2'], [31, 11, '2'],
      [14, 5, 24, 8, '~'], [28, 5, 29, 8, 'Z'], [38, 18, 'K'], [36, 23, 'R'], [38, 6, 'T'], [3, 4, 'B'], [42, 10, 'B'], [34, 20, 'B'],
      [29, 21, 'c'], [11, 3, 'c'], [43, 3, 'c'], [43, 13, 'c'], [2, 18, 'c'], [22, 27, 'E'], [39, 28, 'X']]
      .concat(pts('b', [[8, 10], [5, 7], [12, 3], [28, 10], [2, 14], [14, 16], [7, 21], [15, 21], [17, 21], [28, 15], [33, 16], [42, 15], [33, 3], [42, 4], [36, 10]])),
    guards: [[[17, 14], [28, 14], [28, 20], [17, 20]], [[12, 4], [27, 4], [27, 10], [12, 10]], [[2, 19], [15, 19]], [[2, 5], [8, 5], [8, 10], [2, 10]], [[32, 14], [41, 14], [41, 19], [32, 19]], [[32, 4], [42, 4], [42, 8], [32, 8]]],
    blink: [[28, 5]], fill: 'w'
  };

  /* ================= 4. CLOUD CASTLE ================= */
  D.LEVELS.castle = {
    id: 'castle', n: 4, name: 'Cloud Castle', full: 'Castle Cumulus', icon: '🏰', sky: 'sky', ground: '#ffffff', street: '#f6e7ff', clouds: true, W: 44, H: 36,
    target: { name: 'Rainbow Crown', icon: '👑', model: 'crown' }, vehicle: 'balloon', guard: 'robot', par: 330,
    story: 'High above the clouds, Baron Grumble\u2019s Knight-Bots guard the Rainbow Crown. Cross the sky bridge, crack the treasury, and float away by balloon!',
    big: [{ name: 'Golden Goose Egg', model: 'goldegg', v: 160 }, { name: 'Giant Harp', model: 'harp', v: 160 }, { name: 'Cloud Pillow', model: 'pillow', v: 160 }],
    rooms: [
      ['Treasury', 16, 1, 28, 8, 'treasury', '#ffe9a8', '#b48cff'], ['West Tower', 2, 8, 12, 20, 'tower', '#d8d2f0', '#8e7cc3'], ['Great Hall', 12, 8, 32, 20, 'ghall', '#f3e8ff', '#7c5cff'],
      ['East Tower', 32, 8, 42, 20, 'tower', '#d8d2f0', '#8e7cc3'], ['Library', 2, 20, 12, 32, 'library', '#e6c79a', '#3a8f6b'], ['Courtyard', 12, 20, 32, 32, 'court', '#c8f5d0', '#b9a8ff', true],
      ['Kitchen', 32, 20, 42, 32, 'kitchen', '#fff2c8', '#ff9f43']
    ],
    edits: [[21, 32, 'D'], [22, 32, 'D'], [21, 20, 'D'], [22, 20, 'D'], [12, 26, 'D'], [32, 26, 'D'], [13, 13, 31, 14, '~'], [21, 13, 22, 14, 'Z'], [12, 11, 'D'], [32, 11, 'D'],
      [21, 8, 'L'], [22, 8, 'L'], [33, 21, '1'], [33, 19, '1'], [37, 20, 'D'], [37, 19, 'C'], [5, 20, 'S'], [6, 20, 'S'], [3, 31, 'l'], [38, 11, 'K'], [43, 14, 'R'], [22, 4, 'T'],
      [40, 30, 'B'], [14, 17, 'B'], [4, 10, 'B'], [13, 9, 'c'], [31, 9, 'c'], [13, 31, 'c'], [31, 21, 'c'], [17, 2, 'c'], [11, 21, 'c'], [22, 34, 'E'], [7, 34, 'X']]
      .concat(pts('b', [[17, 6], [27, 6], [3, 18], [11, 9], [41, 18], [41, 9], [24, 10], [30, 17], [3, 22], [10, 28], [41, 22], [34, 31], [14, 24], [30, 30], [13, 19]])),
    guards: [[[14, 22], [29, 22], [29, 30], [14, 30]], [[13, 17], [30, 17]], [[13, 10], [30, 10]], [[34, 22], [40, 22], [40, 29], [34, 29]], [[4, 22], [10, 29]], [[34, 10], [40, 17]], [[18, 3], [26, 3]]],
    blink: [[21, 13]]
  };

  /* ================= 5. TOY STORE (bonus) ================= */
  D.LEVELS.toys = {
    id: 'toys', n: 5, name: 'Toy Tower', full: 'Toy Tower Mega Store', icon: '🧸', sky: 'night', ground: '#5fbf6a', street: '#9aa6c8', W: 40, H: 32, bonus: true,
    target: { name: 'Mega Robo Prototype', icon: '🤖', model: 'robo', big: true }, vehicle: 'kart', guard: 'toybot', par: 300,
    story: 'BONUS HEIST! Baron Grumble wants to keep the Mega Robo Prototype all to himself. It\u2019s HUGE, so the Muscle has to carry it out to the rocket kart!',
    big: [{ name: 'Giant Teddy', model: 'teddy', v: 170 }, { name: 'Golden Console', model: 'console', v: 170 }],
    rooms: [
      ['Back Stock', 2, 2, 14, 8, 'stock', '#d9c8a8', '#8a6a4a'], ['Prototype Lab', 14, 2, 26, 8, 'lab', '#d8f3ff', '#00b3d6'], ['Manager Office', 26, 2, 38, 8, 'office', '#ffe8c8', '#ff6b6b'],
      ['Plush Aisle', 2, 8, 14, 18, 'plush', '#ffd6f0', '#ff6fb5'], ['Blocks & Trains', 14, 8, 26, 18, 'blocks', '#fff3b0', '#ffb703'], ['Game Zone', 26, 8, 38, 18, 'games', '#2a2350', '#7c3aed'],
      ['Gift Wrap', 2, 18, 8, 28, 'giftwrap', '#e0ffe8', '#2fbf71'], ['Showroom', 8, 18, 38, 28, 'showroom', '#fff8e8', '#3b82f6']
    ],
    edits: [[19, 28, 'D'], [20, 28, 'D'], [10, 18, 'D'], [19, 18, 'Z'], [20, 18, 'Z'], [33, 18, 'D'], [14, 14, 'D'], [26, 14, 'D'], [19, 8, 'L'], [20, 8, 'L'], [26, 5, 'D'], [27, 5, 'C'],
      [33, 8, 'D'], [5, 8, 'D'], [14, 4, 'S'], [3, 3, 'l'], [8, 24, 'D'], [5, 19, '1'], [5, 17, '1'], [15, 11, 25, 12, '~'], [32, 5, 'K'], [32, 1, 'R'], [20, 4, 'T'], [4, 12, 'B'], [36, 16, 'B'],
      [9, 19, 'c'], [37, 27, 'c'], [25, 17, 'c'], [27, 9, 'c'], [15, 3, 'c'], [37, 3, 'c'], [20, 30, 'E'], [6, 30, 'X']]
      .concat(pts('b', [[12, 26], [36, 20], [24, 26], [3, 24], [7, 21], [12, 10], [3, 16], [16, 16], [24, 9], [36, 10], [28, 16], [29, 3], [12, 3], [24, 3], [16, 9]])),
    guards: [[[10, 20], [36, 20], [36, 26], [10, 26]], [[24, 22], [34, 22]], [[3, 10], [12, 16]], [[28, 10], [36, 15]], [[28, 3], [36, 3]], [[16, 6], [24, 6]], [[16, 15], [24, 15]]],
    blink: [[19, 18]]
  };
  D.ORDER = ['candy', 'museum', 'ship', 'castle', 'toys'];
  for (const id in D.LEVELS) { const L = D.LEVELS[id]; L.map = grid(L.W, L.H, L.fill || ' ', L.rooms, L.edits); }
})();
