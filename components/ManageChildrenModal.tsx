import React, { useState, useMemo } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import { generateFullName } from '../utils/family';

interface ManageChildrenModalProps {
  parent: Contact;
  allContacts: Contact[];
  onClose: () => void;
  onSave: (newChildren: Contact[], updatedSiblings: Contact[]) => void;
}

const ManageChildrenModal: React.FC<ManageChildrenModalProps> = ({ parent, allContacts, onClose, onSave }) => {
  const { t, language } = useTranslation();
  const contactsMap = useMemo(() => new Map(allContacts.map(c => [c.id, c])), [allContacts]);

  const { father, mother } = useMemo(() => {
    const primaryParentIsFather = parent.gender === 'Male';
    const father = primaryParentIsFather ? parent : (parent.spouseId ? contactsMap.get(parent.spouseId) : null);
    const mother = !primaryParentIsFather ? parent : (parent.spouseId ? contactsMap.get(parent.spouseId) : null);
    return { father, mother };
  }, [parent, contactsMap]);

  const parentIds = useMemo(() => [father?.id, mother?.id].filter((id): id is string => !!id), [father, mother]);
  
  const initialChildren = useMemo(() => {
    return allContacts
      .filter(c => c.parentIds?.some(pId => parentIds.includes(pId)))
      .sort((a, b) => (a.siblingOrder ?? 99) - (b.siblingOrder ?? 99));
  }, [allContacts, parentIds]);

  const [orderedChildren, setOrderedChildren] = useState(initialChildren);
  const [newChildName, setNewChildName] = useState('');
  const [newChildGender, setNewChildGender] = useState<'Male' | 'Female'>('Male');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [addChildError, setAddChildError] = useState('');

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) {
      setAddChildError(t('First Name Required'));
      return;
    }
    if (!father) return; // Safeguard

    setAddChildError(''); // Clear error on success

    const newChild: Contact = {
      id: `new-child-${Date.now()}-${Math.random()}`,
      firstNameEn: newChildName,
      lastNameEn: father.lastNameEn,
      familyName: father.familyName,
      gender: newChildGender,
      parentIds,
      avatar: `https://picsum.photos/seed/${Date.now()}/100`,
      includeInFamilyTree: true,
      siblingOrder: orderedChildren.length + 1,
      manualArabicApproval: false,
    };
    
    setOrderedChildren(prev => [...prev, newChild]);
    setNewChildName('');
    setNewChildGender('Male');
  };

  const handleSave = () => {
    const updatedSiblings = orderedChildren.map((child, index) => ({
      ...child,
      siblingOrder: index + 1
    }));
    
    const newChildren = updatedSiblings.filter(c => c.id.startsWith('new-child-'));
    onSave(newChildren, updatedSiblings);
  };
  
  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const draggedIndex = orderedChildren.findIndex(c => c.id === draggedItemId);
    const targetIndex = orderedChildren.findIndex(c => c.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrderedChildren = [...orderedChildren];
    const [draggedItem] = newOrderedChildren.splice(draggedIndex, 1);
    newOrderedChildren.splice(targetIndex, 0, draggedItem);
    
    setOrderedChildren(newOrderedChildren);
    setDraggedItemId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
  };


  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-lg mx-4 border border-white/10 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('Manage Children')}</h2>
            <p className="text-gray-400 mt-1">{t('Children of')} <span className="font-semibold text-white">{generateFullName(parent.id, contactsMap, language)}</span></p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <p className="text-sm text-gray-400">{t('Drag to reorder siblings.')}</p>
            {orderedChildren.length > 0 ? (
                <ul className="space-y-2">
                    {orderedChildren.map((child, index) => (
                        <li 
                            key={child.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, child.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, child.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-4 p-2 rounded-lg cursor-move transition-colors ${draggedItemId === child.id ? 'bg-indigo-500/30' : 'bg-gray-700/50'}`}
                        >
                            <span className="text-gray-400 font-mono text-sm">{index + 1}.</span>
                            <span className="flex-grow text-white">{child.firstNameEn}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${child.gender === 'Male' ? 'bg-blue-900 text-blue-300' : 'bg-pink-900 text-pink-300'}`}>
                                {t(child.gender)}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500 py-4">{t('No children yet.')}</p>
            )}

            <div className="border-t border-gray-700 pt-4 mt-4">
                <h3 className="text-lg font-semibold text-white mb-2">{t('Add a new child to this family:')}</h3>
                <form onSubmit={handleAddChild} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-grow">
                        <label htmlFor="newChildName" className="text-sm text-gray-300 block mb-1">{t('First Name')}</label>
                        <input
                            id="newChildName"
                            type="text"
                            value={newChildName}
                            onChange={e => {
                              setNewChildName(e.target.value);
                              if (addChildError) setAddChildError('');
                            }}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition"
                        />
                        {addChildError && <p className="text-red-400 text-sm mt-1">{addChildError}</p>}
                    </div>
                    <div>
                        <label htmlFor="newChildGender" className="text-sm text-gray-300 block mb-1">{t('Gender')}</label>
                        <select
                            id="newChildGender"
                            value={newChildGender}
                            onChange={e => setNewChildGender(e.target.value as 'Male' | 'Female')}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition"
                        >
                            <option value="Male">{t('Male')}</option>
                            <option value="Female">{t('Female')}</option>
                        </select>
                    </div>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
                        {t('Add Child')}
                    </button>
                </form>
            </div>
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">
            {t('Cancel')}
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">
            {t('Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageChildrenModal;