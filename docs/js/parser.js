/* =========================================================
   parser.js – Python-like text → engine AST
   ========================================================= */

/** Valid condition keys the parser recognises. */
const PARSER_CONDITIONS = [
    'path_ahead', 'path_behind', 'path_left', 'path_right',
    'wall_ahead', 'gem_here', 'on_paint', 'on_flag',
    'all_collected', 'all_painted',
];

/**
 *  Reference definitions for text-mode commands.
 *  Used to populate the command reference panel.
 */
const TEXT_CMD_DEFS = {
    // ── actions ──
    move: { syntax: 'move()', desc: 'Move one step forward', cat: 'move' },
    turn_left: { syntax: 'turn(left)', desc: 'Turn 90° left', cat: 'turn' },
    turn_right: { syntax: 'turn(right)', desc: 'Turn 90° right', cat: 'turn' },
    turn_to: { syntax: 'turn(north/south/east/west)', desc: 'Face a cardinal direction', cat: 'turn' },
    pick_up: { syntax: 'pick_up()', desc: 'Pick up a gem', cat: 'action' },
    paint: { syntax: 'paint()', desc: 'Paint the current tile', cat: 'action' },
    break_cmd: { syntax: 'break', desc: 'Exit the current loop immediately', cat: 'cond' },
    // ── control ──
    for_range: { syntax: 'for i in range(N):', desc: 'Repeat N times (indent body 4 spaces)', cat: 'loop' },
    if_cond: { syntax: 'if <condition>:', desc: 'Run body if condition is true', cat: 'cond' },
    while_cond: { syntax: 'while <condition>:', desc: 'Loop while condition is true', cat: 'loop' },
    else_clause: { syntax: 'else:', desc: 'Run body if the if-condition was false', cat: 'cond' },
    // ── sensors (shown as reference) ──
    cond_path_ahead: { syntax: 'path(ahead)', desc: 'True if the way ahead is clear', cat: 'sensor' },
    cond_path_behind: { syntax: 'path(behind)', desc: 'True if the way behind is clear', cat: 'sensor' },
    cond_path_left: { syntax: 'path(left)', desc: 'True if the way left is clear', cat: 'sensor' },
    cond_path_right: { syntax: 'path(right)', desc: 'True if the way right is clear', cat: 'sensor' },
    cond_wall_ahead: { syntax: 'wall_ahead()', desc: 'True if there is a wall ahead', cat: 'sensor' },
    cond_gem_here: { syntax: 'gem_here()', desc: 'True if standing on a gem', cat: 'sensor' },
    cond_on_paint: { syntax: 'on_paint()', desc: 'True if on an unpainted tile', cat: 'sensor' },
    cond_on_flag: { syntax: 'on_flag()', desc: 'True if standing on the flag/goal', cat: 'sensor' },
    cond_all_collected: { syntax: 'all_collected()', desc: 'True if all gems have been picked up', cat: 'sensor' },
    cond_all_painted: { syntax: 'all_painted()', desc: 'True if all tiles have been painted', cat: 'sensor' },
    // ── combinators (shown as reference) ──
    combinator_not: { syntax: 'not <condition>', desc: 'Negate a condition (true ↔ false)', cat: 'sensor' },
    combinator_and: { syntax: '<cond1> and <cond2>', desc: 'True if both conditions are true', cat: 'sensor' },
    combinator_or: { syntax: '<cond1> or <cond2>', desc: 'True if either condition is true', cat: 'sensor' },
};

class TextParser {
    /**
     * Parse Python-like code into the AST array the engine expects.
     * Throws an Error with a user-friendly message on syntax problems.
     */
    parse(code) {
        const lines = code.split('\n');
        const { nodes } = this._parseBlock(lines, 0, 0);
        return nodes;
    }

    /** Count non-empty, non-comment lines (≈ "blocks used"). */
    countLines(code) {
        return code.split('\n').filter(l => {
            const t = l.trim();
            return t.length > 0 && !t.startsWith('#');
        }).length;
    }

