import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { generateFullName } from '../utils/family';
import Card from './Card';

interface SearchProps {
  contacts: Contact[];
  onSelect: (contact: Contact) => void;
  value: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
}

const Search: React.FC<SearchProps> = ({ contacts, onSelect, value, onQueryChange, placeholder }) => {
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { language, t } = useTranslation();
  const searchRef = useRef<HTMLDivElement>(null);

  const contactsMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

  const searchableContacts = useMemo(() => {
    return contacts
      .filter(c => c.includeInFamilyTree ?? true)
      .map(contact => {
        const fullNameEn = generateFullName(contact.id, contactsMap, 'en');
        const fullNameAr = generateFullName(contact.id, contactsMap, 'ar');
        
        return {
          ...contact,
          fullNameEn,
          fullNameAr,
          namePartsEn: fullNameEn.split(' '),
        };
      });
  }, [contacts, contactsMap]);

  /**
   * Matches a query of initials against the name parts in a strict, positional order.
   * e.g., 'sasq' matches 'Salem Abdullah Salem... AlQasimi'.
   */
  const matchInitials = (query: string, nameParts: string[]): boolean => {
    let effectiveQuery = query;
    let effectiveNameParts = [...nameParts];

    // Handle special 'q' for 'AlQasimi' only if it's the last character of the query.
    if (query.endsWith('q')) {
        const lastPart = effectiveNameParts[effectiveNameParts.length - 1]?.toLowerCase();
        if (lastPart === 'alqasimi') {
            // If 'q' matches 'AlQasimi', remove them from consideration for the prefix match.
            effectiveQuery = query.slice(0, -1);
            effectiveNameParts.pop();
        } else {
            // If query ends in 'q' but name doesn't end in 'AlQasimi', it's a mismatch.
            return false;
        }
    }
    
    // The remaining query must be a prefix of the remaining name part initials.
    if (effectiveQuery.length > effectiveNameParts.length) {
        // Query is longer than the available name parts, impossible to match.
        return false;
    }

    for (let i = 0; i < effectiveQuery.length; i++) {
        const queryChar = effectiveQuery[i];
        const partFirstLetter = (effectiveNameParts[i]?.[0] || '').toLowerCase();
        
        if (queryChar !== partFirstLetter) {
            return false;
        }
    }

    // If we looped through the whole query without mismatch, it's a prefix match.
    return true;
  };


  useEffect(() => {
    // If the current value is an exact full name, a selection has been made, so hide results.
    const isExactMatch = searchableContacts.some(c => (language === 'ar' ? c.fullNameAr : c.fullNameEn) === value);
    if (isExactMatch) {
      setIsOpen(false);
      setResults([]);
      return;
    }

    if (value.trim().length > 1) {
      const isArabicQuery = /[\u0600-\u06FF]/.test(value);

      const filteredResults = searchableContacts.filter(c => {
        if (isArabicQuery) {
          // Arabic search: simple substring on Arabic full name.
          return c.fullNameAr.includes(value);
        } else {
          // English search: substring + initials on English full name.
          const lowerCaseQuery = value.toLowerCase();
          const initialsQuery = lowerCaseQuery.replace(/\s+/g, '');
          
          const nameToSearch = c.fullNameEn;
          const namePartsToSearch = c.namePartsEn;
          
          const substringMatch = nameToSearch.toLowerCase().includes(lowerCaseQuery);
          const initialsMatch = initialsQuery.length > 1 && matchInitials(initialsQuery, namePartsToSearch);

          return substringMatch || initialsMatch;
        }
      });
      
      const uniqueResults = Array.from(new Set(filteredResults.map(c => c.id)))
        .map(id => filteredResults.find(c => c.id === id));

      setResults(uniqueResults);
      setIsOpen(uniqueResults.length > 0);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [value, searchableContacts, language]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (contact: Contact) => {
    onSelect(contact);
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder || t('Search by name...')}
        className="w-full pl-4 pr-10 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        onFocus={() => { if (results.length > 0 && value.trim().length > 1) setIsOpen(true); }}
      />
      {value && (
        <button
          onClick={() => onQueryChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </button>
      )}
      {isOpen && results.length > 0 && (
         <div className="absolute left-0 right-0 mt-2 z-30 animate-fade-in-scale origin-top">
            <Card className="p-1 max-h-72 overflow-y-auto">
                {results.map(contact => (
                    <button
                        key={contact.id}
                        onClick={() => handleSelect(contact)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-700 text-gray-200"
                    >
                        {language === 'ar' ? contact.fullNameAr : contact.fullNameEn}
                    </button>
                ))}
            </Card>
        </div>
      )}
    </div>
  );
};

export default Search;