
export interface PasswordEntry {
  id: string;
  companyName: string;
  username: string;
  password: string;
  createdAt: number;
  updatedAt: number;
  isDeleted?: boolean;
}

export interface UserData {
  passwords: PasswordEntry[];
  lastSync: number;
  aadhaarVerified: boolean;
  userInfo?: {
    name: string;
    email: string;
  };
}
