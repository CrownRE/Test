import { Contact } from '../types';

// The key is the OLD path-based ID, the value is the NEW unique ID.
const oldIdToNewIdMap = new Map<string, string>();
let contactIdCounter = 0;

const generateNewId = (oldId: string): string => {
    // Generate a unique, non-path-dependent ID to fully decouple from the source format.
    const newId = `contact-gen-${contactIdCounter++}`;
    oldIdToNewIdMap.set(oldId, newId);
    return newId;
};

const parseLineageData = (data: string): Contact[] => {
    const lines = data.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
        return [];
    }

    const contacts: Contact[] = [];
    const parentToChildrenCount = new Map<string, number>(); // Uses OLD parent IDs for counting

    // Manually add the AlQasimi root node
    const alqasimiRoot: Contact = {
        id: 'alqasimi-root', // This ID is special and kept stable
        firstNameEn: 'AlQasimi',
        lastNameEn: 'AlQasimi', 
        familyName: 'AlQasimi',
        gender: 'Male', // Neutral, but the data structure requires it
        avatar: `https://picsum.photos/seed/alqasimi/100`,
        parentIds: [],
        includeInFamilyTree: true,
        manualArabicApproval: false,
    };
    contacts.push(alqasimiRoot);
    oldIdToNewIdMap.set('alqasimi-root', alqasimiRoot.id); // Map it for lookups

    // Process all other lines from the lineage data
    for (const line of lines) {
        const parts = line.trim().split(' ').filter(p => p); // Robustly handle multiple spaces
        if (parts.length < 2) continue;

        const oldId = parts[0];
        const firstName = parts[1];
        const lastName = 'AlQasimi'; // All descendants have this last name
        
        const newId = generateNewId(oldId);

        let parentOldId: string | undefined;
        if (oldId === '0') {
            parentOldId = 'alqasimi-root';
        } else if (oldId.length > 1) {
            parentOldId = oldId.slice(0, -1);
        } else if (oldId.length === 1 && oldId !== '0') {
            parentOldId = '0';
        }
        
        const newParentIds: string[] = [];
        if (parentOldId) {
            const newParentId = oldIdToNewIdMap.get(parentOldId);
            if (newParentId) {
                newParentIds.push(newParentId);
            }
        }
        
        let siblingOrder = 1;
        if (parentOldId) {
            const count = parentToChildrenCount.get(parentOldId) || 0;
            siblingOrder = count + 1;
            parentToChildrenCount.set(parentOldId, siblingOrder);
        }

        contacts.push({
            id: newId,
            firstNameEn: firstName,
            lastNameEn: lastName,
            familyName: lastName,
            gender: 'Male', // Assuming all names provided are male
            avatar: `https://picsum.photos/seed/${oldId}/100`, // Use oldId for consistent images
            parentIds: newParentIds,
            includeInFamilyTree: true,
            siblingOrder,
            manualArabicApproval: false,
        });
    }

    return contacts;
};

