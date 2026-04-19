import { useState } from 'react';
import { Info } from 'lucide-react';

const Toggle = ({
  label,
  description,
  checked,
  onChange,
  tooltip,
  disabled = false,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`flex items-start justify-between py-3 ${className}`}>
      <div className="flex-1 mr-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            {label}
          </label>
          
          {tooltip && (
            <div className="relative">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Info className="w-4 h-4" />
              </button>
              
              {showTooltip && (
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50">
                  {tooltip}
                  <div className="absolute top-full left-4 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-800"></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
};

export default Toggle;
