import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import Toggle from './Toggle';
import TextField from './TextField';

const NotificationSettings = ({ settings, onChange, onSave, loading }) => {
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
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Notification Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure email, SMS, and in-app notifications</p>
        </div>
      </div>

      {/* Stock Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Stock Alerts
        </h3>
        
        <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          <Toggle
            label="Low Stock Alerts"
            description="Get notified when product stock falls below threshold"
            checked={settings.lowStockAlert !== false}
            onChange={(value) => handleChange('lowStockAlert', value)}
          />
        </div>

        {settings.lowStockAlert !== false && (
          <div className="mt-4 space-y-4 pl-4 border-l-2 border-primary-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TextField
                label="Default Low Stock Threshold"
                name="lowStockThreshold"
                type="number"
                value={settings.lowStockThreshold || 10}
                onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value))}
                placeholder="10"
                min={1}
                helpText="Alert when stock falls below this quantity"
              />

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notification Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.lowStockEmail !== false}
                      onChange={(e) => handleChange('lowStockEmail', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.lowStockSMS === true}
                      onChange={(e) => handleChange('lowStockSMS', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <MessageSquare className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">SMS</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.lowStockInApp !== false}
                      onChange={(e) => handleChange('lowStockInApp', e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <Bell className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">In-App</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alert Frequency
              </label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="lowStockFrequency"
                    value="realtime"
                    checked={settings.lowStockFrequency === 'realtime' || !settings.lowStockFrequency}
                    onChange={(e) => handleChange('lowStockFrequency', e.target.value)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Real-time</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="lowStockFrequency"
                    value="daily"
                    checked={settings.lowStockFrequency === 'daily'}
                    onChange={(e) => handleChange('lowStockFrequency', e.target.value)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Daily Digest</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="lowStockFrequency"
                    value="weekly"
                    checked={settings.lowStockFrequency === 'weekly'}
                    onChange={(e) => handleChange('lowStockFrequency', e.target.value)}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Weekly Summary</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Reminders */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Payment Reminders
        </h3>
        
        <Toggle
          label="Enable Payment Reminders"
          description="Send automated payment reminder emails to customers"
          checked={settings.paymentReminders !== false}
          onChange={(value) => handleChange('paymentReminders', value)}
        />

        {settings.paymentReminders !== false && (
          <div className="mt-4 space-y-4 pl-4 border-l-2 border-primary-500">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Send reminders before due date
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.reminder7Days === true}
                    onChange={(e) => handleChange('reminder7Days', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">7 days before</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.reminder3Days !== false}
                    onChange={(e) => handleChange('reminder3Days', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">3 days before</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.reminder1Day === true}
                    onChange={(e) => handleChange('reminder1Day', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">1 day before</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Send reminders after due date
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.overdue1Day === true}
                    onChange={(e) => handleChange('overdue1Day', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">1 day overdue</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.overdue7Days !== false}
                    onChange={(e) => handleChange('overdue7Days', e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">7 days overdue</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* GST Filing Reminders */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          GST Filing Reminders
        </h3>
        
        <Toggle
          label="GST Filing Deadline Reminders"
          description="Get notified before GST return due dates"
          checked={settings.gstFilingReminder !== false}
          onChange={(value) => handleChange('gstFilingReminder', value)}
        />

        {settings.gstFilingReminder !== false && (
          <div className="mt-4 space-y-3 pl-4 border-l-2 border-primary-500">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.gstReminder7Days !== false}
                onChange={(e) => handleChange('gstReminder7Days', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">7 days before due date</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.gstReminder3Days !== false}
                onChange={(e) => handleChange('gstReminder3Days', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">3 days before due date</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.gstReminder1Day !== false}
                onChange={(e) => handleChange('gstReminder1Day', e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">1 day before due date</span>
            </label>
          </div>
        )}
      </div>

      {/* Email & SMS Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Notification Channels
        </h3>
        
        <div className="space-y-4">
          <Toggle
            label="Email Notifications"
            description="Enable sending notifications via email"
            checked={settings.emailNotifications !== false}
            onChange={(value) => handleChange('emailNotifications', value)}
          />

          <Toggle
            label="SMS Notifications"
            description="Enable sending notifications via SMS (requires SMS gateway)"
            checked={settings.smsNotifications === true}
            onChange={(value) => handleChange('smsNotifications', value)}
            tooltip="SMS notifications require configuration of an SMS gateway API"
          />

          <Toggle
            label="Desktop Notifications"
            description="Show browser notifications when app is open"
            checked={settings.desktopNotifications === true}
            onChange={(value) => handleChange('desktopNotifications', value)}
          />
        </div>
      </div>

      {/* Do Not Disturb */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Do Not Disturb</h3>
        
        <Toggle
          label="Enable Quiet Hours"
          description="Suppress non-critical notifications during specified hours"
          checked={settings.quietHoursEnabled === true}
          onChange={(value) => handleChange('quietHoursEnabled', value)}
        />

        {settings.quietHoursEnabled && (
          <div className="mt-4 grid grid-cols-2 gap-6 pl-4 border-l-2 border-primary-500">
            <TextField
              label="From"
              name="quietHoursFrom"
              type="time"
              value={settings.quietHoursFrom || '22:00'}
              onChange={(e) => handleChange('quietHoursFrom', e.target.value)}
            />

            <TextField
              label="To"
              name="quietHoursTo"
              type="time"
              value={settings.quietHoursTo || '08:00'}
              onChange={(e) => handleChange('quietHoursTo', e.target.value)}
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
          ) : 'Save Notification Settings'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
