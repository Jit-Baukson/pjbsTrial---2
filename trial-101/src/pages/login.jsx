import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Logo from '../assets/icons/stickit-mascot.svg'
import { useAuth } from '../context/auth.jsx'

// Email + password sign-in / sign-up. Reached when a guest tries to check out;
// after success we bounce them straight back to where they came from (the cart
// lives in localStorage, so it survives the trip).
function Login() {
    const { signIn, signUp, user } = useAuth()
    const location = useLocation()
    const from = location.state?.from || '/shopping/doraemon'

    const [mode, setMode] = useState('signin') // 'signin' | 'signup'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    // Already signed in — no need to be here.
    if (user) return <Navigate to={from} replace />

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setBusy(true)
        try {
            const { data, error } =
                mode === 'signup'
                    ? await signUp(email, password)
                    : await signIn(email, password)
            if (error) throw error

            // With email confirmations off, signUp returns a session immediately.
            if (!data.session) {
                setError('Check your email to confirm your account, then sign in.')
                setBusy(false)
                return
            }
        } catch (err) {
            setError(err.message || 'Something went wrong.')
            setBusy(false)
        }
    }

    return (
        <div className="login-page">
            <section className="login-card">
                <div className="login-card__header">
                    <h1>{mode === 'signup' ? 'Create account' : 'Welcome back'}</h1>
                    <p className="login-note">
                        Log in or sign up to check out. Your cart is saved and
                        you’ll head straight back after.
                    </p>
                    <img src={Logo} alt="Stickit mascot" />
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-row">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-row">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        />
                    </div>

                    {error && <p className="form-error" role="alert">{error}</p>}

                    <div className="actions">
                        <button type="submit" className="shop-btn login-btn" disabled={busy}>
                            {busy ? 'One sec…' : mode === 'signup' ? 'Sign up' : 'Sign in'}
                        </button>
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => {
                                setMode((m) => (m === 'signup' ? 'signin' : 'signup'))
                                setError('')
                            }}
                        >
                            {mode === 'signup' ? 'Have an account? Sign in' : 'New here? Sign up'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    )
}

export default Login
