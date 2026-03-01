/* =========================================================
   app.js – Wiring everything together
   ========================================================= */

(function () {
    'use strict';

    /* -------- DOM refs -------- */
    const $ = (sel) => document.querySelector(sel);
    const levelSelectScreen = $('#level-select-screen');
    const lsGrid = $('#ls-grid');
    const lsStarTotal = $('#ls-star-total');
    const topBar = $('#top-bar');
    const appMain = $('#app');
    const canvas = $('#game-canvas');
    const msgBox = $('#message-box');
    const levelNum = $('#level-num');
    const levelTotal = $('#level-total');
    const titleBar = $('#level-title-bar');
    const descEl = $('#level-description');
    const hintEl = $('#level-hint');
    const starsEl = $('#stars-display');

    const btnRun = $('#btn-run');
    const btnStep = $('#btn-step');
    const btnReset = $('#btn-reset');
    const btnClear = $('#btn-clear');
    const btnSpeed = $('#btn-speed');

    const modalOverlay = $('#modal-overlay');
    const modalContent = $('#modal-content');
    const modalClose = $('#modal-close');

    /* -------- instances -------- */
    const engine = new GameEngine();
    const renderer = new Renderer(canvas);
    const blocks = new BlockManager($('#toolbox'), $('#workspace'));
    const parser = new TextParser();
    const codeEditor = $('#code-editor');
    const codeReference = $('#code-reference');
    const blockLimitDisplay = $('#block-limit-display');

    let isFast = false;
    let currentMode = 'blocks';

    /* -------- per-level solution persistence -------- */
    function saveSolution(index) {
        try {
            const store = JSON.parse(localStorage.getItem('codequest_solutions') || '{}');
            if (currentMode === 'text') {
                store[index] = { mode: 'text', code: codeEditor.value };
            } else {
                store[index] = { mode: 'blocks', data: blocks.serializeWorkspace() };
            }
            localStorage.setItem('codequest_solutions', JSON.stringify(store));
        } catch (e) { /* ignore */ }
    }
    function loadSolution(index) {
        try {
            const store = JSON.parse(localStorage.getItem('codequest_solutions') || '{}');
            return store[index] || null;
        } catch (e) { return null; }
    }

    /* -------- init: show level select -------- */
    levelTotal.textContent = LEVELS.length;
    showLevelSelectScreen();

    /* ========================================================= */
    /*                  LEVEL SELECT SCREEN                       */
    /* ========================================================= */
    function showLevelSelectScreen() {
        engine.stop();
        // auto-save current solution before leaving
        if (engine.levelIndex != null) saveSolution(engine.levelIndex);
        levelSelectScreen.classList.remove('hidden');
        topBar.classList.add('hidden');
        appMain.classList.add('hidden');
        renderLevelCards();
    }

    /* secret: click the star icon to unlock all levels */
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'ls-star-icon') {
            engine.unlockAll();
            renderLevelCards();
        }
    });

    /* reset progress button */
    document.getElementById('ls-reset-btn').addEventListener('click', () => {
        if (confirm('Reset all progress? This cannot be undone.')) {
            engine.resetProgress();
            try { localStorage.removeItem('codequest_solutions'); } catch (e) { /* ignore */ }
            renderLevelCards();
        }
    });

    function renderLevelCards() {
        const totalStars = engine.starsEarned.reduce((a, b) => a + (b || 0), 0);
        const maxStars = LEVELS.length * 3;
        lsStarTotal.innerHTML = `<span id="ls-star-icon">⭐</span> ${totalStars} / ${maxStars}`;

        lsGrid.innerHTML = '';
        for (let i = 0; i < LEVELS.length; i++) {
            const locked = i >= engine.unlockedLevels;
            const stars = engine.starsEarned[i] || 0;
            const lv = LEVELS[i];

            const card = document.createElement('div');
            card.className = `ls-card${locked ? ' ls-locked' : ''}`;
            card.dataset.lv = i;

            if (locked) {
                const lockLabel = lv.mode === 'text' ? `P${i - 9}` : `B${i + 1}`;
                card.innerHTML = `
                    <div class="ls-num">${lockLabel}</div>
                    <div class="ls-lock-icon">🔒</div>
                    <div class="ls-desc">Complete previous levels</div>`;
            } else {
                const lvLabel = lv.mode === 'text' ? `P${i - 9}` : `B${i + 1}`;
                card.innerHTML = `
                    <div class="ls-num">${lvLabel}</div>
                    <div class="ls-title">${lv.title}</div>
                    <div class="ls-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
                    ${lv.mode === 'text' ? '<div class="ls-badge ls-badge-py">🐍 Python</div>' : '<div class="ls-badge ls-badge-blocks">🧩 Blocks</div>'}`;
                card.addEventListener('click', () => {
                    enterLevel(i);
                });
            }
            lsGrid.appendChild(card);
        }
    }

    function enterLevel(index) {
        levelSelectScreen.classList.add('hidden');
        topBar.classList.remove('hidden');
        appMain.classList.remove('hidden');
        loadLevel(index);
        setButtonsEnabled(true);
        // trigger resize so canvas fits
        setTimeout(() => {
            renderer.resize(engine.level.rows, engine.level.cols);
            drawWorld();
        }, 50);
    }

    /* ========================================================= */
    /*                    LEVEL MANAGEMENT                        */
    /* ========================================================= */
    function loadLevel(index) {
        engine.loadLevel(index);
        const lv = engine.level;
        currentMode = lv.mode === 'text' ? 'text' : 'blocks';

        // toggle block vs text UI
        const isText = currentMode === 'text';
        $('#toolbox-panel').classList.toggle('text-mode', isText);
        $('#toolbox').classList.toggle('hidden', isText);
        codeReference.classList.toggle('hidden', !isText);
        $('#workspace').classList.toggle('hidden', isText);
        codeEditor.classList.toggle('hidden', !isText);
        $('#toolbox-panel h2').textContent = isText ? 'Reference' : 'Blocks';
        $('#workspace-panel h2').textContent = isText ? 'Your Code' : 'Your Program';

        if (isText) {
            populateReference(lv.textCommands || []);
            const saved = loadSolution(index);
            codeEditor.value = (saved && saved.mode === 'text') ? saved.code : '';
            updateLineCount();
        } else {
            blocks.setLevel(lv.blocks, lv.maxBlocks, lv.conditions || []);
            const saved = loadSolution(index);
            if (saved && saved.mode === 'blocks' && saved.data) {
                blocks.restoreWorkspace(saved.data);
            }
        }

        const lvTag = lv.mode === 'text' ? `P${index - 9}` : `B${index + 1}`;
        levelNum.textContent = lvTag;
        titleBar.textContent = lv.title;
        descEl.innerHTML = lv.description;
        hintEl.innerHTML = lv.hint;
        updateStars();

        msgBox.textContent = '';
        msgBox.className = '';

        // resize & draw
        renderer.resize(lv.rows, lv.cols);
        drawWorld();
    }

    function drawWorld() {
        const lv = engine.level;
        renderer.draw({
            grid: engine.grid,
            goals: lv.goals,
            gemsLeft: engine.gemsLeft,
            playerR: engine.playerR,
            playerC: engine.playerC,
            playerDir: engine.playerDir,
            rows: lv.rows,
            cols: lv.cols,
        });
    }

    function updateStars() {
        const s = engine.starsEarned[engine.levelIndex] || 0;
        starsEl.textContent = '⭐'.repeat(s) + '☆'.repeat(3 - s);
    }

    /* ========================================================= */
    /*                    EXECUTION CALLBACKS                     */
    /* ========================================================= */
    engine.onStep = (state) => {
        blocks.highlightBlock(state.blockId);
        drawWorld();
    };

    engine.onFinish = (result) => {
        blocks.clearHighlights();
        drawWorld();
        if (result.success) {
            saveSolution(engine.levelIndex);
            const usedBlocks = currentMode === 'text' ? parser.countLines(codeEditor.value) : blocks.countBlocks();
            const stars = engine.recordWin(usedBlocks);
            updateStars();
            msgBox.textContent = `✅ Level complete! ${'⭐'.repeat(stars)}`;
            msgBox.className = 'success';
            // Show next-level prompt
            setTimeout(() => {
                if (engine.levelIndex < LEVELS.length - 1) {
                    showCompletionModal(stars);
                } else {
                    showGameCompleteModal();
                }
            }, 800);
        } else {
            msgBox.textContent = `❌ ${result.reason}`;
            msgBox.className = 'fail';
        }
        setButtonsEnabled(true);
    };

    /* ========================================================= */
    /*                       BUTTONS                              */
    /* ========================================================= */
    function setButtonsEnabled(enabled) {
        btnRun.disabled = !enabled;
        btnStep.disabled = !enabled;
    }

    btnRun.addEventListener('click', () => {
        let prog;
        if (currentMode === 'text') {
            try { prog = parser.parse(codeEditor.value); }
            catch (err) { msgBox.textContent = `❌ ${err.message}`; msgBox.className = 'fail'; return; }
        } else {
            prog = blocks.getProgram();
        }
        if (prog.length === 0) { msgBox.textContent = currentMode === 'text' ? '⚠️ Write some code first!' : '⚠️ Add some blocks first!'; msgBox.className = 'fail'; return; }
        msgBox.textContent = '▶ Running...';
        msgBox.className = '';
        setButtonsEnabled(false);
        engine.speed = isFast ? engine.fastSpeed : engine.normalSpeed;
        engine.run(prog, false);
    });

    btnStep.addEventListener('click', () => {
        if (engine.running && engine.stepping) {
            engine.advanceStep();
            return;
        }
        let prog;
        if (currentMode === 'text') {
            try { prog = parser.parse(codeEditor.value); }
            catch (err) { msgBox.textContent = `❌ ${err.message}`; msgBox.className = 'fail'; return; }
        } else {
            prog = blocks.getProgram();
        }
        if (prog.length === 0) { msgBox.textContent = currentMode === 'text' ? '⚠️ Write some code first!' : '⚠️ Add some blocks first!'; msgBox.className = 'fail'; return; }
        msgBox.textContent = '🦶 Stepping... click Step again';
        msgBox.className = '';
        setButtonsEnabled(true);
        btnRun.disabled = true;
        engine.speed = 0;
        engine.run(prog, true);
    });

    btnReset.addEventListener('click', () => {
        engine.stop();
        engine.resetState();
        blocks.clearHighlights();
        msgBox.textContent = '';
        msgBox.className = '';
        setButtonsEnabled(true);
        drawWorld();
    });

    btnClear.addEventListener('click', () => {
        engine.stop();
        engine.resetState();
        if (currentMode === 'text') {
            codeEditor.value = '';
            updateLineCount();
        } else {
            blocks.clearWorkspace();
        }
        blocks.clearHighlights();
        msgBox.textContent = '';
        msgBox.className = '';
        setButtonsEnabled(true);
        drawWorld();
    });

    btnSpeed.addEventListener('click', () => {
        isFast = !isFast;
        btnSpeed.textContent = isFast ? '🐢 Slow' : '⏩ Fast';
        engine.speed = isFast ? engine.fastSpeed : engine.normalSpeed;
    });

    /* -------- code editor helpers -------- */
    codeEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const s = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            codeEditor.value = codeEditor.value.substring(0, s) + '    ' + codeEditor.value.substring(end);
            codeEditor.selectionStart = codeEditor.selectionEnd = s + 4;
        }
        if (e.key === 'Enter') {
            const s = codeEditor.selectionStart;
            const before = codeEditor.value.substring(0, s);
            const after = codeEditor.value.substring(codeEditor.selectionEnd);
            // find current line
            const lastNewline = before.lastIndexOf('\n');
            const currentLine = before.substring(lastNewline + 1);
            // match existing indent
            const indentMatch = currentLine.match(/^(\s*)/);
            let indent = indentMatch ? indentMatch[1] : '';
            // if line ends with ':', add 4 more spaces
            if (currentLine.trimEnd().endsWith(':')) indent += '    ';
            e.preventDefault();
            codeEditor.value = before + '\n' + indent + after;
            codeEditor.selectionStart = codeEditor.selectionEnd = s + 1 + indent.length;
        }
        if (e.key === 'Backspace' && codeEditor.selectionStart === codeEditor.selectionEnd) {
            const s = codeEditor.selectionStart;
            const before = codeEditor.value.substring(0, s);
            const lastNL = before.lastIndexOf('\n');
            const lineStart = before.substring(lastNL + 1);
            if (/^ +$/.test(lineStart) && lineStart.length >= 4 && lineStart.length % 4 === 0) {
                e.preventDefault();
                const after = codeEditor.value.substring(s);
                codeEditor.value = before.substring(0, s - 4) + after;
                codeEditor.selectionStart = codeEditor.selectionEnd = s - 4;
            }
        }
    });
    codeEditor.addEventListener('input', () => { if (currentMode === 'text') updateLineCount(); });

    function populateReference(cmds) {
        codeReference.innerHTML = '';
        const esc = s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Group commands by category
        const grouped = new Map();
        for (const key of cmds) {
            const def = TEXT_CMD_DEFS[key];
            if (!def) continue;
            const group = CAT_GROUPS.find(g => g.cats.includes(def.cat));
            const gKey = group ? group.key : 'other';
            if (!grouped.has(gKey)) grouped.set(gKey, []);
            grouped.get(gKey).push({ key, def });
        }

        for (const group of CAT_GROUPS) {
            const items = grouped.get(group.key);
            if (!items || items.length === 0) continue;
            const hdr = document.createElement('div');
            hdr.className = 'ref-cat-header';
            hdr.textContent = group.label;
            codeReference.appendChild(hdr);
            for (const { def } of items) {
                const card = document.createElement('div');
                card.className = `ref-card cat-${def.cat}`;
                card.innerHTML = `<code>${esc(def.syntax)}</code><span class="ref-desc">${esc(def.desc)}</span>`;
                codeReference.appendChild(card);
            }
        }
    }

    function updateLineCount() {
        const count = parser.countLines(codeEditor.value);
        blockLimitDisplay.textContent = `Lines of code: ${count}`;
        blockLimitDisplay.style.color = '#aaa';
    }

    /* -------- level selector (click level indicator) -------- */
    $('#level-indicator').style.cursor = 'pointer';
    $('#level-indicator').addEventListener('click', showLevelSelectScreen);

    /* -------- back button -------- */
    $('#btn-back').addEventListener('click', showLevelSelectScreen);

    /* ========================================================= */
    /*                        MODALS                              */
    /* ========================================================= */
    function openModal(html) {
        modalContent.innerHTML = html;
        modalOverlay.classList.remove('hidden');
    }
    function closeModal() { modalOverlay.classList.add('hidden'); }
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    function showCompletionModal(stars) {
        const html = `
      <div style="text-align:center">
        <h2 style="color:#4ade80;margin-bottom:.3rem">🎉 Level Complete!</h2>
        <div style="font-size:2rem;margin:.5rem 0">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <p style="color:#ccc;margin-bottom:1rem">${stars === 3 ? 'Perfect! 🏆' : stars === 2 ? 'Great job!' : `Try using fewer ${currentMode === 'text' ? 'lines' : 'blocks'} for more stars!`}</p>
        <button class="btn btn-green" id="btn-next-level" style="padding:10px 28px;font-size:1rem">Next Level ▶</button>
        <button class="btn btn-blue" id="btn-retry" style="padding:10px 20px;font-size:1rem;margin-left:8px">Retry</button>
        <button class="btn btn-purple" id="btn-to-levels" style="padding:10px 20px;font-size:1rem;margin-left:8px">Levels</button>
      </div>`;
        openModal(html);
        $('#btn-next-level').addEventListener('click', () => {
            loadLevel(engine.levelIndex + 1);
            closeModal();
            setButtonsEnabled(true);
        });
        $('#btn-retry').addEventListener('click', () => {
            engine.stop();
            engine.resetState();
            blocks.clearHighlights();
            msgBox.textContent = '';
            msgBox.className = '';
            setButtonsEnabled(true);
            drawWorld();
            closeModal();
        });
        $('#btn-to-levels').addEventListener('click', () => {
            closeModal();
            showLevelSelectScreen();
        });
    }

    function showGameCompleteModal() {
        const totalStars = engine.starsEarned.reduce((a, b) => a + (b || 0), 0);
        const maxStars = LEVELS.length * 3;
        const html = `
      <div style="text-align:center">
        <h2 style="color:#facc15;margin-bottom:.3rem">🏆 You Beat Code Quest!</h2>
        <div style="font-size:1.2rem;margin:.5rem 0;color:#ccc">Total Stars: ${totalStars}/${maxStars}</div>
        <p style="color:#aaa">Amazing work! You've mastered the fundamentals of programming.</p>
        <button class="btn btn-purple" id="btn-replay" style="padding:10px 24px;font-size:1rem;margin-top:1rem">Play Again</button>
      </div>`;
        openModal(html);
        $('#btn-replay').addEventListener('click', () => {
            closeModal();
            showLevelSelectScreen();
        });
    }

    /* ========================================================= */
    /*                     WINDOW RESIZE                          */
    /* ========================================================= */
    window.addEventListener('resize', () => {
        renderer.resize(engine.level.rows, engine.level.cols);
        drawWorld();
    });

})();
