import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey,
    {
        // Sessions are stored in localStorage and refreshed automatically, so a
        // signed-in customer stays logged in across visits.
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    }
)