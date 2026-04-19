import { Percent, Calculator, Info } from 'lucide-react';
import SelectField from './SelectField';
import Toggle from './Toggle';
import TextField from './TextField';

const GST_RATES = [
  { value: 0, label: '0% (Nil Rated)' },
  { value: 5, label: '5%' },
  { value: 12, label: '12%' },
  { value: 18, label: '18%' },
  { value: 28, label: '28%' }
];

const TaxSettings = ({ settings, onChange, onSave, loading }) => {
  const handleChange = (field, value) => {
    onChange(field, value);
  };

  const handleSave = async () => {
    await onSave();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Percent className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tax & GST Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure GST rates, HSN codes, and tax calculation rules</p>
        </div>
      </div>

      {/* Default GST Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Default GST Configuration
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SelectField
            label="Default GST Rate"
            name="defaultGSTRate"
            value={settings.defaultGSTRate}
            onChange={(e) => handleChange('defaultGSTRate', parseInt(e.target.value))}
            options={GST_RATES}
            helpText="Applied to new products by default"
          />

          <SelectField
            label="GST Filing Frequency"
            name="filingFrequency"
            value={settings.filingFrequency || 'monthly'}
            onChange={(e) => handleChange('filingFrequency', e.target.value)}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly (QRMP Scheme)' }
            ]}
            tooltip="QRMP (Quarterly Return Monthly Payment) scheme allows small taxpayers to file returns quarterly"
          />
        </div>
      </div>

      {/* Tax Calculation Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tax Calculation Rules</h3>
        
        <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          <Toggle
            label="Enable IGST for inter-state transactions"
            description="Automatically apply IGST when customer/supplier is in different state"
            checked={settings.enableIGST !== false}
            onChange={(value) => handleChange('enableIGST', value)}
            tooltip="IGST (Integrated GST) applies to inter-state supplies. CGST+SGST applies to intra-state supplies."
          />

          <Toggle
            label="Enable round off for invoice totals"
            description="Round invoice totals to nearest rupee"
            checked={settings.enableRoundOff !== false}
            onChange={(value) => handleChange('enableRoundOff', value)}
          />

          <Toggle
            label="Reverse Charge Mechanism (RCM)"
            description="Recipient pays GST instead of supplier"
            checked={settings.reverseCharge === true}
            onChange={(value) => handleChange('reverseCharge', value)}
            tooltip="Under RCM, the recipient of goods/services is liable to pay GST. Applicable for specific categories as per GST law."
          />

          <Toggle
            label="Enable TDS (Tax Deducted at Source)"
            description="Deduct tax at source on specified transactions"
            checked={settings.tdsEnabled === true}
            onChange={(value) => handleChange('tdsEnabled', value)}
          />
        </div>

        {settings.tdsEnabled && (
          <div className="mt-4 pl-4 border-l-2 border-primary-500">
            <TextField
              label="TDS Rate (%)"
              name="tdsRate"
              type="number"
              value={settings.tdsRate || 0}
              onChange={(e) => handleChange('tdsRate', parseFloat(e.target.value))}
              placeholder="0"
              step="0.01"
              className="max-w-xs"
            />
          </div>
        )}
      </div>

      {/* GST Rounding Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">GST Rounding Rules</h3>
        
        <SelectField
          label="Rounding Method"
          name="roundingMethod"
          value={settings.roundingMethod || '2_decimals'}
          onChange={(e) => handleChange('roundingMethod', e.target.value)}
          options={[
            { value: '2_decimals', label: 'Round to 2 decimal places (Standard)' },
            { value: 'nearest_rupee', label: 'Round to nearest rupee' },
            { value: 'truncate', label: 'Truncate decimals (No rounding)' }
          ]}
          helpText="Choose how GST amounts are rounded on invoices"
        />
      </div>

      {/* Pricing Method */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Pricing Method</h3>
        
        <SelectField
          label="Default Pricing Type"
          name="pricingType"
          value={settings.pricingType || 'exclusive'}
          onChange={(e) => handleChange('pricingType', e.target.value)}
          options={[
            { value: 'exclusive', label: 'Tax Exclusive (Price + Tax)' },
            { value: 'inclusive', label: 'Tax Inclusive (Price includes Tax)' }
          ]}
          helpText="Can be overridden per transaction"
          tooltip="Tax Exclusive: ₹100 + 18% GST = ₹118. Tax Inclusive: ₹118 includes 18% GST (₹100 + ₹18)"
        />
      </div>

      {/* E-Invoice & E-Way Bill */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">E-Invoice & E-Way Bill</h3>
        
        <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          <Toggle
            label="Enable E-Way Bill Integration"
            description="Auto-generate e-way bills for goods movement"
            checked={settings.ewayBillEnabled === true}
            onChange={(value) => handleChange('ewayBillEnabled', value)}
            tooltip="Mandatory for inter-state movement of goods valued over ₹50,000"
          />
        </div>

        {settings.ewayBillEnabled && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 pl-4 border-l-2 border-primary-500">
            <TextField
              label="E-Way Bill Threshold (₹)"
              name="ewayBillThreshold"
              type="number"
              value={settings.ewayBillThreshold || 50000}
              onChange={(e) => handleChange('ewayBillThreshold', parseInt(e.target.value))}
              placeholder="50000"
              helpText="Auto-generate for invoices above this amount"
            />

            <TextField
              label="Default Validity (km)"
              name="ewayBillValidity"
              type="number"
              value={settings.ewayBillValidity || 100}
              onChange={(e) => handleChange('ewayBillValidity', parseInt(e.target.value))}
              placeholder="100"
              helpText="1 day for every 100 km"
            />
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex items-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : 'Save Tax Settings'}
        </button>
      </div>
    </div>
  );
};

export default TaxSettings;
