import React, { createContext, useState, ReactNode, useCallback } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

// FIX: Export LanguageContext so it can be used by the useTranslation hook.
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<string, Record<Language, string>> = {
  // App.tsx
  'AlQasimi Family Tree': { en: 'AlQasimi Family Tree', ar: 'شجرة عائلة القاسمي' },
  'Fit to Screen': { en: 'Fit to Screen', ar: 'ملائمة للشاشة' },
  'Search by name...': { en: 'Search by name...', ar: 'البحث بالإسم...' },
  'Find connection with...': { en: 'Find connection with...', ar: 'البحث عن اتصال مع...' },
  'Find Connection': { en: 'Find Connection', ar: 'ابحث عن اتصال' },
  'Clear Connection': { en: 'Clear Connection', ar: 'مسح الاتصال' },
  'Explain Relation': { en: 'Explain Relation', ar: 'شرح العلاقة' },
  'Show Full Tree': { en: 'Show Full Tree', ar: 'عرض الشجرة كاملة' },
  'View in Full Tree': { en: 'View in Full Tree', ar: 'عرض في الشجرة الكاملة' },

  // FamilyTree.tsx
  'No Data': { en: 'No family tree data available.', ar: 'لا توجد بيانات لشجرة العائلة.' },
  'No Root Nodes': { en: 'Could not determine any root nodes for the family tree.', ar: 'تعذر تحديد أي جذور لشجرة العائلة.' },
  'View Details': { en: 'View Details', ar: 'عرض التفاصيل' },
  'Add New Child': { en: 'Add New Child', ar: 'إضافة طفل جديد' },
  'Zoom Pan Hint': { en: 'Tap: Focus | Double Tap/Hold: Options', ar: 'لمسة: تركيز | لمستين/مطولاً: خيارات' },
  'Parent-Child': { en: 'Parent-Child', ar: 'والد-طفل' },
  'Paternal Line': { en: 'Paternal Line', ar: 'สาย الأب' },
  'Maternal Line (on focus)': { en: 'Maternal Line (on focus)', ar: 'สาย الأم (عند التركيز)' },
  'Spouse (on focus)': { en: 'Spouse (on focus)', ar: 'زوج/زوجة (عند التركيز)' },
  'Edit Details': { en: 'Edit Details', ar: 'تعديل التفاصيل' },
  'Delete': { en: 'Delete', ar: 'حذف' },
  'Delete Confirmation': { en: 'Are you sure you want to delete this person and all their descendants?', ar: 'هل أنت متأكد أنك تريد حذف هذا الشخص وجميع نسله؟' },
  'Delete Confirmation Title': { en: 'Confirm Deletion', ar: 'تأكيد الحذف' },

  // Modals
  'Contact Details': { en: 'Contact Details', ar: 'تفاصيل جهة الاتصال' },
  'Close': { en: 'Close', ar: 'إغلاق' },
  'Adding child to': { en: 'Adding a child to', ar: 'إضافة طفل إلى' },
  'Full Name': { en: 'Full Name', ar: 'الاسم الكامل' },
  'First Name': { en: 'First Name', ar: 'الاسم الأول' },
  'Last Name': { en: 'Last Name', ar: 'اسم العائلة' },
  'Family Name': { en: 'Family Name', ar: 'اسم القبيلة' },
  'Family Name Required': { en: 'Family name is required.', ar: 'اسم القبيلة مطلوب.' },
  'Gender': { en: 'Gender', ar: 'الجنس' },
  'Female': { en: 'Female', ar: 'أنثى' },
  'Male': { en: 'Male', ar: 'ذكر' },
  'Cancel': { en: 'Cancel', ar: 'إلغاء' },
  'Save Changes': { en: 'Save Changes', ar: 'حفظ التغييرات' },
  'Edit Contact': { en: 'Edit Contact', ar: 'تعديل جهة الاتصال' },
  'Relation Explained': { en: 'Relation Explained', ar: 'شرح العلاقة' },
  'First Name Required': { en: 'First name is required.', ar: 'الاسم الأول مطلوب.' },
  'Last Name Required': { en: 'Last name is required.', ar: 'اسم العائلة مطلوب.' },
  'Father': { en: 'Father', ar: 'الأب' },
  'Mother': { en: 'Mother', ar: 'الأم' },
  'Edit': { en: 'Edit', ar: 'تعديل' },
  'Select a spouse...': { en: 'Select a spouse...', ar: 'اختر زوج/زوجة...' },
  'Select a father...': { en: 'Select a father...', ar: 'اختر أباً...' },
  'Select a mother...': { en: 'Select a mother...', ar: 'اختر أماً...' },
  'Relation Status': { en: 'Relation Status', ar: 'الحالة الاجتماعية' },
  'Married': { en: 'Married', ar: 'متزوج/متزوجة' },
  'Divorced': { en: 'Divorced', ar: 'مطلق/مطلقة' },
  'Include in main family tree': { en: 'Include in main family tree', ar: 'إدراج في شجرة العائلة الرئيسية' },
  'Sibling Order': { en: 'Sibling Order', ar: 'ترتيب الأشقاء' },
  'Sibling Order Hint': { en: '1 = eldest. Determines left-to-right position.', ar: '1 = الأكبر سناً. يحدد الموقع من اليسار إلى اليمين.' },
  'Siblings': { en: 'Siblings', ar: 'الأشقاء' },
  'Order': { en: 'Order', ar: 'الترتيب' },
  'Avatar URL': { en: 'Avatar URL', ar: 'رابط الصورة الرمزية' },
  
  // Photo Positioner
  'Save Position': { en: 'Save Position', ar: 'حفظ الموضع' },
  'Move photo up': { en: 'Move photo up', ar: 'تحريك الصورة للأعلى' },
  'Move photo down': { en: 'Move photo down', ar: 'تحريك الصورة للأسفل' },
  'Move photo left': { en: 'Move photo left', ar: 'تحريك الصورة لليسار' },
  'Move photo right': { en: 'Move photo right', ar: 'تحريك الصورة لليمين' },
  'Center photo': { en: 'Center photo', ar: 'توسيط الصورة' },
  
  // Data Management
  'Manage Data': { en: 'Manage Data', ar: 'إدارة البيانات' },
  'Admin Data Editor': { en: 'Admin Data Editor', ar: 'محرر بيانات المسؤول' },
  'Search by name in editor...': { en: 'Search by name...', ar: 'البحث بالاسم...' },
  'Add New Person': { en: 'Add New Person', ar: 'إضافة شخص جديد' },
  'Add Person to Tree': { en: 'Add Person to Tree', ar: 'إضافة شخص إلى الشجرة' },
  'In Tree': { en: 'In Tree', ar: 'في الشجرة' },
  'Actions': { en: 'Actions', ar: 'إجراءات' },
  'Return to Tree View': { en: 'Return to Tree View', ar: 'العودة إلى عرض الشجرة' },
  'First Name (Arabic)': { en: 'First Name (Arabic)', ar: 'الاسم الأول (بالعربية)' },
  'Family Name (Arabic)': { en: 'Family Name (Arabic)', ar: 'اسم العائلة (بالعربية)' },
  'Manual Approval': { en: 'Manual Approval', ar: 'موافقة يدوية' },
  'Import Data': { en: 'Import Data', ar: 'استيراد البيانات' },
  'Export Data': { en: 'Export Data', ar: 'تصدير البيانات' },
  'Import Hint': { en: 'Select a CSV or Excel file to import. The data will overwrite the current family tree.', ar: 'اختر ملف CSV أو Excel للاستيراد. ستحل البيانات الجديدة محل شجرة العائلة الحالية.' },
  'Upload CSV or Excel File': { en: 'Upload CSV or Excel File', ar: 'رفع ملف CSV أو Excel' },
  'Selected file': { en: 'Selected file', ar: 'الملف المختار' },
  'Please select a CSV or Excel file.': { en: 'Please select a CSV or Excel file.', ar: 'الرجاء اختيار ملف CSV أو Excel.' },
  'No file selected.': { en: 'No file selected.', ar: 'لم يتم اختيار ملف.' },
  'Error parsing file. Please check the format.': { en: 'Error parsing file. Please check the format.', ar: 'خطأ في تحليل الملف. يرجى التحقق من التنسيق.' },
  'Error reading file.': { en: 'Error reading file.', ar: 'خطأ في قراءة الملف.' },
  'Import': { en: 'Import', ar: 'استيراد' },
  'Processing...': { en: 'Processing...', ar: 'جاري المعالج...' },

  // Manage Children Modal
  'Manage Children': { en: 'Manage Children', ar: 'إدارة الأطفال' },
  'Children of': { en: 'Children of', ar: 'أبناء' },
  'Drag to reorder siblings.': { en: 'Drag to reorder siblings.', ar: 'اسحب لإعادة ترتيب الأشقاء.' },
  'Add a new child to this family:': { en: 'Add a new child to this family:', ar: 'أضف طفلًا جديدًا إلى هذه العائلة:' },
  'Add Child': { en: 'Add Child', ar: 'إضافة طفل' },
  'No children yet.': { en: 'No children yet.', ar: 'لا يوجد أطفال بعد.' },
};

// FIX: Export LanguageProvider so it can be used in index.tsx.
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string): string => {
    return translations[key]?.[language] || key;
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};