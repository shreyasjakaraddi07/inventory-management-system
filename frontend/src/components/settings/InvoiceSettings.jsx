import { useState } from 'react';
import { FileText, Eye, Palette } from 'lucide-react';
import TextField from './TextField';
import Toggle from './Toggle';

const InvoiceSettings = ({ settings, onChange, onSave, loading }) => {
  const [showPreview, setShowPreview] = useState(false);

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
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Invoice Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure invoice format, numbering, and templates</p>
        </div>
      </div>

      {/* Invoice Numbering */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Invoice Numbering</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextField
            label="Sales Invoice Prefix"
            name="invoicePrefix"
            value={settings.invoicePrefix || 'INV-'}
            onChange={(e) => handleChange('invoicePrefix', e.target.value)}
            placeholder="INV-"
            helpText="Example: INV-2024-0001"
          />

          <TextField
            label="Purchase Invoice Prefix"
            name="purchasePrefix"
            value={settings.purchasePrefix || 'PUR-'}
            onChange={(e) => handleChange('purchasePrefix', e.target.value)}
            placeholder="PUR-"
          />

          <TextField
            label="Credit Note Prefix"
            name="creditNotePrefix"
            value={settings.creditNotePrefix || 'CN-'}
            onChange={(e) => handleChange('creditNotePrefix', e.target.value)}
            placeholder="CN-"
          />

          <TextField
            label="Debit Note Prefix"
            name="debitNotePrefix"
            value={settings.debitNotePrefix || 'DN-'}
            onChange={(e) => handleChange('debitNotePrefix', e.target.value)}
            placeholder="DN-"
          />

          <TextField
            label="Invoice Suffix"
            name="invoiceSuffix"
            value={settings.invoiceSuffix || ''}
            onChange={(e) => handleChange('invoiceSuffix', e.target.value)}
            placeholder="/2024-25"
            helpText="Added at the end of invoice number"
          />

          <TextField
            label="Starting Number"
            name="startingNumber"
            type="number"
            value={settings.startingNumber || 1}
            onChange={(e) => handleChange('startingNumber', parseInt(e.target.value))}
            placeholder="1"
            min={1}
          />
        </div>

        <div className="mt-4">
          <Toggle
            label="Financial Year Reset"
            description="Auto-reset numbering each financial year"
            checked={settings.fyReset === true}
            onChange={(value) => handleChange('fyReset', value)}
            tooltip="Invoice numbers will reset to starting number at the beginning of each FY (April 1st)"
          />
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Invoice Content</h3>
        
        <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
          <Toggle
            label="Show HSN/SAC Code"
            description="Display HSN codes on invoices"
            checked={settings.showHSN !== false}
            onChange={(value) => handleChange('showHSN', value)}
          />

          <Toggle
            label="Show GST Breakup"
            description="Display CGST/SGST/IGST separately"
            checked={settings.showGSTBreakup !== false}
            onChange={(value) => handleChange('showGSTBreakup', value)}
          />

          <Toggle
            label="Show Discount Column"
            description="Include discount field on invoices"
            checked={settings.showDiscount === true}
            onChange={(value) => handleChange('showDiscount', value)}
          />

          <Toggle
            label="Show Item Description"
            description="Display product descriptions"
            checked={settings.showDescription !== false}
            onChange={(value) => handleChange('showDescription', value)}
          />

          <Toggle
            label="Show Batch/Expiry Details"
            description="For pharmaceutical and FMCG products"
            checked={settings.showBatchExpiry === true}
            onChange={(value) => handleChange('showBatchExpiry', value)}
          />

          <Toggle
            label="Print Business Logo"
            description="Include your business logo on invoices"
            checked={settings.printLogo !== false}
            onChange={(value) => handleChange('printLogo', value)}
          />

          <Toggle
            label="Enable Digital Signature"
            description="Add digital signature to invoices"
            checked={settings.digitalSignature === true}
            onChange={(value) => handleChange('digitalSignature', value)}
          />
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Terms & Conditions</h3>
        
        <div className="space-y-4">
          <textarea
            value={settings.invoiceTerms || ''}
            onChange={(e) => handleChange('invoiceTerms', e.target.value)}
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            placeholder="Enter default terms and conditions for invoices..."
          />
          
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleChange('invoiceTerms', 'Goods once sold cannot be returned or exchanged.')}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              + No Return Policy
            </button>
            <button
              type="button"
              onClick={() => handleChange('invoiceTerms', 'Payment is due within 30 days of invoice date. Late payments may attract interest @ 18% per annum.')}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              + Payment Terms
            </button>
            <button
              type="button"
              onClick={() => handleChange('invoiceTerms', 'All disputes are subject to Mumbai jurisdiction only.')}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              + Jurisdiction Clause
            </button>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Footer Notes</h3>
        
        <textarea
          value={settings.footerNotes || ''}
          onChange={(e) => handleChange('footerNotes', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
          placeholder="Thank you for your business!&#10;Bank Details: XYZ Bank, A/C: 1234567890, IFSC: XYZ0001234"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Displayed at the bottom of invoices. Use for bank details, UPI ID, or thank you messages.
        </p>
      </div>

      {/* Preview Button */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>

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
          ) : 'Save Invoice Settings'}
        </button>
      </div>

      {/* Invoice Preview */}
      {showPreview && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Invoice Preview
          </h3>
          
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-900">
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <h4 className="font-bold text-lg">{settings.businessName || 'Your Business Name'}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{settings.address || 'Business Address'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">GSTIN: {settings.gstin || 'XXXXXXXXXXXXXXX'}</p>
                </div>
                <div className="text-right">
                  <h5 className="font-semibold">TAX INVOICE</h5>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{settings.invoicePrefix || 'INV-'}2024-0001</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                <p className="text-sm font-semibold">Bill To:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer Name</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer Address</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">GSTIN: XXXXXXXXXXXXXXX</p>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-600">
                    <th className="text-left py-2">#</th>
                    <th className="text-left py-2">Item</th>
                    {settings.showHSN && <th className="text-left py-2">HSN</th>}
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2">1</td>
                    <td className="py-2">Sample Product</td>
                    {settings.showHSN && <td className="py-2">999999</td>}
                    <td className="py-2 text-right">10</td>
                    <td className="py-2 text-right">₹100.00</td>
                    <td className="py-2 text-right">₹1,000.00</td>
                  </tr>
                </tbody>
              </table>

              {settings.showGSTBreakup && (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>₹1,000.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST (9%):</span>
                    <span>₹90.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (9%):</span>
                    <span>₹90.00</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t border-gray-300 dark:border-gray-600 pt-2">
                    <span>Total:</span>
                    <span>₹1,180.00</span>
                  </div>
                </div>
              )}

              {settings.invoiceTerms && (
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                  <p className="text-xs font-semibold mb-1">Terms & Conditions:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{settings.invoiceTerms}</p>
                </div>
              )}

              {settings.footerNotes && (
                <div className="text-center text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-600 pt-4">
                  {settings.footerNotes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceSettings;
