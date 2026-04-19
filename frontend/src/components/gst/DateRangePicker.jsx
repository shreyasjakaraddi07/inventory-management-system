import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { getDefaultDateRange, getPreviousMonthRange, getCurrentQuarterRange, getFinancialYearRange } from '../../utils/gstHelpers';

const PRESETS = [
  { label: 'Current Month', value: 'current_month', fn: getDefaultDateRange },
  { label: 'Previous Month', value: 'previous_month', fn: getPreviousMonthRange },
  { label: 'Current Quarter', value: 'current_quarter', fn: getCurrentQuarterRange },
  { label: 'Financial Year', value: 'financial_year', fn: getFinancialYearRange }
];

const DateRangePicker = ({ value, onChange, className = '' }) => {
  const [showPresets, setShowPresets] = useState(false);
  const [localRange, setLocalRange] = useState(value || getDefaultDateRange());

  useEffect(() => {
    if (value) {
      setLocalRange(value);
    }
  }, [value]);

  const handlePresetClick = (preset) => {
    const range = preset.fn();
    setLocalRange(range);
    onChange?.(range);
    setShowPresets(false);
  };

  const handleDateChange = (field, dateValue) => {
    const newRange = { ...localRange, [field]: dateValue };
    setLocalRange(newRange);
    onChange?.(newRange);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800 dark:text-white">Date Range</h3>
        </div>
        
        {/* Preset Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Presets
            <ChevronDown className={`w-4 h-4 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>
          
          {showPresets && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={localRange.startDate}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={localRange.endDate}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
