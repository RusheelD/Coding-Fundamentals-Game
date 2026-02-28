/* =========================================================
   engine.js – Game state & execution engine
   ========================================================= */

class GameEngine {
    constructor() {
        this.levelIndex = 0;
        this.level = null;
        this.playerR = 0;
        this.playerC = 0;
        this.playerDir = DIR.RIGHT;
        this.grid = [];
        this.gemsLeft = [];
        this.gemsCollected = 0;
        this.totalGems = 0;
        this.running = false;
        this.stepping = false;
        this.speed = 350;
        this.fastSpeed = 80;
        this.normalSpeed = 350;
        this.maxIterations = 500;
        this.onStep = null;
        this.onFinish = null;
        this.starsEarned = [];
        this.unlockedLevels = 1;
        this._loadProgress();
    }

    /* -------- persistence (localStorage) -------- */
    _loadProgress() {
        try {
            const raw = localStorage.getItem('codequest_progress');
            if (raw) {
                const d = JSON.parse(raw);
                this.starsEarned = d.stars || [];
                this.unlockedLevels = d.unlocked || 1;
            }
        } catch (e) { /* ignore */ }
    }
    _saveProgress() {
        try {
            localStorage.setItem('codequest_progress', JSON.stringify({
                stars: this.starsEarned,
                unlocked: this.unlockedLevels,
            }));
        } catch (e) { /* ignore */ }
    }
    resetProgress() {
        this.starsEarned = [];
        this.unlockedLevels = 1;
        try { localStorage.removeItem('codequest_progress'); } catch (e) { /* ignore */ }
    }

    /* -------- level loading -------- */
    loadLevel(index) {
        this.levelIndex = index;
        this.level = LEVELS[index];
        this.resetState();
    }

    resetState() {
        const lv = this.level;
        this.playerR = lv.start.r;
        this.playerC = lv.start.c;
        this.playerDir = lv.start.dir;
        this.grid = lv.grid.map(row => [...row]);
        this.gemsLeft = lv.gems.map(g => ({ ...g }));
        this.gemsCollected = 0;
        this.totalGems = lv.gems.length;
        this.running = false;
        this.stepping = false;
    }

    /* -------- execute AST tree -------- */
    run(blockTree, stepping = false) {
        this.resetState();
        this.running = true;
        this.stepping = stepping;
        this._execTree(blockTree, () => {
            this.running = false;
            this._checkWin();
        });
    }

    async _execTree(blocks, done) {
        let iterations = 0;
        const BREAK = Symbol('break');

        const exec = async (list) => {
            for (const b of list) {
                if (!this.running) return;
                if (iterations++ > this.maxIterations) {
                    this.running = false;
                    if (this.onFinish) this.onFinish({ success: false, reason: 'Infinite loop detected!' });
                    return;
                }

                if (b.type === 'break') {
                    return BREAK;
                }

                if (b.type === 'repeat') {
                    const count = Math.min(parseInt(b.inputValue) || 2, 100);
                    for (let i = 0; i < count; i++) {
                        if (!this.running) return;
                        const r = await exec(b.children || []);
                        if (r === BREAK) break;
                    }
                } else if (b.type === 'while') {
                    while (this.running && this._evalCondition(b.condition) && iterations < this.maxIterations) {
                        iterations++;
                        const r = await exec(b.children || []);
                        if (r === BREAK) break;
                    }
                } else if (b.type === 'if') {
                    const cond = this._evalCondition(b.condition);
                    if (cond) {
                        await exec(b.children || []);
                    } else if (b.elseChildren) {
                        await exec(b.elseChildren);
                    }
                } else {
                    // primitive action
                    const result = this._execAction(b);
                    if (this.onStep) this.onStep({ blockId: b.id, action: b.type, ...this._snapshot(), result });
                    if (!result.ok) {
                        this.running = false;
                        if (this.onFinish) this.onFinish({ success: false, reason: result.msg });
                        return;
                    }
                    await this._delay();
                }
            }
        };

        await exec(blocks);
        if (this.running) done();
    }

