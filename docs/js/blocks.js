/* =========================================================
   blocks.js – Drag-and-drop block system
   ========================================================= */

class BlockManager {
    constructor(toolboxEl, workspaceEl) {
        this.toolboxEl = toolboxEl;
        this.workspaceEl = workspaceEl;
        this.nextId = 1;
        this.availableBlocks = [];
        this.maxBlocks = Infinity;
        this.currentConditions = [];
        this._dragged = null;
        this._dragGhost = null;
        this._initDragListeners();
    }

    /* -------- setup blocks for a level -------- */
    setLevel(blockTypes, maxBlocks, conditions) {
        this.availableBlocks = blockTypes;
        this.maxBlocks = maxBlocks || Infinity;
        this.currentConditions = conditions || [];
        this.toolboxEl.innerHTML = '';
        this.workspaceEl.innerHTML = '';

        // Group blocks by category
        const grouped = new Map();
        for (const type of blockTypes) {
            const def = BLOCK_DEFS[type];
            if (!def) continue;
            const group = CAT_GROUPS.find(g => g.cats.includes(def.cat));
            const key = group ? group.key : 'other';
            if (!grouped.has(key)) grouped.set(key, []);
            grouped.get(key).push({ type, def });
        }

        for (const group of CAT_GROUPS) {
            const items = grouped.get(group.key);
            if (!items || items.length === 0) continue;
            const hdr = document.createElement('div');
            hdr.className = 'toolbox-cat-header';
            hdr.textContent = group.label;
            this.toolboxEl.appendChild(hdr);
            for (const { type, def } of items) {
                this.toolboxEl.appendChild(this._createBlockEl(type, def, true));
            }
        }
        this._updateBlockCount();
    }

    /* -------- create a block DOM element -------- */
    _createBlockEl(type, def, isToolbox) {
        const hasBody = !!def.hasBody;

        if (hasBody) {
            return this._createCBlock(type, def, isToolbox);
        }

        const el = document.createElement('div');
        el.className = `block cat-${def.cat}`;
        el.dataset.type = type;
        el.dataset.id = this.nextId++;
        el.draggable = true;
        el.dataset.toolbox = isToolbox ? '1' : '0';

        el.innerHTML = `<span class="icon">${def.icon}</span><span class="label">${def.label}</span>`;

        // direction / option dropdown for flat blocks (e.g. turn_to)
        if (def.selectOptions) {
            const select = document.createElement('select');
            select.className = 'block-condition-select';
            for (const [val, lbl] of Object.entries(def.selectOptions)) {
                const opt = document.createElement('option');
                opt.value = val;
                opt.textContent = lbl;
                select.appendChild(opt);
            }
            select.addEventListener('click', e => e.stopPropagation());
            select.addEventListener('mousedown', e => e.stopPropagation());
            select.addEventListener('dragstart', e => e.stopPropagation());
            el.appendChild(select);
        }

        // remove button (only for workspace copies)
        if (!isToolbox) {
            el.appendChild(this._makeRemoveBtn(el));
        }

        return el;
    }

    /* -------- create a C-shaped (scoped) block -------- */
    _createCBlock(type, def, isToolbox) {
        const wrap = document.createElement('div');
        wrap.className = `block c-block cat-${def.cat}`;
        wrap.dataset.type = type;
        wrap.dataset.id = this.nextId++;
        wrap.draggable = true;
        wrap.dataset.toolbox = isToolbox ? '1' : '0';

        // --- top bar ---
        const top = document.createElement('div');
        top.className = 'c-block-top';
        top.innerHTML = `<span class="icon">${def.icon}</span><span class="label">${def.label}</span>`;

        // input field for repeat count
        if (def.hasInput) {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = 1;
            input.max = 99;
            input.value = def.inputDefault || 2;
            input.addEventListener('click', e => e.stopPropagation());
            input.addEventListener('mousedown', e => e.stopPropagation());
            input.addEventListener('dragstart', e => e.stopPropagation());
            top.appendChild(input);
        }

        // condition dropdown for if/while
        if (def.hasCondition) {
            const select = document.createElement('select');
            select.className = 'block-condition-select';
            const condKeys = this.currentConditions.length > 0
                ? this.currentConditions
                : Object.keys(CONDITIONS);
            for (const ck of condKeys) {
                const cDef = CONDITIONS[ck];
                if (!cDef) continue;
                const opt = document.createElement('option');
                opt.value = ck;
                opt.textContent = cDef.label;
                select.appendChild(opt);
            }
            select.addEventListener('click', e => e.stopPropagation());
            select.addEventListener('mousedown', e => e.stopPropagation());
            select.addEventListener('dragstart', e => e.stopPropagation());
            top.appendChild(select);
        }

        wrap.appendChild(top);

        if (isToolbox) {
            // Toolbox: flat preview — no body, no bottom bar
            wrap.classList.add('toolbox-compact');
            // Round off the top bar so it looks like a normal block
            top.style.borderRadius = '10px';
            return wrap;
        }

        // --- body (drop zone for nested blocks) ---
        const body = document.createElement('div');
        body.className = 'c-block-body drop-zone';
        body.dataset.parentId = wrap.dataset.id;
        const ph = document.createElement('span');
        ph.className = 'c-block-placeholder';
        ph.textContent = 'drag blocks here';
        body.appendChild(ph);
        wrap.appendChild(body);
        this._makeDropZone(body);

        // --- bottom bar ---
        const bot = document.createElement('div');
        bot.className = 'c-block-bottom';
        wrap.appendChild(bot);

        // remove button
        wrap.appendChild(this._makeRemoveBtn(wrap));

        // hide/show placeholder when body has children
        const observer = new MutationObserver(() => {
            const hasKids = body.querySelector('.block');
            ph.style.display = hasKids ? 'none' : '';
        });
        observer.observe(body, { childList: true });

        return wrap;
    }

