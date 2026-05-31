#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const index_js_1 = require("./index.js");
function usage() {
    const help = `
mdtable — markdown table toolkit

Usage:
  mdtable generate <file>       Generate table from JSON/CSV/TSV file
  mdtable format <file>         Reformat a markdown table
  mdtable validate <file>       Validate markdown table structure
  mdtable query <file> [opts]   Query table (--select, --where, --sort, --limit)
  mdtable diff <fileA> <fileB>  Diff two markdown tables
  mdtable to-csv <file>         Convert markdown table to CSV
  mdtable to-tsv <file>         Convert markdown table to TSV
  mdtable stats <file>          Show table statistics
  mdtable --json                Output as JSON (for validate/diff/stats/query)

Options:
  --align <col:dir,...>         Column alignment (left/center/right)
  --no-header                   Skip header separator
  --select <col1,col2>          Select columns (query)
  --where <col=val>             Filter rows (query)
  --sort <col>                  Sort by column (query)
  --desc                        Sort descending
  --limit <n>                   Limit rows (query)
  --format <auto|json|csv|tsv>  Input format (generate)
  --json                        JSON output
`;
    console.log(help.trim());
    process.exit(0);
}
function readInput(file) {
    const path = (0, path_1.resolve)(file);
    return (0, fs_1.readFileSync)(path, 'utf-8');
}
function detectFormat(content, ext) {
    if (ext === '.json')
        return 'json';
    if (ext === '.csv')
        return 'csv';
    if (ext === '.tsv')
        return 'tsv';
    if (ext === '.md' || ext === '.markdown')
        return 'md';
    // Auto-detect
    const trimmed = content.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{'))
        return 'json';
    if (trimmed.startsWith('|'))
        return 'md';
    if (trimmed.includes('\t'))
        return 'tsv';
    return 'csv';
}
function parseArgs(args) {
    const opts = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
                opts[key] = args[++i];
            }
            else {
                opts[key] = true;
            }
        }
    }
    return opts;
}
function parseAlignOption(val) {
    if (typeof val !== 'string')
        return {};
    const result = {};
    for (const part of val.split(',')) {
        const [col, dir] = part.split(':');
        if (col && dir && ['left', 'center', 'right'].includes(dir)) {
            result[col.trim()] = dir;
        }
    }
    return result;
}
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h')
    usage();
