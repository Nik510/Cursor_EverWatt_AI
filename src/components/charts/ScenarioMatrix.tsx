import React, { useMemo } from 'react';
import { HeatMap, type HeatMapCell } from '../ee-training/widgets/HeatMap';

export type ScenarioMatrixCell = {
  rowKey: string;
  rowLabel: string;
  colKey: string;
  colLabel: string;
  /** Value shown as the heat intensity (lower is better by default). */
  value: number;
  label?: string;
  tooltip?: string;
  payload?: unknown;
};

type Props = {
  scenarios: ScenarioMatrixCell[];
  title?: string;
  subtitle?: string;
  onScenarioSelect?: (cell: ScenarioMatrixCell) => void;
};

export const ScenarioMatrix: React.FC<Props> = ({ scenarios, title, subtitle, onScenarioSelect }) => {
  const { rows, cols, data, minValue, maxValue } = useMemo(() => {
    const rowMap = new Map<string, string>();
    const colMap = new Map<string, string>();
    scenarios.forEach((s) => {
      rowMap.set(s.rowKey, s.rowLabel);
      colMap.set(s.colKey, s.colLabel);
    });
    const rows = Array.from(rowMap.entries()).map(([key, label]) => ({ key, label }));
    const cols = Array.from(colMap.entries()).map(([key, label]) => ({ key, label }));

    const data: HeatMapCell[] = scenarios.map((s) => ({
      row: s.rowKey,
      col: s.colKey,
      value: s.value,
      label: s.label,
      tooltip: s.tooltip,
    }));

    const values = scenarios.map((s) => s.value);
    const minValue = values.length ? Math.min(...values) : 0;
    const maxValue = values.length ? Math.max(...values) : 1;
    return { rows, cols, data, minValue, maxValue };
  }, [scenarios]);

  return (
    <HeatMap
      title={title ?? 'Scenario Matrix'}
      subtitle={subtitle ?? 'Compare outcomes across battery sizes and targets.'}
      data={data}
      rows={rows}
      cols={cols}
      minValue={minValue}
      maxValue={maxValue}
      colorScale="green-red"
      showValues
      showLegend
      cellSize="md"
      onCellClick={(cell) => {
        const match = scenarios.find((s) => s.rowKey === cell.row && s.colKey === cell.col);
        if (match) onScenarioSelect?.(match);
      }}
    />
  );
};


