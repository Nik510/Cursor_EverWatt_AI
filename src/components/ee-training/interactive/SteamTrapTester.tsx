/**
 * SteamTrapTester Component
 * Interactive steam trap diagnosis tool
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Thermometer, 
  Volume2, 
  Eye,
  DollarSign,
  Wrench,
  HelpCircle
} from 'lucide-react';

interface TrapSymptom {
  id: string;
  question: string;
  icon: React.ReactNode;
  options: {
    value: string;
    label: string;
    meaning: string;
  }[];
}

interface DiagnosisResult {
  status: 'good' | 'failed-open' | 'failed-closed' | 'unknown';
  title: string;
  description: string;
  annualCost: string;
  action: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface SteamTrapTesterProps {
  title?: string;
  subtitle?: string;
  steamPressure?: number;
  className?: string;
}

const symptoms: TrapSymptom[] = [
  {
    id: 'sound',
    question: 'What sound does the trap make?',
    icon: <Volume2 className="w-5 h-5" />,
    options: [
      { value: 'intermittent-click', label: 'Intermittent clicking/cycling', meaning: 'Normal operation' },
      { value: 'continuous-flow', label: 'Continuous flow/hissing', meaning: 'May be failed open' },
      { value: 'silent', label: 'Silent/no activity', meaning: 'May be failed closed or no load' },
      { value: 'banging', label: 'Loud banging/water hammer', meaning: 'Likely failed closed' },
    ],
  },
  {
    id: 'downstream-temp',
    question: 'Temperature downstream of trap?',
    icon: <Thermometer className="w-5 h-5" />,
    options: [
      { value: 'hot-full', label: 'Very hot (near steam temp)', meaning: 'Trap may be blowing live steam' },
      { value: 'warm', label: 'Warm (100-150°F)', meaning: 'Normal - some heat from condensate' },
      { value: 'cold', label: 'Cold (near ambient)', meaning: 'Trap may be closed or no load' },
    ],
  },
  {
    id: 'visual',
    question: 'What do you see at the condensate outlet?',
    icon: <Eye className="w-5 h-5" />,
    options: [
      { value: 'flash-steam', label: 'Small amount of flash steam', meaning: 'Normal' },
      { value: 'continuous-steam', label: 'Continuous strong steam plume', meaning: 'Failed open - blowing steam' },
      { value: 'nothing', label: 'No discharge visible', meaning: 'May be closed or no load' },
      { value: 'water-only', label: 'Steady water discharge', meaning: 'Possible trap failure' },
    ],
  },
  {
    id: 'equipment',
    question: 'How is the heated equipment performing?',
    icon: <Wrench className="w-5 h-5" />,
    options: [
      { value: 'normal', label: 'Heating normally', meaning: 'Trap likely working' },
      { value: 'slow', label: 'Slow to heat / not reaching temp', meaning: 'May be failed closed' },
      { value: 'flooded', label: 'Water accumulation in equipment', meaning: 'Trap likely failed closed' },
      { value: 'unknown', label: 'Cannot determine', meaning: 'Need more investigation' },
    ],
  },
];

const diagnose = (answers: Record<string, string>, steamPressure: number): DiagnosisResult => {
  // Count indicators
  const failedOpenIndicators = [
    answers.sound === 'continuous-flow',
    answers['downstream-temp'] === 'hot-full',
    answers.visual === 'continuous-steam',
  ].filter(Boolean).length;

  const failedClosedIndicators = [
    answers.sound === 'silent' || answers.sound === 'banging',
    answers['downstream-temp'] === 'cold',
    answers.visual === 'nothing',
    answers.equipment === 'slow' || answers.equipment === 'flooded',
  ].filter(Boolean).length;

  const normalIndicators = [
    answers.sound === 'intermittent-click',
    answers['downstream-temp'] === 'warm',
    answers.visual === 'flash-steam',
    answers.equipment === 'normal',
  ].filter(Boolean).length;

  // Calculate annual cost for failed open trap
  const steamLossLbHr = Math.sqrt(steamPressure) * 5; // Rough estimate
  const annualSteamLoss = steamLossLbHr * 8760;
  const annualCost = (annualSteamLoss * 12) / 1000; // $12 per 1000 lb steam

  if (failedOpenIndicators >= 2) {
    return {
      status: 'failed-open',
      title: 'Likely FAILED OPEN',
      description: 'The trap appears to be passing live steam continuously. This wastes significant energy.',
      annualCost: `~$${annualCost.toFixed(0)}/year`,
      action: 'Replace trap immediately. Verify with ultrasonic testing.',
      urgency: 'high',
    };
  }

  if (failedClosedIndicators >= 2) {
    return {
      status: 'failed-closed',
      title: 'Likely FAILED CLOSED',
      description: 'The trap is not discharging condensate properly. This causes water hammer and reduced heat transfer.',
      annualCost: 'Reduced production/comfort',
      action: 'Replace or repair trap. Check for debris or stuck internals.',
      urgency: 'high',
    };
  }

  if (normalIndicators >= 3) {
    return {
      status: 'good',
      title: 'Trap Appears GOOD',
      description: 'Based on the symptoms, the trap appears to be operating normally.',
      annualCost: '$0 (operating properly)',
      action: 'Document and recheck in 6-12 months.',
      urgency: 'low',
    };
  }

  return {
    status: 'unknown',
    title: 'INCONCLUSIVE',
    description: 'The symptoms are mixed. Further testing is recommended.',
    annualCost: 'Unknown',
    action: 'Perform ultrasonic and temperature testing to confirm trap status.',
    urgency: 'medium',
  };
};

export const SteamTrapTester: React.FC<SteamTrapTesterProps> = ({
  title = 'Steam Trap Diagnosis Tool',
  subtitle = 'Answer the questions to diagnose trap condition',
  steamPressure = 15,
  className = '',
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (symptomId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [symptomId]: value }));
  };

  const result = diagnose(answers, steamPressure);
  const allAnswered = Object.keys(answers).length === symptoms.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'from-green-500 to-emerald-600';
      case 'failed-open':
        return 'from-red-500 to-rose-600';
      case 'failed-closed':
        return 'from-orange-500 to-red-600';
      default:
        return 'from-gray-500 to-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-8 h-8" />;
      case 'failed-open':
      case 'failed-closed':
        return <XCircle className="w-8 h-8" />;
      default:
        return <HelpCircle className="w-8 h-8" />;
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-slate-500 via-gray-600 to-zinc-700 rounded-2xl flex items-center justify-center shadow-lg">
          <AlertTriangle className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      {/* Steam pressure input */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Steam Pressure (psig)
        </label>
        <input
          type="number"
          value={steamPressure}
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          readOnly
        />
        <p className="text-xs text-gray-500 mt-1">
          Higher pressure = greater losses from failed traps
        </p>
      </div>

      <div className="flex gap-6">
        {/* Questions */}
        <div className="flex-1 space-y-4">
          {symptoms.map((symptom, index) => (
            <div
              key={symptom.id}
              className={`p-4 rounded-xl border transition-all ${
                answers[symptom.id] ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  answers[symptom.id] ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {answers[symptom.id] ? <CheckCircle className="w-5 h-5" /> : symptom.icon}
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-500">Question {index + 1}</span>
                  <h4 className="font-medium text-gray-900">{symptom.question}</h4>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {symptom.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(symptom.id, option.value)}
                    className={`p-3 rounded-lg text-left text-sm transition-all ${
                      answers[symptom.id] === option.value
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className={`text-xs mt-1 ${
                      answers[symptom.id] === option.value ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {option.meaning}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Result panel */}
        <div className="w-80">
          {allAnswered || showResult ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
              {/* Result header */}
              <div className={`bg-gradient-to-r ${getStatusColor(result.status)} text-white p-5`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    {getStatusIcon(result.status)}
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Diagnosis</div>
                    <h4 className="text-lg font-bold">{result.title}</h4>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">{result.description}</p>

                {/* Cost impact */}
                <div className={`p-4 rounded-lg ${
                  result.status === 'good' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                } border`}>
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className={`w-4 h-4 ${
                      result.status === 'good' ? 'text-green-600' : 'text-red-600'
                    }`} />
                    <span className="text-sm font-semibold text-gray-700">Cost Impact</span>
                  </div>
                  <p className={`text-lg font-bold ${
                    result.status === 'good' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.annualCost}
                  </p>
                </div>

                {/* Action */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Recommended Action</h5>
                  <p className="text-sm text-gray-600">{result.action}</p>
                </div>

                {/* Urgency */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  result.urgency === 'high' ? 'bg-red-100 text-red-700' :
                  result.urgency === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                  {result.urgency === 'high' ? 'Immediate attention needed' :
                   result.urgency === 'medium' ? 'Schedule testing soon' :
                   'Normal maintenance schedule'}
                </div>
              </div>

              {/* Reset button */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setAnswers({});
                    setShowResult(false);
                  }}
                  className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Reset Diagnosis
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border border-gray-200 p-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <HelpCircle className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="font-semibold text-gray-700 mb-2">Answer All Questions</h4>
                <p className="text-sm text-gray-500">
                  Complete the assessment to see the diagnosis and estimated cost impact.
                </p>
                <p className="text-xs text-gray-400 mt-4">
                  {Object.keys(answers).length} of {symptoms.length} answered
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <h5 className="font-semibold text-amber-800 mb-2">💡 Testing Tips</h5>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Use an ultrasonic detector for most accurate diagnosis</li>
          <li>• Temperature guns can identify hot downstream pipes (failed open)</li>
          <li>• Test during normal operation, not startup</li>
          <li>• Industry average: 15-25% of traps are failed in buildings without maintenance programs</li>
        </ul>
      </div>
    </div>
  );
};

export default SteamTrapTester;
