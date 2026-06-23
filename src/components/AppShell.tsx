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
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

    // Close sidebar on route change (mobile navigation)
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [pathname]);

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
            <TabBar
                themeMode={themeMode}
                onToggleTheme={handleToggleTheme}
                isMobileOpen={isMobileSidebarOpen}
                onMobileClose={() => setIsMobileSidebarOpen(false)}
                onMobileOpen={() => setIsMobileSidebarOpen(true)}
            />
            <main className={`flex-1 overflow-y-auto ${themeMode === 'dark' ? 'bg-[#0f1a0f] text-white' : 'bg-[#ffffff] text-[#0f172a]'}`}>
                {/* Mobile header bar with hamburger */}
                <div className={`sticky top-0 z-40 flex items-center justify-between px-4 py-3 md:hidden ${themeMode === 'dark' ? 'bg-[#0a150a] border-b border-[#1f331f]' : 'bg-white border-b border-[#e2e8f0]'}`}>
                    <button
                        type="button"
                        aria-label="Open navigation menu"
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl transition ${themeMode === 'dark' ? 'text-white hover:bg-[#1a2e1a]' : 'text-[#0f172a] hover:bg-[#f1f5f9]'}`}
                    >
                        ☰
                    </button>
                    <span className={`text-lg font-bold ${themeMode === 'dark' ? 'text-[#4ade80]' : 'text-[#16a34a]'}`}>🌾 AgriSpark</span>
                    <div className="w-11" /> {/* spacer to center the logo */}
                </div>
                {children}
            </main>
        </div>
    );
}
