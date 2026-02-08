import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SavingsTrendData {
  year: number;
  cumulativeSavings: number;
  annualSavings: number;
}

interface SavingsTrendChartProps {
  data: SavingsTrendData[];
  height?: number;
}

export const SavingsTrendChart: React.FC<SavingsTrendChartProps> = ({ data, height = 300 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="year" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          label={{ value: '$', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
          formatter={(value: number, name: string) => {
            const formatted = `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
            const label = name === 'cumulativeSavings' ? 'Cumulative Savings' : 'Annual Savings';
            return [formatted, label];
          }}
        />
        <Legend 
          formatter={(value) => {
            return value === 'cumulativeSavings' ? 'Cumulative Savings' : 'Annual Savings';
          }}
        />
        <Line 
          type="monotone" 
          dataKey="cumulativeSavings" 
          stroke="#10b981" 
          strokeWidth={2}
          name="cumulativeSavings"
          dot={{ r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="annualSavings" 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="annualSavings"
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

