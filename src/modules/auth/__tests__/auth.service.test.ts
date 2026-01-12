import { AuthService } from '../auth.service';
import { supabaseAdmin } from '../../../config/supabase';
import { AppError } from '../../../middleware/error.middleware';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../../config/supabase');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../modules/companies/companies.service');
jest.mock('../../../modules/subscriptions/subscriptions.service');
jest.mock('../../../utils/email.service');
jest.mock('../../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockSupabase: any;

  beforeEach(() => {
    authService = new AuthService();
    mockSupabase = {
      auth: {
        admin: {
          createUser: jest.fn(),
          deleteUser: jest.fn(),
          generateLink: jest.fn(),
        },
        signInWithPassword: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        limit: jest.fn().mockReturnThis(),
      })),
    };
    (supabaseAdmin as any) = mockSupabase;
    jest.clearAllMocks();
  });

  describe('register', () => {
    const mockRegisterData = {
      email: 'test@example.com',
      password: 'TestPassword123!@#',
      fullName: 'Test User',
      companyName: 'Test Company',
      role: 'developer' as const,
    };

    it('should successfully register a new user', async () => {
      // Mock Supabase auth user creation
      const mockAuthUser = {
        user: {
          id: 'user-123',
          email: mockRegisterData.email,
        },
      };
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: mockAuthUser,
        error: null,
      });

      // Mock user profile creation
      const mockUserProfile = {
        id: 'user-123',
        email: mockRegisterData.email,
        full_name: mockRegisterData.fullName,
        role: mockRegisterData.role,
      };
      mockSupabase.from('users').select().eq().single.mockResolvedValue({
        data: mockUserProfile,
        error: null,
      });

      // Mock company creation
      const mockCompany = {
        id: 'company-123',
        name: mockRegisterData.companyName,
      };
      mockSupabase.from('companies').insert.mockResolvedValue({
        data: [mockCompany],
        error: null,
      });

      // Mock JWT token generation
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.register(mockRegisterData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(mockRegisterData.email);
      expect(result.user.fullName).toBe(mockRegisterData.fullName);
      expect(mockSupabase.auth.admin.createUser).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      mockSupabase.auth.admin.createUser.mockResolvedValue({
        data: null,
        error: { message: 'User already registered', code: '23505' },
      });

      await expect(authService.register(mockRegisterData)).rejects.toThrow(AppError);
    });

    it('should throw error if password is too weak', async () => {
      const weakPasswordData = {
        ...mockRegisterData,
        password: 'weak',
      };

      await expect(authService.register(weakPasswordData)).rejects.toThrow();
    });
  });

  describe('login', () => {
    const mockLoginData = {
      email: 'test@example.com',
      password: 'TestPassword123!@#',
    };

    it('should successfully login a user', async () => {
      const mockAuthUser = {
        user: {
          id: 'user-123',
          email: mockLoginData.email,
        },
        session: {
          access_token: 'mock-access-token',
        },
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthUser,
        error: null,
      });

      const mockUserProfile = {
        id: 'user-123',
        email: mockLoginData.email,
        full_name: 'Test User',
        role: 'developer',
        avatar_url: null,
        company_id: 'company-123',
      };
      mockSupabase.from('users').select().eq().single.mockResolvedValue({
        data: mockUserProfile,
        error: null,
      });

      const mockCompany = {
        id: 'company-123',
        name: 'Test Company',
      };
      mockSupabase.from('user_companies').select().eq().mockResolvedValue({
        data: [{ company_id: 'company-123', role: 'admin' }],
        error: null,
      });

      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      const result = await authService.login(mockLoginData, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      if ('user' in result) {
        expect(result.user.email).toBe(mockLoginData.email);
      }
    });

    it('should require 2FA if enabled', async () => {
      const mockAuthUser = {
        user: {
          id: 'user-123',
          email: mockLoginData.email,
        },
        session: {
          access_token: 'mock-access-token',
        },
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockAuthUser,
        error: null,
      });

      const mockUserProfile = {
        id: 'user-123',
        email: mockLoginData.email,
        full_name: 'Test User',
        role: 'developer',
        is_two_factor_enabled: true,
      };
      mockSupabase.from('users').select().eq().single.mockResolvedValue({
        data: mockUserProfile,
        error: null,
      });

      const result = await authService.login(mockLoginData, '127.0.0.1', 'test-agent');

      expect(result).toHaveProperty('require2fa');
      expect((result as any).require2fa).toBe(true);
    });

    it('should throw error for invalid credentials', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      });

      await expect(authService.login(mockLoginData, '127.0.0.1', 'test-agent')).rejects.toThrow(AppError);
    });
  });

  describe('generate2FASecret', () => {
    it('should generate 2FA secret and QR code', async () => {
      const userId = 'user-123';
      const mockSecret = {
        base32: 'MOCKBASE32SECRET',
        otpauth_url: 'otpauth://totp/Zyndrx?secret=MOCKBASE32SECRET',
      };

      // Mock speakeasy (would need to be mocked)
      jest.mock('speakeasy', () => ({
        generateSecret: jest.fn(() => mockSecret),
      }));

      mockSupabase.from('users').update.mockResolvedValue({
        data: { id: userId, two_factor_secret: mockSecret.base32 },
        error: null,
      });

      // Mock QRCode
      jest.mock('qrcode', () => ({
        toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
      }));

      const result = await authService.generate2FASecret(userId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(mockSupabase.from('users').update).toHaveBeenCalled();
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA with valid token', async () => {
      const userId = 'user-123';
      const token = '123456';
      const mockSecret = 'MOCKBASE32SECRET';

      const mockUser = {
        id: userId,
        two_factor_secret: mockSecret,
      };
      mockSupabase.from('users').select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      // Mock speakeasy verify
      jest.mock('speakeasy', () => ({
        totp: {
          verify: jest.fn(() => true),
        },
      }));

      mockSupabase.from('users').update.mockResolvedValue({
        data: { id: userId, is_two_factor_enabled: true },
        error: null,
      });

      const result = await authService.enable2FA(userId, token);

      expect(result).toHaveProperty('recoveryCodes');
      expect(Array.isArray(result.recoveryCodes)).toBe(true);
      expect(result.recoveryCodes.length).toBe(10);
    });

    it('should throw error for invalid token', async () => {
      const userId = 'user-123';
      const token = '000000';
      const mockSecret = 'MOCKBASE32SECRET';

      const mockUser = {
        id: userId,
        two_factor_secret: mockSecret,
      };
      mockSupabase.from('users').select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      // Mock speakeasy verify returning false
      jest.mock('speakeasy', () => ({
        totp: {
          verify: jest.fn(() => false),
        },
      }));

      await expect(authService.enable2FA(userId, token)).rejects.toThrow(AppError);
    });
  });
});
