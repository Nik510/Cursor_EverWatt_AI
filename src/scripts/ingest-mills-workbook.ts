import { readFile } from 'node:fs/promises';
import { ingestMillsWorkbookV1 } from '../services/workbook-mills-ingest';

async function main() {
  const filePath = process.argv.slice(2).join(' ').trim();
  if (!filePath) {
    console.error('Usage: tsx src/scripts/ingest-mills-workbook.ts "<path-to-xlsx>"');
    process.exit(2);
  }

  const buf = await readFile(filePath);
  // fileId is purely for provenance pointers in v1
  const fileId = 'local-dev';
  const ingest = ingestMillsWorkbookV1({ fileId, buf });

  const formulaCounts = ingest.auditRows.reduce(
    (acc, r) => {
      const cells = r.cells || {};
      for (const v of Object.values(cells)) {
        acc.totalCells += 1;
        if (v?.formula) acc.cellsWithFormulas += 1;
      }
      return acc;
    },
    { totalCells: 0, cellsWithFormulas: 0 }
  );

  const top = ingest.lightingFixtureTypes.slice(0, 10).map((g) => ({
    qty: g.qty,
    fixtureTypeKey: g.fixtureTypeKey,
    needsConfirmation: g.needsConfirmation,
    sampleEvidence: (g.evidenceRefs || []).slice(0, 2).map((e) => ({
      sheet: e.sheet,
      rowStart: e.rowStart,
      colStart: e.colStart,
      colEnd: e.colEnd,
      snippet: e.snippet || e.snippetText,
    })),
  }));

  const out = {
    apiVersion: ingest.apiVersion,
    extractedAt: ingest.extractedAt,
    counts: {
      vaultSheets: ingest.vaultSheets.length,
      auditRows: ingest.auditRows.length,
      lightingFixtureTypes: ingest.lightingFixtureTypes.length,
      measures: ingest.measures.length,
      bomItems: ingest.bomItems.length,
      inbox: ingest.inbox.length,
    },
    auditRowCellFormulaStats: formulaCounts,
    topFixtureTypes: top,
    inbox: ingest.inbox.slice(0, 20),
  };

  process.stdout.write(JSON.stringify(out, null, 2));
  process.stdout.write('\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

