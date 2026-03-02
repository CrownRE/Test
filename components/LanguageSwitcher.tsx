import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();
  
  const handleToggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggleLanguage}
        className="px-4 py-2 h-full rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors flex items-center gap-2"
        aria-label={`Switch to ${language === 'en' ? 'Arabic' : 'English'}`}
      >
        {language === 'en' ? 'العربية' : 'English'}
      </button>
    </div>
  );
};

export default LanguageSwitcher;
