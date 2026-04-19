import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Loader, Plus, ChevronDown, Check } from 'lucide-react';

/**
 * Autocomplete Component
 * 
 * @param {string} placeholder - Input placeholder
 * @param {string} value - Current value (controlled)
 * @param {function} onChange - Handler for value change
 * @param {function} onSelect - Handler when an item is selected
 * @param {string} searchEndpoint - API endpoint for searching
 * @param {string} createEndpoint - API endpoint for creating a new item
 * @param {string} labelKey - Key in the result object to use as display label
 * @param {string} valueKey - Key in the result object to use as unique ID
 * @param {function} renderItem - Custom renderer for dropdown items
 * @param {boolean} showCreateOption - Whether to show the "Create New" option
 */
const Autocomplete = ({
  placeholder = "Search...",
  value = "",
  onChange,
  onSelect,
  searchEndpoint,
  createEndpoint,
  labelKey = "name",
  valueKey = "id",
  renderItem,
  showCreateOption = true,
  className = "",
  inputClassName = "",
  queryParam = "q" // Added to support specified 'q' param
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [direction, setDirection] = useState('bottom'); // 'top' or 'bottom'
  
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  // Sync internal state with prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Get auth token from localStorage
      const userInfo = localStorage.getItem('userInfo');
      const token = userInfo ? JSON.parse(userInfo).token : null;
      
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(`${searchEndpoint}${searchEndpoint.includes('?') ? '&' : '?'}${queryParam}=${encodeURIComponent(query)}`, config);
      // Adapt to common API structures
      const data = res.data.data || res.data || [];
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Autocomplete search failed:', err);
      setError('Search failed');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    if (onChange) onChange(newVal);
    
    setIsOpen(true);
    setActiveIndex(-1);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newVal);
    }, 300);

    // Determine direction on change/open
    updateDirection();
  };

  const updateDirection = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If less than 300px below and more space above, flip it
      if (spaceBelow < 300 && spaceAbove > spaceBelow) {
        setDirection('top');
      } else {
        setDirection('bottom');
      }
    }
  };

  // Helper to access data keys correctly (case-insensitive for Oracle)
  const getDataValue = (item, key) => {
    if (!item || !key) return "";
    return item[key] !== undefined ? item[key] : (item[key.toUpperCase()] !== undefined ? item[key.toUpperCase()] : "");
  };

  const handleSelect = (item) => {
    setInputValue(getDataValue(item, labelKey));
    setIsOpen(false);
    if (onSelect) onSelect(item);
  };

  const handleCreate = async () => {
    if (!createEndpoint) {
      // If no create endpoint, just bubble up the selection as a "new" item
      if (onSelect) onSelect({ [labelKey]: inputValue, isNew: true });
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      // Get auth token from localStorage
      const userInfo = localStorage.getItem('userInfo');
      const token = userInfo ? JSON.parse(userInfo).token : null;
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      // Determine the correct field name based on the labelKey
      let fieldName = 'name';
      if (labelKey.toLowerCase().includes('supplier')) {
        fieldName = 'supplier_name';
      } else if (labelKey.toLowerCase().includes('product')) {
        fieldName = 'product_name';
      } else if (labelKey.toLowerCase().includes('customer')) {
        fieldName = 'customer_name';
      }
      
      const res = await axios.post(createEndpoint, { 
        [fieldName]: inputValue 
      }, config);
      const newItem = res.data.data || res.data;
      handleSelect(newItem);
    } catch (err) {
      console.error('Creation failed:', err);
      setError(err.response?.data?.error || 'Creation failed');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const max = showCreateOption && inputValue.trim() ? suggestions.length : suggestions.length - 1;
      setActiveIndex(prev => (prev < max ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > -1 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex === -1) return;
      
      if (activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex]);
      } else if (showCreateOption && activeIndex === suggestions.length) {
        handleCreate();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="text-blue-400 font-extrabold">{part}</span> 
        : part
    );
  };

  return (
    <div className={`relative w-full ${className} ${isOpen ? 'z-[1000]' : 'z-10'}`} ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            updateDirection();
            if (inputValue && suggestions.length === 0) fetchSuggestions(inputValue);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          name="search-query-field"
          autoComplete="off"
          spellCheck="false"
          className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-10 py-2 text-gray-900 dark:text-gray-100 focus:border-green-500 focus:ring-1 focus:ring-green-500/20 outline-none transition ${inputClassName}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {loading && <Loader className="w-4 h-4 text-blue-500 animate-spin" />}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className={`absolute left-0 right-0 ${direction === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
          <div className="max-h-64 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => (
                <div
                  key={getDataValue(item, valueKey) || index}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full text-left p-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0 cursor-pointer transition-colors flex justify-between items-center ${
                    activeIndex === index ? 'bg-green-50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex-1 text-left">
                    {renderItem ? renderItem(item, inputValue) : (
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        {highlightMatch(getDataValue(item, labelKey), inputValue)}
                      </p>
                    )}
                  </div>
                  {String(getDataValue(item, labelKey)).toLowerCase() === String(value).toLowerCase() && <Check className="w-4 h-4 text-green-500 ml-2" />}
                </div>
              ))
            ) : !loading && inputValue.trim() && (
              <div className="p-4 text-center text-slate-500 text-sm italic">
                No existing results found
              </div>
            )}

            {showCreateOption && inputValue.trim() && (
              <div
                onClick={handleCreate}
                onMouseEnter={() => setActiveIndex(suggestions.length)}
                className={`w-full text-left p-3 border-t border-gray-100 dark:border-gray-700/50 cursor-pointer transition-all flex items-center gap-3 ${
                  activeIndex === suggestions.length ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${activeIndex === suggestions.length ? 'bg-green-100 dark:bg-green-900/40' : 'bg-blue-50 dark:bg-blue-900/40'}`}>
                   <Plus size={16} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-70 italic">
                      New {labelKey.toLowerCase().includes('supplier') ? 'Supplier' : labelKey.toLowerCase().includes('product') ? 'Product' : labelKey.toLowerCase().includes('customer') ? 'Customer' : 'Item'}
                    </span>
                    <span className="font-bold text-sm">Add "{inputValue}"</span>
                </div>
              </div>
            )}
          </div>
          {error && (
            <div className="p-2 bg-rose-500/10 text-rose-400 text-[10px] text-center border-t border-rose-500/20">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Autocomplete;
