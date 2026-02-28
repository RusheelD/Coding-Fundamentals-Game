/* =========================================================
   levels.js – Level definitions for Code Quest
   Each level describes the grid, player start, goal(s),
   walls, collectibles, available blocks, and hints.
   ========================================================= */

// Direction constants
const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
const DIR_NAME = ['up', 'right', 'down', 'left'];
const DIR_DELTA = [
    { dr: -1, dc: 0 },  // UP
    { dr: 0, dc: 1 },   // RIGHT
    { dr: 1, dc: 0 },   // DOWN
    { dr: 0, dc: -1 },  // LEFT
];

// Tile types
const TILE = {
    EMPTY: 0,
    WALL: 1,
    GOAL: 2,
    GEM: 3,
    HAZARD: 4,
    PAINT: 5,      // tile the player must paint
    PAINTED: 6,    // already painted
    SWITCH_A: 7,   // blue switch – toggles blue gates
    GATE_A_CLOSED: 8,
    GATE_A_OPEN: 9,
    SWITCH_B: 10,  // red switch – toggles red gates
    GATE_B_CLOSED: 11,
    GATE_B_OPEN: 12,
};

/**
 *  Conditions available for if/while dropdown blocks.
 */
const CONDITIONS = {
    path_ahead: { label: 'path ahead' },
    path_behind: { label: 'path behind' },
    path_left: { label: 'path left' },
    path_right: { label: 'path right' },
    wall_ahead: { label: 'wall ahead' },
    gem_here: { label: 'gem here' },
    on_paint: { label: 'on paint tile' },
};

/**
 *  Block catalogue – every possible block type.
 *  `cat` = colour-category; `hasBody` = can nest blocks (loop/if).
 */
const BLOCK_DEFS = {
    move_forward: { label: 'Move Forward', icon: '⬆️', cat: 'move' },
    turn_left: { label: 'Turn Left', icon: '↩️', cat: 'turn' },
    turn_right: { label: 'Turn Right', icon: '↪️', cat: 'turn' },
    turn_to: {
        label: 'Face', icon: '🧭', cat: 'turn',
        selectOptions: { north: '↑ North', south: '↓ South', east: '→ East', west: '← West' }
    },
    pick_up: { label: 'Pick Up', icon: '💎', cat: 'action' },
    paint: { label: 'Paint Tile', icon: '🎨', cat: 'action' },
    repeat: { label: 'Repeat', icon: '🔁', cat: 'loop', hasBody: true, hasInput: true, inputDefault: 2 },
    if_cond: { label: 'If', icon: '❓', cat: 'cond', hasBody: true, hasCondition: true },
    while_cond: { label: 'While', icon: '🔄', cat: 'loop', hasBody: true, hasCondition: true },
};

/**
 *  Level list.  Grid is row-major (grid[row][col]).
 */