const lineageData = `
0 Saqer
1 Khalid
1a Khalid
1aa Mohammed
1aaa Fahim
1aab Ahmed
1aaba Mohammed
1aabb Khalid
1aac Saqer
1aaca Mohammed
1aacb Sultan
1aacc Rashid
1aacd Khalid
1aad Abdullah
1ab Saud
1aba Majid
1abaa Saud
1abaaa Majid
1abab Khalid
1abb Khalid
1abba Saud
1abc Sultan
1abd Abdulaziz
1ac Faisal
1aca Tariq
1acaa Faisal
1acb Khalid
1acba Faisal
1acbb Khalid
1acc Majid
1acca Faisal
1acd Mohammed
1acda Rashid
1acdb Maktoum
2 Sultan
2a Saqer
2aa Sultan
2aaa Majid
2aaaa Sultan
2aab Ahmed
2aac Saqer
2aaca Sultan
2ab Saeed
2aba Sultan
2ac Haitham
2aca Saqer
2acb Majid
2acc Mohammed
2acd Faisal
2b Khalid
2ba Sultan
2baa Majid
2baaa Sultan
2baab Khalid
2bab Kayed
2baba Haitham
2babb Laith
2babc Rashid
2bac Fahim
2baca Rashid
2bacb Salem
2bad Rashid
2bb Saud
2bba Khalid
2bbb Fahd
2bbc Ahmed
2bbca Sultan
2bbcb Saud
2bc Faisal
2bca Khalid
2bcaa Saqer
2bcb Mohammed
2c Mohammed
2ca Ahmed
2caa Mohammed
2cab Sultan
2caba Ahmed
2cac Salem
2cb Salem
2cc Sultan
2cca Mohammed
2ccaa Sultan
2ccb Saud
2ccba Sultan
2ccc Ahmed
2ccd Salem
2d Salem
2da Mohammed
2daa Salem
2dab Saqer
2dac Khalid
2dad Abdulaziz
2dae Sultan
2db Abdullah
2dba Sultan
2dbb Salem
2dbc Ahmed
2dc Abdulrahman
2dca Salem
2e Saud
2ea Mohammed
2eaa Sultan
2eab Saud
2eaba Mohammed
2eac Khalid
2f Abdullah
2fa Khalid
2faa Saqer
2fb Sultan
2fba Abdullah
2fbb Abdulaziz
2fbc Mohammed
2fc Mohammed
2g Ahmed
2ga Sultan
2gaa Ahmed
2gb Mohammed
2gba Saud
2gc Saqer
2gd Khalid
2gda Saud
3 Mohammed
3a Khalid
3aa Faisal
3ab Sultan
3aba Khalid
3abb Mohammed
3abc Ahmed
3ac Mohammed
3ad Ahmed
3b Saqer
3c Sultan
3ca Mohammed
3cb Khalid
3d Abdulaziz
3da Khalid
3daa Zayed
3e Abdullah
ea Mohammed
3eaa Abdullah
3f Rashid
3g Humaid
3ga Mohammed
3gaa Humaid
3h Ali
4 Majid
4a Hamad
4aa Saud
4aaa Faisal
4aab Mohammed
4aac Saqer
4ab Saqer
4aba Khalid
4abaa Sultan
4abb Majid
4abba Saqer
4abc Rashid
4abca Khalid
4abd Mohammed
4abda Sultan
4abdb Saqer
4abe Sultan
4ac Majid
4aca Sultan
4acb Hamad
4acc Khalid
4acd Saeed
4ace Alqasim
4ad Shehab
4ada Abdullah
4adb Salem
4b Saeed
4ba Majid
4bac Saeed
4bb Mohammed
4bba Abdulrahman
4bbb Ahmed
4bbc Saeed
4bc Sultan
4bca Saeed
4bcb Mohd
4bcc Abdulmalik
4bd Khalid
4c Abdullah
4ca Majid
4caa Abdullah
4cb Mohammed
4cc Ali
5 Rashid
5a Saqer
5aa Abdulhakim
5ab Najib
5ac Khalid
5aca Rashid
5acb Saqer
5acc Majid
5ad Rashid
5ada Saqer
6 Humaid
6a Saqer
6aa Humaid
6aaa Khalid
6aab Abdulaziz
6aac Saqer
6ab Hisham
6aba Sultan
6ac Isam
6aca Khalid
6acaa Saud
6acb Saud
6acc Rashid
6ad Ahmed
6ada Saqer
6adb Mohd
6adc Hisham
6b Abdulaziz
6ba Humaid
6baa Ahmed
6bab Abdulaziz
6bac Saqer
6bad Saeed
6bb Jamal
6bba Abdulaziz
6bbb Mohd
6bbc Abdullah
6bbd Salem
6bc Ahmed
`;

let parsedContacts = parseLineageData(lineageData);

// --- Manual additions for spouses and females using the new ID system ---

// Create a mutable map for easier and more readable updates.
const contactsById = new Map(parsedContacts.map(c => [c.id, c]));

// --- Add AlShamsi family ---
const alshamsiRoot: Contact = {
    id: 'alshamsi-root', firstNameEn: 'AlShamsi', lastNameEn: 'AlShamsi', familyName: 'AlShamsi',
    gender: 'Male', avatar: `https://picsum.photos/seed/alshamsi/100`, parentIds: [], includeInFamilyTree: true, manualArabicApproval: false,
};
contactsById.set(alshamsiRoot.id, alshamsiRoot);

const hamdanAlShamsi: Contact = {
    id: 'id-hamdan-shamsi', firstNameEn: 'Hamdan', lastNameEn: 'AlShamsi', familyName: 'AlShamsi',
    gender: 'Male', avatar: `https://picsum.photos/seed/hamdan/100`, parentIds: [alshamsiRoot.id], includeInFamilyTree: true, manualArabicApproval: false,
};
contactsById.set(hamdanAlShamsi.id, hamdanAlShamsi);


