import React, { useState, useEffect, useMemo } from 'react';
import { Contact } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import ContactSelector from './ContactSelector';
import ConfirmationModal from './ConfirmationModal';
import AddPersonModal from './AddPersonModal';
import ManageChildrenModal from './ManageChildrenModal';
import { generateFullName, deleteContactAndDescendants } from '../utils/family';

interface AdminDataEditorProps {
  initialContacts: Contact[];
  onSaveChanges: (updatedContacts: Contact[]) => void;
  onCancel: () => void;
}

const ROWS_PER_PAGE = 20;

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

const AdminDataEditor: React.FC<AdminDataEditorProps> = ({ initialContacts, onSaveChanges, onCancel }) => {
  const { t, language } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Contact | 'fullName'; direction: 'ascending' | 'descending' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingChildrenOf, setEditingChildrenOf] = useState<Contact | null>(null);
  
  const contactsMap = useMemo(() => new Map(initialContacts.map(c => [c.id, c])), [initialContacts]);

  const uniqueFamilyNames = useMemo(() => {
    const names = new Set(initialContacts.map(c => c.familyName));
    return Array.from(names).sort();
  }, [initialContacts]);

  useEffect(() => {
    // Deep copy and enrich with parent info for easier editing
    // FIX: Explicitly type `enrichedContacts` to prevent `contacts` state from being inferred as `any[]`.
    const enrichedContacts: Contact[] = JSON.parse(JSON.stringify(initialContacts));
    setContacts(enrichedContacts);
  }, [initialContacts]);

  const handleInputChange = (id: string, field: keyof Contact, value: any) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };
  
  const handleParentChange = (id: string, parentType: 'father' | 'mother', parent: Contact | null) => {
    setContacts(prev => prev.map(c => {
        if (c.id !== id) return c;
        
        const otherParentId = (parentType === 'father')
          ? c.parentIds?.find(pId => contactsMap.get(pId)?.gender === 'Female')
          : c.parentIds?.find(pId => contactsMap.get(pId)?.gender === 'Male');
        
        const newParentIds = [otherParentId, parent?.id].filter((pId): pId is string => !!pId);
        
        return { ...c, parentIds: Array.from(new Set(newParentIds)) };
    }));
  };
  
  const handleSpouseChange = (id: string, spouse: Contact | null) => {
     setContacts(prev => prev.map(c => c.id === id ? { ...c, spouseId: spouse?.id, relationStatus: spouse ? c.relationStatus || 'Married' : undefined } : c));
  };

  const handleSaveNewPerson = (newContact: Contact) => {
    setContacts(prev => [newContact, ...prev]);
    setIsAddModalOpen(false);
    setCurrentPage(1);
  };
  
  const handleDeleteRequest = (id: string) => {
    setContactToDelete(id);
  };

  const handleConfirmDelete = () => {
      if(contactToDelete) {
        setContacts(prev => deleteContactAndDescendants(contactToDelete, prev));
      }
      setContactToDelete(null);
  }
  
  const processAndSaveChanges = (contactsToSave: Contact[]) => {
    let processedContacts = [...contactsToSave];
    const contactsToUpdate = new Map<string, Partial<Contact>>();

    // Bi-directional spouse linking logic based on changes from the initial state
    for (const contact of processedContacts) {
        const originalContact = contactsMap.get(contact.id);
        const originalSpouseId = originalContact?.spouseId;
        const newSpouseId = contact.spouseId;

        if (originalSpouseId !== newSpouseId) {
            // Remove link from old spouse
            if (originalSpouseId) {
              // FIX: Add explicit type to ensure the update object is correctly typed as Partial<Contact>.
              const oldSpouseUpdate: Partial<Contact> = contactsToUpdate.get(originalSpouseId) || {};
              oldSpouseUpdate.spouseId = undefined;
              oldSpouseUpdate.relationStatus = undefined;
              contactsToUpdate.set(originalSpouseId, oldSpouseUpdate);
            }

            // Add link to new spouse
            if (newSpouseId) {
              // FIX: Add explicit type to ensure the update object is correctly typed as Partial<Contact>.
              const newSpouseUpdate: Partial<Contact> = contactsToUpdate.get(newSpouseId) || {};
              newSpouseUpdate.spouseId = contact.id;
              newSpouseUpdate.relationStatus = contact.relationStatus;
              contactsToUpdate.set(newSpouseId, newSpouseUpdate);
            }
        }
    }

    processedContacts = processedContacts.map(c => {
        if (contactsToUpdate.has(c.id)) {
            // FIX: By assigning the payload to an intermediate variable and using spread syntax,
            // we ensure TypeScript can correctly infer the resulting object type as 'Contact',
            // resolving potential "spread type" and "unknown[]" errors.
            const updatePayload = contactsToUpdate.get(c.id)!;
            return { ...c, ...updatePayload };
        }
        return c;
    });

    onSaveChanges(processedContacts);
  };

  const handleSaveChangesFromChildrenModal = (newChildren: Contact[], updatedSiblings: Contact[]) => {
    const parent = editingChildrenOf;
    if (!parent) {
      setEditingChildrenOf(null);
      return;
    }

    // Identify all children related to this parent couple from the current editor state.
    const spouseId = parent.spouseId;
    const parentIds = [parent.id, spouseId].filter((id): id is string => !!id);
    
    const oldChildrenIds = new Set(
      contacts
        .filter(c => c.parentIds?.some(pId => parentIds.includes(pId)))
        .map(c => c.id)
    );

    // Filter out all the old children. We will replace them with the definitive `updatedSiblings` list.
    const contactsWithoutOldChildren = contacts.filter(c => !oldChildrenIds.has(c.id));

    // The `updatedSiblings` list from the modal is the new source of truth.
    const finalContacts = [...contactsWithoutOldChildren, ...updatedSiblings];

    // Close the children modal
    setEditingChildrenOf(null);
    
    // Now call the main save function which will update App.tsx and close the editor.
    processAndSaveChanges(finalContacts);
  };


  const handleSaveChangesClick = () => {
      processAndSaveChanges(contacts);
  };

  const sortedAndFilteredContacts = useMemo(() => {
    // FIX: Explicitly type `currentContactsMap` to prevent a TypeScript inference error where it becomes `Map<unknown, unknown>`.
    const currentContactsMap: Map<string, Contact> = new Map(contacts.map(c => [c.id, c]));
    
    const contactsWithFullName = contacts.map(c => {
        const fullNameEn = generateFullName(c.id, currentContactsMap, 'en');
        const fullNameAr = generateFullName(c.id, currentContactsMap, 'ar');
        return {
            ...c,
            fullName: language === 'en' ? fullNameEn : fullNameAr,
            fullNameEn,
            fullNameAr,
            namePartsEn: fullNameEn.split(' ')
        };
    });

    let filtered = contactsWithFullName;
    if (searchTerm.trim()) {
        const isArabicQuery = /[\u0600-\u06FF]/.test(searchTerm);

        if (isArabicQuery) {
            filtered = contactsWithFullName.filter(c =>
                c.fullNameAr.includes(searchTerm)
            );
        } else {
            const lowerCaseSearch = searchTerm.toLowerCase();
            const initialsQuery = lowerCaseSearch.replace(/\s+/g, '');

            filtered = contactsWithFullName.filter(c => {
                const substringMatch = c.fullNameEn.toLowerCase().includes(lowerCaseSearch);
                const initialsMatch = initialsQuery.length > 1 && matchInitials(initialsQuery, c.namePartsEn);
                return substringMatch || initialsMatch;
            });
        }
    }

    if (sortConfig !== null) {
        // Create a mutable copy for sorting
        filtered = [...filtered].sort((a, b) => {
            const valA = a[sortConfig.key as keyof typeof a] || '';
            const valB = b[sortConfig.key as keyof typeof b] || '';
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }
    return filtered;
  }, [contacts, searchTerm, sortConfig, language]);
  
  const totalPages = Math.ceil(sortedAndFilteredContacts.length / ROWS_PER_PAGE);
  const paginatedContacts = sortedAndFilteredContacts.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const requestSort = (key: keyof Contact | 'fullName') => {
      let direction: 'ascending' | 'descending' = 'ascending';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
          direction = 'descending';
      }
      setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: keyof Contact | 'fullName') => {
      if (!sortConfig || sortConfig.key !== key) return null;
      return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const inputStyles = "bg-gray-800 focus:bg-gray-700 w-full outline-none px-2 py-1 rounded-md border border-transparent focus:border-indigo-500";
  const selectStyles = "bg-gray-800 focus:bg-gray-700 w-full outline-none px-1 py-1 rounded-md border border-transparent focus:border-indigo-500";


  return (
    <div className="flex-grow flex flex-col bg-gray-900/50 border border-white/10 rounded-2xl p-4 animate-fade-in-scale min-h-0">
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <h2 className="text-2xl font-bold text-white">{t('Admin Data Editor')}</h2>
        <div className="flex-grow">
             <input
                type="text"
                placeholder={t('Search by name in editor...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition max-w-xs"
            />
        </div>
      </div>
      <div className="flex-grow overflow-auto relative rounded-lg border border-gray-700">
        <table className="w-full min-w-[130rem] text-sm text-left text-gray-300 table-fixed">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0 z-10">
            <tr>
              <th scope="col" className="px-3 py-3 cursor-pointer select-none w-1/6" onClick={() => requestSort('fullName')}>
                {t('Full Name')} {getSortIndicator('fullName')}
              </th>
              <th scope="col" className="px-3 py-3 cursor-pointer select-none w-[8%]" onClick={() => requestSort('firstNameEn')}>
                {t('First Name')} {getSortIndicator('firstNameEn')}
              </th>
              <th scope="col" className="px-3 py-3 cursor-pointer select-none w-[8%]" onClick={() => requestSort('familyName')}>
                {t('Family Name')} {getSortIndicator('familyName')}
              </th>
               <th scope="col" className="px-3 py-3 cursor-pointer select-none w-[10%]" onClick={() => requestSort('avatar')}>
                {t('Avatar URL')} {getSortIndicator('avatar')}
              </th>
              <th scope="col" className="px-3 py-3 cursor-pointer select-none w-[5%]" onClick={() => requestSort('gender')}>
                {t('Gender')} {getSortIndicator('gender')}
              </th>
              <th scope="col" className="px-3 py-3 w-[10%]">{t('Father')}</th>
              <th scope="col" className="px-3 py-3 w-[10%]">{t('Mother')}</th>
              <th scope="col" className="px-3 py-3 w-[10%]">{t('Spouse')}</th>
              <th scope="col" className="px-3 py-3 w-[6%]">{t('Relation Status')}</th>
              <th scope="col" className="px-3 py-3 cursor-pointer select-none w-[4%]" onClick={() => requestSort('includeInFamilyTree')}>
                {t('In Tree')} {getSortIndicator('includeInFamilyTree')}
              </th>
              <th scope="col" className="px-3 py-3 cursor-pointer select-none w-[4%]" onClick={() => requestSort('siblingOrder')}>
                {t('Sibling Order')} {getSortIndicator('siblingOrder')}
              </th>
              <th scope="col" className="px-3 py-3 w-[4%]">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800">
            {paginatedContacts.map((contact) => {
               const fatherId = contact.parentIds?.find(pId => initialContacts.find(c => c.id === pId)?.gender === 'Male');
               const motherId = contact.parentIds?.find(pId => initialContacts.find(c => c.id === pId)?.gender === 'Female');
               return (
                  <React.Fragment key={contact.id}>
                    <tr className="border-b border-gray-700 hover:bg-gray-700/50">
                        <td className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis">
                            {contact.fullName}
                        </td>
                        <td className="px-2 py-1"><input type="text" value={contact.firstNameEn} onChange={(e) => handleInputChange(contact.id, 'firstNameEn', e.target.value)} className={inputStyles}/></td>
                        <td className="px-2 py-1">
                          <select value={contact.familyName} onChange={(e) => handleInputChange(contact.id, 'familyName', e.target.value)} className={selectStyles}>
                            {uniqueFamilyNames.map(name => (
                              <option key={name} value={name} className="bg-gray-800">{name}</option>
                            ))}
                          </select>
                        </td>
                         <td className="px-2 py-1"><input type="url" value={contact.avatar} onChange={(e) => handleInputChange(contact.id, 'avatar', e.target.value)} className={inputStyles}/></td>
                        <td className="px-2 py-1">
                            <select value={contact.gender} onChange={(e) => handleInputChange(contact.id, 'gender', e.target.value)} className={selectStyles}>
                                <option className="bg-gray-800" value="Male">{t('Male')}</option>
                                <option className="bg-gray-800" value="Female">{t('Female')}</option>
                            </select>
                        </td>
                        <td className="px-2 py-1">
                            <ContactSelector contacts={initialContacts} currentValue={fatherId} onSelect={(p) => handleParentChange(contact.id, 'father', p)} filter={c => c.id !== contact.id && c.gender === 'Male'} placeholder={t("Father")}/>
                        </td>
                         <td className="px-2 py-1">
                            <ContactSelector contacts={initialContacts} currentValue={motherId} onSelect={(p) => handleParentChange(contact.id, 'mother', p)} filter={c => c.id !== contact.id && c.gender === 'Female'} placeholder={t("Mother")}/>
                        </td>
                        <td className="px-2 py-1">
                            <ContactSelector contacts={initialContacts} currentValue={contact.spouseId} onSelect={(s) => handleSpouseChange(contact.id, s)} filter={c => c.id !== contact.id && c.gender !== contact.gender} placeholder={t("Spouse")}/>
                        </td>
                        <td className="px-2 py-1">
                            <select disabled={!contact.spouseId} value={contact.relationStatus || ''} onChange={(e) => handleInputChange(contact.id, 'relationStatus', e.target.value)} className={`${selectStyles} disabled:opacity-50 disabled:cursor-not-allowed`}>
                                <option className="bg-gray-800" value=""></option>
                                <option className="bg-gray-800" value="Married">{t('Married')}</option>
                                <option className="bg-gray-800" value="Divorced">{t('Divorced')}</option>
                            </select>
                        </td>
                        <td className="px-2 py-1 text-center"><input type="checkbox" checked={contact.includeInFamilyTree ?? true} onChange={(e) => handleInputChange(contact.id, 'includeInFamilyTree', e.target.checked)} className="h-4 w-4 text-indigo-600 bg-gray-900 border-gray-700 rounded focus:ring-indigo-500" /></td>
                        <td className="px-2 py-1"><input type="number" value={contact.siblingOrder || ''} onChange={(e) => handleInputChange(contact.id, 'siblingOrder', e.target.value ? parseInt(e.target.value, 10) : undefined)} className={`${inputStyles} w-16`}/></td>
                        <td className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setEditingChildrenOf(contact)}
                                    title={t('Manage Children')}
                                    className="text-blue-400 hover:text-blue-300 font-bold text-lg"
                                >
                                    👨‍👩‍👧‍👦
                                </button>
                                <button onClick={() => handleDeleteRequest(contact.id)} title={t('Delete')} className="text-red-500 hover:text-red-400 font-bold text-lg">
                                  🗑️
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr className="bg-gray-800/50 border-b-2 border-gray-700">
                        <td className="px-2 py-2"></td>
                        <td className="px-2 py-2">
                            <input 
                                type="text" 
                                value={contact.firstNameAr || ''} 
                                onChange={(e) => handleInputChange(contact.id, 'firstNameAr', e.target.value)} 
                                placeholder={t('First Name (Arabic)')}
                                className={`${inputStyles} text-right`}
                                dir="rtl"
                            />
                        </td>
                        <td className="px-2 py-2">
                            <input 
                                type="text" 
                                value={contact.lastNameAr || ''} 
                                onChange={(e) => handleInputChange(contact.id, 'lastNameAr', e.target.value)} 
                                placeholder={t('Family Name (Arabic)')}
                                className={`${inputStyles} text-right`}
                                dir="rtl"
                            />
                        </td>
                        <td className="px-2 py-2 text-center" colSpan={2}>
                            <div className="flex items-center justify-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={contact.manualArabicApproval ?? false} 
                                    onChange={(e) => handleInputChange(contact.id, 'manualArabicApproval', e.target.checked)} 
                                    id={`approve-${contact.id}`}
                                    className="h-4 w-4 text-indigo-600 bg-gray-900 border-gray-700 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor={`approve-${contact.id}`} className="text-xs text-gray-400 whitespace-nowrap">{t('Manual Approval')}</label>
                            </div>
                        </td>
                        <td colSpan={7}></td>
                    </tr>
                  </React.Fragment>
               )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 justify-between items-center">
        <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">{t('Add New Person')}</button>
        
        {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">First</button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                <span>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">Last</button>
            </div>
        )}

        <div className="flex gap-4">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">{t('Cancel')}</button>
            <button onClick={handleSaveChangesClick} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors">{t('Save Changes')}</button>
        </div>
      </div>
      <ConfirmationModal
        isOpen={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t('Delete Confirmation Title')}
      >
        <p>{t('Delete Confirmation')}</p>
      </ConfirmationModal>
      {isAddModalOpen && (
        <AddPersonModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSaveNewPerson}
          allContacts={initialContacts}
        />
      )}
      {editingChildrenOf && (
        <ManageChildrenModal
          parent={editingChildrenOf}
          allContacts={contacts}
          onClose={() => setEditingChildrenOf(null)}
          onSave={handleSaveChangesFromChildrenModal}
        />
      )}
    </div>
  );
};

export default AdminDataEditor;