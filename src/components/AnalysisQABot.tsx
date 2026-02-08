/**
 * Analysis Q&A Bot Component
 * Answers questions about battery analysis results using context-aware reasoning
 * Can be extended with LLM integration later
 */

import React, { useState, useMemo } from 'react';
import { MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';

interface AnalysisContext {
  battery: {
    modelName: string;
    manufacturer: string;
    capacityKwh: number;
    powerKw: number;
    efficiency: number;
    warranty: number;
    price: number;
  };
  simulationResult: {
    originalPeak: number;
    newPeak: number;
    peakReduction: number;
    peakReductionPercent: number;
  };
  financials: {
    demandRate: number;
    annualSavings: number;
    systemCost: number;
    paybackYears: number;
  };
  cycleAnalysis: {
    cyclesPerYear: number;
    eventsPerMonth: number;
    maxObservedKw: number;
  };
  peakFrequency: {
    perYear: number;
    perMonthAvg: number;
  };
  targetThreshold: number;
  alternativeBatteries?: Array<{
    modelName: string;
    capacityKwh: number;
    powerKw: number;
    peakReductionKw: number;
    annualSavings: number;
    systemCost: number;
    paybackYears: number;
  }>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AnalysisQABotProps {
  context: AnalysisContext;
}

export const AnalysisQABot: React.FC<AnalysisQABotProps> = ({ context }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your analysis assistant. I can help explain why this battery (${context.battery.modelName}) was chosen, compare it to alternatives, and answer questions about the analysis results. What would you like to know?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const answerQuestion = async (question: string): Promise<string> => {
    const q = question.toLowerCase().trim();
    const { battery, simulationResult, financials, cycleAnalysis, peakFrequency, targetThreshold, alternativeBatteries } = context;

    // Why was this battery chosen?
    if (q.includes('why') && (q.includes('chosen') || q.includes('selected') || q.includes('pick'))) {
      const reasons: string[] = [];
      
      if (financials.paybackYears < 10) {
        reasons.push(`excellent payback period of ${financials.paybackYears.toFixed(1)} years`);
      } else if (financials.paybackYears < 20) {
        reasons.push(`reasonable payback period of ${financials.paybackYears.toFixed(1)} years`);
      }
      
      if (simulationResult.peakReductionPercent >= 15) {
        reasons.push(`strong peak reduction of ${simulationResult.peakReductionPercent.toFixed(1)}%`);
      }
      
      if (battery.powerKw >= simulationResult.peakReduction) {
        reasons.push(`sufficient power (${battery.powerKw} kW) to achieve the ${simulationResult.peakReduction.toFixed(1)} kW peak reduction`);
      }
      
      if (financials.annualSavings > 0) {
        reasons.push(`positive annual savings of $${financials.annualSavings.toLocaleString()}`);
      }
      
      return `This battery (${battery.modelName}) was chosen because it offers ${reasons.join(', ')}. ` +
        `With a system cost of $${financials.systemCost.toLocaleString()} and annual savings of $${financials.annualSavings.toLocaleString()}, ` +
        `it provides a balanced combination of performance and economics.`;
    }

    // Why not a larger battery?
    if (q.includes('why not') && (q.includes('larger') || q.includes('bigger') || q.includes('more'))) {
      const largerBatteries = alternativeBatteries?.filter(b => 
        (b.capacityKwh > battery.capacityKwh || b.powerKw > battery.powerKw) && 
        b.paybackYears > financials.paybackYears
      ) || [];
      
      if (largerBatteries.length > 0) {
        const example = largerBatteries[0];
        return `A larger battery like ${example.modelName} (${example.capacityKwh} kWh, ${example.powerKw} kW) would provide ` +
          `${example.peakReductionKw.toFixed(1)} kW peak reduction vs ${simulationResult.peakReduction.toFixed(1)} kW, ` +
          `but at a cost of $${example.systemCost.toLocaleString()} vs $${financials.systemCost.toLocaleString()}. ` +
          `The payback period would be ${example.paybackYears.toFixed(1)} years vs ${financials.paybackYears.toFixed(1)} years. ` +
          `For this load profile, the additional capacity doesn't justify the extra cost - the current battery ` +
          `already achieves ${simulationResult.peakReductionPercent.toFixed(1)}% peak reduction, which is ` +
          `${simulationResult.peakReductionPercent >= 15 ? 'optimal' : 'adequate'} for most applications.`;
      }
      
      return `A larger battery would provide more peak reduction, but the economics don't justify it. ` +
        `The current battery (${battery.modelName}) already reduces peak demand by ${simulationResult.peakReduction.toFixed(1)} kW ` +
        `(${simulationResult.peakReductionPercent.toFixed(1)}%), which is ${simulationResult.peakReductionPercent >= 15 ? 'in the optimal range' : 'adequate for this application'}. ` +
        `Larger batteries typically cost significantly more but may only provide marginal additional savings, ` +
        `resulting in longer payback periods. The current selection balances performance and economics.`;
    }

    // How often does the battery discharge?
    if (q.includes('how often') || q.includes('frequency') || q.includes('discharge')) {
      return `The battery discharges approximately ${cycleAnalysis.eventsPerMonth.toFixed(1)} times per month ` +
        `(${cycleAnalysis.cyclesPerYear} times per year). This is based on ${peakFrequency.perYear} peak events ` +
        `where demand exceeds the ${targetThreshold.toFixed(0)} kW threshold. ` +
        `The battery cycles ${cycleAnalysis.cyclesPerYear} times annually, which is ` +
        `${cycleAnalysis.cyclesPerYear < 300 ? 'moderate and extends battery life' : 'high and may accelerate degradation'}.`;
    }

    // What's the payback period?
    if (q.includes('payback') || q.includes('roi') || q.includes('return')) {
      return `The payback period is ${financials.paybackYears.toFixed(1)} years. ` +
        `This is calculated by dividing the system cost ($${financials.systemCost.toLocaleString()}) ` +
        `by the annual savings ($${financials.annualSavings.toLocaleString()}). ` +
        `A payback period under 10 years is generally considered good for commercial energy storage projects.`;
    }

    // What's the peak reduction?
    if (q.includes('peak reduction') || q.includes('shave') || q.includes('reduce')) {
      return `The battery reduces peak demand by ${simulationResult.peakReduction.toFixed(1)} kW, ` +
        `from ${simulationResult.originalPeak.toFixed(1)} kW to ${simulationResult.newPeak.toFixed(1)} kW. ` +
        `This represents a ${simulationResult.peakReductionPercent.toFixed(1)}% reduction. ` +
        `${simulationResult.peakReductionPercent >= 15 ? 'This is in the optimal 15-30% range for peak shaving.' : 
          'Consider a larger battery if you need 15%+ reduction for better customer value.'}`;
    }

    // Compare to alternatives
    if (q.includes('compare') || q.includes('alternative') || q.includes('other')) {
      if (alternativeBatteries && alternativeBatteries.length > 0) {
        const top3 = alternativeBatteries.slice(0, 3);
        let response = `Here are the top alternatives:\n\n`;
        top3.forEach((alt, i) => {
          response += `${i + 1}. ${alt.modelName} (${alt.capacityKwh} kWh, ${alt.powerKw} kW): ` +
            `$${alt.systemCost.toLocaleString()}, ${alt.paybackYears.toFixed(1)}yr payback, ` +
            `${alt.peakReductionKw.toFixed(1)}kW reduction\n`;
        });
        response += `\nThe current selection (${battery.modelName}) was chosen for the best balance of cost and performance.`;
        return response;
      }
      return `I don't have alternative battery data loaded. The current battery (${battery.modelName}) ` +
        `provides ${simulationResult.peakReduction.toFixed(1)} kW peak reduction with a ` +
        `${financials.paybackYears.toFixed(1)} year payback period.`;
    }

    // Battery specifications
    if (q.includes('spec') || q.includes('capacity') || q.includes('power') || q.includes('size')) {
      return `The ${battery.modelName} has:\n` +
        `• Capacity: ${battery.capacityKwh} kWh\n` +
        `• Power: ${battery.powerKw} kW\n` +
        `• Efficiency: ${(battery.efficiency * 100).toFixed(0)}%\n` +
        `• Warranty: ${battery.warranty} years\n` +
        `• System Cost: $${financials.systemCost.toLocaleString()}\n\n` +
        `This provides ${simulationResult.peakReduction.toFixed(1)} kW peak reduction with ` +
        `$${financials.annualSavings.toLocaleString()} annual savings.`;
    }

    // Default response
    return `I can help you understand:\n` +
      `• Why this battery was chosen\n` +
      `• Why not a larger/smaller battery\n` +
      `• How often the battery discharges\n` +
      `• Payback period and ROI\n` +
      `• Peak reduction details\n` +
      `• Battery specifications\n\n` +
      `Try asking: "Why was this battery chosen?" or "Why not a larger battery?"`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    // Simulate thinking delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await answerQuestion(input);
    
    const assistantMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsThinking(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">Ask About This Analysis</h3>
      </div>

      <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-50 text-blue-900'
                  : 'bg-gray-50 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              <div className="text-xs opacity-60 mt-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Thinking...</div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask: Why was this battery chosen? Why not a larger one?"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          disabled={isThinking}
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