const command = args[0];
const opts = parseArgs(args.slice(1));
const files = args.slice(1).filter(a => !a.startsWith('--'));
try {
    switch (command) {
        case 'generate': {
            if (!files[0]) {
                console.error('Error: provide input file');
                process.exit(1);
            }
            const content = readInput(files[0]);
            const ext = '.' + files[0].split('.').pop();
            const fmt = opts.format && typeof opts.format === 'string' ? opts.format : detectFormat(content, ext);
            const tableOpts = { align: parseAlignOption(opts.align ?? {}) };
            let result;
            if (fmt === 'json') {
                const data = JSON.parse(content);
                const arr = Array.isArray(data) ? data : [data];
                result = (0, index_js_1.fromObjects)(arr, tableOpts);
            }
            else if (fmt === 'csv') {
                result = (0, index_js_1.fromCsv)(content, tableOpts);
            }
            else if (fmt === 'tsv') {
                result = (0, index_js_1.fromTsv)(content, tableOpts);
            }
            else {
                // Treat as CSV fallback
                result = (0, index_js_1.fromCsv)(content, tableOpts);
            }
            console.log(result);
            break;
        }
        case 'format': {
            if (!files[0]) {
                console.error('Error: provide input file');
                process.exit(1);
            }
            const content = readInput(files[0]);
            const { headers, rows, aligns } = (0, index_js_1.parse)(content);
            const colConfig = headers.map((h, i) => ({ name: h, align: aligns[i] ?? 'left' }));
            console.log((0, index_js_1.fromArrays)(headers, rows, { columns: colConfig }));
            break;
        }
        case 'validate': {
            if (!files[0]) {
                console.error('Error: provide input file');
                process.exit(1);
            }
            const content = readInput(files[0]);
            const issues = (0, index_js_1.validate)(content);
            if (opts.json) {
                console.log(JSON.stringify(issues, null, 2));
            }
            else if (issues.length === 0) {
                console.log('✓ Table is valid');
            }
            else {
                for (const issue of issues) {
                    console.log(`${issue.severity === 'error' ? '✗' : '⚠'} Line ${issue.line}: ${issue.message}`);
                }
                if (issues.some(i => i.severity === 'error'))
                    process.exit(1);
            }
            break;
        }
        case 'query': {
            if (!files[0]) {
                console.error('Error: provide input file');
                process.exit(1);
            }
            const content = readInput(files[0]);
            const select = typeof opts.select === 'string' ? opts.select.split(',').map(s => s.trim()) : undefined;
            const where = {};
            if (typeof opts.where === 'string') {
                for (const part of opts.where.split(',')) {
                    const [col, val] = part.split('=');
                    if (col && val) {
                        if (val.startsWith('/') && val.endsWith('/')) {
                            where[col.trim()] = new RegExp(val.slice(1, -1));
                        }
                        else {
                            where[col.trim()] = val;
                        }
                    }
                }
            }
            const result = (0, index_js_1.query)(content, {
                select,
                where: Object.keys(where).length ? where : undefined,
                sortBy: typeof opts.sort === 'string' ? opts.sort : undefined,
                order: opts.desc ? 'desc' : 'asc',
                limit: typeof opts.limit === 'string' ? parseInt(opts.limit) : undefined,
            });
            if (opts.json) {
                const p = (0, index_js_1.parse)(result);
                console.log(JSON.stringify({ headers: p.headers, rows: p.rows }, null, 2));
            }
            else {
                console.log(result);
            }
            break;
        }
        case 'diff': {
            if (!files[0] || !files[1]) {
                console.error('Error: provide two input files');
                process.exit(1);
            }
            const a = readInput(files[0]);
            const b = readInput(files[1]);
            const d = (0, index_js_1.diff)(a, b);
            if (opts.json) {
                console.log(JSON.stringify(d, null, 2));
            }
            else {
                const parts = [];
                if (d.columnChanges.added.length)
                    parts.push(`+ Columns: ${d.columnChanges.added.join(', ')}`);
                if (d.columnChanges.removed.length)
                    parts.push(`- Columns: ${d.columnChanges.removed.join(', ')}`);
                if (d.addedRows.length)
                    parts.push(`+ Rows: ${d.addedRows.join(', ')}`);
                if (d.removedRows.length)
                    parts.push(`- Rows: ${d.removedRows.join(', ')}`);
                for (const m of d.modifiedCells) {
                    parts.push(`~ Row ${m.row}, ${m.col}: "${m.before}" → "${m.after}"`);
                }
                console.log(parts.length ? parts.join('\n') : 'No differences');
            }
            break;
        }
        case 'to-csv': {
            if (!files[0]) {
                console.error('Error: provide input file');
                process.exit(1);
            }
            console.log((0, index_js_1.toCsv)(readInput(files[0])));
            break;
        }
        case 'to-tsv': {
            if (!files[0]) {
                console.error('Error: provide input file');
                process.exit(1);
            }
            console.log((0, index_js_1.toTsv)(readInput(files[0])));
            break;
        }
        case 'stats': {
            if (!files[0]) {
                console.error('Error: provide input file');
                process.exit(1);
            }
            const s = (0, index_js_1.stats)(readInput(files[0]));
            if (opts.json) {
                console.log(JSON.stringify(s, null, 2));
            }
            else {
                console.log(`Columns: ${s.columns}`);
                console.log(`Rows: ${s.rows}`);
                console.log(`Total cells: ${s.totalCells}`);
                console.log(`Empty cells: ${s.emptyCells}`);
                console.log(`Max row width: ${s.maxRowWidth}`);
                for (const [col, w] of Object.entries(s.columnWidths)) {
                    console.log(`  ${col}: min=${w.min} max=${w.max} avg=${w.avg}`);
                }
            }
            break;
        }
        default:
            console.error(`Unknown command: ${command}`);
            process.exit(1);
    }
}
catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
}
