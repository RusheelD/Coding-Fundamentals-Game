/* =========================================================
   renderer.js – Canvas rendering for the game world
   ========================================================= */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = 48;
        this.dpr = window.devicePixelRatio || 1;
    }

    /* -------- sizing -------- */
    resize(rows, cols) {
        this.dpr = window.devicePixelRatio || 1;
        const panel = this.canvas.parentElement;
        const maxW = panel.clientWidth - 20;
        const maxH = panel.clientHeight - 60;
        // Pick tile size that fits the available space
        this.tileSize = Math.floor(Math.min(maxW / cols, maxH / rows, 72));
        const cssW = cols * this.tileSize;
        const cssH = rows * this.tileSize;
        // Set the canvas backing store to DPR-scaled size for crisp rendering
        this.canvas.width = cssW * this.dpr;
        this.canvas.height = cssH * this.dpr;
        // Set the CSS display size
        this.canvas.style.width = cssW + 'px';
        this.canvas.style.height = cssH + 'px';
        // Scale the context so drawing code stays in CSS-pixel coordinates
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    /* -------- draw full frame -------- */
    draw(state) {
        const { grid, goals, gemsLeft, playerR, playerC, playerDir, rows, cols } = state;
        const ts = this.tileSize;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // tiles
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * ts;
                const y = r * ts;
                const tile = grid[r][c];

                // floor
                ctx.fillStyle = (r + c) % 2 === 0 ? '#1b3a5c' : '#173352';
                ctx.fillRect(x, y, ts, ts);

                if (tile === TILE.WALL) {
                    ctx.fillStyle = '#374151';
                    ctx.fillRect(x, y, ts, ts);
                    // brick pattern
                    ctx.strokeStyle = '#4b5563';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x + 2, y + 2, ts - 4, ts / 2 - 3);
                    ctx.strokeRect(x + ts / 4, y + ts / 2, ts / 2, ts / 2 - 3);
                } else if (tile === TILE.HAZARD) {
                    ctx.fillStyle = '#7f1d1d';
                    ctx.fillRect(x, y, ts, ts);
                    this._drawEmoji(ctx, '☠️', x + ts / 2, y + ts / 2, ts * 0.55);
                } else if (tile === TILE.PAINT) {
                    ctx.fillStyle = '#4a4a5a';
                    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
                } else if (tile === TILE.PAINTED) {
                    ctx.fillStyle = '#2563eb';
                    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
                    ctx.fillStyle = 'rgba(255,255,255,0.15)';
                    ctx.fillRect(x + 4, y + 4, ts - 8, ts - 8);
                } else if (tile === TILE.SWITCH_A) {
                    // blue switch – button on floor
                    ctx.fillStyle = '#1e3a5f';
                    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
                    ctx.fillStyle = '#3b82f6';
                    ctx.beginPath();
                    ctx.arc(x + ts / 2, y + ts / 2, ts * 0.28, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#93c5fd';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (tile === TILE.SWITCH_B) {
                    // red switch – button on floor
                    ctx.fillStyle = '#3b1f1f';
                    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    ctx.arc(x + ts / 2, y + ts / 2, ts * 0.28, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fca5a5';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else if (tile === TILE.GATE_A_CLOSED) {
                    // blue gate – closed (vertical bars)
                    ctx.fillStyle = '#172554';
                    ctx.fillRect(x, y, ts, ts);
                    ctx.strokeStyle = '#60a5fa';
                    ctx.lineWidth = 3;
                    for (let bx = x + 6; bx < x + ts; bx += 10) {
                        ctx.beginPath();
                        ctx.moveTo(bx, y + 2);
                        ctx.lineTo(bx, y + ts - 2);
                        ctx.stroke();
                    }
                } else if (tile === TILE.GATE_A_OPEN) {
                    // blue gate – open (subtle tint)
                    ctx.fillStyle = '#1e3a5f';
                    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
                    ctx.fillStyle = 'rgba(96,165,250,0.12)';
                    ctx.fillRect(x + 4, y + 4, ts - 8, ts - 8);
                } else if (tile === TILE.GATE_B_CLOSED) {
                    // red gate – closed (vertical bars)
                    ctx.fillStyle = '#450a0a';
                    ctx.fillRect(x, y, ts, ts);
                    ctx.strokeStyle = '#f87171';
                    ctx.lineWidth = 3;
                    for (let bx = x + 6; bx < x + ts; bx += 10) {
                        ctx.beginPath();
                        ctx.moveTo(bx, y + 2);
                        ctx.lineTo(bx, y + ts - 2);
                        ctx.stroke();
                    }
                } else if (tile === TILE.GATE_B_OPEN) {
                    // red gate – open (subtle tint)
                    ctx.fillStyle = '#3b1f1f';
                    ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
                    ctx.fillStyle = 'rgba(248,113,113,0.12)';
                    ctx.fillRect(x + 4, y + 4, ts - 8, ts - 8);
                }

                // grid lines
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, ts, ts);
            }
        }

        // goals (flags)
        for (const g of goals) {
            this._drawEmoji(ctx, '🚩', g.c * ts + ts / 2, g.r * ts + ts / 2, ts * 0.6);
        }

        // gems
        for (const g of gemsLeft) {
            this._drawEmoji(ctx, '💎', g.c * ts + ts / 2, g.r * ts + ts / 2, ts * 0.5);
        }

        // player
        this._drawPlayer(ctx, playerC * ts + ts / 2, playerR * ts + ts / 2, playerDir, ts);
    }

    /* -------- draw player character -------- */
    _drawPlayer(ctx, cx, cy, dir, ts) {
        const size = ts * 0.38;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(dir * Math.PI / 2);

        // body
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 2;
        ctx.stroke();

        // eyes
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(-size * 0.3, -size * 0.25, size * 0.15, 0, Math.PI * 2);
        ctx.arc(size * 0.3, -size * 0.25, size * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // arrow (direction indicator)
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.moveTo(0, -size - 6);
        ctx.lineTo(-5, -size + 2);
        ctx.lineTo(5, -size + 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /* -------- emoji helper -------- */
    _drawEmoji(ctx, emoji, x, y, size) {
        ctx.font = `${size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y);
    }
}
