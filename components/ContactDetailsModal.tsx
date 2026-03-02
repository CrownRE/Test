import React, { useMemo, useState, useEffect } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { generateFullName, getContactDepth, generationColors } from '../utils/family';
import PhotoPositioner from './PhotoPositioner';

interface ContactDetailsModalProps {
  contact: Contact;
  allContacts: Contact[];
  onClose: () => void;
  onEdit: (contactId: string) => void;
  onUpdateAvatarPosition: (contactId: string, position: string) => void;
}

const DetailRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center w-full py-2">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-semibold text-right">{value}</span>
    </div>
  );
};

const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({ contact, allContacts, onClose, onEdit, onUpdateAvatarPosition }) => {
  const { language, t } = useTranslation();
  const [currentPosition, setCurrentPosition] = useState(contact.avatarPosition || '50% 50%');
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
      const initialPosition = contact.avatarPosition || '50% 50%';
      setCurrentPosition(initialPosition);
      setHasChanges(false);
  }, [contact]);

  const handlePositionChange = (newPosition: string) => {
    setCurrentPosition(newPosition);
    setHasChanges(newPosition !== (contact.avatarPosition || '50% 50%'));
  };
  
  const handleSavePosition = () => {
    onUpdateAvatarPosition(contact.id, currentPosition);
    setHasChanges(false);
  };

  const contactsMap = useMemo(() => new Map(allContacts.map(c => [c.id, c])), [allContacts]);
  
  const fullName = useMemo(() => {
    return generateFullName(contact.id, contactsMap, language);
  }, [contact.id, contactsMap, language]);

  const color = useMemo(() => {
    const depth = getContactDepth(contact.id, contactsMap);
    return generationColors[depth % generationColors.length];
  }, [contact.id, contactsMap]);
  
  const spouse = useMemo(() => {
    if (!contact.spouseId) return null;
    return contactsMap.get(contact.spouseId);
  }, [contact.spouseId, contactsMap]);

  const parents = useMemo(() => {
    if (!contact.parentIds || contact.parentIds.length === 0) return { father: null, mother: null };
    const parentContacts = contact.parentIds.map(id => contactsMap.get(id)).filter((c): c is Contact => !!c);
    const father = parentContacts.find(p => p.gender === 'Male') || null;
    const mother = parentContacts.find(p => p.gender === 'Female') || null;
    return { father, mother };
  }, [contact.parentIds, contactsMap]);


  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-details-title"
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-md mx-4 border border-white/10 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 id="contact-details-title" className="text-2xl font-bold text-white">{t('Contact Details')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>
        
        <div className="flex flex-col items-center text-center">
            <PhotoPositioner
                contact={contact}
                color={color}
                position={currentPosition}
                onPositionChange={handlePositionChange}
                className="w-28 h-28 mb-4"
            />
            {hasChanges && (
                 <button 
                    onClick={handleSavePosition}
                    className="mb-4 -mt-2 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors text-sm animate-fade-in"
                >
                    {t('Save Position')}
                </button>
            )}
          <p className="text-xl font-semibold text-white leading-relaxed" style={{ wordBreak: 'break-word' }}>{fullName}</p>
          <p className="text-gray-400 mt-2">{t(contact.gender)}</p>
        </div>
        
        <div className="mt-6 border-t border-white/10 pt-4 space-y-2">
            <DetailRow label={t('Spouse')} value={spouse ? generateFullName(spouse.id, contactsMap, language) : undefined} />
            <DetailRow label={t('Relation Status')} value={spouse ? t(contact.relationStatus || 'Married') : undefined} />
            <DetailRow label={t('Father')} value={parents.father ? generateFullName(parents.father.id, contactsMap, language) : undefined} />
            <DetailRow label={t('Mother')} value={parents.mother ? generateFullName(parents.mother.id, contactsMap, language) : undefined} />
        </div>

        <div className="mt-6 border-t border-white/10 pt-4 flex gap-4">
            <button 
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex-grow"
            >
              {t('Close')}
            </button>
            <button 
              onClick={() => onEdit(contact.id)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex-grow"
            >
              {t('Edit')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailsModal;