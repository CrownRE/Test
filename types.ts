export interface Contact {
  id: string;
  firstNameEn: string;
  lastNameEn: string;
  familyName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  avatar: string;
  avatarPosition?: string;
  gender: 'Male' | 'Female';
  parentIds?: string[];
  spouseId?: string;
  includeInFamilyTree?: boolean;
  relationStatus?: 'Married' | 'Divorced';
  siblingOrder?: number;
  manualArabicApproval?: boolean;
}