    /* ---- recursive descent, indentation-based ---- */
    _parseBlock(lines, startIdx, expectedIndent) {
        const nodes = [];
        let i = startIdx;

        while (i < lines.length) {
            const raw = lines[i];
            const trimmed = raw.trim();

            // skip blank lines and comments
            if (!trimmed || trimmed.startsWith('#')) { i++; continue; }

            const indent = this._indent(raw);

            // de-dented → this block is done
            if (indent < expectedIndent) break;

            // unexpected extra indent
            if (indent > expectedIndent) {
                throw new Error(`Line ${i + 1}: unexpected indent`);
            }

            // ---- control structures ----
            let m;

            // for loop
            if ((m = trimmed.match(/^for\s+\w+\s+in\s+range\(\s*(\d+)\s*\)\s*:$/))) {
                const count = m[1];
                const child = this._parseBlock(lines, i + 1, expectedIndent + 4);
                if (child.nodes.length === 0) throw new Error(`Line ${i + 1}: for-loop body is empty (indent body 4 spaces)`);
                nodes.push({ type: 'repeat', inputValue: count, children: child.nodes, id: `t${i}` });
                i = child.endIdx;
                continue;
            }

            // while <condExpr>:
            // condExpr supports not, and, or combinators and both cond() / cond(param) forms
            if ((m = trimmed.match(/^while\s+(.+?)\s*:$/))) {
                const condition = this._parseCondExpr(m[1].trim(), i);
                const child = this._parseBlock(lines, i + 1, expectedIndent + 4);
                if (child.nodes.length === 0) throw new Error(`Line ${i + 1}: while-loop body is empty (indent body 4 spaces)`);
                nodes.push({ type: 'while', condition, children: child.nodes, id: `t${i}` });
                i = child.endIdx;
                continue;
            }

            // if <condExpr>:
            // condExpr supports not, and, or combinators and both cond() / cond(param) forms
            if ((m = trimmed.match(/^if\s+(.+?)\s*:$/))) {
                const condition = this._parseCondExpr(m[1].trim(), i);
                const startLine = i;
                const child = this._parseBlock(lines, i + 1, expectedIndent + 4);
                if (child.nodes.length === 0) throw new Error(`Line ${i + 1}: if-body is empty (indent body 4 spaces)`);
                const ifNode = { type: 'if', condition, children: child.nodes, id: `t${startLine}` };
                i = child.endIdx;
                const elseResult = this._checkElse(lines, i, expectedIndent);
                if (elseResult) { ifNode.elseChildren = elseResult.elseChildren; i = elseResult.endIdx; }
                nodes.push(ifNode);
                continue;
            }

            // ---- simple commands ----
            if (/^move\(\)$/.test(trimmed)) { nodes.push({ type: 'move_forward', id: `t${i}` }); i++; continue; }
            if ((m = trimmed.match(/^turn\((left|right|north|south|east|west)\)$/))) {
                const dir = m[1];
                if (dir === 'left') nodes.push({ type: 'turn_left', id: `t${i}` });
                else if (dir === 'right') nodes.push({ type: 'turn_right', id: `t${i}` });
                else nodes.push({ type: 'turn_to', direction: dir, id: `t${i}` });
                i++; continue;
            }
            if (/^pick_up\(\)$/.test(trimmed)) { nodes.push({ type: 'pick_up', id: `t${i}` }); i++; continue; }
            if (/^paint\(\)$/.test(trimmed)) { nodes.push({ type: 'paint', id: `t${i}` }); i++; continue; }
            if (/^break$/.test(trimmed)) { nodes.push({ type: 'break', id: `t${i}` }); i++; continue; }

            // unknown command
            throw new Error(`Line ${i + 1}: unknown command "${trimmed}"`);
        }

        return { nodes, endIdx: i };
    }

    /** Count leading spaces (tabs → 4 spaces). */
    _indent(line) {
        const m = line.match(/^(\s*)/);
        return m ? m[1].replace(/\t/g, '    ').length : 0;
    }

    /**
     * Parse a condition expression, supporting `and` / `or` combinators.
     * Returns a string key for simple conditions, or { op, left, right } for compound.
     */
    _parseCondExpr(expr, lineIdx) {
        // Check for `or` combinator (lowest precedence)
        const orParts = expr.split(/\s+or\s+/);
        if (orParts.length > 1) {
            const right = this._parseCondExpr(orParts.pop().trim(), lineIdx);
            const left = this._parseCondExpr(orParts.join(' or ').trim(), lineIdx);
            return { op: 'or', left, right };
        }
        // Check for `and` combinator
        const andParts = expr.split(/\s+and\s+/);
        if (andParts.length > 1) {
            const right = this._parseCondExpr(andParts.pop().trim(), lineIdx);
            const left = this._parseCondExpr(andParts.join(' and ').trim(), lineIdx);
            return { op: 'and', left, right };
        }
        // Check for `not` prefix (unary, highest precedence)
        if (/^not\s+/.test(expr)) {
            const operand = this._parseCondExpr(expr.slice(4).trim(), lineIdx);
            return { op: 'not', operand };
        }
        // Single condition: func() or func(param)
        const m = expr.match(/^(\w+)\((\w*)\)$/);
        if (!m) throw new Error(`Line ${lineIdx + 1}: invalid condition "${expr}"`);
        const condName = m[2] ? `${m[1]}_${m[2]}` : m[1];
        if (!PARSER_CONDITIONS.includes(condName)) {
            throw new Error(`Line ${lineIdx + 1}: unknown condition "${expr}"`);
        }
        return condName;
    }

    /** Check for an else clause following an if block. */
    _checkElse(lines, startIdx, expectedIndent) {
        let peek = startIdx;
        while (peek < lines.length && (!lines[peek].trim() || lines[peek].trim().startsWith('#'))) peek++;
        if (peek < lines.length && this._indent(lines[peek]) === expectedIndent && lines[peek].trim() === 'else:') {
            const elseChild = this._parseBlock(lines, peek + 1, expectedIndent + 4);
            if (elseChild.nodes.length === 0) throw new Error(`Line ${peek + 1}: else-body is empty (indent body 4 spaces)`);
            return { elseChildren: elseChild.nodes, endIdx: elseChild.endIdx };
        }
        return null;
    }
}
