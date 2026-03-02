import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { generateFullName } from '../utils/family';
import Card from './Card';

interface ContactSelectorProps {
  contacts: Contact[];
  onSelect: (contact: Contact | null) => void;
  currentValue?: string;
  placeholder?: string;
  filter?: (contact: Contact) => boolean;
}

const ContactSelector: React.FC<ContactSelectorProps> = ({ contacts, onSelect, currentValue, placeholder, filter }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { language } = useTranslation();
  const searchRef = useRef<HTMLDivElement>(null);

  const contactsMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

  const filteredContacts = useMemo(() => {
    return filter ? contacts.filter(filter) : contacts;
  }, [contacts, filter]);

  useEffect(() => {
    if (currentValue) {
      const selectedContact = contactsMap.get(currentValue);
      if (selectedContact) {
        setQuery(generateFullName(selectedContact.id, contactsMap, language));
      }
    } else {
      setQuery('');
    }
  }, [currentValue, contactsMap, language]);

  useEffect(() => {
    if (!isOpen) return;

    if (query.trim() === '') {
      setResults(filteredContacts.slice(0, 50)); // Show some initial results
    } else {
      const lowerCaseQuery = query.toLowerCase();
      const searchResults = filteredContacts.filter(c => 
        generateFullName(c.id, contactsMap, language).toLowerCase().includes(lowerCaseQuery)
      );
      setResults(searchResults);
    }
  }, [query, filteredContacts, contactsMap, language, isOpen]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query to the selected value if user clicks away without selecting
        if (currentValue) {
            const selectedContact = contactsMap.get(currentValue);
            if (selectedContact) setQuery(generateFullName(selectedContact.id, contactsMap, language));
        } else {
            setQuery('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [currentValue, contactsMap, language]);

  const handleSelect = (contact: Contact) => {
    onSelect(contact);
    setIsOpen(false);
  };
  
  const handleClear = () => {
    onSelect(null);
    setQuery('');
  }

  return (
    <div className="relative w-full" ref={searchRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className="w-full pl-4 pr-10 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        onFocus={() => setIsOpen(true)}
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
          aria-label="Clear selection"
        >
          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </button>
      )}
      {isOpen && (
         <div className="absolute left-0 right-0 mt-2 z-30 animate-fade-in-scale origin-top">
            <Card className="p-1 max-h-60 overflow-y-auto">
                {results.length > 0 ? results.map(contact => (
                    <button
                        type="button"
                        key={contact.id}
                        onClick={() => handleSelect(contact)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-700 text-gray-200"
                    >
                        {generateFullName(contact.id, contactsMap, language)}
                    </button>
                )) : (
                    <div className="px-3 py-2 text-sm text-gray-400">No results found.</div>
                )}
            </Card>
        </div>
      )}
    </div>
  );
};

export default ContactSelector;
