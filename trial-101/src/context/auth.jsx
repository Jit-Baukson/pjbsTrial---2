import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Guest-aware auth.
// Accounts are intentionally deferred, but this provider already:
//   * reads the real Supabase session on load,
//   * subscribes to auth changes,
//   * exposes a stable shape (user / loading / signIn / signUp / signOut),
// so enabling email or Google auth later is a UI change, not a refactor.
// Guest checkout works fully without any of the sign-in methods being wired.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            setLoading(false)
        })

        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s)
        })

        return () => sub.subscription.unsubscribe()
    }, [])

    const value = useMemo(
        () => ({
            session,
            user: session?.user ?? null,
            loading,
            isGuest: loading ? false : !session,
            signOut: () => supabase.auth.signOut(),
        }),
        [session, loading]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
    return ctx
}
