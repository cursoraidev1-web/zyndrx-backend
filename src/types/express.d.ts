import { UserRole } from './database.types';
 
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        companyId?: string; // Current active company/workspace
      };
    }
  }
}
 
export {};
