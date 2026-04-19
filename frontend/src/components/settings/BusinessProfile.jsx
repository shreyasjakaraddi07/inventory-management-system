import { useState, useEffect } from 'react';
import { Building2, Mail, Phone, MapPin, Globe, Upload, X } from 'lucide-react';
import TextField from './TextField';
import SelectField from './SelectField';
import Toggle from './Toggle';

// Indian state codes
const INDIAN_STATES = [
  { value: '01', label: 'Jammu and Kashmir' },
  { value: '02', label: 'Himachal Pradesh' },
  { value: '03', label: 'Punjab' },
  { value: '04', label: 'Chandigarh' },
  { value: '05', label: 'Uttarakhand' },
  { value: '06', label: 'Haryana' },
  { value: '07', label: 'Delhi' },
  { value: '08', label: 'Rajasthan' },
  { value: '09', label: 'Uttar Pradesh' },
  { value: '10', label: 'Bihar' },
  { value: '11', label: 'Sikkim' },
  { value: '12', label: 'Arunachal Pradesh' },
  { value: '13', label: 'Nagaland' },
  { value: '14', label: 'Manipur' },
  { value: '15', label: 'Mizoram' },
  { value: '16', label: 'Tripura' },
  { value: '17', label: 'Meghalaya' },
  { value: '18', label: 'Assam' },
  { value: '19', label: 'West Bengal' },
  { value: '20', label: 'Jharkhand' },
  { value: '21', label: 'Odisha' },
  { value: '22', label: 'Chhattisgarh' },
  { value: '23', label: 'Madhya Pradesh' },
  { value: '24', label: 'Gujarat' },
  { value: '25', label: 'Daman and Diu' },
  { value: '26', label: 'Dadra and Nagar Haveli' },
  { value: '27', label: 'Maharashtra' },
  { value: '28', label: 'Andhra Pradesh' },
  { value: '29', label: 'Karnataka' },
  { value: '30', label: 'Goa' },
  { value: '31', label: 'Lakshadweep' },
  { value: '32', label: 'Kerala' },
  { value: '33', label: 'Tamil Nadu' },
  { value: '34', label: 'Puducherry' },
  { value: '35', label: 'Andaman and Nicobar Islands' },
  { value: '36', label: 'Telangana' },
  { value: '37', label: 'Andhra Pradesh (New)' }
];

