import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

// Email + password auth on top of Supabase.
//   * reads the real session on load and subscribes to changes,
//   * sessions persist in localStorage (see supabaseClient) so users stay
//     signed in across visits,
//   * exposes signIn / signUp / signOut returning the raw Supabase result so
//     callers can surface data.error to the UI.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data }) => setSession(data.session))
            .catch(() => setSession(null))
            .finally(() => setLoading(false))

        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
            setSession(s)
        })

        return () => sub.subscription.unsubscribe()
    }, [])

    const value = useMemo(
        () => ({
            session,
            user: session?.user ?? null,
            email: session?.user?.email ?? null,
            loading,
            isGuest: loading ? false : !session,
            signIn: (email, password) =>
                supabase.auth.signInWithPassword({ email, password }),
            signUp: (email, password) =>
                supabase.auth.signUp({ email, password }),
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
