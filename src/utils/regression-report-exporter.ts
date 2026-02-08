import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { computeUncertaintyMetrics, type RegressionAnalysisResult, type RegressionResult } from './regression-analysis';

export type ExportGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

export type ExportModelChoice = 'auto' | 'linear' | 'hddcdd' | 'change-point' | 'towt';

function pickModel(result: RegressionAnalysisResult, choice: ExportModelChoice): RegressionResult {
  const fallback = result.temperatureRegression;
  if (choice === 'linear') return result.temperatureRegression ?? fallback;
  if (choice === 'hddcdd') return result.multivariateRegression ?? fallback;
  if (choice === 'change-point') return result.changePointRegression ?? fallback;
  if (choice === 'towt') return result.towtRegression ?? fallback;

  const candidates: Array<RegressionResult | null | undefined> = [
    result.towtRegression,
    result.changePointRegression,
    result.multivariateRegression,
    result.temperatureRegression,
  ];
  return (
    candidates
      .filter((r): r is RegressionResult => Boolean(r))
      .sort((a, b) => (b.rSquared ?? 0) - (a.rSquared ?? 0))[0] ?? fallback
  );
}

function fmtPct(v: number, digits: number = 2): string {
  return `${v.toFixed(digits)}%`;
}

function fmtNum(v: number, digits: number = 4): string {
  return v.toFixed(digits);
}

