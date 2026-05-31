"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const index_js_1 = require("./index.js");
(0, node_test_1.describe)('fromObjects', () => {
    (0, node_test_1.it)('generates table from array of objects', () => {
        const result = (0, index_js_1.fromObjects)([
            { name: 'Alice', age: 30 },
            { name: 'Bob', age: 25 },
        ]);
        strict_1.default.ok(result.includes('Alice'));
        strict_1.default.ok(result.includes('Bob'));
        strict_1.default.ok(result.includes('30'));
        strict_1.default.ok(result.includes('25'));
        const lines = result.split('\n');
        strict_1.default.equal(lines.length, 4); // header + sep + 2 rows
    });
    (0, node_test_1.it)('handles empty array', () => {
        strict_1.default.equal((0, index_js_1.fromObjects)([]), '');
    });
    (0, node_test_1.it)('respects column alignment', () => {
        const result = (0, index_js_1.fromObjects)([{ name: 'Alice', score: 100 }], { align: { score: 'right' } });
        const lines = result.split('\n');
        strict_1.default.ok(lines[1].includes('-:')); // right align separator
    });
    (0, node_test_1.it)('handles missing fields', () => {
        const result = (0, index_js_1.fromObjects)([
            { a: '1', b: '2' },
            { a: '3' },
        ]);
        strict_1.default.ok(result.includes('3'));
    });
});
(0, node_test_1.describe)('fromArrays', () => {
    (0, node_test_1.it)('generates table from arrays', () => {
        const result = (0, index_js_1.fromArrays)(['A', 'B'], [['1', '2'], ['3', '4']]);
        const lines = result.split('\n');
        strict_1.default.equal(lines.length, 4);
        strict_1.default.ok(lines[0].includes('A'));
        strict_1.default.ok(lines[0].includes('B'));
    });
});
(0, node_test_1.describe)('parse', () => {
    (0, node_test_1.it)('parses a markdown table', () => {
        const table = `| Name | Age |
|------|-----|
| Alice | 30 |
| Bob | 25 |`;
        const result = (0, index_js_1.parse)(table);
        strict_1.default.deepEqual(result.headers, ['Name', 'Age']);
        strict_1.default.equal(result.rows.length, 2);
        strict_1.default.equal(result.rows[0][0], 'Alice');
        strict_1.default.equal(result.rows[1][1], '25');
    });
    (0, node_test_1.it)('detects alignment', () => {
        const table = `| Name | Age |
|:-----|----:|
| Alice | 30 |`;
        const result = (0, index_js_1.parse)(table);
        strict_1.default.equal(result.aligns[0], 'left');
        strict_1.default.equal(result.aligns[1], 'right');
    });
    (0, node_test_1.it)('detects center alignment', () => {
        const table = `| Name |
|:----:|
| test |`;
        const result = (0, index_js_1.parse)(table);
        strict_1.default.equal(result.aligns[0], 'center');
    });
    (0, node_test_1.it)('throws on invalid table', () => {
        strict_1.default.throws(() => (0, index_js_1.parse)('not a table'), /Invalid table/);
    });
});
(0, node_test_1.describe)('validate', () => {
    (0, node_test_1.it)('validates a correct table', () => {
        const table = `| A | B |
|---|---|
| 1 | 2 |`;
        const issues = (0, index_js_1.validate)(table);
        strict_1.default.equal(issues.length, 0);
    });
    (0, node_test_1.it)('detects missing separator', () => {
        const table = `| A | B |
| X | Y |
| 1 | 2 |`;
        const issues = (0, index_js_1.validate)(table);
        strict_1.default.ok(issues.some(i => i.message.includes('Separator')));
    });
    (0, node_test_1.it)('detects column mismatch', () => {
        const table = `| A | B |
|---|---|
| 1 |`;
        const issues = (0, index_js_1.validate)(table);
        strict_1.default.ok(issues.some(i => i.message.includes('Column count')));
    });
});
(0, node_test_1.describe)('query', () => {
    const table = `| Name | Score | Grade |
|------|-------|-------|
| Alice | 90 | A |
| Bob | 75 | B |
| Charlie | 60 | C |
| Diana | 85 | A |`;
    (0, node_test_1.it)('filters rows', () => {
        const result = (0, index_js_1.query)(table, { where: { Grade: 'A' } });
        strict_1.default.ok(result.includes('Alice'));
        strict_1.default.ok(result.includes('Diana'));
        strict_1.default.ok(!result.includes('Bob'));
    });
    (0, node_test_1.it)('sorts rows', () => {
        const result = (0, index_js_1.query)(table, { sortBy: 'Score', order: 'desc' });
        const lines = result.split('\n').slice(2); // skip header + sep
        strict_1.default.ok(lines[0].includes('Alice')); // 90
        strict_1.default.ok(lines[lines.length - 1].includes('Charlie')); // 60
    });
    (0, node_test_1.it)('limits rows', () => {
        const result = (0, index_js_1.query)(table, { limit: 2 });
        const dataLines = result.split('\n').slice(2);
        strict_1.default.equal(dataLines.length, 2);
    });
    (0, node_test_1.it)('selects columns', () => {
        const result = (0, index_js_1.query)(table, { select: ['Name', 'Grade'] });
        strict_1.default.ok(!result.includes('Score'));
        strict_1.default.ok(result.includes('Grade'));
    });
});
(0, node_test_1.describe)('fromCsv', () => {
    (0, node_test_1.it)('generates table from CSV', () => {
        const csv = `Name,Age\nAlice,30\nBob,25`;
        const result = (0, index_js_1.fromCsv)(csv);
        strict_1.default.ok(result.includes('Alice'));
        strict_1.default.ok(result.includes('|'));
    });
    (0, node_test_1.it)('handles quoted fields', () => {
        const csv = `Name,Desc\nAlice,"has, comma"`;
        const result = (0, index_js_1.fromCsv)(csv);
        strict_1.default.ok(result.includes('has, comma'));
    });
});
(0, node_test_1.describe)('fromTsv', () => {
    (0, node_test_1.it)('generates table from TSV', () => {
        const tsv = `Name\tAge\nAlice\t30`;
        const result = (0, index_js_1.fromTsv)(tsv);
        strict_1.default.ok(result.includes('Alice'));
    });
});
(0, node_test_1.describe)('diff', () => {
    (0, node_test_1.it)('detects added rows', () => {
        const a = `| Name | Age |\n|------|-----|\n| Alice | 30 |`;
        const b = `| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |`;
        const d = (0, index_js_1.diff)(a, b);
        strict_1.default.equal(d.addedRows.length, 1);
        strict_1.default.equal(d.removedRows.length, 0);
    });
    (0, node_test_1.it)('detects removed rows', () => {
        const a = `| Name |\n|------|\n| Alice |\n| Bob |`;
        const b = `| Name |\n|------|\n| Alice |`;
        const d = (0, index_js_1.diff)(a, b);
        strict_1.default.equal(d.removedRows.length, 1);
    });
    (0, node_test_1.it)('detects modified cells', () => {
        const a = `| Name | Age |\n|------|-----|\n| Alice | 30 |`;
        const b = `| Name | Age |\n|------|-----|\n| Alice | 31 |`;
        const d = (0, index_js_1.diff)(a, b);
        strict_1.default.equal(d.modifiedCells.length, 1);
        strict_1.default.equal(d.modifiedCells[0].before, '30');
        strict_1.default.equal(d.modifiedCells[0].after, '31');
    });
    (0, node_test_1.it)('detects column changes', () => {
        const a = `| Name |\n|------|\n| Alice |`;
        const b = `| Name | Age |\n|------|-----|\n| Alice | 30 |`;
        const d = (0, index_js_1.diff)(a, b);
        strict_1.default.ok(d.columnChanges.added.includes('Age'));
    });
});
(0, node_test_1.describe)('toCsv', () => {
    (0, node_test_1.it)('converts table to CSV', () => {
        const table = `| Name | Age |\n|------|-----|\n| Alice | 30 |`;
        const csv = (0, index_js_1.toCsv)(table);
        strict_1.default.ok(csv.includes('Name,Age'));
        strict_1.default.ok(csv.includes('Alice,30'));
    });
});
(0, node_test_1.describe)('toTsv', () => {
    (0, node_test_1.it)('converts table to TSV', () => {
        const table = `| Name | Age |\n|------|-----|\n| Alice | 30 |`;
        const tsv = (0, index_js_1.toTsv)(table);
        strict_1.default.ok(tsv.includes('Name\tAge'));
    });
});
(0, node_test_1.describe)('stats', () => {
    (0, node_test_1.it)('computes table statistics', () => {
        const table = `| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |`;
        const s = (0, index_js_1.stats)(table);
        strict_1.default.equal(s.columns, 2);
        strict_1.default.equal(s.rows, 2);
        strict_1.default.equal(s.totalCells, 6);
        strict_1.default.equal(s.emptyCells, 0);
    });
});
