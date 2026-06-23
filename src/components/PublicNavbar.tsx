'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface PublicNavbarProps {
    showLoginButtons?: boolean;
}

export default function PublicNavbar({ showLoginButtons = true }: PublicNavbarProps) {
    const pathname = usePathname() || '/';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const linkClass = (href: string) => {
        const base = 'text-sm font-medium transition-colors';
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return `${base} ${isActive ? 'text-[#16a34a]' : 'text-[#0f172a]'} hover:text-[#16a34a]`;
    };

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <nav className="sticky top-0 z-40 bg-white shadow-sm">
            <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="text-3xl font-extrabold text-[#16a34a]">🌾</div>
                    <Link href="/" className="text-xl font-bold text-[#0f172a] sm:text-2xl">
                        AgriSpark
                    </Link>
                </div>

                <div className="hidden items-center gap-10 md:flex">
                    <Link href="/" className={linkClass('/')}>Home</Link>
                    <Link href="/products" className={linkClass('/products')}>Products</Link>
                    <Link href="/about" className={linkClass('/about')}>About Us</Link>
                </div>

                <div className="flex items-center gap-2 md:hidden">
                    <button
                        type="button"
                        aria-label="Toggle navigation menu"
                        aria-expanded={mobileMenuOpen}
                        onClick={() => setMobileMenuOpen((current) => !current)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-emerald-200 bg-white text-[#0f172a] shadow-sm"
                    >
                        <span className="flex flex-col gap-1.5">
                            <span className="block h-0.5 w-5 rounded bg-current" />
                            <span className="block h-0.5 w-5 rounded bg-current" />
                            <span className="block h-0.5 w-5 rounded bg-current" />
                        </span>
                    </button>
                </div>

                {showLoginButtons && (
                    <div className="hidden items-center gap-2 sm:gap-3 md:flex md:justify-end">
                        <Link href="/login" className="rounded-md border border-[#16a34a] bg-white px-4 py-2 font-semibold text-[#16a34a] transition hover:bg-green-50 sm:px-5 sm:py-2.5">
                            Login
                        </Link>
                        <Link href="/login" className="rounded-md bg-[#16a34a] px-4 py-2 font-semibold text-white transition hover:bg-[#15803d] sm:px-5 sm:py-2.5">
                            Sign Up
                        </Link>
                    </div>
                )}
            </div>

            {mobileMenuOpen && (
                <div className="border-t border-emerald-100 bg-white px-4 pb-4 pt-3 shadow-sm sm:px-6 md:hidden">
                    <div className="flex flex-col gap-3">
                        <Link href="/" className={linkClass('/')} onClick={closeMobileMenu}>
                            Home
                        </Link>
                        <Link href="/products" className={linkClass('/products')} onClick={closeMobileMenu}>
                            Products
                        </Link>
                        <Link href="/about" className={linkClass('/about')} onClick={closeMobileMenu}>
                            About Us
                        </Link>

                        {showLoginButtons && (
                            <div className="mt-2 flex flex-col gap-2">
                                <Link
                                    href="/login"
                                    onClick={closeMobileMenu}
                                    className="rounded-md border border-[#16a34a] bg-white px-4 py-2 text-center font-semibold text-[#16a34a] transition hover:bg-green-50"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/login"
                                    onClick={closeMobileMenu}
                                    className="rounded-md bg-[#16a34a] px-4 py-2 text-center font-semibold text-white transition hover:bg-[#15803d]"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}