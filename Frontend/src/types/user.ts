export interface Technician {
  id: number;
  specialty: string;
  phone: string;
  is_verified: boolean;
  years_experience: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'technician' | 'client' | 'admin';
  is_verified: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
  technician?: Technician;
}

export interface Profile {
  type: 'client' | 'technician';
  address?: string;
  phone?: string;
  specialty?: string;
  years_experience?: number;
  is_verified?: boolean;
}