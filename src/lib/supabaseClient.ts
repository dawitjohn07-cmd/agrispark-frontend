import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

let supabaseInstance: any = null;

const createFallbackClient = () => ({
    auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase is not configured.' } }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase is not configured.' } }),
        resetPasswordForEmail: async () => ({ data: null, error: { message: 'Supabase is not configured.' } }),
        updateUser: async () => ({ data: { user: null }, error: { message: 'Supabase is not configured.' } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    },
    from: () => ({
        select: () => ({
            eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
                single: async () => ({ data: null, error: null }),
            }),
        }),
        insert: async () => ({ data: null, error: null }),
        upsert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        order: () => ({ select: async () => ({ data: [], error: null }) }),
    }),
    storage: {
        from: () => ({
            upload: async () => ({ data: null, error: { message: 'Supabase is not configured.' } }),
            getPublicUrl: () => ({ data: { publicUrl: '' } }),
            remove: async () => ({ data: null, error: { message: 'Supabase is not configured.' } }),
            list: async () => ({ data: [], error: { message: 'Supabase is not configured.' } }),
        }),
    },
});

const createSupabaseClient = () => {
    if (!supabaseUrl || !supabaseKey) {
        return createFallbackClient();
    }

    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    });
};

export const supabase =
    (() => {
        if (!supabaseInstance) {
            supabaseInstance = createSupabaseClient();
        }
        return supabaseInstance;
    })();