// Add Fatima, from AlShamsi family, married to Khalid AlQasimi (old id: 1a)
const khalid1aNewId = oldIdToNewIdMap.get('1a');
if (khalid1aNewId && contactsById.has(khalid1aNewId)) {
    const fatima: Contact = {
        id: 'id-fatima-shamsi',
        firstNameEn: 'Fatima', lastNameEn: 'AlShamsi', familyName: 'AlShamsi',
        gender: 'Female',
        avatar: `https://picsum.photos/seed/fatima/100`,
        avatarPosition: '50% 20%', // Custom position to focus on the top part of a portrait image
        includeInFamilyTree: true,
        spouseId: khalid1aNewId,
        relationStatus: 'Married',
        parentIds: [hamdanAlShamsi.id], // Daughter of Hamdan
        manualArabicApproval: false,
    };
    contactsById.set(fatima.id, fatima);

    // Update Khalid (1a) to be married to Fatima
    const khalidContact = contactsById.get(khalid1aNewId)!;
    khalidContact.spouseId = fatima.id;
    khalidContact.relationStatus = 'Married';
    
    // Update Mohammed (1aa) to be the child of Khalid (1a) and Fatima
    const mohammed1aaNewId = oldIdToNewIdMap.get('1aa');
    if (mohammed1aaNewId && contactsById.has(mohammed1aaNewId)) {
        const mohammedContact = contactsById.get(mohammed1aaNewId)!;
        mohammedContact.parentIds = [...(mohammedContact.parentIds || []), fatima.id];
    }
}

// Add Noora, from AlShamsi family, married to Sultan AlQasimi (old id: 2)
const sultan2NewId = oldIdToNewIdMap.get('2');
if (sultan2NewId && contactsById.has(sultan2NewId)) {
    const noora: Contact = {
        id: 'id-noora-shamsi',
        firstNameEn: 'Noora', lastNameEn: 'AlShamsi', familyName: 'AlShamsi',
        gender: 'Female',
        avatar: `https://picsum.photos/seed/noora/100`,
        includeInFamilyTree: true,
        spouseId: sultan2NewId,
        relationStatus: 'Married',
        parentIds: [hamdanAlShamsi.id], // Another daughter of Hamdan, sister of Fatima
        manualArabicApproval: false,
    };
    contactsById.set(noora.id, noora);

    // Update Sultan (2) to be married to Noora
    const sultanContact = contactsById.get(sultan2NewId)!;
    sultanContact.spouseId = noora.id;
    sultanContact.relationStatus = 'Married';
    
    // Update Saqer (2a), son of Sultan, to also be the child of Noora
    const saqer2aNewId = oldIdToNewIdMap.get('2a');
    if (saqer2aNewId && contactsById.has(saqer2aNewId)) {
        const saqerContact = contactsById.get(saqer2aNewId)!;
        saqerContact.parentIds = [...(saqerContact.parentIds || []), noora.id];
    }
}


// --- Add AlSuwaidi family ---
const alsuwaidiRoot: Contact = {
    id: 'alsuwaidi-root', firstNameEn: 'AlSuwaidi', lastNameEn: 'AlSuwaidi', familyName: 'AlSuwaidi',
    gender: 'Male', avatar: `https://picsum.photos/seed/alsuwaidi/100`, parentIds: [], includeInFamilyTree: true, manualArabicApproval: false,
};
contactsById.set(alsuwaidiRoot.id, alsuwaidiRoot);


// Add Aisha, from AlSuwaidi family, divorced from Saud AlQasimi (old id: 1ab)
const saud1abNewId = oldIdToNewIdMap.get('1ab');
if (saud1abNewId && contactsById.has(saud1abNewId)) {
    const aisha: Contact = {
        id: 'id-aisha-suwaidi',
        firstNameEn: 'Aisha', lastNameEn: 'AlSuwaidi', familyName: 'AlSuwaidi',
        gender: 'Female',
        avatar: `https://picsum.photos/seed/aisha/100`,
        includeInFamilyTree: true,
        spouseId: saud1abNewId,
        relationStatus: 'Divorced',
        parentIds: [alsuwaidiRoot.id], // Belongs to the AlSuwaidi family
        manualArabicApproval: false,
    };
    contactsById.set(aisha.id, aisha);
    
    // Update Saud (1ab) to be divorced from Aisha
    const saudContact = contactsById.get(saud1abNewId)!;
    saudContact.spouseId = aisha.id;
    saudContact.relationStatus = 'Divorced';

    // Update Majid (1aba) to be the child of Saud (1ab) and Aisha
    const majid1abaNewId = oldIdToNewIdMap.get('1aba');
    if (majid1abaNewId && contactsById.has(majid1abaNewId)) {
        const majidContact = contactsById.get(majid1abaNewId)!;
        majidContact.parentIds = [...(majidContact.parentIds || []), aisha.id];
    }
}

export const initialContacts = Array.from(contactsById.values());