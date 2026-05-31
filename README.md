# mdtable

Markdown table toolkit — generate, format, validate, query, and diff markdown tables from the CLI or programmatically.

Why? Because working with markdown tables is surprisingly annoying. You paste some CSV data and need it as a markdown table. Or you have a table that's misaligned. Or you need to compare two versions of a table. `mdtable` handles all of that.

## Install

```bash
npm install -g mdtable
```

## CLI

```bash
# Generate table from JSON
mdtable generate data.json

# Generate from CSV
mdtable generate data.csv

# Generate from TSV
mdtable generate data.tsv

# Reformat an existing table
mdtable format table.md

# Validate table structure
mdtable validate table.md

# Query: filter, sort, limit, select columns
mdtable query table.md --where "Grade=A" --sort Score --desc --limit 5
mdtable query table.md --select Name,Age

# Diff two tables
mdtable diff old.md new.md

# Convert to CSV/TSV
mdtable to-csv table.md
mdtable to-tsv table.md

# Table statistics
mdtable stats table.md

# JSON output (for validate, diff, stats, query)
mdtable validate table.md --json
mdtable diff old.md new.md --json
mdtable stats table.md --json
```

## Programmatic API

```typescript
import { fromObjects, parse, query, diff, stats } from 'mdtable';

// Generate from data
const table = fromObjects([
  { name: 'Alice', score: 95 },
  { name: 'Bob', score: 82 },
]);
console.log(table);
// | name  | score |
// |-------|-------|
// | Alice | 95    |
// | Bob   | 82    |

// Parse a table
const { headers, rows, aligns } = parse(tableText);

// Query
const filtered = query(tableText, {
  where: { name: 'Alice' },
  sortBy: 'score',
  order: 'desc',
  limit: 10,
});

// Diff two tables
const changes = diff(oldTable, newTable);
// { addedRows, removedRows, modifiedCells, columnChanges }

// Statistics
const s = stats(tableText);
// { columns, rows, totalCells, emptyCells, columnWidths }
```

## Features

- **Generate** tables from JSON, CSV, or TSV
- **Parse** existing markdown tables into structured data
- **Validate** table structure (column consistency, separator syntax)
- **Query** with filtering, sorting, column selection, and row limits
- **Diff** two tables to find added/removed rows, modified cells, column changes
- **Convert** between markdown, CSV, and TSV formats
- **Statistics** on column widths, empty cells, dimensions
- **Column alignment** — left, center, right
- **JSON output** for CI/CD integration
- Zero runtime dependencies (Node.js 18+)

## License

MIT
