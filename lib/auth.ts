'use client';

import { AuthUser, DeviceAccessRecord } from './types';

const AUTH_STORAGE_KEY = 'dahod_auth_user_v1';
const DEVICES_STORAGE_KEY = 'dahod_authorized_devices_v1';

export const initialFamilyDevices: DeviceAccessRecord[] = [
  {
    id: 'dev-1',
    userEmail: 'mom@dahodjewellers.com',
    userName: 'Mrs. D. Gandhi (Mom)',
    deviceName: 'Mom Android Phone (Samsung Galaxy)',
    lastActive: new Date().toISOString(),
    isRevoked: false,
  },
  {
    id: 'dev-2',
    userEmail: 'nirvan@example.com',
    userName: 'Nirvan Gandhi',
    deviceName: 'Nirvan iPhone 16 Pro',
    lastActive: new Date().toISOString(),
    isRevoked: false,
  },
  {
    id: 'dev-3',
    userEmail: 'shop@dahodjewellers.com',
    userName: 'Shop Counter Tablet',
    deviceName: 'Dahod Shop iPad Air',
    lastActive: new Date().toISOString(),
    isRevoked: false,
  },
];

export function getStoredAuthUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function saveAuthUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
  } catch (e) {}
}

export function getStoredDevices(): DeviceAccessRecord[] {
  if (typeof window === 'undefined') return initialFamilyDevices;
  try {
    const raw = localStorage.getItem(DEVICES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(initialFamilyDevices));
      return initialFamilyDevices;
    }
    return JSON.parse(raw);
  } catch (e) {
    return initialFamilyDevices;
  }
}

export function saveDevices(devices: DeviceAccessRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEVICES_STORAGE_KEY, JSON.stringify(devices));
  } catch (e) {}
}

export function parseGoogleJwt(token: string): { name: string; email: string; picture?: string; sub: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function getCurrentDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Device';
  if (/iphone|ipad|ipod/i.test(ua)) return 'Apple iOS Device';
  if (/macintosh|mac os x/i.test(ua)) return 'Mac Desktop';
  if (/windows/i.test(ua)) return 'Windows PC';
  return 'Web Browser';
}
