import { Save, X } from 'lucide-react';

const SaveBar = ({
  onSave,
  onCancel,
  loading = false,
  hasChanges = false,
  className = ''
}) => {
  if (!hasChanges) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 ${className}`}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You have unsaved changes
        </p>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="inline-flex items-center px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveBar;
