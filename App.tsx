import React, { useState, useCallback, useMemo } from 'react';
import FamilyTree from './components/FamilyTree';
import { initialContacts } from './data/mockData';
import type { Contact } from './types';
import ContactDetailsModal from './components/ContactDetailsModal';
import AddChildModal from './components/AddChildModal';
import { useTranslation } from './hooks/useTranslation';
import LanguageSwitcher from './components/LanguageSwitcher';
import Search from './components/Search';
import { deleteContactAndDescendants, findConnectionPath, generateFullName, generateRelationText, getFamilyForFocus, translateContacts, exportContactsToCSV } from './utils/family';
import EditContactModal from './components/EditContactModal';
import RelationModal from './components/RelationshipModal';
import AdminDataEditor from './components/AdminDataEditor';
import ImportModal from './components/ImportModal';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(translateContacts(initialContacts));
  const [viewedContact, setViewedContact] = useState<Contact | null>(null);
  const [parentForNewChild, setParentForNewChild] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [centerOnNodeId, setCenterOnNodeId] = useState<string | null>(null);
  const { language, t } = useTranslation();

  // State for the connection feature
  const [queryA, setQueryA] = useState('');
  const [queryB, setQueryB] = useState('');
  const [contactA, setContactA] = useState<Contact | null>(null);
  const [contactB, setContactB] = useState<Contact | null>(null);
  const [connectionPath, setConnectionPath] = useState<ReturnType<typeof findConnectionPath> | null>(null);
  
  // State for relation explanation
  const [relationExplanation, setRelationExplanation] = useState<string | null>(null);
  const [isRelationModalOpen, setIsRelationModalOpen] = useState(false);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

  // State for focus mode
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
  const [nodeToPin, setNodeToPin] = useState<string | null>(null);
  
  // State for data management
  const [isAdminEditorOpen, setIsAdminEditorOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);


  const contactsMap = useMemo(() => new Map(contacts.map(c => [c.id, c])), [contacts]);

  const displayedContacts = useMemo(() => {
    if (focusedContactId) {
      const lineageIds = getFamilyForFocus(focusedContactId, contacts);
      return contacts.filter(c => lineageIds.includes(c.id));
    }
    
    // Default view: Show ONLY the AlQasimi family tree.
    return contacts.filter(c => {
        return c.familyName === 'AlQasimi' && (c.includeInFamilyTree ?? true);
    });
    
  }, [focusedContactId, contacts]);

  const handleViewContact = useCallback((contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setViewedContact(contact);
    }
  }, [contacts]);

  const handleInitiateAddNewChild = useCallback((parentId: string) => {
    const parent = contacts.find(c => c.id === parentId);
    if (parent) {
      setParentForNewChild(parent);
    }
  }, [contacts]);

  const handleSaveNewChild = useCallback((newChildData: Omit<Contact, 'id' | 'avatar' | 'firstNameAr' | 'lastNameAr' | 'siblingOrder'>) => {
    const siblings = contacts.filter(c => 
        c.parentIds?.length && newChildData.parentIds?.length &&
        c.parentIds.some(pId => newChildData.parentIds!.includes(pId))
    );
    const maxOrder = Math.max(0, ...siblings.map(s => s.siblingOrder || 0));

    const newChild: Contact = {
        id: `contact-${Date.now()}`,
        ...newChildData,
        avatar: `https://picsum.photos/seed/${Date.now()}/100`,
        siblingOrder: maxOrder + 1,
        manualArabicApproval: false,
    };
    setContacts(prevContacts => translateContacts([...prevContacts, newChild]));
    setParentForNewChild(null);
  }, [contacts]);

  const handleInitiateEditContact = useCallback((contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setViewedContact(null); // Close details modal if open
      setEditingContact(contact);
    }
  }, [contacts]);

  const handleSaveEditedContact = useCallback((updatedContact: Contact) => {
    const oldContact = contactsMap.get(updatedContact.id);
    const oldSpouseId = oldContact?.spouseId;
    const newSpouseId = updatedContact.spouseId;

    // Find if the new spouse already had a spouse
    const newSpouseOldSpouseId = newSpouseId ? contactsMap.get(newSpouseId)?.spouseId : undefined;

    const newContacts = contacts.map(c => {
        // Rule 1: Always update the contact being edited
        if (c.id === updatedContact.id) {
            return updatedContact;
        }

        // Rule 2: Link the new spouse (and update status)
        if (c.id === newSpouseId) {
            return { ...c, spouseId: updatedContact.id, relationStatus: updatedContact.relationStatus };
        }

        // Rule 3: Unlink the old spouse, but only if they are not also the new spouse
        if (c.id === oldSpouseId && oldSpouseId !== newSpouseId) {
            return { ...c, spouseId: undefined, relationStatus: undefined };
        }
        
        // Rule 4: Unlink the old spouse of the new spouse, if applicable
        if (newSpouseOldSpouseId && c.id === newSpouseOldSpouseId && newSpouseOldSpouseId !== updatedContact.id) {
            return { ...c, spouseId: undefined, relationStatus: undefined };
        }
        
        // Unchanged contact
        return c;
    });

    setContacts(translateContacts(newContacts));
    setEditingContact(null);
  }, [contacts, contactsMap]);

  const handleDeleteContact = useCallback((contactId: string) => {
    if (contactId === 'alqasimi-root' || contactId === 'alshamsi-root' || contactId === 'alsuwaidi-root') {
        alert("The root of a family cannot be deleted.");
        return;
    }
    setContacts(prevContacts => deleteContactAndDescendants(contactId, prevContacts));
  }, []);

  const handleFitToScreen = useCallback(() => {
    setFitTrigger(t => t + 1);
  }, []);

  const handleSelectA = (contact: Contact) => {
    setContactA(contact);
    setQueryA(generateFullName(contact.id, contactsMap, language));
    setCenterOnNodeId(contact.id);
  };

  const handleSelectB = (contact: Contact) => {
    setContactB(contact);
    setQueryB(generateFullName(contact.id, contactsMap, language));
    setCenterOnNodeId(null);
  };
  
  const handleQueryAChange = (query: string) => {
    setQueryA(query);
    if (!query) {
      setContactA(null);
      if (connectionPath) {
        setConnectionPath(null);
      }
    }
  };

  const handleQueryBChange = (query: string) => {
    setQueryB(query);
    if (!query) {
      setContactB(null);
      if (connectionPath) {
        setConnectionPath(null);
      }
    }
  };


  const handleFindConnection = () => {
    if (contactA && contactB) {
      const path = findConnectionPath(contactA.id, contactB.id, contactsMap);
      setConnectionPath(path);
      // Automatically fit the view to the connection path
      if (path) {
        handleFitToScreen();
      }
    }
  };

  const handleClearConnection = () => {
    setConnectionPath(null);
    setContactA(null);
    setContactB(null);
    setQueryA('');
    setQueryB('');
  };
  
  const handleExplainRelation = async () => {
    if (!contactA || !contactB || !connectionPath) return;

    setIsExplanationLoading(true);
    setRelationExplanation(null);
    setIsRelationModalOpen(true);
    
    try {
        const explanation = await generateRelationText(contactA, contactB, connectionPath, contactsMap, t, language);
        setRelationExplanation(explanation);
    } catch (error) {
        console.error("Failed to explain relation:", error);
        setRelationExplanation(t('Relation could not be determined.'));
    } finally {
        setIsExplanationLoading(false);
    }
  };

  const handleFocusContact = useCallback((contactId: string) => {
    setFocusedContactId(contactId);
    setCenterOnNodeId(contactId);
    handleClearConnection();
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusedContactId(null);
    // Automatically fit the view to the full tree
    handleFitToScreen();
  }, [handleFitToScreen]);

  const handleViewInFullTree = useCallback(() => {
    if (focusedContactId) {
      setNodeToPin(focusedContactId);
      setFocusedContactId(null);
    }
  }, [focusedContactId]);
  
  const handleSaveChangesFromEditor = (updatedContacts: Contact[]) => {
    setContacts(translateContacts(updatedContacts));
    setIsAdminEditorOpen(false);
  };
  
  const handleImportData = (importedContacts: Contact[]) => {
    setContacts(translateContacts(importedContacts));
    alert('Data imported successfully!');
  };

  const handleExportData = () => {
    exportContactsToCSV(contacts);
  };

  const handleUpdateAvatarPosition = useCallback((contactId: string, avatarPosition: string) => {
    setContacts(prev => {
      const newContacts = prev.map(c => {
        if (c.id === contactId) {
          return { ...c, avatarPosition };
        }
        return c;
      });
      // Update viewed contact as well to re-render the modal with new data
      if (viewedContact?.id === contactId) {
        setViewedContact(newContacts.find(c => c.id === contactId) || null);
      }
      return newContacts;
    });
  }, [viewedContact?.id]);

  return (
    <main className="h-screen bg-gray-900 text-gray-100 p-4 lg:p-8 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-7xl mx-auto flex flex-col flex-grow">
        <header className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className={language === 'ar' ? 'text-right' : 'text-left'}>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">{t('AlQasimi Family Tree')}</h1>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {isAdminEditorOpen ? (
                <button
                  onClick={() => setIsAdminEditorOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
                >
                  {t('Return to Tree View')}
                </button>
              ) : (
                <>
                  {focusedContactId && (
                    <>
                      <button
                        onClick={handleViewInFullTree}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors animate-fade-in"
                      >
                        {t('View in Full Tree')}
                      </button>
                      <button
                        onClick={handleClearFocus}
                        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors animate-fade-in"
                      >
                        {t('Show Full Tree')}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleFitToScreen}
                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
                  >
                    {t('Fit to Screen')}
                  </button>
                </>
              )}
               <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
                >
                  {t('Import Data')}
                </button>
                <button
                  onClick={handleExportData}
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
                >
                  {t('Export Data')}
                </button>
              <button
                onClick={() => setIsAdminEditorOpen(true)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
              >
                {t('Manage Data')}
              </button>
              <LanguageSwitcher />
            </div>
          </div>
          {!isAdminEditorOpen && (
             <div className="mt-4 space-y-3">
              <Search 
                value={queryA} 
                onQueryChange={handleQueryAChange}
                contacts={contacts} 
                onSelect={handleSelectA} 
              />
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="w-full flex-grow">
                  <Search
                    value={queryB}
                    onQueryChange={handleQueryBChange}
                    contacts={contacts}
                    onSelect={handleSelectB}
                    placeholder={t('Find connection with...')}
                  />
                </div>
                {!connectionPath ? (
                  <button
                    onClick={handleFindConnection}
                    disabled={!contactA || !contactB}
                    className="px-5 py-2 w-full sm:w-auto rounded-lg font-semibold transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {t('Find Connection')}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleExplainRelation}
                      className="px-5 py-2 w-full flex-grow rounded-lg font-semibold transition-colors bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {t('Explain Relation')}
                    </button>
                    <button
                      onClick={handleClearConnection}
                      className="px-5 py-2 w-full flex-grow rounded-lg font-semibold transition-colors bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {t('Clear Connection')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>
        <div className="flex-grow min-h-0">
          {isAdminEditorOpen ? (
            <AdminDataEditor
              initialContacts={contacts} 
              onSaveChanges={handleSaveChangesFromEditor}
              onCancel={() => setIsAdminEditorOpen(false)}
            />
          ) : (
            <FamilyTree
              contacts={displayedContacts}
              onViewContact={handleViewContact}
              onAddNewChild={handleInitiateAddNewChild}
              onEditContact={handleInitiateEditContact}
              onDeleteContact={handleDeleteContact}
              onFocusContact={handleFocusContact}
              focusedContactId={focusedContactId}
              fitTrigger={fitTrigger}
              centerOnNodeId={centerOnNodeId}
              onCenterComplete={() => setCenterOnNodeId(null)}
              connectionPath={connectionPath}
              nodeToPin={nodeToPin}
              onPinComplete={() => setNodeToPin(null)}
            />
          )}
        </div>
      </div>
      
      {viewedContact && (
        <ContactDetailsModal 
          contact={viewedContact}
          allContacts={contacts}
          onClose={() => setViewedContact(null)}
          onEdit={handleInitiateEditContact}
          onUpdateAvatarPosition={handleUpdateAvatarPosition}
        />
      )}
      
      {parentForNewChild && (
        <AddChildModal 
          parent={parentForNewChild} 
          onClose={() => setParentForNewChild(null)}
          onAddChild={handleSaveNewChild} 
        />
      )}

      {editingContact && (
        <EditContactModal
          contact={editingContact}
          allContacts={contacts}
          onClose={() => setEditingContact(null)}
          onSave={handleSaveEditedContact}
        />
      )}

      {isRelationModalOpen && (
        <RelationModal
          isLoading={isExplanationLoading}
          explanation={relationExplanation}
          onClose={() => setIsRelationModalOpen(false)}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportData}
        />
      )}
    </main>
  );
};

export default App;