    _makeRemoveBtn(parentEl) {
        const rm = document.createElement('button');
        rm.className = 'btn-remove';
        rm.textContent = '×';
        rm.addEventListener('click', (e) => {
            e.stopPropagation();
            parentEl.remove();
            this._updateBlockCount();
        });
        return rm;
    }

    /* -------- drag & drop -------- */
    _initDragListeners() {
        // drag start on any block
        document.addEventListener('dragstart', (e) => {
            const block = e.target.closest('.block');
            if (!block) return;
            this._dragged = block;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', block.dataset.type);
            setTimeout(() => block.style.opacity = '0.4', 0);
        });

        document.addEventListener('dragend', (e) => {
            const block = e.target.closest('.block');
            if (block) block.style.opacity = '';
            this._dragged = null;
            // Remove all insertion indicators
            document.querySelectorAll('.insert-indicator').forEach(el => el.remove());
        });

        // make main workspace a drop zone
        this._makeDropZone(this.workspaceEl);
    }

    /**
     * Find the child block we should insert BEFORE based on the cursor Y position.
     * Returns the block element to insertBefore, or null to append at end.
     */
    _getInsertTarget(zone, y) {
        const children = [...zone.children].filter(el => el.classList.contains('block') && el !== this._dragged);
        for (const child of children) {
            const rect = child.getBoundingClientRect();
            // If cursor is above the midpoint of this block, insert before it
            if (y < rect.top + rect.height / 2) {
                return child;
            }
        }
        return null; // append at end
    }

