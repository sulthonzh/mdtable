#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromObjects = fromObjects;
exports.fromArrays = fromArrays;
exports.parse = parse;
exports.validate = validate;
exports.query = query;
exports.fromCsv = fromCsv;
exports.fromTsv = fromTsv;
exports.diff = diff;
exports.toCsv = toCsv;
exports.toTsv = toTsv;
exports.stats = stats;
// --- Generate markdown table from data ---
function fromObjects(data, options) {
    if (!data.length)
        return '';
    const allKeys = [...new Set(data.flatMap(Object.keys))];
    const columns = options?.columns ?? allKeys.map(k => ({ name: k }));
    const colNames = columns.map(c => c.name);
    const aligns = columns.map(c => c.align ?? options?.align?.[c.name] ?? 'left');
    const rows = data.map(obj => colNames.map(k => String(obj[k] ?? '')));
    return buildTable(colNames, rows, aligns, options);
}
function fromArrays(headers, rows, options) {
    const aligns = headers.map((_, i) => {
        if (options?.columns?.[i]?.align)
            return options.columns[i].align;
        if (options?.align?.[headers[i]])
            return options.align[headers[i]];
        return 'left';
    });
    return buildTable(headers, rows, aligns, options);
}
function buildTable(headers, rows, aligns, options) {
    const pad = options?.padding ?? 1;
    const maxW = options?.maxWidth ?? 0;
    const colWidths = headers.map((h, i) => {
        const dataMax = Math.max(h.length, ...rows.map(r => r[i]?.length ?? 0));
        const colMax = options?.columns?.[i]?.maxWidth ?? maxW;
        return colMax ? Math.min(dataMax, colMax) : dataMax;
    });
    const padStr = ' '.repeat(pad);
    const sep = '|';
    const fmtCell = (val, w, align) => {
        const truncated = val.length > w ? val.slice(0, w - 1) + '…' : val;
        const padded = align === 'right' ? truncated.padStart(w) :
            align === 'center' ? padCenter(truncated, w) :
                truncated.padEnd(w);
        return `${padStr}${padded}${padStr}`;
    };
    const alignSep = (w, align) => {
        if (align === 'center')
            return ':' + '-'.repeat(w) + ':';
        if (align === 'right')
            return '-'.repeat(w) + ':';
        if (align === 'left')
            return ':' + '-'.repeat(w);
        return '-'.repeat(w + 2);
    };
    const lines = [];
    // Header
    lines.push(sep + headers.map((h, i) => fmtCell(h, colWidths[i], 'left')).join(sep) + sep);
    // Separator
    lines.push(sep + colWidths.map((w, i) => `${padStr}${alignSep(w, aligns[i])}${padStr}`).join(sep) + sep);
    // Rows
    for (const row of rows) {
        lines.push(sep + row.map((c, i) => fmtCell(c, colWidths[i], aligns[i])).join(sep) + sep);
    }
    return lines.join('\n');
}
function padCenter(s, w) {
    const left = Math.floor((w - s.length) / 2);
    const right = w - s.length - left;
    return ' '.repeat(left) + s + ' '.repeat(right);
}
// --- Parse markdown table ---
function parse(tableText) {
    const lines = tableText.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
    if (lines.length < 2)
        throw new Error('Invalid table: need at least header and separator rows');
    const parseRow = (line) => line.split('|').slice(1, -1).map(c => c.trim());
    const headers = parseRow(lines[0]);
    const sepLine = lines[1];
    const aligns = sepLine.split('|').slice(1, -1).map(cell => {
        const c = cell.trim();
        if (c.startsWith(':') && c.endsWith(':'))
            return 'center';
        if (c.endsWith(':'))
            return 'right';
        if (c.startsWith(':'))
            return 'left';
        return null;
    });
    const rows = lines.slice(2).map(parseRow);
    return { headers, aligns, rows };
}
function validate(tableText) {
    const issues = [];
    const lines = tableText.trim().split('\n');
    if (lines.length < 2) {
        issues.push({ line: 0, message: 'Table must have at least header and separator rows', severity: 'error' });
        return issues;
    }
    // Check separator row
    const sepLine = lines[1].trim();
    if (!sepLine.match(/^\|[\s:\-|]+\|$/)) {
        issues.push({ line: 2, message: 'Separator row must contain only pipes, dashes, and colons', severity: 'error' });
    }
    // Count columns from header
    const headerCols = lines[0].split('|').length - 2;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith('|') || !line.endsWith('|')) {
            issues.push({ line: i + 1, message: `Row doesn't start/end with |`, severity: 'error' });
            continue;
        }
        const cols = line.split('|').length - 2;
        if (i !== 1 && cols !== headerCols) {
            issues.push({ line: i + 1, message: `Column count (${cols}) doesn't match header (${headerCols})`, severity: i === 0 ? 'error' : 'warning' });
        }
    }
    return issues;
}
// --- Query table (filter, sort, select) ---
function query(tableText, opts) {
    const parsed = parse(tableText);
    let rows = parsed.rows;
    // Filter
    if (opts.where) {
        for (const [col, val] of Object.entries(opts.where)) {
            const idx = parsed.headers.indexOf(col);
            if (idx === -1)
                continue;
            rows = rows.filter(r => {
                const cell = r[idx] ?? '';
                if (val instanceof RegExp)
                    return val.test(cell);
                return cell.toLowerCase() === String(val).toLowerCase();
            });
        }
    }
    // Sort
    if (opts.sortBy) {
        const idx = parsed.headers.indexOf(opts.sortBy);
        if (idx !== -1) {
            const dir = opts.order === 'desc' ? -1 : 1;
            rows.sort((a, b) => {
                const va = a[idx] ?? '', vb = b[idx] ?? '';
                const na = Number(va), nb = Number(vb);
                if (!isNaN(na) && !isNaN(nb))
                    return (na - nb) * dir;
                return va.localeCompare(vb) * dir;
            });
        }
    }
    // Limit
    if (opts.limit)
        rows = rows.slice(0, opts.limit);
    // Select columns
    let headers = parsed.headers;
    let aligns = parsed.aligns;
    if (opts.select) {
        const indices = opts.select.map(s => headers.indexOf(s)).filter(i => i !== -1);
        headers = indices.map(i => headers[i]);
        aligns = indices.map(i => aligns[i]);
        rows = rows.map(r => indices.map(i => r[i] ?? ''));
    }
    // Rebuild with original aligns
    const colConfig = headers.map((h, i) => ({
        name: h,
        align: aligns[i] ?? 'left',
    }));
    return fromArrays(headers, rows, { columns: colConfig });
}
// --- CSV/TSV parsing ---
function fromCsv(csvText, options) {
    const delimiter = options?.delimiter ?? ',';
    const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0)
        return '';
    const parseCsvLine = (line) => {
        const cells = [];
        let current = '';
        let inQuotes = false;
        for (const ch of line) {
            if (ch === '"') {
                inQuotes = !inQuotes;
                continue;
            }
            if (ch === delimiter && !inQuotes) {
                cells.push(current.trim());
                current = '';
                continue;
            }
            current += ch;
        }
        cells.push(current.trim());
        return cells;
    };
    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map(parseCsvLine);
    return fromArrays(headers, rows, options);
}
function fromTsv(tsvText, options) {
    return fromCsv(tsvText, { ...options, delimiter: '\t' });
}
function diff(tableA, tableB) {
    const a = parse(tableA);
    const b = parse(tableB);
    const result = {
        addedRows: [],
        removedRows: [],
        modifiedCells: [],
        columnChanges: {
            added: b.headers.filter(h => !a.headers.includes(h)),
            removed: a.headers.filter(h => !b.headers.includes(h)),
        },
    };
    const commonHeaders = a.headers.filter(h => b.headers.includes(h));
    // Build row maps by first column value (usually an ID/name)
    const aRows = new Map();
    const bRows = new Map();
    a.rows.forEach((r, i) => aRows.set(r[0], i));
    b.rows.forEach((r, i) => bRows.set(r[0], i));
    // Check for modifications and removals
    for (const [key, idx] of aRows) {
        if (!bRows.has(key)) {
            result.removedRows.push(idx);
        }
        else {
            const bIdx = bRows.get(key);
            for (const h of commonHeaders) {
                const colIdx = a.headers.indexOf(h);
                const bColIdx = b.headers.indexOf(h);
                if (a.rows[idx][colIdx] !== b.rows[bIdx][bColIdx]) {
                    result.modifiedCells.push({
                        row: bIdx,
                        col: h,
                        before: a.rows[idx][colIdx] ?? '',
                        after: b.rows[bIdx][bColIdx] ?? '',
                    });
                }
            }
        }
    }
    // Check for additions
    for (const [key, idx] of bRows) {
        if (!aRows.has(key))
            result.addedRows.push(idx);
    }
    return result;
}
// --- toCSV / toTSV ---
function toCsv(tableText, delimiter = ',') {
    const { headers, rows } = parse(tableText);
    const escCell = (c) => c.includes(delimiter) || c.includes('"') || c.includes('\n')
        ? `"${c.replace(/"/g, '""')}"` : c;
    return [
        headers.map(escCell).join(delimiter),
        ...rows.map(r => r.map(escCell).join(delimiter)),
    ].join('\n');
}
function toTsv(tableText) {
    return toCsv(tableText, '\t');
}
function stats(tableText) {
    const { headers, rows } = parse(tableText);
    const totalCells = headers.length * (rows.length + 1);
    let emptyCells = 0;
    const colWidths = {};
    for (const h of headers) {
        colWidths[h] = { min: h.length, max: h.length, avg: h.length, _sum: h.length };
    }
    for (const row of rows) {
        for (let i = 0; i < headers.length; i++) {
            const cell = row[i] ?? '';
            if (cell === '')
                emptyCells++;
            const len = cell.length;
            const h = headers[i];
            const w = colWidths[h];
            w._sum += len;
            if (len < w.min)
                w.min = len;
            if (len > w.max)
                w.max = len;
        }
    }
    const rowCount = rows.length + 1;
    for (const h of headers) {
        colWidths[h].avg = Math.round(colWidths[h]._sum / rowCount * 10) / 10;
        delete colWidths[h]._sum;
    }
    const maxRowWidth = Math.max(...rows.map(r => r.join(' | ').length), headers.join(' | ').length);
    return {
        columns: headers.length,
        rows: rows.length,
        totalCells,
        emptyCells,
        maxRowWidth,
        columnWidths: colWidths,
    };
}
