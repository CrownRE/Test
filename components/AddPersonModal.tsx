import React, { useState, useMemo, useEffect } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import ContactSelector from './ContactSelector';

interface AddPersonModalProps {
  onClose: () => void;
  onSave: (newContact: Contact) => void;
  allContacts: Contact[];
}

const AddPersonModal: React.FC<AddPersonModalProps> = ({ onClose, onSave, allContacts }) => {
  const { t } = useTranslation();
  
  const [firstNameEn, setFirstNameEn] = useState('');
  const [lastNameEn, setLastNameEn] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [fatherId, setFatherId] = useState<string | undefined>();
  const [motherId, setMotherId] = useState<string | undefined>();
  const [includeInFamilyTree, setIncludeInFamilyTree] = useState(true);
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const uniqueFamilyNames = useMemo(() => {
    const names = new Set(allContacts.map(c => c.familyName));
    return Array.from(names).sort();
  }, [allContacts]);

  useEffect(() => {
    if (fatherId) {
        const father = allContacts.find(c => c.id === fatherId);
        if (father) {
            setFamilyName(father.familyName);
            setLastNameEn(father.familyName);
        }
    }
  }, [fatherId, allContacts]);


  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!firstNameEn.trim()) newErrors.firstNameEn = t('First Name Required');
    if (!lastNameEn.trim()) newErrors.lastNameEn = t('Last Name Required');
    if (!familyName.trim()) newErrors.familyName = t('Family Name Required');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    const parentIds = [fatherId, motherId].filter((id): id is string => !!id);
    
    const siblings = allContacts.filter(c => 
        c.parentIds?.length && parentIds.length &&
        c.parentIds.some(pId => parentIds.includes(pId))
    );
    const maxOrder = Math.max(0, ...siblings.map(s => s.siblingOrder || 0));

    const newContact: Contact = {
        id: `contact-${Date.now()}`,
        firstNameEn,
        lastNameEn,
        familyName,
        gender,
        parentIds,
        avatar: `https://picsum.photos/seed/${Date.now()}/100`,
        includeInFamilyTree,
        siblingOrder: maxOrder + 1,
        manualArabicApproval: false,
    };
    onSave(newContact);
  };
  
  const renderInput = (id: string, label: string, value: string, setter: (val: string) => void, errorKey: string) => (
     <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input 
            type="text"
            id={id}
            value={value}
            onChange={e => {
                setter(e.target.value);
                if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: undefined }));
            }}
            className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-white focus:ring-2 focus:border-indigo-500 transition ${errors[errorKey] ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-indigo-500'}`}
            required
            aria-invalid={!!errors[errorKey]}
            aria-describedby={errors[errorKey] ? `${id}-error` : undefined}
        />
        {errors[errorKey] && <p id={`${id}-error`} className="text-red-400 text-sm mt-1">{errors[errorKey]}</p>}
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-person-title"
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md mx-4 border border-white/10 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 id="add-person-title" className="text-2xl font-bold text-white">{t('Add Person to Tree')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {renderInput('firstName', t('First Name'), firstNameEn, setFirstNameEn, 'firstNameEn')}
            {renderInput('lastName', t('Last Name'), lastNameEn, setLastNameEn, 'lastNameEn')}
            <div>
              <label htmlFor="familyName" className="block text-sm font-medium text-gray-300 mb-1">{t('Family Name')}</label>
              <select 
                id="familyName"
                value={familyName}
                onChange={e => {
                    setFamilyName(e.target.value);
                    if (errors.familyName) setErrors(prev => ({...prev, familyName: undefined}));
                }}
                 className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-white focus:ring-2 focus:border-indigo-500 transition ${errors.familyName ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-indigo-500'}`}
              >
                <option value="">Select a family...</option>
                {uniqueFamilyNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                ))}
              </select>
               {errors.familyName && <p className="text-red-400 text-sm mt-1">{errors.familyName}</p>}
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
             <div className="border-t border-gray-700 my-2"></div>
            <div>
              <label htmlFor="father" className="block text-sm font-medium text-gray-300 mb-1">{t('Father')}</label>
              <ContactSelector contacts={allContacts} currentValue={fatherId} onSelect={(c) => setFatherId(c?.id)} filter={c => c.gender === 'Male'} placeholder={t('Select a father...')}/>
            </div>
            <div>
              <label htmlFor="mother" className="block text-sm font-medium text-gray-300 mb-1">{t('Mother')}</label>
              <ContactSelector contacts={allContacts} currentValue={motherId} onSelect={(c) => setMotherId(c?.id)} filter={c => c.gender === 'Female'} placeholder={t('Select a mother...')}/>
            </div>
             <div className="border-t border-gray-700 my-2"></div>
             <div>
                <label className="flex items-center space-x-3 mt-2">
                    <input
                        type="checkbox"
                        checked={includeInFamilyTree}
                        onChange={(e) => setIncludeInFamilyTree(e.target.checked)}
                        className="h-5 w-5 text-indigo-600 bg-gray-900 border-gray-700 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-300 text-sm">{t('Include in main family tree')}</span>
                </label>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">
              {t('Cancel')}
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
              {t('Add New Person')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPersonModal;