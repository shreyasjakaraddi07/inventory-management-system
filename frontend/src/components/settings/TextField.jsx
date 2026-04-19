import { useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const TextField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helpText,
  tooltip,
  icon: Icon,
  maxLength,
  disabled = false,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const hasValue = value !== '' && value !== null && value !== undefined;
  const isValid = !error && hasValue && isFocused;
  const hasError = error && isFocused;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
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
              <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg z-50">
                {tooltip}
                <div className="absolute top-full right-4 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-800"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Container */}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <input
          type={type}
          name={name}
          value={value || ''}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 border rounded-lg transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${Icon ? 'pl-10' : ''}
            ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}
            ${hasError
              ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
              : isValid
              ? 'border-green-300 dark:border-green-600 focus:ring-green-500 focus:border-green-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500'
            }
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
          `}
        />

        {/* Validation Icon */}
        {isValid && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      {/* Help Text */}
      {!hasError && helpText && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default TextField;