const LEVELS = [
    // ──────────── LEVEL 1 ────────────
    {
        title: 'First Steps',
        description: 'Move your character forward to reach the flag!',
        hint: 'Use 3 <b>Move Forward</b> blocks.',
        rows: 5, cols: 5,
        grid: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        start: { r: 2, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 2, c: 3 }],
        gems: [],
        blocks: ['move_forward'],
        maxBlocks: 5,
        stars: [5, 4, 3],  // blocks used thresholds for 3/2/1 star
    },

    // ──────────── LEVEL 2 ────────────
    {
        title: 'Turn the Corner',
        description: 'Navigate around the corner to reach the flag.',
        hint: 'Move forward, then turn, then move forward again.',
        rows: 5, cols: 5,
        grid: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        start: { r: 4, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 0, c: 4 }],
        gems: [],
        blocks: ['move_forward', 'turn_left', 'turn_right'],
        maxBlocks: 12,
        stars: [12, 11, 9],  // min: 9 (right 4 + turn_left + up 4)
    },

    // ──────────── LEVEL 3 ────────────
    {
        title: 'Repeat Yourself',
        description: 'Use a loop to move across the board efficiently.',
        hint: 'Put <b>Move Forward</b> inside a <b>Repeat</b> block.',
        rows: 5, cols: 7,
        grid: [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        start: { r: 2, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 2, c: 6 }],
        gems: [],
        blocks: ['move_forward', 'repeat'],
        maxBlocks: 4,
        stars: [3, 2, 2],
    },

    // ──────────── LEVEL 4 ────────────
    {
        title: 'Gem Collector',
        description: 'Collect all the gems, then reach the flag.',
        hint: 'Pick up the gems as you walk. Can you use a <b>Repeat</b> loop?',
        rows: 5, cols: 5,
        grid: [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
        ],
        start: { r: 2, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 2, c: 4 }],
        gems: [{ r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }],
        blocks: ['move_forward', 'pick_up', 'repeat'],
        maxBlocks: 6,
        stars: [6, 5, 4],  // min: 3 (repeat(4){move, pick_up})
    },

    // ──────────── LEVEL 5 ────────────
    // Concept: putting MULTIPLE commands inside one Repeat body
    {
        title: 'Staircase',
        description: 'Walk down the staircase to reach the flag! Look for a pattern you can repeat.',
        hint: 'Each step is the same: <b>Forward, Turn Right, Forward, Turn Left</b>. Put all four inside one <b>Repeat</b>!',
        rows: 5, cols: 5,
        grid: [
            [0, 0, 1, 1, 1],
            [1, 0, 0, 1, 1],
            [1, 1, 0, 0, 1],
            [1, 1, 1, 0, 0],
            [1, 1, 1, 1, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 4, c: 4 }],
        gems: [],
        blocks: ['move_forward', 'turn_left', 'turn_right', 'repeat'],
        maxBlocks: 16,
        stars: [16, 10, 5],
    },

    // ──────────── LEVEL 6 ────────────
    // Concept: conditionals — If On Gem
    {
        title: 'Choosy Collector',
        description: 'Walk along the corridor and pick up only the gems — don\'t grab thin air!',
        hint: 'Use <b>If</b> (gem here) with <b>Pick Up</b> inside, all within a <b>Repeat</b> that also moves forward.',
        rows: 3, cols: 9,
        grid: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
        start: { r: 1, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 1, c: 8 }],
        gems: [{ r: 1, c: 2 }, { r: 1, c: 4 }, { r: 1, c: 6 }],
        blocks: ['move_forward', 'pick_up', 'repeat', 'if_cond'],
        conditions: ['gem_here'],
        maxBlocks: 12,
        stars: [12, 8, 4],
    },

    // ──────────── LEVEL 7 ────────────
    // Concept: While Path — loop without knowing the count
    {
        title: 'While You Can',
        description: 'Use a while-loop to walk forward without counting steps!',
        hint: '<b>While</b> (path ahead) keeps running its body as long as the path ahead is clear — no counting needed!',
        rows: 4, cols: 8,
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 3, c: 7 }],
        gems: [],
        blocks: ['move_forward', 'turn_right', 'while_cond'],
        conditions: ['path_ahead'],
        maxBlocks: 12,
        stars: [12, 8, 5],
    },

    // ──────────── LEVEL 8 ────────────
    // Concept: combining While Path + If On Gem
    {
        title: 'Smart Collector',
        description: 'Walk and collect gems automatically by combining a while-loop with a conditional!',
        hint: 'Put <b>Move Forward</b> and <b>If</b> (gem here) with <b>Pick Up</b> inside a <b>While</b> (path ahead) loop.',
        rows: 3, cols: 10,
        grid: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
        start: { r: 1, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 1, c: 9 }],
        gems: [{ r: 1, c: 1 }, { r: 1, c: 3 }, { r: 1, c: 4 }, { r: 1, c: 7 }],
        blocks: ['move_forward', 'pick_up', 'while_cond', 'if_cond'],
        conditions: ['path_ahead', 'gem_here'],
        maxBlocks: 15,
        stars: [15, 8, 4],
    },

    // ──────────── LEVEL 9 ────────────
    // Concept: Paint action + loops
    {
        title: 'Painter Bot',
        description: 'Paint every grey tile to turn it green!',
        hint: 'Paint the tile you\'re on, then use a loop to <b>Move Forward</b> and <b>Paint</b> the rest.',
        rows: 3, cols: 7,
        grid: [
            [1, 1, 1, 1, 1, 1, 1],
            [5, 5, 5, 5, 5, 5, 5],
            [1, 1, 1, 1, 1, 1, 1],
        ],
        start: { r: 1, c: 0, dir: DIR.RIGHT },
        goals: [],
        gems: [],
        requirePaint: true,
        blocks: ['move_forward', 'paint', 'repeat', 'while_cond'],
        conditions: ['path_ahead'],
        maxBlocks: 14,
        stars: [14, 8, 4],
    },

    // ──────────── LEVEL 10 ────────────
    // Concept: nested Repeat loops
    {
        title: 'Code Master',
        description: 'Paint the entire border of the room. Can you find the repeating pattern?',
        hint: 'Each side is the same: move and paint 4 times, then turn. Use a <b>Repeat</b> inside a <b>Repeat</b>!',
        rows: 5, cols: 5,
        grid: [
            [5, 5, 5, 5, 5],
            [5, 0, 0, 0, 5],
            [5, 0, 0, 0, 5],
            [5, 0, 0, 0, 5],
            [5, 5, 5, 5, 5],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [],
        gems: [],
        requirePaint: true,
        blocks: ['move_forward', 'paint', 'turn_right', 'repeat'],
        maxBlocks: 20,
        stars: [20, 16, 6],
    },

    // ══════════════════════════════════════════════════════════
    //  TEXT MODE LEVELS (Python-like syntax)
    // ══════════════════════════════════════════════════════════

    // ──────────── LEVEL 11 (TEXT) ────────────
    // Concept: basic Python commands — movement & turns
    {
        title: 'Hello, Python!',
        description: 'Write Python code to move your character to the flag. Each command goes on its own line.',
        hint: 'Use <code>move()</code> and <code>turn(right)</code>. You need 3 forward, 1 turn, then 3 more forward.',
        mode: 'text',
        rows: 4, cols: 4,
        grid: [
            [0, 0, 0, 0],
            [1, 1, 1, 0],
            [1, 1, 1, 0],
            [1, 1, 1, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 3, c: 3 }],
        gems: [],
        textCommands: ['move', 'turn_right'],
        blocks: [],
        maxBlocks: 15,
        stars: [9, 8, 7],
    },

    // ──────────── LEVEL 12 (TEXT) ────────────
    // Concept: for loops to reduce repetition
    {
        title: 'For Loops',
        description: 'Use a for-loop to cross the corridor without writing the same command 8 times!',
        hint: 'Indent the body with 4 spaces:<br><code>for i in range(8):<br>&nbsp;&nbsp;&nbsp;&nbsp;move()</code>',
        mode: 'text',
        rows: 3, cols: 9,
        grid: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
        start: { r: 1, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 1, c: 8 }],
        gems: [],
        textCommands: ['move', 'for_range'],
        blocks: [],
        maxBlocks: 15,
        stars: [8, 5, 2],
    },

    // ──────────── LEVEL 13 (TEXT) ────────────
    // Concept: if-statements (conditionals)
    {
        title: 'If Statements',
        description: 'Walk the corridor and collect gems — but only pick up when standing on one!',
        hint: 'Check before picking up:<br><code>for i in range(9):<br>&nbsp;&nbsp;&nbsp;&nbsp;move()<br>&nbsp;&nbsp;&nbsp;&nbsp;if gem_here():<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;pick_up()</code>',
        mode: 'text',
        rows: 3, cols: 10,
        grid: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
        start: { r: 1, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 1, c: 9 }],
        gems: [{ r: 1, c: 2 }, { r: 1, c: 4 }, { r: 1, c: 6 }, { r: 1, c: 8 }],
        textCommands: ['move', 'pick_up', 'for_range', 'if_cond', 'cond_gem_here'],
        blocks: [],
        maxBlocks: 20,
        stars: [10, 7, 4],
    },

    // ──────────── LEVEL 14 (TEXT) ────────────
    // Concept: while loops — loop without knowing the count
    {
        title: 'While Loops',
        description: 'Use while-loops to walk corridors of unknown length. No counting needed!',
        hint: '<code>while path(ahead):</code> repeats its body as long as the way is clear. Use it for each straight stretch, with a turn in between.',
        mode: 'text',
        rows: 5, cols: 8,
        grid: [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 4, c: 7 }],
        gems: [],
        textCommands: ['move', 'turn_right', 'while_cond', 'cond_path_ahead'],
        blocks: [],
        maxBlocks: 20,
        stars: [12, 8, 5],
    },

    // ──────────── LEVEL 15 (TEXT) ────────────
    // Concept: nested for-loops
    {
        title: 'Nested Loops',
        description: 'Paint the entire border of the room using nested for-loops!',
        hint: 'Each side: move &amp; paint 5 times, then turn:<br><code>paint()<br>for i in range(4):<br>&nbsp;&nbsp;&nbsp;&nbsp;for j in range(5):<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;move()<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;paint()<br>&nbsp;&nbsp;&nbsp;&nbsp;turn(right)</code>',
        mode: 'text',
        rows: 6, cols: 6,
        grid: [
            [5, 5, 5, 5, 5, 5],
            [5, 0, 0, 0, 0, 5],
            [5, 0, 0, 0, 0, 5],
            [5, 0, 0, 0, 0, 5],
            [5, 0, 0, 0, 0, 5],
            [5, 5, 5, 5, 5, 5],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [],
        gems: [],
        requirePaint: true,
        textCommands: ['move', 'paint', 'turn_right', 'for_range'],
        blocks: [],
        maxBlocks: 25,
        stars: [18, 12, 6],
    },

    // ──────────── LEVEL 16 (TEXT) ────────────
    // Concept: while + if_gem together (auto-collect pattern)
    {
        title: 'Auto Collector',
        description: 'Walk a long corridor and automatically collect any gems you find. Combine while and if!',
        hint: 'Use <code>while path(ahead):</code> with <code>move()</code> and <code>if gem_here():</code> + <code>pick_up()</code> inside.',
        mode: 'text',
        rows: 3, cols: 12,
        grid: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
        start: { r: 1, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 1, c: 11 }],
        gems: [{ r: 1, c: 2 }, { r: 1, c: 5 }, { r: 1, c: 7 }, { r: 1, c: 9 }, { r: 1, c: 10 }],
        textCommands: ['move', 'pick_up', 'while_cond', 'if_cond', 'cond_path_ahead', 'cond_gem_here'],
        blocks: [],
        maxBlocks: 20,
        stars: [8, 6, 4],
    },

    // ──────────── LEVEL 17 (TEXT) ────────────
    // Concept: multiple while loops — zigzag navigation
    {
        title: 'Zigzag',
        description: 'Navigate the zigzag corridors using while-loops for each stretch!',
        hint: 'Use <code>while path(ahead): move()</code> for each stretch. Try <code>turn(south)</code>, <code>turn(east)</code>, <code>turn(west)</code> to face the right direction at each bend!',
        mode: 'text',
        rows: 7, cols: 6,
        grid: [
            [0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 6, c: 5 }],
        gems: [],
        textCommands: ['move', 'turn_left', 'turn_right', 'turn_to', 'while_cond', 'for_range', 'cond_path_ahead'],
        blocks: [],
        maxBlocks: 25,
        stars: [16, 11, 7],
    },

    // ──────────── LEVEL 18 (TEXT) ────────────
    // Concept: if wall_ahead() for reactive navigation
    {
        title: 'Wall Hugger',
        description: 'Navigate a winding path by checking for walls ahead. Turn when blocked!',
        hint: 'Inside a for-loop: move forward, then check <code>if wall_ahead():</code> and turn. The path always turns right.',
        mode: 'text',
        rows: 5, cols: 7,
        grid: [
            [0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0, 0, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 4, c: 6 }],
        gems: [],
        textCommands: ['move', 'turn_left', 'turn_right', 'turn_to', 'for_range', 'while_cond', 'if_cond', 'cond_path_ahead', 'cond_wall_ahead'],
        blocks: [],
        maxBlocks: 25,
        stars: [14, 10, 6],
    },

    // ──────────── LEVEL 19 (TEXT) ────────────
    // Concept: paint + for loops — paint multiple rows
    {
        title: 'Stripe Painter',
        description: 'Paint three rows of tiles. After each row, reposition to the next one!',
        hint: 'Paint a row (paint + move in a loop), then turn around and drop down. Use a for-loop for each row, or nest them!',
        mode: 'text',
        rows: 5, cols: 7,
        grid: [
            [5, 5, 5, 5, 5, 5, 5],
            [0, 0, 0, 0, 0, 0, 0],
            [5, 5, 5, 5, 5, 5, 5],
            [0, 0, 0, 0, 0, 0, 0],
            [5, 5, 5, 5, 5, 5, 5],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [],
        gems: [],
        requirePaint: true,
        textCommands: ['move', 'paint', 'turn_left', 'turn_right', 'for_range'],
        blocks: [],
        maxBlocks: 40,
        stars: [25, 18, 13],
    },

    // ──────────── LEVEL 20 (TEXT) ────────────
    // Concept: switches & gates — step on switch to open gate
    {
        title: 'Gate Runner',
        description: 'A blue gate blocks your path! Find the blue switch to open it, then navigate through.',
        hint: 'Go down, then right to the switch (it opens the gate). Back up and right through the gate to the flag. Try using <code>while path(ahead)</code> for each leg.',
        mode: 'text',
        rows: 3, cols: 6,
        grid: [
            [0, 0, 0, 8, 0, 0],
            [0, 0, 0, 1, 1, 1],
            [0, 0, 7, 1, 1, 1],
        ],
        start: { r: 0, c: 0, dir: DIR.DOWN },
        goals: [{ r: 0, c: 5 }],
        gems: [],
        textCommands: ['move', 'turn_left', 'turn_right', 'turn_to', 'while_cond', 'for_range', 'cond_path_ahead'],
        blocks: [],
        maxBlocks: 15,
        stars: [12, 10, 8],
    },

    // ──────────── LEVEL 21 (TEXT) ────────────
    // NEW Concept: if/else — decide what to do on each tile
    {
        title: 'Sort & Collect',
        description: 'Walk the corridor. If a gem is here, pick it up — otherwise paint the tile. Reach the flag!',
        hint: 'Use a for loop with if gem_here(): / else: inside. The corridor is 7 tiles long.',
        mode: 'text',
        rows: 1, cols: 8,
        grid: [
            [5, 0, 5, 0, 5, 0, 5, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 0, c: 7 }],
        gems: [{ r: 0, c: 1 }, { r: 0, c: 3 }, { r: 0, c: 5 }],
        requirePaint: true,
        textCommands: ['move', 'pick_up', 'paint', 'for_range', 'if_cond', 'else_clause', 'cond_gem_here'],
        blocks: [],
        maxBlocks: 20,
        stars: [8, 6, 5],
    },

    // ──────────── LEVEL 22 (TEXT) ────────────
    // Concept: while + if pattern — algorithmic navigation
    {
        title: 'Right-Hand Rule',
        description: 'Navigate the L-shaped corridor, collecting gems along the way. The path always turns right!',
        hint: 'Use a for-loop with <code>while path(ahead): move()</code> and <code>turn(right)</code>. Three legs, three right turns!',
        mode: 'text',
        rows: 5, cols: 5,
        grid: [
            [0, 0, 0, 0, 0],
            [1, 1, 1, 1, 0],
            [1, 1, 1, 1, 0],
            [1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 4, c: 0 }],
        gems: [{ r: 0, c: 2 }, { r: 2, c: 4 }, { r: 4, c: 2 }],
        textCommands: ['move', 'turn_right', 'turn_to', 'pick_up', 'for_range', 'while_cond', 'if_cond', 'cond_path_ahead', 'cond_path_right', 'cond_gem_here'],
        blocks: [],
        maxBlocks: 15,
        stars: [8, 6, 5],
    },

    // ──────────── LEVEL 23 (TEXT) ────────────
    // Concept: on_paint() sensor — detect unpainted tiles
    {
        title: 'Smart Painter',
        description: 'Walk the corridor and paint only the tiles that need it. Use <code>on_paint()</code> to check!',
        hint: 'Use <code>paint()</code> first (you start on a paint tile), then <code>while path(ahead): move(); if on_paint(): paint()</code>.',
        mode: 'text',
        rows: 1, cols: 12,
        grid: [
            [5, 0, 0, 5, 0, 5, 5, 0, 5, 0, 0, 5],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [],
        gems: [],
        requirePaint: true,
        textCommands: ['move', 'paint', 'while_cond', 'if_cond', 'cond_path_ahead', 'cond_on_paint'],
        blocks: [],
        maxBlocks: 12,
        stars: [8, 6, 5],
    },

    // ──────────── LEVEL 24 (TEXT) ────────────
    // Concept: while + if/else in a serpentine (3 rows)
    {
        title: 'The Serpentine',
        description: 'Snake across 3 rows collecting gems and painting empty tiles. Use while loops and if/else!',
        hint: 'Row 1: walk right (while path(ahead)), sort gems/paint. Turn down+left. Row 2: walk left, sort. Turn down+right. Row 3: walk right, sort. Reach goal.',
        mode: 'text',
        rows: 3, cols: 8,
        grid: [
            [5, 5, 0, 5, 5, 0, 5, 5],
            [5, 0, 5, 5, 0, 5, 0, 5],
            [0, 5, 5, 0, 5, 5, 5, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 2, c: 7 }],
        gems: [
            { r: 0, c: 2 }, { r: 0, c: 5 },
            { r: 1, c: 1 }, { r: 1, c: 4 }, { r: 1, c: 6 },
            { r: 2, c: 0 }, { r: 2, c: 3 }, { r: 2, c: 7 },
        ],
        requirePaint: true,
        textCommands: ['move', 'turn_left', 'turn_right', 'turn_to', 'pick_up', 'paint', 'while_cond', 'if_cond', 'else_clause', 'cond_path_ahead', 'cond_gem_here'],
        blocks: [],
        maxBlocks: 50,
        stars: [35, 28, 22],
    },

    // ──────────── LEVEL 25 (TEXT) ────────────
    // Concept: capstone — for, while, if/else, wall/gem sensors, paint, all combined
    {
        title: 'Grand Master',
        description: 'The ultimate challenge! Navigate a multi-room course with walls, collect all gems, paint all tiles, and reach the exit.',
        hint: 'Break it into sections. Use while path(ahead) to traverse open corridors, if/else for gem/paint decisions, and turns to navigate the rooms.',
        mode: 'text',
        rows: 5, cols: 9,
        grid: [
            [5, 0, 5, 0, 5, 1, 5, 0, 5],
            [1, 1, 1, 1, 0, 1, 0, 1, 1],
            [5, 0, 5, 5, 0, 5, 5, 0, 5],
            [1, 1, 0, 1, 0, 1, 1, 1, 1],
            [5, 0, 5, 1, 5, 0, 5, 5, 0],
        ],
        start: { r: 0, c: 0, dir: DIR.RIGHT },
        goals: [{ r: 4, c: 8 }],
        gems: [
            { r: 0, c: 1 }, { r: 0, c: 3 }, { r: 0, c: 7 },
            { r: 2, c: 1 }, { r: 2, c: 4 }, { r: 2, c: 7 },
            { r: 4, c: 1 }, { r: 4, c: 5 }, { r: 4, c: 8 },
        ],
        requirePaint: true,
        textCommands: ['move', 'turn_left', 'turn_right', 'turn_to', 'pick_up', 'paint', 'for_range', 'while_cond', 'if_cond', 'if_not_cond', 'else_clause', 'cond_path_ahead', 'cond_path_behind', 'cond_path_left', 'cond_path_right', 'cond_wall_ahead', 'cond_gem_here', 'cond_on_paint'],
        blocks: [],
        maxBlocks: 60,
        stars: [40, 32, 24],
    },
];