const BUSINESS_TYPES = [
  { value: 'proprietorship', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
  { value: 'private_ltd', label: 'Private Limited Company' },
  { value: 'public_ltd', label: 'Public Limited Company' },
  { value: 'ngo', label: 'NGO / Non-Profit' }
];

// GSTIN validation regex
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;
const PHONE_REGEX = /^[0-9]{10}$/;

const BusinessProfile = ({ settings, onChange, onSave, loading }) => {
  const [errors, setErrors] = useState({});
  const [logoPreview, setLogoPreview] = useState(settings.logo || null);

  // Sync logoPreview when settings change (e.g., after load from backend)
  useEffect(() => {
    setLogoPreview(settings.logo || null);
  }, [settings.logo]);

  const handleChange = (field, value) => {
    console.log(`✏️ Field changed: ${field} =`, value);
    onChange(field, value);

    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-detect state from GSTIN
    if (field === 'gstin' && value.length >= 2) {
      const stateCode = value.substring(0, 2);
      const state = INDIAN_STATES.find(s => s.value === stateCode);
      if (state && !settings.state) {
        onChange('state', state.value);
      }
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'File size must be less than 2MB' }));
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      setErrors(prev => ({ ...prev, logo: 'Only PNG, JPG, and SVG files are allowed' }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      onChange('logo', reader.result);
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    onChange('logo', null);
    setHasChanges(true);
  };

  const validate = () => {
    const newErrors = {};

    if (!settings.businessName || settings.businessName.trim().length < 2) {
      newErrors.businessName = 'Business name must be at least 2 characters';
    }

    if (settings.gstin && !GSTIN_REGEX.test(settings.gstin)) {
      newErrors.gstin = 'Invalid GSTIN format. Example: 27AABCU9603R1ZX';
    }

    if (settings.pan && !PAN_REGEX.test(settings.pan)) {
      newErrors.pan = 'Invalid PAN format. Example: AABCU9603R';
    }

    if (settings.pincode && !PINCODE_REGEX.test(settings.pincode)) {
      newErrors.pincode = 'PIN code must be 6 digits';
    }

    if (settings.phone && !PHONE_REGEX.test(settings.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log('🔘 Save button clicked in BusinessProfile');
    if (!validate()) {
      console.log('❌ Validation failed, not saving');
      return;
    }
    console.log('✅ Validation passed, calling onSave...');
    await onSave();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Profile</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your business information and GST details</p>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Business Logo</h3>
        <div className="flex items-center gap-6">
          {logoPreview ? (
            <div className="relative">
              <img
                src={logoPreview}
                alt="Business Logo"
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-white dark:bg-gray-700">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
          )}
          
          <div className="flex-1">
            <label className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              Upload Logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              PNG, JPG or SVG. Max 2MB. Recommended: 400x400px
            </p>
            {errors.logo && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.logo}</p>
            )}
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TextField
          label="Business Name"
          name="businessName"
          value={settings.businessName}
          onChange={(e) => handleChange('businessName', e.target.value)}
          placeholder="Your Business Name Pvt Ltd"
          required
          error={errors.businessName}
          tooltip="Your registered legal business name"
        />

        <TextField
          label="Trade Name"
          name="tradeName"
          value={settings.tradeName}
          onChange={(e) => handleChange('tradeName', e.target.value)}
          placeholder="Trading As (if different)"
          tooltip="Name displayed on invoices if different from legal name"
        />

        <SelectField
          label="Business Type"
          name="businessType"
          value={settings.businessType}
          onChange={(e) => handleChange('businessType', e.target.value)}
          options={BUSINESS_TYPES}
          helpText="Affects liability and compliance requirements"
        />

        <TextField
          label="GSTIN"
          name="gstin"
          value={settings.gstin}
          onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
          placeholder="27AABCU9603R1ZX"
          maxLength={15}
          error={errors.gstin}
          tooltip="15-digit Goods and Services Tax Identification Number. First 2 digits represent state code."
          className="font-mono"
        />

        <TextField
          label="PAN Number"
          name="pan"
          value={settings.pan}
          onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
          placeholder="AABCU9603R"
          maxLength={10}
          error={errors.pan}
          className="font-mono"
        />

        <TextField
          label="Contact Email"
          name="email"
          type="email"
          value={settings.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="contact@business.com"
          icon={Mail}
          error={errors.email}
        />

        <TextField
          label="Contact Phone"
          name="phone"
          type="tel"
          value={settings.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="9876543210"
          icon={Phone}
          maxLength={10}
          error={errors.phone}
        />

        <TextField
          label="Website"
          name="website"
          type="url"
          value={settings.website}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="www.yourbusiness.com"
          icon={Globe}
        />
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Registered Address
        </h3>

        <TextField
          label="Address"
          name="address"
          value={settings.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Full street address"
          className="md:col-span-2"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TextField
            label="City"
            name="city"
            value={settings.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Mumbai"
          />

          <SelectField
            label="State"
            name="state"
            value={settings.state}
            onChange={(e) => handleChange('state', e.target.value)}
            options={INDIAN_STATES}
            placeholder="Select state"
          />

          <TextField
            label="PIN Code"
            name="pincode"
            value={settings.pincode}
            onChange={(e) => handleChange('pincode', e.target.value)}
            placeholder="400001"
            maxLength={6}
            error={errors.pincode}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
          }}
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
          ) : 'Save Business Profile'}
        </button>
      </div>
    </div>
  );
};

export default BusinessProfile;