    _delay() {
        if (this.stepping) {
            return new Promise(resolve => { this._stepResolve = resolve; });
        }
        return new Promise(resolve => setTimeout(resolve, this.speed));
    }

    advanceStep() {
        if (this._stepResolve) { this._stepResolve(); this._stepResolve = null; }
    }

    stop() { this.running = false; if (this._stepResolve) { this._stepResolve(); this._stepResolve = null; } }

    /* -------- condition evaluator (supports compound and/or) -------- */
    _evalCondition(cond) {
        // compound operators: not, and, or
        if (typeof cond === 'object' && cond.op) {
            if (cond.op === 'not') return !this._evalCondition(cond.operand);
            const left = this._evalCondition(cond.left);
            const right = this._evalCondition(cond.right);
            if (cond.op === 'and') return left && right;
            if (cond.op === 'or') return left || right;
        }
        switch (cond) {
            case 'path_ahead': return !this._wallInRelDir(0);
            case 'path_right': return !this._wallInRelDir(1);
            case 'path_behind': return !this._wallInRelDir(2);
            case 'path_left': return !this._wallInRelDir(3);
            case 'wall_ahead': return this._wallInRelDir(0);
            case 'gem_here': return this._onGem();
            case 'on_paint': return this._onPaintTile();
            case 'on_flag': return this._onFlag();
            case 'all_collected': return this._allCollected();
            case 'all_painted': return this._allPainted();
            default: return false;
        }
    }

    /* -------- primitive actions -------- */
    _execAction(node) {
        switch (node.type) {
            case 'move_forward': return this._moveForward();
            case 'turn_left': this.playerDir = (this.playerDir + 3) % 4; return { ok: true };
            case 'turn_right': this.playerDir = (this.playerDir + 1) % 4; return { ok: true };
            case 'turn_to': return this._turnTo(node.direction);
            case 'pick_up': return this._pickUp();
            case 'paint': return this._paint();
            default: return { ok: true };
        }
    }

    _turnTo(dir) {
        const MAP = { north: DIR.UP, south: DIR.DOWN, east: DIR.RIGHT, west: DIR.LEFT };
        if (MAP[dir] !== undefined) {
            this.playerDir = MAP[dir];
            return { ok: true };
        }
        return { ok: false, msg: 'Unknown direction: ' + dir };
    }

    _moveForward() {
        const d = DIR_DELTA[this.playerDir];
        const nr = this.playerR + d.dr;
        const nc = this.playerC + d.dc;
        if (nr < 0 || nr >= this.level.rows || nc < 0 || nc >= this.level.cols) {
            return { ok: false, msg: 'Walked off the edge!' };
        }
        const tile = this.grid[nr][nc];
        if (tile === TILE.WALL || tile === TILE.GATE_A_CLOSED || tile === TILE.GATE_B_CLOSED) {
            return { ok: false, msg: 'Crashed into a wall!' };
        }
        if (tile === TILE.HAZARD) {
            return { ok: false, msg: 'Stepped on a hazard!' };
        }
        this.playerR = nr;
        this.playerC = nc;
        // auto-trigger switches
        if (tile === TILE.SWITCH_A) this._toggleGates('A');
        else if (tile === TILE.SWITCH_B) this._toggleGates('B');
        return { ok: true };
    }

    _pickUp() {
        const idx = this.gemsLeft.findIndex(g => g.r === this.playerR && g.c === this.playerC);
        if (idx === -1) return { ok: false, msg: 'No gem here to pick up!' };
        this.gemsLeft.splice(idx, 1);
        this.gemsCollected++;
        return { ok: true };
    }

    _paint() {
        if (this.grid[this.playerR][this.playerC] === TILE.PAINT) {
            this.grid[this.playerR][this.playerC] = TILE.PAINTED;
        }
        return { ok: true };
    }

