"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getInitials, resolvePublicStorageUrl } from "@/lib/utils";
import { CART_UPDATED_EVENT, getCartCount } from "@/lib/cart";

interface NavLink {
    icon: string;
    label: string;
    href: string;
}

interface TabBarProps {
    themeMode?: 'dark' | 'light';
    onToggleTheme?: () => void;
}

export default function TabBar({ themeMode = 'dark', onToggleTheme }: TabBarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [cartCount, setCartCount] = useState(0);
    const [farmerPendingOrdersCount, setFarmerPendingOrdersCount] = useState(0);
    const [farmerUnreadMessagesCount, setFarmerUnreadMessagesCount] = useState(0);
    const [role, setRole] = useState<"farmer" | "buyer" | "admin" | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!mounted) return;
                if (!user) {
                    setCurrentUserId(null);
                    setReady(true);
                    return;
                }

                const { data: userRow } = await supabase
                    .from("users")
                    .select("full_name, role, avatar_url")
                    .eq("id", user.id)
                    .maybeSingle();

                if (!mounted) return;
                setCurrentUserId(user.id);
                setUserName(userRow?.full_name || null);
                setAvatarUrl(resolvePublicStorageUrl(userRow?.avatar_url || ''));
                setRole((userRow?.role as "farmer" | "buyer" | "admin") || "buyer");
            } catch (e) {
                // silent
            } finally {
                if (mounted) setReady(true);
            }
        };

        load();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;
            if (!session?.user) {
                setCurrentUserId(null);
                setRole(null);
                setUserName(null);
                setAvatarUrl('');
                setFarmerPendingOrdersCount(0);
                setFarmerUnreadMessagesCount(0);
                setReady(true);
                return;
            }

            try {
                const { data: userRow } = await supabase
                    .from("users")
                    .select("full_name, role, avatar_url")
                    .eq("id", session.user.id)
                    .maybeSingle();


                if (!mounted) return;
                setCurrentUserId(session.user.id);
                setUserName(userRow?.full_name || null);
                setAvatarUrl(resolvePublicStorageUrl(userRow?.avatar_url || ''));
                setRole((userRow?.role as "farmer" | "buyer" | "admin") || "buyer");
            } catch (e) {
                // silent
            } finally {
                if (mounted) setReady(true);
            }
        });

        return () => {
            mounted = false;
            subscription?.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const syncCartCount = () => {
            setCartCount(getCartCount());
        };

        syncCartCount();
        window.addEventListener(CART_UPDATED_EVENT, syncCartCount);
        window.addEventListener('storage', syncCartCount);

        return () => {
            window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
            window.removeEventListener('storage', syncCartCount);
        };
    }, []);

    useEffect(() => {
        let active = true;
        let ordersChannel: any = null;
        let messagesChannel: any = null;

        const loadFarmerPendingOrdersCount = async () => {
            if (!currentUserId) {
                if (active) setFarmerPendingOrdersCount(0);
                return;
            }

            const { data: productRows, error: productError } = await supabase
                .from('products')
                .select('id')
                .eq('farmer_id', currentUserId)
                .eq('is_deleted', false);

            if (productError) {
                if (active) setFarmerPendingOrdersCount(0);
                return;
            }

            const productIds = (productRows || []).map((row: any) => row.id);
            if (productIds.length === 0) {
                if (active) setFarmerPendingOrdersCount(0);
                return;
            }

            const { count, error: ordersError } = await supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .in('product_id', productIds)
                .eq('status', 'pending');

            if (!ordersError && active) {
                setFarmerPendingOrdersCount(count || 0);
            }
        };

        const loadFarmerUnreadMessagesCount = async () => {
            if (!currentUserId) {
                if (active) setFarmerUnreadMessagesCount(0);
                return;
            }

            const { count, error: messagesError } = await supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('receiver_id', currentUserId)
                .eq('is_read', false)
                .neq('sender_id', currentUserId);

            if (!messagesError && active) {
                setFarmerUnreadMessagesCount(count || 0);
            }
        };

        const syncFarmerBadges = async () => {
            await Promise.all([loadFarmerPendingOrdersCount(), loadFarmerUnreadMessagesCount()]);
        };

        if (role !== 'farmer' || !currentUserId) {
            setFarmerPendingOrdersCount(0);
            setFarmerUnreadMessagesCount(0);
            return () => {
                active = false;
            };
        }

        syncFarmerBadges();

        ordersChannel = supabase
            .channel(`farmer-orders-badge-${currentUserId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                loadFarmerPendingOrdersCount();
            })
            .subscribe();

        messagesChannel = supabase
            .channel(`farmer-chat-badge-${currentUserId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUserId}`,
            }, () => {
                loadFarmerUnreadMessagesCount();
            })
            .subscribe();

        return () => {
            active = false;
            if (ordersChannel) supabase.removeChannel(ordersChannel);
            if (messagesChannel) supabase.removeChannel(messagesChannel);
        };
    }, [role, currentUserId]);

    const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

    // Show nothing on public routes or while loading
    const publicRoutes = ["/", "/login", "/reset-password", "/reset-password-confirm", "/products"];
    const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname?.startsWith(`${route}/`));

    if (!ready) {
        return isPublicRoute ? null : (
            <div className="w-60 flex-shrink-0 bg-gray-100" />
        );
    }

    if (!role) {
        return isPublicRoute ? null : (
            <div className="w-60 flex-shrink-0 bg-gray-100" />
        );
    }

    const farmerLinks: NavLink[] = [
        { icon: "🏠", label: "Home", href: "/farmer" },
        { icon: "📦", label: "Products", href: "/farmer/products" },
        { icon: "➕", label: "Add Product", href: "/farmer/create" },
        { icon: "📋", label: "Orders", href: "/farmer/orders" },
        { icon: "🕘", label: "History", href: "/farmer/history" },
        { icon: "💬", label: "Chat", href: "/farmer/chat" },
        { icon: "👤", label: "Profile", href: "/farmer/profile" },
    ];

    const buyerLinks: NavLink[] = [
        { icon: "🏠", label: "Home", href: "/buyer" },
        { icon: "🛒", label: "Cart", href: "/buyer/cart" },
        { icon: "📋", label: "My Orders", href: "/buyer/orders" },
        { icon: "🕘", label: "History", href: "/buyer/history" },
        { icon: "💬", label: "Chat", href: "/buyer/chat" },
        { icon: "👤", label: "Profile", href: "/buyer/profile" },
    ];

    const adminLinks: NavLink[] = [
        { icon: "📊", label: "Overview", href: "/admin" },
        { icon: "👥", label: "Users", href: "/admin/users" },
        { icon: "🧺", label: "Products", href: "/admin/products" },
        { icon: "🧾", label: "Orders", href: "/admin/orders" },
        { icon: "⚠️", label: "Disputes", href: "/admin/disputes" },
        { icon: "📝", label: "Logs", href: "/admin/logs" },
    ];

    const links = role === "farmer" ? farmerLinks : role === "admin" ? adminLinks : buyerLinks;
    const isLightMode = themeMode === 'light';

    const roleTheme = role === "admin"
        ? {
            brandText: isLightMode ? 'text-[#16a34a]' : "text-sky-300",
            avatarBg: isLightMode ? 'bg-[#eaffea] text-[#16a34a] border border-[#bbf7d0]' : "bg-sky-500/15 text-sky-200 border border-sky-400/20",
            activeLink: isLightMode
                ? 'bg-green-500 text-white font-semibold shadow-[0_0_18px_rgba(34,197,94,0.25)]'
                : "bg-[#4ade80] text-[#071007] font-semibold shadow-[0_0_18px_rgba(74,222,128,0.25)]",
            hoverLink: isLightMode ? 'text-[#000000] hover:bg-[#f1f5f9] hover:text-[#000000]' : "text-slate-300 hover:bg-[#1a2e1a] hover:text-white",
        }
        : {
            brandText: isLightMode ? 'text-[#16a34a]' : "text-[#4ade80]",
            avatarBg: isLightMode ? 'bg-[#eaffea] text-[#16a34a] border border-[#bbf7d0]' : "bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/20",
            activeLink: isLightMode
                ? 'bg-green-500 text-white font-semibold shadow-[0_0_18px_rgba(34,197,94,0.25)]'
                : "bg-[#4ade80] text-[#071007] font-semibold shadow-[0_0_18px_rgba(74,222,128,0.25)]",
            hoverLink: isLightMode ? 'text-[#000000] hover:bg-[#f1f5f9] hover:text-[#000000]' : "text-slate-300 hover:bg-[#1a2e1a] hover:text-white",
        };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <aside className={`flex w-60 flex-shrink-0 flex-col ${isLightMode ? 'border-r border-[#e2e8f0] bg-[#ffffff] text-[#0f172a]' : 'border-r border-[#2d4a2d] bg-[#0a150a] text-white'}`}>
            <div className={`flex flex-col p-6 ${isLightMode ? 'border-b border-[#e2e8f0]' : 'border-b border-[#1f331f]'}`}>
                <div className={`text-2xl font-extrabold ${roleTheme.brandText}`}>🌾 <span className="align-middle">AgriSpark</span></div>
                <div className="mt-3 flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full font-semibold ${roleTheme.avatarBg}`}>
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt={userName || 'User'} className="h-full w-full object-cover" />
                        ) : (
                            getInitials(userName || 'User')
                        )}
                    </div>
                    <div>
                        <div className={`text-sm font-medium ${isLightMode ? 'text-[#166534]' : 'text-white'}`}>{userName || 'User'}</div>
                        <div className={`text-xs ${isLightMode ? 'text-[#166534]' : 'text-slate-400'}`}>{role === 'farmer' ? 'Farmer' : role === 'admin' ? 'Admin' : 'Buyer'}</div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {links.map((link) => {
                    const active = isActive(link.href);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 transition ${active ? roleTheme.activeLink : roleTheme.hoverLink}`}
                        >
                            <span className="text-xl" style={{ width: 20 }}>{link.icon}</span>
                            <span className="text-sm">{link.label}</span>
                            {role === 'buyer' && link.href === '/buyer/cart' && cartCount > 0 && (
                                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {cartCount}
                                </span>
                            )}
                            {role === 'farmer' && link.href === '/farmer/orders' && farmerPendingOrdersCount > 0 && (
                                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {farmerPendingOrdersCount}
                                </span>
                            )}
                            {role === 'farmer' && link.href === '/farmer/chat' && farmerUnreadMessagesCount > 0 && (
                                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {farmerUnreadMessagesCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className={`p-4 ${isLightMode ? 'border-t border-[#e2e8f0]' : 'border-t border-[#1f331f]'}`}>
                <button
                    type="button"
                    onClick={onToggleTheme}
                    className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 transition ${isLightMode ? 'text-[#374151] hover:bg-[#f1f5f9] hover:text-[#0f172a]' : 'text-slate-300 hover:bg-[#1a2e1a] hover:text-white'}`}
                >
                    <span className="text-xl">{themeMode === 'dark' ? '🌙' : '☀️'}</span>
                    <span className="text-sm">{themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                <button onClick={handleLogout} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 transition ${isLightMode ? 'text-[#374151] hover:bg-[#f1f5f9] hover:text-[#0f172a]' : 'text-slate-300 hover:bg-[#1a2e1a] hover:text-white'}`}>
                    <span className="text-xl">🔓</span>
                    <span className="text-sm">Logout</span>
                </button>
            </div>
        </aside>
    );
}
