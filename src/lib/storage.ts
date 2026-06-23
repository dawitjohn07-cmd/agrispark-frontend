// Local Storage utilities to replace AsyncStorage
export const localStorage_ = {
    getItem: (key: string) => {
        if (typeof window !== 'undefined') {
            return window.localStorage.getItem(key);
        }
        return null;
    },

    setItem: (key: string, value: string) => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value);
        }
    },

    removeItem: (key: string) => {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
        }
    },

    clear: () => {
        if (typeof window !== 'undefined') {
            window.localStorage.clear();
        }
    },
};

// Utility to check if user is authenticated
export const checkAuth = async () => {
    if (typeof window === 'undefined') return null;

    const { data: { session } } = await (await import('./supabaseClient')).supabase.auth.getSession();
    return session;
};