    /* -------- switches & gates -------- */
    _toggleGates(group) {
        const closed = group === 'A' ? TILE.GATE_A_CLOSED : TILE.GATE_B_CLOSED;
        const open = group === 'A' ? TILE.GATE_A_OPEN : TILE.GATE_B_OPEN;
        for (let r = 0; r < this.level.rows; r++) {
            for (let c = 0; c < this.level.cols; c++) {
                if (this.grid[r][c] === closed) this.grid[r][c] = open;
                else if (this.grid[r][c] === open) this.grid[r][c] = closed;
            }
        }
    }

    /* -------- sensors -------- */
    _wallInRelDir(offset) {
        const absDir = (this.playerDir + offset) % 4;
        const d = DIR_DELTA[absDir];
        const nr = this.playerR + d.dr;
        const nc = this.playerC + d.dc;
        if (nr < 0 || nr >= this.level.rows || nc < 0 || nc >= this.level.cols) return true;
        const t = this.grid[nr][nc];
        return t === TILE.WALL || t === TILE.GATE_A_CLOSED || t === TILE.GATE_B_CLOSED;
    }

    _wallAhead() {
        return this._wallInRelDir(0);
    }

    _onGem() {
        return this.gemsLeft.some(g => g.r === this.playerR && g.c === this.playerC);
    }

    _onPaintTile() {
        return this.grid[this.playerR][this.playerC] === TILE.PAINT;
    }

    _onFlag() {
        return this.level.goals.some(g => g.r === this.playerR && g.c === this.playerC);
    }

    _allCollected() {
        return this.gemsLeft.length === 0;
    }

    _allPainted() {
        return this.grid.flat().every(t => t !== TILE.PAINT);
    }

    /* -------- win / lose check -------- */
    _checkWin() {
        const lv = this.level;
        if (this.gemsLeft.length > 0) {
            if (this.onFinish) this.onFinish({ success: false, reason: `${this.gemsLeft.length} gem(s) remaining!` });
            return;
        }
        if (lv.requirePaint) {
            const unpainted = this.grid.flat().filter(t => t === TILE.PAINT).length;
            if (unpainted > 0) {
                if (this.onFinish) this.onFinish({ success: false, reason: `${unpainted} tile(s) still need painting!` });
                return;
            }
        }
        if (lv.goals.length > 0) {
            const onGoal = lv.goals.some(g => g.r === this.playerR && g.c === this.playerC);
            if (!onGoal) {
                if (this.onFinish) this.onFinish({ success: false, reason: 'Not on the goal yet!' });
                return;
            }
        }
        if (this.onFinish) this.onFinish({ success: true });
    }

    _snapshot() {
        return {
            playerR: this.playerR,
            playerC: this.playerC,
            playerDir: this.playerDir,
            grid: this.grid.map(r => [...r]),
            gemsLeft: [...this.gemsLeft],
            gemsCollected: this.gemsCollected,
        };
    }

    /* -------- stars -------- */
    calcStars(blocksUsed) {
        const thresholds = this.level.stars;
        if (blocksUsed <= thresholds[2]) return 3;
        if (blocksUsed <= thresholds[1]) return 2;
        if (blocksUsed <= thresholds[0]) return 1;
        return 1;
    }

    recordWin(blocksUsed) {
        const s = this.calcStars(blocksUsed);
        const prev = this.starsEarned[this.levelIndex] || 0;
        if (s > prev) this.starsEarned[this.levelIndex] = s;
        if (this.levelIndex + 1 >= this.unlockedLevels) {
            this.unlockedLevels = Math.min(this.levelIndex + 2, LEVELS.length);
        }
        this._saveProgress();
        return s;
    }

    unlockAll() {
        this.unlockedLevels = LEVELS.length;
        this._saveProgress();
    }
}
