import { supabase } from './supabaseClient.js'

// Saved contact profile for a signed-in customer. RLS restricts every query to
// the caller's own row (userId = auth.uid()), so no user id needs to be trusted
// from the client for reads/writes to succeed.

// Returns { name, instagram, email, phone } or null if the customer hasn't
// saved a profile yet.
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('name, instagram, email, phone')
        .eq('userId', userId)
        .maybeSingle()
    if (error) throw error
    return data
}

// Upserts the customer's saved profile (from the profile page or after a
// purchase). `phone` is optional; omitting it leaves any saved value intact.
export async function saveProfile(userId, { name, instagram, email, phone }) {
    const { error } = await supabase.from('profiles').upsert(
        { userId, name, instagram, email, phone, updatedAt: new Date().toISOString() },
        { onConflict: 'userId' }
    )
    if (error) throw error
    // Let the header greeting refresh instantly, wherever the save happened.
    window.dispatchEvent(
        new CustomEvent('stickit:profile', {
            detail: { name: (name ?? '').trim(), instagram: (instagram ?? '').trim() },
        })
    )
}