    _makeDropZone(zone) {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            zone.classList.add('drag-over');

            // Show insertion indicator between blocks
            const target = this._getInsertTarget(zone, e.clientY);
            // Remove old indicator in this zone
            zone.querySelectorAll(':scope > .insert-indicator').forEach(el => el.remove());
            let indicator = document.createElement('div');
            indicator.className = 'insert-indicator';
            if (target) {
                zone.insertBefore(indicator, target);
            } else {
                zone.appendChild(indicator);
            }
        });
        zone.addEventListener('dragleave', (e) => {
            // Only clear if actually leaving this zone (not entering a child)
            if (!zone.contains(e.relatedTarget)) {
                zone.classList.remove('drag-over');
                zone.querySelectorAll(':scope > .insert-indicator').forEach(el => el.remove());
            }
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            zone.classList.remove('drag-over');
            zone.querySelectorAll(':scope > .insert-indicator').forEach(el => el.remove());
            if (!this._dragged) return;

            const type = this._dragged.dataset.type;
            const def = BLOCK_DEFS[type];
            if (!def) return;

            // Determine where to insert
            const target = this._getInsertTarget(zone, e.clientY);

            if (this._dragged.dataset.toolbox === '1') {
                // Clone from toolbox
                if (this._countWorkspaceBlocks() >= this.maxBlocks) return; // block limit
                const clone = this._createBlockEl(type, def, false);
                if (target) {
                    zone.insertBefore(clone, target);
                } else {
                    zone.appendChild(clone);
                }
            } else {
                // Re-order within workspace – insert at the right position
                if (target) {
                    zone.insertBefore(this._dragged, target);
                } else {
                    zone.appendChild(this._dragged);
                }
            }
            this._updateBlockCount();
        });
    }

    _countWorkspaceBlocks() {
        return this.workspaceEl.querySelectorAll('.block').length;
    }

    _updateBlockCount() {
        const el = document.getElementById('block-limit-display');
        const count = this._countWorkspaceBlocks();
        if (this.maxBlocks < Infinity) {
            el.textContent = `Blocks: ${count} / ${this.maxBlocks}`;
            el.style.color = count > this.maxBlocks ? '#f87171' : '#aaa';
        } else {
            el.textContent = `Blocks: ${count}`;
        }
    }

    /* -------- read workspace blocks as AST -------- */
    getProgram() {
        return this._readBlocks(this.workspaceEl);
    }

    _readBlocks(container) {
        const blocks = [];
        for (const el of container.children) {
            if (!el.classList.contains('block')) continue;
            const node = {
                type: el.dataset.type,
                id: el.dataset.id,
            };
            // read input value (may be direct child or inside .c-block-top)
            const input = el.querySelector(':scope > input[type="number"], :scope > .c-block-top > input[type="number"]');
            if (input) node.inputValue = input.value;
            // read condition dropdown (C-blocks) or direction select (flat blocks)
            const select = el.querySelector(':scope > .c-block-top > select') || el.querySelector(':scope > select');
            if (select) {
                if (node.type === 'if_cond' || node.type === 'while_cond') {
                    node.condition = select.value;
                } else {
                    node.direction = select.value;
                }
            }
            // map block types → generic engine types
            if (node.type === 'if_cond') node.type = 'if';
            if (node.type === 'while_cond') node.type = 'while';
            // read children (nested blocks)
            const body = el.querySelector(':scope > .block-body, :scope > .c-block-body');
            if (body) node.children = this._readBlocks(body);
            blocks.push(node);
        }
        return blocks;
    }

    countBlocks() {
        return this._countWorkspaceBlocks();
    }

    clearWorkspace() {
        this.workspaceEl.innerHTML = '';
        this._updateBlockCount();
    }

    /* -------- serialize / restore workspace -------- */
    serializeWorkspace() {
        return this._serializeContainer(this.workspaceEl);
    }

    _serializeContainer(container) {
        const arr = [];
        for (const el of container.children) {
            if (!el.classList.contains('block')) continue;
            const obj = { type: el.dataset.type };
            const input = el.querySelector(':scope > input[type="number"], :scope > .c-block-top > input[type="number"]');
            if (input) obj.inputValue = input.value;
            const select = el.querySelector(':scope > .c-block-top > select') || el.querySelector(':scope > select');
            if (select) obj.selectValue = select.value;
            const body = el.querySelector(':scope > .c-block-body');
            if (body) obj.children = this._serializeContainer(body);
            arr.push(obj);
        }
        return arr;
    }

    restoreWorkspace(data) {
        this.workspaceEl.innerHTML = '';
        if (!data || !data.length) { this._updateBlockCount(); return; }
        for (const item of data) {
            this._restoreBlock(item, this.workspaceEl);
        }
        this._updateBlockCount();
    }

    _restoreBlock(item, container) {
        const def = BLOCK_DEFS[item.type];
        if (!def) return;
        const el = this._createBlockEl(item.type, def, false);
        // restore input value
        if (item.inputValue != null) {
            const input = el.querySelector(':scope > input[type="number"], :scope > .c-block-top > input[type="number"]');
            if (input) input.value = item.inputValue;
        }
        // restore select value
        if (item.selectValue != null) {
            const select = el.querySelector(':scope > .c-block-top > select') || el.querySelector(':scope > select');
            if (select) select.value = item.selectValue;
        }
        container.appendChild(el);
        // restore nested children
        if (item.children && item.children.length) {
            const body = el.querySelector(':scope > .c-block-body');
            if (body) {
                for (const child of item.children) {
                    this._restoreBlock(child, body);
                }
            }
        }
    }

    /* -------- highlight -------- */
    highlightBlock(id) {
        this.workspaceEl.querySelectorAll('.block').forEach(b => b.classList.remove('running'));
        const el = this.workspaceEl.querySelector(`.block[data-id="${id}"]`);
        if (el) { el.classList.add('running'); el.scrollIntoView({ block: 'nearest' }); }
    }
    clearHighlights() {
        this.workspaceEl.querySelectorAll('.block').forEach(b => b.classList.remove('running'));
    }
}
