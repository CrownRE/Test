import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import Card from './Card';

interface RelationModalProps {
  isLoading: boolean;
  explanation: string | null;
  onClose: () => void;
}

const RelationModal: React.FC<RelationModalProps> = ({ isLoading, explanation, onClose }) => {
  const { t } = useTranslation();

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-lg mx-4 border border-white/10 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-white">{t('Relation Explained')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>
        
        <div className="min-h-[120px] flex items-center justify-center text-center">
            {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-300">Generating explanation...</p>
                </div>
            ) : (
                <p className="text-lg text-gray-200 leading-relaxed">{explanation}</p>
            )}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 text-center">
            <button 
              onClick={onClose}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full"
            >
              {t('Close')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default RelationModal;