export function exportRegressionToPDF(args: {
  title: string;
  modelChoice: ExportModelChoice;
  results: Record<ExportGranularity, RegressionAnalysisResult>;
}): void {
  const doc = new jsPDF();
  const now = new Date().toLocaleString();

  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235);
  doc.text(args.title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${now}`, 14, 26);
  doc.text(`Model: ${args.modelChoice.toUpperCase()}`, 14, 32);

  let y = 40;
  const granularities: ExportGranularity[] = ['hourly', 'daily', 'weekly', 'monthly'];

  for (const g of granularities) {
    const res = args.results[g];
    const reg = pickModel(res, args.modelChoice);
    const diag = reg.diagnostics;
    const uncertainty = computeUncertaintyMetrics({
      aggregatedData: res.aggregatedData,
      regression: reg,
      confidence: 0.9,
      assumedSavingsFraction: 0.1,
    });

    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`${g.toUpperCase()} (${res.aggregatedData.length} pts)`, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Equation: ${reg.equation}`, 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['R²', fmtNum(reg.rSquared, 4)],
        ['Adj R²', fmtNum(reg.adjustedRSquared, 4)],
        ['RMSE', diag?.rmse !== undefined ? fmtNum(diag.rmse, 2) : '—'],
        ['CVRMSE', diag?.cvrmse !== undefined ? fmtPct(diag.cvrmse, 2) : '—'],
        ['NMBE', diag?.nmbe !== undefined ? fmtPct(diag.nmbe, 2) : '—'],
        ['Significance F', reg.anova ? fmtNum(reg.anova.significanceF, 6) : '—'],
        ['U (90% CI, 10% savings)', fmtPct(uncertainty.U * 100, 2)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Coefficients (trim if too long)
    const coeffRows =
      (reg.coefficients ?? []).slice(0, 18).map((c) => [
        c.name,
        fmtNum(c.value, 6),
        fmtNum(c.standardError, 6),
        fmtNum(c.tStat, 4),
        fmtNum(c.pValue, 6),
      ]) ?? [];

    if (coeffRows.length) {
      autoTable(doc, {
        startY: y,
        head: [['Term', 'Coef', 'Std Err', 't', 'p']],
        body: coeffRows,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 8 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Data sample
    const dataRows = res.aggregatedData.slice(0, 24).map((d, i) => [
      d.period,
      Math.round(d.totalUsage).toString(),
      reg.predictedValues[i] !== undefined ? Math.round(reg.predictedValues[i]).toString() : '',
      reg.residuals[i] !== undefined ? Math.round(reg.residuals[i]).toString() : '',
      d.avgTemperature.toFixed(1),
      d.maxDemand.toFixed(1),
      d.heatingDegreeDays.toFixed(2),
      d.coolingDegreeDays.toFixed(2),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Period', 'Usage', 'Pred', 'Resid', 'Temp', 'Max kW', 'HDD', 'CDD']],
      body: dataRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 7 },
    });
    y = (doc as any).lastAutoTable.finalY + 14;

    // New page if needed
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
  }

  const timestamp = new Date().toISOString().split('T')[0];
  doc.save(`Regression_Report_${timestamp}.pdf`);
}

export function exportRegressionToExcel(args: {
  title: string;
  modelChoice: ExportModelChoice;
  results: Record<ExportGranularity, RegressionAnalysisResult>;
}): void {
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString();

  const granularityOrder: ExportGranularity[] = ['hourly', 'daily', 'weekly', 'monthly'];

  // Summary sheet
  const summaryRows: Array<Array<string | number>> = [
    [args.title],
    ['Generated', now],
    ['Model', args.modelChoice.toUpperCase()],
    [''],
    ['Granularity', 'n', 'R²', 'Adj R²', 'RMSE', 'CVRMSE %', 'NMBE %', 'U (90% CI) %'],
  ];

  for (const g of granularityOrder) {
    const res = args.results[g];
    const reg = pickModel(res, args.modelChoice);
    const diag = reg.diagnostics;
    const u = computeUncertaintyMetrics({
      aggregatedData: res.aggregatedData,
      regression: reg,
      confidence: 0.9,
      assumedSavingsFraction: 0.1,
    });
    summaryRows.push([
      g,
      res.aggregatedData.length,
      reg.rSquared,
      reg.adjustedRSquared,
      diag?.rmse ?? '',
      diag?.cvrmse ?? '',
      diag?.nmbe ?? '',
      u.U * 100,
    ]);
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  // Per-granularity sheets
  for (const g of granularityOrder) {
    const res = args.results[g];
    const reg = pickModel(res, args.modelChoice);
    const diag = reg.diagnostics;
    const u = computeUncertaintyMetrics({
      aggregatedData: res.aggregatedData,
      regression: reg,
      confidence: 0.9,
      assumedSavingsFraction: 0.1,
    });

    const sheetRows: Array<Array<string | number>> = [
      [`${g.toUpperCase()} MODEL`],
      ['Equation', reg.equation],
      ['n', res.aggregatedData.length],
      ['R²', reg.rSquared],
      ['Adj R²', reg.adjustedRSquared],
      ['RMSE', diag?.rmse ?? ''],
      ['CVRMSE %', diag?.cvrmse ?? ''],
      ['NMBE %', diag?.nmbe ?? ''],
      ['U (90% CI) %', u.U * 100],
      [''],
    ];

    if (reg.anova) {
      sheetRows.push(['ANOVA']);
      sheetRows.push(['Source', 'df', 'SS', 'MS']);
      sheetRows.push(['Regression', reg.anova.regression.df, reg.anova.regression.ss, reg.anova.regression.ms]);
      sheetRows.push(['Residual', reg.anova.residual.df, reg.anova.residual.ss, reg.anova.residual.ms]);
      sheetRows.push(['Total', reg.anova.total.df, reg.anova.total.ss, '']);
      sheetRows.push(['F', reg.anova.fStatistic, 'Significance F', reg.anova.significanceF]);
      sheetRows.push(['']);
    }

    if (reg.coefficients?.length) {
      sheetRows.push(['COEFFICIENTS']);
      sheetRows.push(['Term', 'Coef', 'Std Err', 't', 'p', '90% CI lower', '90% CI upper', '95% CI lower', '95% CI upper']);
      for (const c of reg.coefficients) {
        sheetRows.push([
          c.name,
          c.value,
          c.standardError,
          c.tStat,
          c.pValue,
          c.ci90.lower,
          c.ci90.upper,
          c.ci95.lower,
          c.ci95.upper,
        ]);
      }
      sheetRows.push(['']);
    }

    sheetRows.push(['DATA']);
    sheetRows.push(['Period', 'Start', 'End', 'Usage', 'Predicted', 'Residual', 'AvgTempF', 'MaxDemandkW', 'HDD', 'CDD', 'Points']);
    for (let i = 0; i < res.aggregatedData.length; i++) {
      const d = res.aggregatedData[i];
      sheetRows.push([
        d.period,
        d.startDate.toISOString(),
        d.endDate.toISOString(),
        d.totalUsage,
        reg.predictedValues[i] ?? '',
        reg.residuals[i] ?? '',
        d.avgTemperature,
        d.maxDemand,
        d.heatingDegreeDays,
        d.coolingDegreeDays,
        d.dataPoints,
      ]);
    }

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetRows), g.toUpperCase());
  }

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Regression_Report_${timestamp}.xlsx`);
}


