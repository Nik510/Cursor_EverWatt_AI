import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Calendar, TrendingUp, FileText, CheckCircle } from 'lucide-react';
import {
  generateMVReport,
  generateComparisonPeriods,
  calculateMVComparison,
  calculateMVSummary,
  type MVReportData,
  type MVTimePeriod,
  type MVProjectData,
  type MVComparisonData,
} from '../../../utils/mv-report-generator';
import { useToast } from '../../../contexts/ToastContext';

export const MVComparisonReport: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'excel' | 'word'>('pdf');
  const [timePeriod, setTimePeriod] = useState<MVTimePeriod>('bi-annual');
  const [projectName, setProjectName] = useState('');
  const [upgradeDate, setUpgradeDate] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');

  // In a real implementation, these would come from actual data sources
  // For now, we'll provide a UI that allows users to configure the report
  const handleGenerate = async () => {
    if (!projectName || !upgradeDate) {
      toast({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide project name and upgrade date.',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Generate periods for comparison
      const upgradeDateObj = new Date(upgradeDate);
      const periods = generateComparisonPeriods(upgradeDateObj, timePeriod, 12);

      // In a real implementation, you would fetch baseline and post-upgrade data
      // For now, we'll create sample comparison data structure
      // This would typically come from your data store/API
      const comparisons: MVComparisonData[] = periods.map((period) => {
        // Sample data - in production, this would come from actual interval data
        const baselineEnergy = Math.random() * 100000 + 50000;
        const postUpgradeEnergy = baselineEnergy * (1 - Math.random() * 0.2 - 0.1); // 10-30% reduction
        const baselineDemand = Math.random() * 500 + 200;
        const postUpgradeDemand = baselineDemand * (1 - Math.random() * 0.15 - 0.05); // 5-20% reduction
        const baselineCost = baselineEnergy * 0.12; // Sample rate
        const postUpgradeCost = postUpgradeEnergy * 0.12;

        return calculateMVComparison(
          // Baseline data (sample - would come from actual data)
          Array.from({ length: 100 }, (_, i) => ({
            timestamp: new Date(period.start.getTime() + i * 86400000),
            energy: baselineEnergy / 100,
            demand: baselineDemand + Math.random() * 50,
            cost: baselineCost / 100,
          })),
          // Post-upgrade data (sample - would come from actual data)
          Array.from({ length: 100 }, (_, i) => ({
            timestamp: new Date(period.start.getTime() + i * 86400000),
            energy: postUpgradeEnergy / 100,
            demand: postUpgradeDemand + Math.random() * 50,
            cost: postUpgradeCost / 100,
          })),
          period.start,
          period.end
        );
      });

      const summary = calculateMVSummary(comparisons);

      const reportData: MVReportData = {
        title: `M&V Report - ${projectName}`,
        project: {
          projectId: 'sample-project-id',
          projectName,
          upgradeDate: upgradeDateObj,
          building: buildingName || buildingAddress
            ? {
                name: buildingName,
                address: buildingAddress,
                squareFootage: 0, // Would come from actual data
                buildingType: 'Commercial', // Would come from actual data
              }
            : undefined,
        },
        timePeriod,
        comparisons,
        summary,
        metadata: {
          generatedAt: new Date().toLocaleString(),
        },
      };

      await generateMVReport(reportData, format);

      toast({
        type: 'success',
        title: 'Report Generated',
        message: 'M&V report has been generated successfully.',
      });
    } catch (error) {
      console.error('Error generating M&V report:', error);
      toast({
        type: 'error',
        title: 'Generation Failed',
        message: 'Failed to generate M&V report. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Measurement & Verification Report</h1>
        <p className="text-gray-600">
          Generate comprehensive M&V reports comparing project performance before and after upgrades
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
        <div className="space-y-6">
          {/* Project Information */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Project Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upgrade Date *
                </label>
                <input
                  type="date"
                  value={upgradeDate}
                  onChange={(e) => setUpgradeDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building Name
                </label>
                <input
                  type="text"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter building name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building Address
                </label>
                <input
                  type="text"
                  value={buildingAddress}
                  onChange={(e) => setBuildingAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter building address"
                />
              </div>
            </div>
          </div>

          {/* Time Period Selection */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Comparison Period
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Select the time period for comparisons. Reports will compare baseline (before upgrade) vs post-upgrade performance.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(['monthly', 'quarterly', 'bi-annual', 'yearly'] as MVTimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    timePeriod === period
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 capitalize mb-1">
                    {period === 'bi-annual' ? 'Bi-Annual' : period.charAt(0).toUpperCase() + period.slice(1)}
                  </p>
                  <p className="text-xs text-gray-600">
                    {period === 'monthly' && 'Month over month'}
                    {period === 'quarterly' && 'Quarterly comparisons'}
                    {period === 'bi-annual' && 'Every 6 months'}
                    {period === 'yearly' && 'Annual comparisons'}
                  </p>
                  {timePeriod === period && (
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-2 mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Export Format</h2>
            <div className="grid grid-cols-3 gap-4">
              {(['pdf', 'excel', 'word'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    format === fmt
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-900 capitalize">{fmt}</p>
                  {format === fmt && (
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-2 mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              About M&V Reports
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                Measurement and Verification (M&V) reports compare project performance before and after upgrades.
                These reports are essential for:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Proving energy savings to utilities and stakeholders</li>
                <li>Meeting regulatory requirements (e.g., utility incentive programs)</li>
                <li>Tracking ongoing project performance</li>
                <li>Identifying optimization opportunities</li>
              </ul>
              <p className="mt-2">
                <strong>Note:</strong> In production, baseline and post-upgrade data would be loaded from your
                interval data sources. This interface allows you to configure and generate reports once data is available.
              </p>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !projectName || !upgradeDate}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
                isGenerating || !projectName || !upgradeDate
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Generating Report...
                </>
              ) : (
                <>
                  <Download className="w-6 h-6" />
                  Generate M&V Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
