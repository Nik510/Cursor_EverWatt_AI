import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import type { ReportData } from './report-generator';

function h(level: HeadingLevel, text: string): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { after: 200 },
  });
}

function p(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
    spacing: { after: 120 },
  });
}

function bullets(items: string[]): Paragraph[] {
  return items.map(
    (t) =>
      new Paragraph({
        text: t,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
  );
}

export async function generateWordReport(data: ReportData): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(h(HeadingLevel.TITLE, data.title));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${data.metadata?.generatedAt || new Date().toLocaleString()}`,
          italics: true,
          color: '666666',
        }),
      ],
      spacing: { after: 240 },
    })
  );

  if (data.building) {
    children.push(h(HeadingLevel.HEADING_1, 'Building Information'));
    children.push(p(`Name: ${data.building.name}`));
    children.push(p(`Address: ${data.building.address}`));
    children.push(p(`Square Footage: ${data.building.squareFootage.toLocaleString()} sq ft`));
    children.push(p(`Building Type: ${data.building.buildingType}`));
  }

  if (data.financials) {
    children.push(h(HeadingLevel.HEADING_1, 'Financial Summary'));
    children.push(
      ...bullets([
        `Annual Savings: $${data.financials.annualSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        `Project Cost: $${data.financials.projectCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        `Payback Period: ${data.financials.paybackYears.toFixed(1)} years`,
        `NPV (10 years): $${data.financials.npv10.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        `CO₂ Reduction: ${data.financials.co2Reduction.toFixed(1)} tons/year`,
      ])
    );
  }

  if (data.calculations?.hvac?.individual) {
    children.push(h(HeadingLevel.HEADING_1, 'HVAC Systems Analysis'));
    const lines = data.calculations.hvac.individual.map((item) => {
      const system = item.system?.name || item.system?.type || 'HVAC System';
      const cap = item.system?.capacity ? `${item.system.capacity} ${item.system.type === 'boiler' ? 'MBH' : 'tons'}` : '';
      const savings = item.result?.annualSavings != null ? `$${Number(item.result.annualSavings).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr` : '';
      const payback = item.result?.paybackYears != null ? `${Number(item.result.paybackYears).toFixed(1)} yrs` : '';
      return [system, cap, savings, payback].filter(Boolean).join(' • ');
    });
    children.push(...bullets(lines));
  }

  if (data.calculations?.lighting?.individual) {
    children.push(h(HeadingLevel.HEADING_1, 'Lighting Systems Analysis'));
    const lines = data.calculations.lighting.individual.map((item) => {
      const system = item.system?.name || item.system?.type || 'Lighting System';
      const fixtures = item.system?.fixtureCount ? `${item.system.fixtureCount} fixtures` : '';
      const savings = item.result?.annualSavings != null ? `$${Number(item.result.annualSavings).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr` : '';
      const payback = item.result?.paybackYears != null ? `${Number(item.result.paybackYears).toFixed(1)} yrs` : '';
      return [system, fixtures, savings, payback].filter(Boolean).join(' • ');
    });
    children.push(...bullets(lines));
  }

  if (data.recommendations?.length) {
    children.push(h(HeadingLevel.HEADING_1, 'Recommendations'));
    children.push(...bullets(data.recommendations));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
