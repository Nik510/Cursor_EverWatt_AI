import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable types are not bundled
import autoTable from 'jspdf-autotable';
import type { BatteryReportViewModel } from './report-vm';

const formatCurrency = (value: number, fractionDigits = 0) =>
  `\$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: fractionDigits })}`;

export function exportBatteryCustomerSummaryPdf(vm: BatteryReportViewModel) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Battery Analysis — Customer Summary', 14, 16);
  doc.setFontSize(10);
  const siteName = vm.raw.envelope?.customerInfo?.billingName || vm.raw.envelope?.customerInfo?.companyName || 'Customer';
  const siteAddr = vm.raw.envelope?.customerInfo?.siteAddress || vm.raw.envelope?.customerInfo?.siteLocation || 'Address N/A';
  doc.text(`Site: ${siteName} • ${siteAddr}`, 14, 24);
  doc.text(
    `Rate: ${vm.rateCode || 'N/A'} • Demand Rate: ${formatCurrency(vm.demandRatePerKwMonth)}/kW-month`,
    14,
    30
  );

  autoTable(doc, {
    startY: 38,
    head: [['Metric', 'Value']],
    body: [
      ['Battery', vm.batteryLabel],
      ['Size', `${vm.totalKwh.toFixed(0)} kWh / ${vm.totalKw.toFixed(0)} kW`],
      ['Annual Savings', formatCurrency(vm.annualSavings)],
      ['System Cost', formatCurrency(vm.systemCost)],
      ['Payback', Number.isFinite(vm.paybackYears) ? `${vm.paybackYears.toFixed(1)} years` : 'N/A'],
      ['Baseline Peak', `${vm.baselineKw.toFixed(1)} kW`],
      ['Spike Count', `${vm.spikeCount}`],
      ['NPV (10yr, 5%)', formatCurrency(vm.npv10yr)],
    ],
    styles: { fontSize: 9 },
  });

  const tariffEngine = vm.raw.envelope?.result?.tariffEngine;
  if (tariffEngine?.success && Array.isArray(tariffEngine.cycles)) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 8 || 90,
      head: [['Bill End', 'Demand Before', 'Demand After', 'Determinant', 'Savings ($)']],
      body: tariffEngine.cycles.slice(0, 12).map((c: any) => {
        const det = Array.isArray(c.determinants) ? c.determinants[0] : null;
        return [
          String(c.billEndDate || '').slice(0, 10),
          Number(det?.beforeKw ?? 0).toFixed(1),
          Number(det?.afterKw ?? 0).toFixed(1),
          String(det?.name || det?.determinantId || 'n/a'),
          Number(c.savings ?? 0).toFixed(2),
        ];
      }),
      styles: { fontSize: 8 },
    });
  }

  const bills = Array.isArray(vm.raw.envelope?.usageData) ? vm.raw.envelope.usageData : [];
  if (bills.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 8 || 70,
      head: [['Recent Bills', 'Peak kW', 'Usage kWh', 'Bill $']],
      body: bills.slice(-6).map((b: any) => [
        String(b.billEndDate || '').slice(0, 10),
        Number(b.peakDemandKw ?? 0).toFixed(1),
        Number(b.totalUsageKwh ?? 0).toLocaleString(),
        formatCurrency(Number(b.totalCost ?? 0)),
      ]),
      styles: { fontSize: 8 },
    });
  }

  // Manifest footer (for discrepancy triage)
  doc.setFontSize(8);
  const footer = vm.manifestFooter.slice(0, 8).join(' | ');
  doc.text(footer, 14, 285, { maxWidth: 180 } as any);

  doc.save(`Battery_Report_${siteName}.pdf`);
}

export function exportBatteryFullPdf(vm: BatteryReportViewModel) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.text('Battery Analysis — Full Report', 14, 16);
  doc.setFontSize(9);
  const ci = vm.raw.envelope?.customerInfo || {};
  doc.text(
    `Site: ${ci.billingName || ci.companyName || 'Customer'} (${ci.saId || ci.serviceAgreementId || 'SAID N/A'}) • Rate: ${vm.rateCode || 'N/A'}`,
    14,
    24
  );
  doc.text(`Battery: ${vm.batteryLabel} (${vm.totalKwh.toFixed(0)} kWh / ${vm.totalKw.toFixed(0)} kW)`, 14, 30);

  autoTable(doc, {
    startY: 38,
    head: [['Category', 'Value']],
    body: [
      ['Baseline Peak', `${vm.baselineKw.toFixed(1)} kW`],
      ['Spike Count', `${vm.spikeCount}`],
      ['Demand Rate Used', `${formatCurrency(vm.demandRatePerKwMonth)}/kW-month`],
      ['Annual Savings', formatCurrency(vm.annualSavings)],
      ['System Cost', formatCurrency(vm.systemCost)],
      ['Payback', Number.isFinite(vm.paybackYears) ? `${vm.paybackYears.toFixed(1)} years` : 'N/A'],
      ['NPV (10yr, 5%)', formatCurrency(vm.npv10yr)],
      ['Interval Hash', vm.raw.manifest.intervalSha256 || 'n/a'],
      ['Usage Hash', vm.raw.manifest.usageSha256 || 'n/a'],
      ['Catalog Hash', vm.raw.manifest.catalogSha256 || 'n/a'],
      ['Git Commit', vm.raw.manifest.gitCommit || 'n/a'],
    ],
    styles: { fontSize: 8 },
  });

  const diag = vm.raw.envelope?.result?.diagnostic;
  if (diag) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 6 || 120,
      head: [['Diagnostic Notes']],
      body: [
        [`powerAdequacy: ${String(diag.powerAdequacy ?? 'n/a')}, capacityAdequacy: ${String(diag.capacityAdequacy ?? 'n/a')}`],
        [`captureRate: ${Number(diag.captureRate ?? 0).toFixed(3)}, utilizationRate: ${Number(diag.utilizationRate ?? 0).toFixed(3)}`],
      ],
      styles: { fontSize: 8 },
    });
  }

  const tariffEngine = vm.raw.envelope?.result?.tariffEngine;
  if (tariffEngine?.success && Array.isArray(tariffEngine.cycles)) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable?.finalY + 6 || 140,
      head: [['Bill End', 'Demand Before', 'Demand After', 'Binding TS', 'Cycle Savings ($)']],
      body: tariffEngine.cycles.map((c: any) => {
        const det = Array.isArray(c.determinants) ? c.determinants[0] : null;
        const bind = det?.bindingTimestampsBefore?.[0] || det?.bindingTimestampsAfter?.[0] || '';
        return [
          String(c.billEndDate || '').slice(0, 10),
          Number(det?.beforeKw ?? 0).toFixed(1),
          Number(det?.afterKw ?? 0).toFixed(1),
          bind ? String(bind).replace('T', ' ').slice(0, 16) : 'n/a',
          Number(c.savings ?? 0).toFixed(2),
        ];
      }),
      styles: { fontSize: 8 },
    });
  }

  doc.save(`Battery_Internal_${ci.billingName || ci.companyName || 'site'}.pdf`);
}

