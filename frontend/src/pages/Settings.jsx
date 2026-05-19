import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  Building2, 
  User, 
  Bell, 
  Percent,
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Users
} from 'lucide-react';
import axios from 'axios';
import BusinessProfile from '../components/settings/BusinessProfile';
import TaxSettings from '../components/settings/TaxSettings';
import InvoiceSettings from '../components/settings/InvoiceSettings';
import NotificationSettings from '../components/settings/NotificationSettings';
import StaffManagement from '../components/settings/StaffManagement';

const API = 'http://localhost:8080/api';

const Settings = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('business');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Consolidated Settings State
  const [settings, setSettings] = useState({
    // Business
    businessName: '',
    tradeName: '',
    businessType: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    logo: null,
    
    // Tax
    defaultGSTRate: 18,
    enableIGST: true,
    enableRoundOff: true,
    reverseCharge: false,
    tdsEnabled: false,
    tdsRate: 0,
    filingFrequency: 'monthly',
    roundingMethod: '2_decimals',
    pricingType: 'exclusive',
    ewayBillEnabled: false,
    ewayBillThreshold: 50000,
    ewayBillValidity: 100,
    
    // Invoice
    invoicePrefix: 'INV-',
    purchasePrefix: 'PUR-',
    creditNotePrefix: 'CN-',
    debitNotePrefix: 'DN-',
    invoiceSuffix: '',
    startingNumber: 1,
    fyReset: false,
    showHSN: true,
    showGSTBreakup: true,
    showDiscount: false,
    showDescription: true,
    showBatchExpiry: false,
    printLogo: true,
    digitalSignature: false,
    invoiceTerms: '',
    footerNotes: '',
    
    // Notifications
    lowStockAlert: true,
    lowStockThreshold: 10,
    lowStockEmail: true,
    lowStockSMS: false,
    lowStockInApp: true,
    lowStockFrequency: 'realtime',
    paymentReminders: true,
    reminder7Days: true,
    reminder3Days: true,
    reminder1Day: false,
    overdue1Day: true,
    overdue7Days: true,
    gstFilingReminder: true,
    gstReminder7Days: true,
    gstReminder3Days: true,
    gstReminder1Day: true,
    emailNotifications: true,
    smsNotifications: false,
    desktopNotifications: false,
    quietHoursEnabled: false,
    quietHoursFrom: '22:00',
    quietHoursTo: '08:00'
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  // Warn user before navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      const response = await axios.get(`${API}/settings`, config);
      console.log('Settings loaded:', response.data);
      
      if (response.data) {
        const { business, tax, invoice, notifications } = response.data;
        
        setSettings(prev => ({
          ...prev,
          // Business - extract fields explicitly instead of spreading
          businessName: business?.businessName || '',
          tradeName: business?.tradeName || '',
          businessType: business?.businessType || '',
          gstin: business?.gstin || '',
          pan: business?.pan || '',
          address: business?.address || '',
          city: business?.city || '',
          state: business?.state || '',
          pincode: business?.pincode || '',
          phone: business?.phone || '',
          email: business?.email || '',
          website: business?.website || '',
          logo: business?.logo || null,
          // Tax
          defaultGSTRate: tax?.defaultGSTRate ? Number(tax.defaultGSTRate) : 18,
          enableIGST: tax?.enableIGST === true || tax?.enableIGST === 'true',
          enableRoundOff: tax?.enableRoundOff === true || tax?.enableRoundOff === 'true',
          reverseCharge: tax?.reverseCharge === true || tax?.reverseCharge === 'true',
          tdsEnabled: tax?.tdsEnabled === true || tax?.tdsEnabled === 'true',
          tdsRate: tax?.tdsRate ? Number(tax.tdsRate) : 0,
          filingFrequency: tax?.filingFrequency || 'monthly',
          roundingMethod: tax?.roundingMethod || '2_decimals',
          pricingType: tax?.pricingType || 'exclusive',
          ewayBillEnabled: tax?.ewayBillEnabled === true || tax?.ewayBillEnabled === 'true',
          ewayBillThreshold: tax?.ewayBillThreshold ? Number(tax.ewayBillThreshold) : 50000,
          ewayBillValidity: tax?.ewayBillValidity ? Number(tax.ewayBillValidity) : 100,
          // Invoice
          invoicePrefix: invoice?.invoicePrefix || 'INV-',
          purchasePrefix: invoice?.purchasePrefix || 'PUR-',
          creditNotePrefix: invoice?.creditNotePrefix || 'CN-',
          debitNotePrefix: invoice?.debitNotePrefix || 'DN-',
          invoiceSuffix: invoice?.invoiceSuffix || '',
          startingNumber: invoice?.startingNumber ? Number(invoice.startingNumber) : 1,
          fyReset: invoice?.fyReset === true || invoice?.fyReset === 'true',
          showHSN: invoice?.showHSN === true || invoice?.showHSN === 'true',
          showGSTBreakup: invoice?.showGSTBreakup === true || invoice?.showGSTBreakup === 'true',
          showDiscount: invoice?.showDiscount === true || invoice?.showDiscount === 'true',
          showDescription: invoice?.showDescription === true || invoice?.showDescription === 'true',
          showBatchExpiry: invoice?.showBatchExpiry === true || invoice?.showBatchExpiry === 'true',
          printLogo: invoice?.printLogo === true || invoice?.printLogo === 'true',
          digitalSignature: invoice?.digitalSignature === true || invoice?.digitalSignature === 'true',
          invoiceTerms: invoice?.invoiceTerms || '',
          footerNotes: invoice?.footerNotes || '',
          // Notifications
          lowStockAlert: notifications?.lowStockAlert === true || notifications?.lowStockAlert === 'true',
          lowStockThreshold: notifications?.lowStockThreshold ? Number(notifications.lowStockThreshold) : 10,
          lowStockEmail: notifications?.lowStockEmail === true || notifications?.lowStockEmail === 'true',
          lowStockSMS: notifications?.lowStockSMS === true || notifications?.lowStockSMS === 'true',
          lowStockInApp: notifications?.lowStockInApp === true || notifications?.lowStockInApp === 'true',
          lowStockFrequency: notifications?.lowStockFrequency || 'realtime',
          paymentReminders: notifications?.paymentReminders === true || notifications?.paymentReminders === 'true',
          reminder7Days: notifications?.reminder7Days === true || notifications?.reminder7Days === 'true',
          reminder3Days: notifications?.reminder3Days === true || notifications?.reminder3Days === 'true',
          reminder1Day: notifications?.reminder1Day === true || notifications?.reminder1Day === 'true',
          overdue1Day: notifications?.overdue1Day === true || notifications?.overdue1Day === 'true',
          overdue7Days: notifications?.overdue7Days === true || notifications?.overdue7Days === 'true',
          gstFilingReminder: notifications?.gstFilingReminder === true || notifications?.gstFilingReminder === 'true',
          gstReminder7Days: notifications?.gstReminder7Days === true || notifications?.gstReminder7Days === 'true',
          gstReminder3Days: notifications?.gstReminder3Days === true || notifications?.gstReminder3Days === 'true',
          gstReminder1Day: notifications?.gstReminder1Day === true || notifications?.gstReminder1Day === 'true',
          emailNotifications: notifications?.emailNotifications === true || notifications?.emailNotifications === 'true',
          smsNotifications: notifications?.smsNotifications === true || notifications?.smsNotifications === 'true',
          desktopNotifications: notifications?.desktopNotifications === true || notifications?.desktopNotifications === 'true',
          quietHoursEnabled: notifications?.quietHoursEnabled === true || notifications?.quietHoursEnabled === 'true',
          quietHoursFrom: notifications?.quietHoursFrom || '22:00',
          quietHoursTo: notifications?.quietHoursTo || '08:00'
        }));
        setHasUnsavedChanges(false);
        setSettingsLoaded(true);
      }
    } catch (err) {
      console.log('Settings not found, using defaults', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const saveSettings = async (section, data) => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      console.log(`💾 Attempting to save ${section} settings:`, data);
      const config = { headers: { Authorization: `Bearer ${user?.token}` } };
      
      // Use POST to upsert settings (backend does UPSERT via UPDATE+INSERT)
      const response = await axios.post(`${API}/settings/${section}`, data, config);
      console.log(`✅ Backend response:`, response.data);
      
      setSuccess(`${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
      setHasUnsavedChanges(false);
      
      // Reload from backend to confirm persistence
      await loadSettings();
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error(`❌ Error saving ${section} settings:`, err);
      
      // Show specific error messages
      let errorMsg = 'Failed to save settings';
      if (err.response?.status === 400) {
        errorMsg = err.response.data?.message || 'Validation error - check your input';
      } else if (err.response?.status === 401) {
        errorMsg = 'Session expired. Please log in again.';
      } else if (err.response?.status === 500) {
        errorMsg = `Server error: ${err.response.data?.details || 'Database error. Check server logs.'}`;
      } else if (!err.response) {
        errorMsg = 'Network error - cannot reach server. Is the backend running?';
      }
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Section-specific save handlers
  const handleSaveBusiness = async () => {
    const businessData = {
      businessName: settings.businessName,
      tradeName: settings.tradeName,
      businessType: settings.businessType,
      gstin: settings.gstin,
      pan: settings.pan,
      address: settings.address,
      city: settings.city,
      state: settings.state,
      pincode: settings.pincode,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      logo: settings.logo
    };
    await saveSettings('business', businessData);
  };

  const handleSaveTax = async () => {
    const taxData = {
      defaultGSTRate: settings.defaultGSTRate,
      enableIGST: settings.enableIGST,
      enableRoundOff: settings.enableRoundOff,
      reverseCharge: settings.reverseCharge,
      tdsEnabled: settings.tdsEnabled,
      tdsRate: settings.tdsRate,
      filingFrequency: settings.filingFrequency,
      roundingMethod: settings.roundingMethod,
      pricingType: settings.pricingType,
      ewayBillEnabled: settings.ewayBillEnabled,
      ewayBillThreshold: settings.ewayBillThreshold,
      ewayBillValidity: settings.ewayBillValidity
    };
    await saveSettings('tax', taxData);
  };

  const handleSaveInvoice = async () => {
    const invoiceData = {
      invoicePrefix: settings.invoicePrefix,
      purchasePrefix: settings.purchasePrefix,
      creditNotePrefix: settings.creditNotePrefix,
      debitNotePrefix: settings.debitNotePrefix,
      invoiceSuffix: settings.invoiceSuffix,
      startingNumber: settings.startingNumber,
      fyReset: settings.fyReset,
      showHSN: settings.showHSN,
      showGSTBreakup: settings.showGSTBreakup,
      showDiscount: settings.showDiscount,
      showDescription: settings.showDescription,
      showBatchExpiry: settings.showBatchExpiry,
      printLogo: settings.printLogo,
      digitalSignature: settings.digitalSignature,
      invoiceTerms: settings.invoiceTerms,
      footerNotes: settings.footerNotes
    };
    await saveSettings('invoice', invoiceData);
  };

  const handleSaveNotifications = async () => {
    const notificationData = {
      lowStockAlert: settings.lowStockAlert,
      lowStockThreshold: settings.lowStockThreshold,
      lowStockEmail: settings.lowStockEmail,
      lowStockSMS: settings.lowStockSMS,
      lowStockInApp: settings.lowStockInApp,
      lowStockFrequency: settings.lowStockFrequency,
      paymentReminders: settings.paymentReminders,
      reminder7Days: settings.reminder7Days,
      reminder3Days: settings.reminder3Days,
      reminder1Day: settings.reminder1Day,
      overdue1Day: settings.overdue1Day,
      overdue7Days: settings.overdue7Days,
      gstFilingReminder: settings.gstFilingReminder,
      gstReminder7Days: settings.gstReminder7Days,
      gstReminder3Days: settings.gstReminder3Days,
      gstReminder1Day: settings.gstReminder1Day,
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      desktopNotifications: settings.desktopNotifications,
      quietHoursEnabled: settings.quietHoursEnabled,
      quietHoursFrom: settings.quietHoursFrom,
      quietHoursTo: settings.quietHoursTo
    };
    await saveSettings('notifications', notificationData);
  };

  // Universal change handler
  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  const tabs = [
    { id: 'business', label: 'Business Profile', icon: Building2 },
    { id: 'tax', label: 'Tax & GST', icon: Percent },
    { id: 'invoice', label: 'Invoice Settings', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'staff', label: 'Staff Management', icon: Users }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'business':
        return (
          <BusinessProfile
            settings={settings}
            onChange={handleSettingChange}
            onSave={handleSaveBusiness}
            loading={saving}
          />
        );
      case 'tax':
        return (
          <TaxSettings
            settings={settings}
            onChange={handleSettingChange}
            onSave={handleSaveTax}
            loading={saving}
          />
        );
      case 'invoice':
        return (
          <InvoiceSettings
            settings={settings}
            onChange={handleSettingChange}
            onSave={handleSaveInvoice}
            loading={saving}
          />
        );
      case 'notifications':
        return (
          <NotificationSettings
            settings={settings}
            onChange={handleSettingChange}
            onSave={handleSaveNotifications}
            loading={saving}
          />
        );
      case 'staff':
        return (
          <StaffManagement
            user={user}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your business profile, tax settings, and preferences</p>
        </div>
        
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Search className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-800 dark:text-emerald-200">{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          <span className="text-rose-800 dark:text-rose-200">{error}</span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <nav className="space-y-1 sticky top-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
