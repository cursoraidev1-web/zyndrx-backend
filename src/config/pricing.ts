export type PlanType = 'free' | 'standard' | 'premium' | 'enterprise';

export const PRICING_LIMITS = {
  free: {
    maxProjects: 1,      // 
    maxMembers: 5,       // 
    maxTasks: 10,        // [cite: 15]
    storageLimit: 1 * 1024 * 1024 * 1024, // 1GB [cite: 17]
    integrations: false, // [cite: 25]
    analytics: 'basic'
  },
  standard: {
    maxProjects: 5,      // [cite: 42]
    maxMembers: 1000,    // Unlimited practically
    maxTasks: 1000000,   // Unlimited [cite: 43]
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB [cite: 47]
    integrations: true,  // [cite: 50]
    analytics: 'basic'
  },
  premium: {
    maxProjects: 1000000, // Unlimited [cite: 72]
    maxMembers: 1000000,
    maxTasks: 1000000,
    storageLimit: 100 * 1024 * 1024 * 1024, // 100GB [cite: 84]
    integrations: true,
    analytics: 'advanced' // [cite: 80]
  },
  enterprise: {
    maxProjects: 1000000,
    maxMembers: 1000000,
    maxTasks: 1000000,
    storageLimit: 10000000000000, // Unlimited [cite: 116]
    integrations: true,
    analytics: 'advanced'
  }
};