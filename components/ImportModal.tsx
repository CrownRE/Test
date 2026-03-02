import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Contact } from '../types';

// Declare the XLSX global from the script tag in index.html
declare var XLSX: any;

interface ImportModalProps {
  onClose: () => void;
  onImport: (contacts: Contact[]) => void;
}

// Helper to convert a raw data object (from CSV or Excel) into a typed Contact
const convertRawToContact = (contactData: any): Contact => {
  // Ensure required fields are strings and handle potential non-string values from Excel
  const id = String(contactData.id || `gen-${Date.now()}`);
  const firstNameEn = String(contactData.firstNameEn || '');
  const lastNameEn = String(contactData.lastNameEn || '');
  
  return {
    id,
    firstNameEn,
    lastNameEn,
    familyName: String(contactData.familyName || lastNameEn),
    firstNameAr: contactData.firstNameAr ? String(contactData.firstNameAr) : undefined,
    lastNameAr: contactData.lastNameAr ? String(contactData.lastNameAr) : undefined,
    avatar: contactData.avatar ? String(contactData.avatar) : `https://picsum.photos/seed/${id}/100`,
    gender: String(contactData.gender) as 'Male' | 'Female',
    parentIds: contactData.parentIds ? String(contactData.parentIds).split(';').filter(Boolean) : undefined,
    spouseId: contactData.spouseId ? String(contactData.spouseId) : undefined,
    // Convert boolean strings/values robustly
    includeInFamilyTree: ['true', '1', true].includes(String(contactData.includeInFamilyTree).toLowerCase()),
    relationStatus: contactData.relationStatus as 'Married' | 'Divorced' || undefined,
    siblingOrder: contactData.siblingOrder ? parseInt(String(contactData.siblingOrder), 10) : undefined,
    manualArabicApproval: ['true', '1', true].includes(String(contactData.manualArabicApproval).toLowerCase()),
  };
};

// CSV parser using the helper
const parseCSV = (csvText: string): Contact[] => {
    const lines = csvText.trim().split(/\r\n|\n/);
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim());
    const contacts: Contact[] = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Handle commas within quoted fields
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];

        const contactData: any = {};
        header.forEach((key, index) => {
            // Remove quotes from parsed values
            contactData[key] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
        });

        contacts.push(convertRawToContact(contactData));
    }
    return contacts;
};

// Excel parser using SheetJS and the helper
const parseExcel = (arrayBuffer: ArrayBuffer): Contact[] => {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Use sheet_to_json to get an array of objects directly
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

  return jsonData.map(convertRawToContact);
};


const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      const allowedExtensions = ['.csv', '.xlsx', '.xls'];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
      
      if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
        setError(t('Please select a CSV or Excel file.'));
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleImport = () => {
    if (!file) {
      setError(t('No file selected.'));
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = (e) => {
      try {
        let importedContacts: Contact[] = [];
        if (fileName.endsWith('.csv')) {
          const text = e.target?.result as string;
          importedContacts = parseCSV(text);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          const buffer = e.target?.result as ArrayBuffer;
          importedContacts = parseExcel(buffer);
        }
        
        onImport(importedContacts);
        onClose();
      } catch (err) {
        console.error("File parsing error:", err);
        setError(t('Error parsing file. Please check the format.'));
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError(t('Error reading file.'));
      setIsProcessing(false);
    };

    if (fileName.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-lg mx-4 border border-white/10 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">{t('Import Data')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-3xl leading-none">&times;</button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300">{t('Import Hint')}</p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('Upload CSV or Excel File')}</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
            />
          </div>
          {file && <p className="text-sm text-gray-400">{t('Selected file')}: {file.name}</p>}
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="mt-8 flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors">
            {t('Cancel')}
          </button>
          <button 
            onClick={handleImport} 
            disabled={!file || isProcessing}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isProcessing ? t('Processing...') : t('Import')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;