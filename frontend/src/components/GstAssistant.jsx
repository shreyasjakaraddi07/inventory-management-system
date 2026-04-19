import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, ChevronDown, Bot, User, Loader2 } from 'lucide-react';

// ── Knowledge base ─────────────────────────────────────────────────────────

const GST_KNOWLEDGE = {
  returns: {
    'gstr-1': 'GSTR-1 is the monthly/quarterly statement of outward supplies (sales). Traders with >₹5 Cr turnover file monthly; others can opt quarterly (QRMP). Deadline: 11th of next month (monthly) or 13th of month after quarter end.',
    'gstr-3b': 'GSTR-3B is the monthly self-assessed summary return. It reports net GST liability, ITC claimed, and tax paid. Filed even if there are no transactions. Deadline: 20th of next month (for monthly filers).',
    'gstr-2a': 'GSTR-2A is an auto-populated, read-only statement of inward supplies (purchases) reflected from your suppliers\' GSTR-1. It is for reference only — you claim ITC in GSTR-3B.',
    'gstr-2b': 'GSTR-2B is a static, auto-drafted ITC statement generated on the 14th of each month. It is the basis for ITC claims under Rule 36(4). Match your purchase records against GSTR-2B before filing GSTR-3B.',
    'gstr-9': 'GSTR-9 is the annual return consolidating all monthly/quarterly returns filed during the financial year. It must reconcile with audited financials. Mandatory for businesses with >₹2 Cr turnover.'
  },
  formats: {
    'xlsx': 'XLSX (Excel) is the most common format for offline review and submission to your CA or tax consultant. Excel files can be imported into Tally, Busy, and most accounting software.',
    'json': 'JSON is the format required for direct upload to the GSTN portal (GST.gov.in). Download the GSTR-1 JSON from this page and upload it under "File Returns → GSTR-1 → Upload JSON" on the portal.',
    'pdf': 'PDF export is for your records and audit trail. It creates a formatted, printable summary of the return period — share with auditors or keep as documentation.',
    'csv': 'CSV is for bulk data processing, reconciliation tools, and importing into your CA\'s software. It contains raw row-level data without formatting.'
  },
  supplyTypes: {
    'b2b': 'B2B (Business to Business): Supplies to registered GST dealers. These invoices must include the buyer\'s GSTIN. They appear in Table 4A of GSTR-1 and flow to the buyer\'s GSTR-2A/2B.',
    'b2c': 'B2C (Business to Consumer): Supplies to unregistered persons. B2CL = large inter-state invoices >₹2.5 Lakh; B2CS = all other small/intra-state B2C invoices consolidated in GSTR-1.',
    'export': 'Export supplies (zero-rated under Section 16 of IGST Act). Can be with payment of IGST (and claim refund) or under LUT/Bond without payment. Must be reported in Table 6A/6B of GSTR-1.',
    'rcm': 'Reverse Charge Mechanism (RCM): The recipient pays GST instead of the supplier — for services like GTA, advocate fees, import of services. Report in Table 3.1(d) of GSTR-3B. ITC on RCM can be claimed in Table 4A(3).'
  },
  itc: {
    claim: 'ITC (Input Tax Credit) can be claimed on purchases used for business purposes. Conditions: (1) You must have a valid tax invoice, (2) The supplier must have filed their GSTR-1, (3) The invoice must appear in your GSTR-2B, (4) You must have received the goods/services, (5) Tax must have been paid to the government.',
    reversal: 'ITC must be reversed if: (1) Goods/services are used for exempt supplies, (2) Payment to supplier is not made within 180 days, (3) Used for personal/non-business purposes. Reversal is done in Table 4B of GSTR-3B.',
    rule36: 'Under Rule 36(4), ITC can only be claimed up to 105% of eligible ITC appearing in GSTR-2B. Provisional ITC beyond this is not allowed as of January 2022.',
    blocked: 'Blocked credits under Section 17(5): Motor vehicles (with exceptions), food & beverages, club memberships, health services, works contract for immovable property, and CSR expenses. These cannot be claimed as ITC.'
  },
  reconciliation: {
    unmatched: 'An "Unmatched" invoice means your purchase record does not have a corresponding entry in GSTR-2B from the supplier. This can happen because: (1) Supplier has not filed GSTR-1 yet, (2) Invoice number in your records differs from what the supplier reported, (3) GSTIN mismatch, (4) Invoice date falls in a different period.',
    steps: '1. Download GSTR-2B from the GST portal for the same period.\n2. Compare invoice numbers, GSTINs, and tax amounts line by line.\n3. Contact suppliers with missing invoices and ask them to file/amend their GSTR-1.\n4. For invoices genuinely absent from GSTR-2B, do not claim ITC — book it as an expense instead.\n5. Once the supplier files/amends, it will appear in next month\'s GSTR-2B.'
  },
  hsn: {
    what: 'HSN (Harmonised System of Nomenclature) codes are standardised 4/6/8 digit product classification codes. SAC (Services Accounting Code) is the equivalent for services. Both must be declared in GSTR-1.',
    mandatory: 'HSN codes are mandatory in invoices: (1) Turnover up to ₹5 Cr — 4-digit HSN for B2B, optional for B2C; (2) Turnover >₹5 Cr — 6-digit HSN mandatory for all invoices.',
    table12: 'HSN Summary (Table 12 of GSTR-1) is an aggregate summary of all HSN codes supplied during the period, with total quantity, taxable value, and tax amounts. Export the "HSN Summary" from this page to fill Table 12.'
  }
};

