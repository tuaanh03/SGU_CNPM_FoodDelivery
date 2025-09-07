import { describe, test, expect } from '@jest/globals';
import { hashPassword, verifyPassword, generateToken } from '../api/lib/auth.js';

describe('Auth utility functions', () => {
    test('hashPassword generates consistent hash', async () => {
        const password = 'secret';
        const hash1 = await hashPassword(password);
        const hash2 = await hashPassword(password);
        expect(hash1).toBe(hash2);
        expect(hash1).not.toBe(password);
    });

    test('verifyPassword validates correct password', async () => {
        const password = 'secret';
        const hash = await hashPassword(password);
        expect(await verifyPassword(password, hash)).toBe(true);
        expect(await verifyPassword('wrong', hash)).toBe(false);
    });

    test('generateToken returns random strings', () => {
        const t1 = generateToken();
        const t2 = generateToken();
        expect(typeof t1).toBe('string');
        expect(t1.length).toBeGreaterThan(0);
        expect(t1).not.toBe(t2);
    });
});