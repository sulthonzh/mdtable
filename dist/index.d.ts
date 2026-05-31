#!/usr/bin/env node
export interface ColumnConfig {
    name: string;
    align?: 'left' | 'center' | 'right';
    maxWidth?: number;
}
export interface TableOptions {
    columns?: ColumnConfig[];
    align?: Record<string, 'left' | 'center' | 'right'>;
    padding?: number;
    maxWidth?: number;
    headerSeparator?: boolean;
}
export interface ParsedTable {
    headers: string[];
    aligns: ('left' | 'center' | 'right' | null)[];
    rows: string[][];
}
export declare function fromObjects(data: Record<string, unknown>[], options?: TableOptions): string;
export declare function fromArrays(headers: string[], rows: string[][], options?: TableOptions): string;
export declare function parse(tableText: string): ParsedTable;
export interface ValidationIssue {
    line: number;
    message: string;
    severity: 'error' | 'warning';
}
export declare function validate(tableText: string): ValidationIssue[];
export declare function query(tableText: string, opts: {
    select?: string[];
    where?: Record<string, string | RegExp>;
    sortBy?: string;
    order?: 'asc' | 'desc';
    limit?: number;
}): string;
export declare function fromCsv(csvText: string, options?: TableOptions & {
    delimiter?: string;
}): string;
export declare function fromTsv(tsvText: string, options?: TableOptions): string;
export interface TableDiff {
    addedRows: number[];
    removedRows: number[];
    modifiedCells: {
        row: number;
        col: string;
        before: string;
        after: string;
    }[];
    columnChanges: {
        added: string[];
        removed: string[];
    };
}
export declare function diff(tableA: string, tableB: string): TableDiff;
export declare function toCsv(tableText: string, delimiter?: string): string;
export declare function toTsv(tableText: string): string;
export interface TableStats {
    columns: number;
    rows: number;
    totalCells: number;
    emptyCells: number;
    maxRowWidth: number;
    columnWidths: Record<string, {
        min: number;
        max: number;
        avg: number;
    }>;
}
export declare function stats(tableText: string): TableStats;
