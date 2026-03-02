import React, { useState, useEffect, useMemo } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import ContactSelector from './ContactSelector';
import { generateFullName, generationColors, getContactDepth } from '../utils/family';
import PhotoPositioner from './PhotoPositioner';

interface EditContactModalProps {
  contact: Contact;
  allContacts: Contact[];
  onClose: () => void;
  onSave: (updatedContact: Contact) => void;
}

const EditContactModal: React.FC<EditContactModalProps> = ({ contact, allContacts, onClose, onSave }) => {
  const [firstNameEn, setFirstNameEn] = useState(contact.firstNameEn);
  const [lastNameEn, setLastNameEn] = useState(contact.lastNameEn);
  const [familyName, setFamilyName] = useState(contact.familyName);
  const [gender, setGender] = useState<'Male' | 'Female'>(contact.gender);
  const [spouseId, setSpouseId] = useState(contact.spouseId);
  const [motherId, setMotherId] = useState<string | undefined>(undefined);
  const [includeInFamilyTree, setIncludeInFamilyTree] = useState(contact.includeInFamilyTree ?? true);
  const [relationStatus, setRelationStatus] = useState(contact.relationStatus);
  const [siblingOrder, setSiblingOrder] = useState(contact.siblingOrder);
  const [avatar, setAvatar] = useState(contact.avatar);
  const [avatarPosition, setAvatarPosition] = useState(contact.avatarPosition || '50% 50%');
  
  const [errors, setErrors] = useState<{ firstName?: string, lastName?: string, familyName?: string }>({});
  const { t, language } = useTranslation();
  
  const contactsMap = useMemo(() => new Map(allContacts.map(c => [c.id, c])), [allContacts]);

  const color = useMemo(() => {
    const depth = getContactDepth(contact.id, contactsMap);
    return generationColors[depth % generationColors.length];
  }, [contact.id, contactsMap]);
  
  const siblings = useMemo(() => {
    if (!contact.parentIds || contact.parentIds.length === 0) return [];
    return allContacts
      .filter(c => 
        c.id !== contact.id &&
        c.parentIds?.some(pId => contact.parentIds!.includes(pId))
      )
      .sort((a, b) => (a.siblingOrder || 999) - (b.siblingOrder || 999));
  }, [contact, allContacts]);

  useEffect(() => {
    setFirstNameEn(contact.firstNameEn);
    setLastNameEn(contact.lastNameEn);
    setFamilyName(contact.familyName);
    setGender(contact.gender);
    setSpouseId(contact.spouseId);
    setIncludeInFamilyTree(contact.includeInFamilyTree ?? true);
    setRelationStatus(contact.relationStatus);
    setSiblingOrder(contact.siblingOrder);
    setAvatar(contact.avatar);
    setAvatarPosition(contact.avatarPosition || '50% 50%');
    
    const parentContacts = contact.parentIds?.map(id => contactsMap.get(id)).filter(Boolean);
    const mother = parentContacts?.find(p => p!.gender === 'Female');
    setMotherId(mother?.id);

  }, [contact, contactsMap]);

  const validate = () => {
    const newErrors: { firstName?: string; lastName?: string, familyName?: string } = {};
    if (!firstNameEn.trim()) newErrors.firstName = t('First Name Required');
    if (!lastNameEn.trim()) newErrors.lastName = t('Last Name Required');
    if (!familyName.trim()) newErrors.familyName = t('Family Name Required');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    const parentContacts = contact.parentIds?.map(id => contactsMap.get(id)).filter(Boolean);
    const father = parentContacts?.find(p => p!.gender === 'Male');
    
    const newParentIds: string[] = [];
    if (father) newParentIds.push(father.id);
    if (motherId) newParentIds.push(motherId);

    onSave({
      ...contact,
      firstNameEn,
      lastNameEn,
      familyName,
      gender,
      spouseId,
      parentIds: newParentIds,
      includeInFamilyTree,
      relationStatus,
      siblingOrder,
      avatar,
      avatarPosition,
      firstNameAr: undefined, 
      lastNameAr: undefined,
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-contact-title"
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md mx-4 border border-white/10 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 id="edit-contact-title" className="text-2xl font-bold text-white">{t('Edit Contact')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">{t('First Name')}</label>
              <input 
                type="text"
                id="firstName"
                value={firstNameEn}
                onChange={e => {
                  setFirstNameEn(e.target.value);
                  if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined }));
                }}
                className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-white focus:ring-2 focus:border-indigo-500 transition ${errors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-indigo-500'}`}
                required
                autoFocus
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? "edit-firstName-error" : undefined}
              />
              {errors.firstName && <p id="edit-firstName-error" className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">{t('Last Name')}</label>
              <input 
                type="text"
                id="lastName"
                value={lastNameEn}
                onChange={e => {
                  setLastNameEn(e.target.value);
                  if (errors.lastName) setErrors(prev => ({ ...prev, lastName: undefined }));
                }}
                className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-white focus:ring-2 focus:border-indigo-500 transition ${errors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-indigo-500'}`}
                required
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "edit-lastName-error" : undefined}
              />
              {errors.lastName && <p id="edit-lastName-error" className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
            </div>
             <div>
              <label htmlFor="familyName" className="block text-sm font-medium text-gray-300 mb-1">{t('Family Name')}</label>
              <input 
                type="text"
                id="familyName"
                value={familyName}
                onChange={e => {
                  setFamilyName(e.target.value);
                  if (errors.familyName) setErrors(prev => ({ ...prev, familyName: undefined }));
                }}
                className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-white focus:ring-2 focus:border-indigo-500 transition ${errors.familyName ? 'border-red-500 focus:ring-red-500' : 'border-gray-700 focus:ring-indigo-500'}`}
                required
              />
              {errors.familyName && <p className="text-red-400 text-sm mt-1">{errors.familyName}</p>}
            </div>
            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-300 mb-1">{t('Avatar URL')}</label>
              <input 
                type="url"
                id="avatarUrl"
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
                className="w-full bg-gray-900 border rounded-lg px-3 py-2 text-white focus:ring-2 focus:border-indigo-500 transition border-gray-700"
                placeholder="https://example.com/photo.jpg"
              />
            </div>
            {avatar && (
              <div className="flex justify-center my-4">
                <PhotoPositioner
                    contact={{ ...contact, avatar }}
                    color={color}
                    position={avatarPosition}
                    onPositionChange={setAvatarPosition}
                    className="w-24 h-24"
                />
              </div>
            )}
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-1">{t('Gender')}</label>
              <select 
                id="gender"
                value={gender}
                onChange={e => setGender(e.target.value as 'Male' | 'Female')}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                <option value="Female">{t('Female')}</option>
                <option value="Male">{t('Male')}</option>
              </select>
            </div>
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
            <div className="border-t border-gray-700 my-2"></div>
            <div>
                <label htmlFor="spouse" className="block text-sm font-medium text-gray-300 mb-1">{t('Spouse')}</label>
                <ContactSelector
                    contacts={allContacts}
                    currentValue={spouseId}
                    onSelect={(c) => setSpouseId(c ? c.id : undefined)}
                    placeholder={t('Select a spouse...')}
                    filter={(c) => c.id !== contact.id && c.gender !== contact.gender}
                />
            </div>
            {spouseId && (
              <div>
                <label htmlFor="relationStatus" className="block text-sm font-medium text-gray-300 mb-1">{t('Relation Status')}</label>
                <select
                    id="relationStatus"
                    value={relationStatus || 'Married'}
                    onChange={(e) => setRelationStatus(e.target.value as 'Married' | 'Divorced')}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                >
                    <option value="Married">{t('Married')}</option>
                    <option value="Divorced">{t('Divorced')}</option>
                </select>
              </div>
            )}
             <div>
                <label htmlFor="mother" className="block text-sm font-medium text-gray-300 mb-1">{t('Mother')}</label>
                <ContactSelector
                    contacts={allContacts}
                    currentValue={motherId}
                    onSelect={(c) => setMotherId(c ? c.id : undefined)}
                    placeholder={t('Select a mother...')}
                    filter={(c) => c.id !== contact.id && c.gender === 'Female'}
                />
            </div>
            <div className="border-t border-gray-700 my-2"></div>
            <div>
              <label htmlFor="siblingOrder" className="block text-sm font-medium text-gray-300 mb-1">{t('Sibling Order')}</label>
              <input 
                type="number"
                id="siblingOrder"
                value={siblingOrder || ''}
                onChange={e => setSiblingOrder(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                min="1"
              />
              <p className="text-xs text-gray-400 mt-1">{t('Sibling Order Hint')}</p>
            </div>
             {siblings.length > 0 && (
              <div className="bg-gray-900/50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">{t('Siblings')}</h4>
                  <ul className="text-gray-400 text-sm space-y-1">
                      {siblings.map(s => <li key={s.id}>{generateFullName(s.id, contactsMap, language)} ({t('Order')}: {s.siblingOrder})</li>)}
                  </ul>
              </div>
            )}
          </div>
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">
              {t('Cancel')}
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
              {t('Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContactModal;