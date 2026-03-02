import type { Contact } from '../types';
import { nameTranslations } from "../data/translations";
import { generateGeminiExplanation } from './gemini';

export const generationColors = [
  '#a78bfa', // violet-400
  '#818cf8', // indigo-400
  '#60a5fa', // blue-400
  '#38bdf8', // lightBlue-400
  '#22d3ee', // cyan-400
  '#2dd4bf', // teal-400
  '#4ade80', // green-400
];

export const translateContacts = (contactsToTranslate: Contact[]): Contact[] => {
    return contactsToTranslate.map(contact => {
        // If manual approval is checked, we assume the AR names are final and don't touch them.
        if (contact.manualArabicApproval) {
            return contact;
        }
        return {
            ...contact,
            // Keep existing AR name if present, otherwise translate from EN.
            // This allows for partial manual entry without being overwritten.
            firstNameAr: contact.firstNameAr || nameTranslations[contact.firstNameEn] || contact.firstNameEn,
            lastNameAr: contact.lastNameAr || nameTranslations[contact.lastNameEn] || contact.lastNameEn,
        };
    });
};

export const getContactDepth = (
  contactId: string,
  contactsMap: Map<string, Contact>
): number => {
  let depth = 0;
  let currentContact = contactsMap.get(contactId);

  while (currentContact) {
    depth++;
    const parentContacts = currentContact.parentIds?.map(id => contactsMap.get(id)).filter(Boolean) as Contact[] || [];
    
    // Stop if there are no parents
    if (parentContacts.length === 0) {
      break;
    }

    // Prioritize the father for depth calculation to match the visual patrilineal tree layout
    const father = parentContacts.find(p => p.gender === 'Male');
    
    if (father) {
      currentContact = father;
    } else {
      // If no father, stop traversing to avoid jumping trees unexpectedly
      currentContact = undefined;
    }
  }
  return depth > 0 ? depth -1 : 0;
};

export const generateFullName = (
  contactId: string,
  contactsMap: Map<string, Contact>,
  language: 'en' | 'ar'
): string => {
  const contact = contactsMap.get(contactId);
  if (!contact) return '';

  // Root nodes are just their first name.
  if (!contact.parentIds || contact.parentIds.length === 0) {
    return language === 'ar' ? (contact.firstNameAr || contact.firstNameEn) : contact.firstNameEn;
  }

  const nameParts: string[] = [];
  let currentContact: Contact | undefined = contact;

  // Use the patrilineal line for the full name.
  while (currentContact) {
    // Check if current is a root node
    if (!currentContact.parentIds || currentContact.parentIds.length === 0) {
        break;
    }
    const firstName = language === 'ar' ? currentContact.firstNameAr || currentContact.firstNameEn : currentContact.firstNameEn;
    nameParts.push(firstName);
    
    const parentContacts = currentContact.parentIds?.map(id => contactsMap.get(id)).filter(Boolean) as Contact[] || [];
    const father = parentContacts.find(p => p.gender === 'Male');

    currentContact = father;
  }
  
  const separator = ' ';
  const lineageName = nameParts.join(separator);

  const familyName = contact.familyName
    ? (language === 'ar' ? (nameTranslations[contact.familyName] || contact.familyName) : contact.familyName)
    : '';

  return `${lineageName} ${familyName}`.trim();
};

export const findConnectionPath = (
  contactIdA: string,
  contactIdB: string,
  contactsMap: Map<string, Contact>
): { 
  nodes: string[]; 
  links: [string, string][]; 
  orderedPath: string[];
  lcaId: string;
  pathA: string[];
  pathB: string[];
} | null => {
  if (contactIdA === contactIdB) return null;

  const queueA: [string, string[]][] = [[contactIdA, [contactIdA]]];
  const visitedA = new Map<string, string[]>();
  visitedA.set(contactIdA, [contactIdA]);

  const queueB: [string, string[]][] = [[contactIdB, [contactIdB]]];
  const visitedB = new Map<string, string[]>();
  visitedB.set(contactIdB, [contactIdB]);

  let lcaId: string | null = null;
  let pathA: string[] = [];
  let pathB: string[] = [];
  
  if (visitedA.has(contactIdB)) {
    lcaId = contactIdB;
    pathA = visitedA.get(contactIdB)!;
    pathB = [contactIdB];
  } else if (visitedB.has(contactIdA)) {
    lcaId = contactIdA;
    pathA = [contactIdA];
    pathB = visitedB.get(contactIdA)!;
  }
  
  while (queueA.length > 0 || queueB.length > 0) {
    if (lcaId) break;

    if (queueA.length > 0) {
      const [currentId, currentPath] = queueA.shift()!;
      const currentContact = contactsMap.get(currentId);
      for (const parentId of currentContact?.parentIds || []) {
        if (!visitedA.has(parentId)) {
          const newPath = [...currentPath, parentId];
          visitedA.set(parentId, newPath);
          queueA.push([parentId, newPath]);
          if (visitedB.has(parentId)) {
            lcaId = parentId;
            pathA = newPath;
            pathB = visitedB.get(parentId)!;
            break;
          }
        }
      }
    }
    if (lcaId) break;

    if (queueB.length > 0) {
      const [currentId, currentPath] = queueB.shift()!;
      const currentContact = contactsMap.get(currentId);
      for (const parentId of currentContact?.parentIds || []) {
        if (!visitedB.has(parentId)) {
          const newPath = [...currentPath, parentId];
          visitedB.set(parentId, newPath);
          queueB.push([parentId, newPath]);
          if (visitedA.has(parentId)) {
            lcaId = parentId;
            pathA = visitedA.get(parentId)!;
            pathB = newPath;
            break;
          }
        }
      }
    }
  }

  if (!lcaId) return null;

  const path_lca_to_B = [...pathB].reverse().slice(1);
  const orderedPath = [...pathA, ...path_lca_to_B];
  const nodeIds = [...new Set(orderedPath)];

  const linksA = pathA.length > 1 ? pathA.slice(0, -1).map((id, i) => [pathA[i+1], id] as [string, string]) : [];
  const linksB = pathB.length > 1 ? pathB.slice(0, -1).map((id, i) => [pathB[i+1], id] as [string, string]) : [];
  
  const links = [...linksA, ...linksB];

  return { nodes: nodeIds, links, orderedPath, lcaId, pathA, pathB };
};

const getDescendantIdsRecursive = (contactId: string, contactsMap: Map<string, Contact>, allContacts: Contact[]): string[] => {
    const descendants: string[] = [];
    const children = allContacts.filter(c => c.parentIds?.includes(contactId));
    for (const child of children) {
        descendants.push(child.id);
        descendants.push(...getDescendantIdsRecursive(child.id, contactsMap, allContacts));
    }
    return descendants;
};

export const deleteContactAndDescendants = (contactIdToDelete: string, allContacts: Contact[]): Contact[] => {
    const contactsMap = new Map(allContacts.map(c => [c.id, c]));
    const contactToDelete = contactsMap.get(contactIdToDelete);
    if (!contactToDelete) return allContacts;

    const idsToDelete = new Set([contactIdToDelete, ...getDescendantIdsRecursive(contactIdToDelete, contactsMap, allContacts)]);
    
    // Find all spouses of the people being deleted
    const spousesToUnlink = new Set<string>();
    idsToDelete.forEach(id => {
        const contact = contactsMap.get(id);
        if (contact?.spouseId && !idsToDelete.has(contact.spouseId)) {
            spousesToUnlink.add(contact.spouseId);
        }
    });
    
    let remainingContacts = allContacts.filter(c => !idsToDelete.has(c.id));
    
    // Unlink the spouses of the deleted contacts
    remainingContacts = remainingContacts.map(c => {
        if (spousesToUnlink.has(c.id)) {
            return { ...c, spouseId: undefined, relationStatus: undefined };
        }
        return c;
    });

    return remainingContacts;
};

export const generateRelationText = async (
  contactA: Contact,
  contactB: Contact,
  connectionPath: NonNullable<ReturnType<typeof findConnectionPath>>,
  contactsMap: Map<string, Contact>,
  t: (key: string) => string,
  language: 'en' | 'ar'
): Promise<string> => {
    const { lcaId, pathA, pathB } = connectionPath;
    if (!lcaId) return t('No Common Ancestor');

    const nameA = generateFullName(contactA.id, contactsMap, language);
    const nameB = generateFullName(contactB.id, contactsMap, language);
    
    const lcaContact = contactsMap.get(lcaId);
    if (!lcaContact) return t('Relation could not be determined.');
    const lcaName = language === 'ar' ? (lcaContact.firstNameAr || lcaContact.firstNameEn) : lcaContact.firstNameEn;
    
    // Helper to get names for a path
    const getPathNames = (path: string[]): string => {
        return path
            .map(id => contactsMap.get(id))
            .filter((c): c is Contact => !!c)
            .map(c => language === 'ar' ? (c.firstNameAr || c.firstNameEn) : c.firstNameEn)
            .join(language === 'ar' ? ' -> ' : ' -> ');
    };

    const pathA_names = getPathNames(pathA);
    const pathB_names = getPathNames(pathB);
    
    // Construct a detailed prompt for Gemini
    const prompt = `Based on the following family tree paths, explain the relationship between ${nameA} and ${nameB} in one simple, clear sentence.
The paths go from the person to their oldest known ancestor in that line.

Path for ${nameA}: ${pathA_names}
Path for ${nameB}: ${pathB_names}

The first common ancestor in their paths is ${lcaName}.

Please provide the explanation in ${language === 'ar' ? 'Arabic' : 'English'}. For example: "Person X is Person Y's first cousin." or "Person X is Person Y's grandfather."`;

    // Call the Gemini utility function
    const explanation = await generateGeminiExplanation(prompt);
    
    return explanation;
};

export const getFamilyForFocus = (
  focusedContactId: string,
  allContacts: Contact[]
): string[] => {
  const familyIds = new Set<string>();
  const contactsMap = new Map(allContacts.map(c => [c.id, c]));

  // Step 1: Add the focused person.
  if (contactsMap.has(focusedContactId)) {
    familyIds.add(focusedContactId);
  }

  // Step 2: Traverse upwards to gather all direct ancestors (the "bloodline").
  const ancestorQueue: string[] = [focusedContactId];
  const processed = new Set<string>(); // Prevent cycles

  while (ancestorQueue.length > 0) {
    const currentId = ancestorQueue.shift()!;
    if (processed.has(currentId)) continue;
    processed.add(currentId);

    const contact = contactsMap.get(currentId);
    if (contact?.parentIds) {
      for (const parentId of contact.parentIds) {
        if (contactsMap.has(parentId)) {
          familyIds.add(parentId);
          ancestorQueue.push(parentId);
        }
      }
    }
  }

  // Step 3: Traverse downwards to get direct children of the focused person.
  const children = allContacts.filter(c => c.parentIds?.includes(focusedContactId));
  for (const child of children) {
    familyIds.add(child.id);
  }

  // Step 4: Add the necessary spouses/co-parents for the people in the direct line.
  // A spouse is "necessary" if they are a parent of someone else already in the `familyIds` set.
  const directLineIds = Array.from(familyIds); // Create a snapshot before adding spouses
  for (const personId of directLineIds) {
    // Find children of this person who are also in the direct line.
    const relevantChildren = allContacts.filter(
      c => directLineIds.includes(c.id) && c.parentIds?.includes(personId)
    );

    // For each relevant child, find their *other* parent(s) and add them.
    for (const child of relevantChildren) {
      child.parentIds?.forEach(pId => {
        // The other parent is one who isn't the person we are currently checking.
        if (pId !== personId && contactsMap.has(pId)) {
          familyIds.add(pId);
        }
      });
    }
  }

  return Array.from(familyIds);
};

export const exportContactsToCSV = (contacts: Contact[]) => {
  const header = [
    'id', 'firstNameEn', 'lastNameEn', 'familyName', 'firstNameAr', 'lastNameAr',
    'avatar', 'gender', 'parentIds', 'spouseId', 'includeInFamilyTree',
    'relationStatus', 'siblingOrder', 'manualArabicApproval'
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = contacts.map(contact => {
    return [
      escapeCSV(contact.id),
      escapeCSV(contact.firstNameEn),
      escapeCSV(contact.lastNameEn),
      escapeCSV(contact.familyName),
      escapeCSV(contact.firstNameAr),
      escapeCSV(contact.lastNameAr),
      escapeCSV(contact.avatar),
      escapeCSV(contact.gender),
      escapeCSV(contact.parentIds?.join(';')),
      escapeCSV(contact.spouseId),
      escapeCSV(contact.includeInFamilyTree),
      escapeCSV(contact.relationStatus),
      escapeCSV(contact.siblingOrder),
      escapeCSV(contact.manualArabicApproval)
    ].join(',');
  });

  const csvContent = [header.join(','), ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "alqasimi_family_tree_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};