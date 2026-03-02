import React, { useState } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';

type NewChildData = Omit<Contact, 'id' | 'avatar' | 'firstNameAr' | 'lastNameAr' | 'siblingOrder'>;

interface AddChildModalProps {
  parent: Contact;
  onClose: () => void;
  onAddChild: (childData: NewChildData) => void;
}

const AddChildModal: React.FC<AddChildModalProps> = ({ parent, onClose, onAddChild }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(parent.familyName);
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [error, setError] = useState('');
  const { language, t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError(t('First Name Required'));
      return;
    }
    setError('');
    onAddChild({
      firstNameEn: firstName,
      lastNameEn: lastName,
      familyName: parent.familyName,
      gender,
      parentIds: [parent.id, ...(parent.spouseId ? [parent.spouseId] : [])],
      includeInFamilyTree: true,
    });
  };
  
  const parentFirstName = language === 'ar' ? parent.firstNameAr || parent.firstNameEn : parent.firstNameEn;
  const parentLastName = language === 'ar' ? parent.lastNameAr || parent.lastNameEn : parent.lastNameEn;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-child-title"
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md mx-4 border border-white/10 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 id="add-child-title" className="text-2xl font-bold text-white">{t('Add New Child')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>
        <p className="text-gray-400 mb-6">{t('Adding child to')} <span className="font-semibold text-white">{parentFirstName} {parentLastName}</span>.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">{t('First Name')}</label>
              <input 
                type="text"
                id="firstName"
                value={firstName}
                onChange={e => {
                  setFirstName(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-white focus:ring-2 focus:border-indigo-500 transition ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-indigo-500'}`}
                required
                autoFocus
                aria-invalid={!!error}
                aria-describedby={error ? "firstName-error" : undefined}
              />
              {error && <p id="firstName-error" className="text-red-400 text-sm mt-1">{error}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">{t('Last Name')}</label>
              <input 
                type="text"
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                required
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-1">{t('Gender')}</label>
              <select 
                id="gender"
                value={gender}
                onChange={e => setGender(e.target.value as 'Male' | 'Female')}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                <option value="Male">{t('Male')}</option>
                <option value="Female">{t('Female')}</option>
              </select>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">
              {t('Cancel')}
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
              {t('Add New Child')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddChildModal;
