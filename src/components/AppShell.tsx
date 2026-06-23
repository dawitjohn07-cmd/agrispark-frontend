'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import TabBar from '@/components/TabBar';

type ThemeMode = 'dark' | 'light';
const AUTH_THEME_STORAGE_KEY = 'agri-auth-theme';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        if (typeof window === 'undefined') return 'dark';
        const storedTheme = window.localStorage.getItem(AUTH_THEME_STORAGE_KEY);
        return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';
    });
    const [themeReady, setThemeReady] = useState(false);

    const isPublicFarmerView = /^\/farmer\/[^/]+\/view$/.test(pathname || '');
    const publicRoutes = ['/', '/login', '/products', '/about', '/reset-password', '/reset-password-confirm'];
    const isPublicRoute = publicRoutes.includes(pathname || '') || isPublicFarmerView;

    useEffect(() => {
        const storedTheme = window.localStorage.getItem(AUTH_THEME_STORAGE_KEY);
        if (storedTheme === 'light' || storedTheme === 'dark') {
            setThemeMode(storedTheme);
        }
        setThemeReady(true);
    }, []);

    useEffect(() => {
        if (!themeReady) return;
        window.localStorage.setItem(AUTH_THEME_STORAGE_KEY, themeMode);
    }, [themeMode, themeReady]);

    const handleToggleTheme = () => {
        setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'));
    };

    if (isPublicRoute) {
        return (
            <div className="flex min-h-screen bg-gray-50 text-gray-900">
                <main className="flex-1 overflow-y-auto bg-gray-50 text-gray-900">{children}</main>
            </div>
        );
    }

    if (!themeReady) {
        return null;
    }

    return (
        <div className={`${themeMode === 'dark' ? 'agri-dark bg-[#0f1a0f] text-white' : 'agri-light bg-[#ffffff] text-[#0f172a]'} flex h-screen`}>
            <TabBar themeMode={themeMode} onToggleTheme={handleToggleTheme} />
            <main className={`flex-1 overflow-y-auto ${themeMode === 'dark' ? 'bg-[#0f1a0f] text-white' : 'bg-[#ffffff] text-[#0f172a]'}`}>{children}</main>
        </div>
    );
}