const QUICK_SUGGESTIONS = [
  'What is GSTR-2B reconciliation?',
  'How do I claim ITC?',
  'What does "Unmatched" status mean?',
  'Which format do I upload to the GST portal?',
  'What is B2B vs B2C supply?',
  'What are blocked ITC credits?',
];

// ── AI response generator (rule-based) ────────────────────────────────────────

const generateResponse = (message) => {
  const q = message.toLowerCase();

  // Greeting
  if (/^(hi|hello|hey|namaste)/.test(q)) {
    return 'Hello! I\'m your GST filing assistant. Ask me about GSTR-1, GSTR-3B, reconciliation, ITC claims, or what to do with unmatched invoices. How can I help?';
  }

  // Unmatched invoices
  if (q.includes('unmatched') || q.includes('mismatch') || q.includes('not matched')) {
    return `**Unmatched Invoice — What it means:**\n\n${GST_KNOWLEDGE.reconciliation.unmatched}\n\n**Steps to resolve:**\n\n${GST_KNOWLEDGE.reconciliation.steps}`;
  }

  // GSTR-2B
  if (q.includes('2b') || q.includes('gstr-2b') || q.includes('gstr 2b')) {
    return `**GSTR-2B:**\n\n${GST_KNOWLEDGE.returns['gstr-2b']}\n\n**Reconciliation Steps:**\n\n${GST_KNOWLEDGE.reconciliation.steps}`;
  }

  // GSTR-2A
  if (q.includes('2a') || q.includes('gstr-2a')) {
    return `**GSTR-2A:**\n\n${GST_KNOWLEDGE.returns['gstr-2a']}`;
  }

  // GSTR-1
  if (q.includes('gstr-1') || q.includes('gstr 1') || (q.includes('gstr') && q.includes('outward'))) {
    return `**GSTR-1:**\n\n${GST_KNOWLEDGE.returns['gstr-1']}\n\nTo file: export the GSTR-1 JSON from this page and upload it to GST.gov.in.`;
  }

  // GSTR-3B
  if (q.includes('gstr-3b') || q.includes('gstr 3b') || q.includes('3b')) {
    return `**GSTR-3B:**\n\n${GST_KNOWLEDGE.returns['gstr-3b']}`;
  }

  // GSTR-9
  if (q.includes('gstr-9') || q.includes('annual return') || q.includes('gstr 9')) {
    return `**GSTR-9 (Annual Return):**\n\n${GST_KNOWLEDGE.returns['gstr-9']}`;
  }

  // ITC claim
  if ((q.includes('itc') || q.includes('input tax credit')) && (q.includes('claim') || q.includes('how') || q.includes('eligible'))) {
    return `**ITC Claim — Conditions under CGST Act, Section 16:**\n\n${GST_KNOWLEDGE.itc.claim}\n\n**Important limit:** ${GST_KNOWLEDGE.itc.rule36}`;
  }

  // ITC reversal
  if ((q.includes('itc') || q.includes('input tax credit')) && (q.includes('revers') || q.includes('disallow'))) {
    return `**ITC Reversal:**\n\n${GST_KNOWLEDGE.itc.reversal}`;
  }

  // Blocked ITC
  if (q.includes('blocked') || (q.includes('section 17') && q.includes('5'))) {
    return `**Blocked ITC — Section 17(5):**\n\n${GST_KNOWLEDGE.itc.blocked}`;
  }

  // ITC (general)
  if (q.includes('itc') || q.includes('input tax credit')) {
    return `**Input Tax Credit (ITC):**\n\nHere are the key ITC topics:\n\n1. **Claiming ITC:** ${GST_KNOWLEDGE.itc.claim}\n\n2. **Rule 36(4) limit:** ${GST_KNOWLEDGE.itc.rule36}\n\n3. **Reversal:** ${GST_KNOWLEDGE.itc.reversal}\n\n4. **Blocked credits:** ${GST_KNOWLEDGE.itc.blocked}`;
  }

  // Export formats — JSON
  if (q.includes('json') || q.includes('upload') || q.includes('portal')) {
    return `**JSON Export — for GST portal upload:**\n\n${GST_KNOWLEDGE.formats.json}`;
  }

  // Export formats — XLSX
  if (q.includes('excel') || q.includes('xlsx')) {
    return `**XLSX/Excel Export:**\n\n${GST_KNOWLEDGE.formats.xlsx}`;
  }

  // Export formats — PDF
  if (q.includes('pdf')) {
    return `**PDF Export:**\n\n${GST_KNOWLEDGE.formats.pdf}`;
  }

  // Export formats — CSV
  if (q.includes('csv')) {
    return `**CSV Export:**\n\n${GST_KNOWLEDGE.formats.csv}`;
  }

  // Export formats (general)
  if (q.includes('format') || q.includes('export')) {
    return `**Export Formats — When to use each:**\n\n| Format | Best For |\n|--------|----------|\n| **JSON** | Upload directly to GST portal |\n| **XLSX** | Share with CA, import to Tally/Busy |\n| **PDF** | Audit records, printable summaries |\n| **CSV** | Reconciliation tools, raw data processing |`;
  }

  // B2B
  if (q.includes('b2b')) {
    return `**B2B Supply:**\n\n${GST_KNOWLEDGE.supplyTypes['b2b']}`;
  }

  // B2C
  if (q.includes('b2c') || q.includes('b2cl') || q.includes('b2cs')) {
    return `**B2C Supply:**\n\n${GST_KNOWLEDGE.supplyTypes['b2c']}`;
  }

  // Export supply
  if (q.includes('export supply') || q.includes('zero rated') || q.includes('lut') || q.includes('zero-rated')) {
    return `**Export / Zero-Rated Supply:**\n\n${GST_KNOWLEDGE.supplyTypes['export']}`;
  }

  // RCM
  if (q.includes('rcm') || q.includes('reverse charge')) {
    return `**Reverse Charge Mechanism (RCM):**\n\n${GST_KNOWLEDGE.supplyTypes['rcm']}`;
  }

  // HSN
  if (q.includes('hsn') || q.includes('sac') || q.includes('harmonised')) {
    return `**HSN / SAC Codes:**\n\n${GST_KNOWLEDGE.hsn.what}\n\n**Mandatory requirement:** ${GST_KNOWLEDGE.hsn.mandatory}\n\n**HSN Summary (Table 12):** ${GST_KNOWLEDGE.hsn.table12}`;
  }

  // Reconciliation general
  if (q.includes('reconcil') || q.includes('match') || q.includes('compare')) {
    return `**GSTR-2B Reconciliation:**\n\n${GST_KNOWLEDGE.reconciliation.unmatched}\n\n**Resolution steps:**\n\n${GST_KNOWLEDGE.reconciliation.steps}`;
  }

  // Supply type general
  if (q.includes('supply type') || q.includes('invoice type')) {
    return `**Invoice / Supply Types:**\n\n| Type | Description |\n|------|-------------|\n| **B2B** | To registered buyers (with GSTIN) |\n| **B2CL** | Inter-state to unregistered, invoice >₹2.5L |\n| **B2CS** | All other unregistered/small B2C supplies |\n| **EXP** | Export supplies (zero-rated) |\n| **CDNR** | Credit/Debit notes to registered buyers |`;
  }

  // Specific invoice mismatch
  if (q.includes('invoice') && (q.includes('issue') || q.includes('problem') || q.includes('wrong') || q.includes('error'))) {
    return 'Please paste the relevant invoice details (invoice number, GSTIN, taxable amount, CGST/SGST/IGST) and I\'ll help you diagnose the issue.';
  }

  // Due dates / deadlines
  if (q.includes('due date') || q.includes('deadline') || q.includes('when') || q.includes('last date')) {
    return `**GST Filing Due Dates:**\n\n| Return | Who Files | Due Date |\n|--------|-----------|----------|\n| GSTR-1 (Monthly) | Turnover >₹5 Cr | 11th of next month |\n| GSTR-1 (IFF/Quarterly) | QRMP scheme | 13th of month after quarter end |\n| GSTR-3B (Monthly) | Turnover >₹5 Cr | 20th of next month |\n| GSTR-3B (Quarterly) | QRMP scheme | 22nd/24th of month after quarter end |\n| GSTR-9 | Annual | 31st December of next FY |\n\nNote: Deadlines can change via CBIC notifications. Always verify on GST.gov.in.`;
  }

  // Penalty / late fee
  if (q.includes('late fee') || q.includes('penalty') || q.includes('fine') || q.includes('interest')) {
    return `**Late Filing — Fees & Interest:**\n\n- **Late fee:** ₹50/day (₹25 CGST + ₹25 SGST) for regular returns. Nil-return late fee is ₹20/day (₹10 CGST + ₹10 SGST).\n- **Interest:** 18% p.a. on unpaid tax, calculated from due date to payment date.\n- **Maximum late fee:** Capped at ₹10,000 per return currently (subject to CBIC notifications).\n\nI'd recommend verifying current caps on GST.gov.in or with your CA as these limits have changed multiple times.`;
  }

  // Help / what can you do
  if (q.includes('help') || q.includes('what can') || q.includes('what do')) {
    return `I can help you with:\n\n1. **Reconciliation** — Understanding unmatched invoices and GSTR-2B mismatches\n2. **Return types** — GSTR-1, GSTR-3B, GSTR-2A, GSTR-2B, GSTR-9\n3. **ITC** — Claiming, reversals, blocked credits, Rule 36(4)\n4. **Supply types** — B2B, B2C, Export, RCM\n5. **HSN/SAC codes** — What they are and when they're required\n6. **Export formats** — JSON (portal), XLSX (CA/Tally), PDF (records), CSV (reconciliation)\n7. **Due dates** — Filing deadlines\n\nAsk me anything specific!`;
  }

  // Default
  return `I didn't quite understand that specific query. Here's what I can help with:\n\n- GSTR-1, GSTR-3B, GSTR-2B, GSTR-9 filing guidance\n- Unmatched invoice resolution\n- ITC claims and reversals\n- B2B/B2C/Export supply types\n- HSN/SAC code requirements\n- Export format selection (JSON, XLSX, PDF, CSV)\n\nCould you rephrase your question or pick one of these topics?`;
};

