import { useState } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  error,
  helpText,
  placeholder = 'Select an option',
  disabled = false,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = value !== '' && value !== null && value !== undefined;
  const hasError = error && isFocused;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Select Container */}
      <div className="relative">
        <select
          name={name}
          value={value || ''}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          className={`
            w-full px-4 py-2.5 border rounded-lg transition-all duration-200 appearance-none
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${disabled ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' : 'bg-white dark:bg-gray-700'}
            ${hasError
              ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500 focus:border-primary-500'
            }
            text-gray-900 dark:text-white
            pr-10
          `}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom Arrow Icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <ChevronDown className="h-5 w-5 text-gray-400" />
        </div>
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

export default SelectField;