// ── Component ─────────────────────────────────────────────────────────────────

const GstAssistant = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: 'Hello! I\'m your **GST filing assistant**.\n\nI can help you with GSTR-2B reconciliation, unmatched invoice resolution, ITC claims, return types, and export format guidance.\n\nWhat do you need help with?',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');

    const userMsg = { id: Date.now(), role: 'user', text: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Simulate small delay for realism
    setTimeout(() => {
      const reply = generateResponse(msg);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', text: reply, time: new Date() }]);
      setIsTyping(false);
    }, 400);
  };

  // Simple markdown-to-JSX renderer
  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      // Table row
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.slice(1, -1).split('|').map(c => c.trim());
        const isSeparator = cells.every(c => /^[-:]+$/.test(c));
        if (isSeparator) return null;
        return (
          <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
            {cells.map((cell, j) => (
              <td key={j} className="px-2 py-1 text-xs text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{
                __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              }} />
            ))}
          </tr>
        );
      }

      let html = line
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

      if (line.match(/^\d+\./)) {
        return <p key={i} className="text-xs leading-relaxed my-0.5 ml-2" dangerouslySetInnerHTML={{ __html: html }} />;
      }

      return html ? <p key={i} className="text-xs leading-relaxed my-0.5" dangerouslySetInnerHTML={{ __html: html }} /> : <br key={i} />;
    }).filter(Boolean);
  };

  // Wrap table rows properly
  const renderMessage = (text) => {
    const lines = text.split('\n');
    const parts = [];
    let tableLines = [];
    let nonTableLines = [];

    const flushNonTable = () => {
      if (nonTableLines.length) {
        parts.push(<div key={parts.length}>{renderText(nonTableLines.join('\n'))}</div>);
        nonTableLines = [];
      }
    };
    const flushTable = () => {
      if (tableLines.length) {
        parts.push(
          <div key={parts.length} className="overflow-x-auto my-1">
            <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded">
              <tbody>{renderText(tableLines.join('\n'))}</tbody>
            </table>
          </div>
        );
        tableLines = [];
      }
    };

    lines.forEach(line => {
      if (line.startsWith('|')) {
        flushNonTable();
        tableLines.push(line);
      } else {
        flushTable();
        nonTableLines.push(line);
      }
    });
    flushNonTable();
    flushTable();

    return parts;
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-blue-600 dark:bg-blue-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">GST Assistant</p>
            <p className="text-xs text-blue-200">Reconciliation & Filing Help</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-tr-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm'
            }`}>
              {msg.role === 'user'
                ? <p className="text-xs leading-relaxed">{msg.text}</p>
                : <div className="space-y-0.5">{renderMessage(msg.text)}</div>
              }
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200 text-right' : 'text-gray-400'}`}>
                {msg.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-3 py-2">
              <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick suggestions */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)}
              className="flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition whitespace-nowrap">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 flex-shrink-0">
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about GST filing..."
            className="flex-1 bg-transparent text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 px-2 outline-none"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || isTyping}
            className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-40 hover:bg-blue-700 transition flex-shrink-0">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center mt-1.5">
          Based on CGST Act, 2017. Verify with your CA for specific cases.
        </p>
      </div>
    </div>
  );
};

export default GstAssistant;
