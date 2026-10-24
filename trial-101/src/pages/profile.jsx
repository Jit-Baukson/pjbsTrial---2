import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/shopHeader.jsx'
import Footer from '../components/footer.jsx'
import { useAuth } from '../context/auth.jsx'
import { getProfile, saveProfile } from '../lib/profiles.js'

// The customer's saved profile: what to call them, Instagram, email and an
// optional phone. Reached from the header avatar. Everything is editable and
// can be saved at any time; checkout prefills these values.
export default function Profile() {
    const { user, email: authEmail, signOut } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({ name: '', instagram: '', email: '', phone: '' })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState('')

    // Load the saved profile once; fall back to the account email.
    useEffect(() => {
        if (!user) return
        let active = true
        getProfile(user.id)
            .then((p) => {
                if (!active) return
                setForm({
                    name: p?.name || '',
                    instagram: p?.instagram || '',
                    email: p?.email || authEmail || '',
                    phone: p?.phone || '',
                })
            })
            .catch(() => {
                if (active) setForm((f) => ({ ...f, email: f.email || authEmail || '' }))
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [user, authEmail])

    function update(field) {
        return (e) => {
            setForm((f) => ({ ...f, [field]: e.target.value }))
            setSaved(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setSaving(true)
        try {
            await saveProfile(user.id, {
                name: form.name.trim(),
                instagram: form.instagram.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
            })
            setSaved(true)
        } catch (err) {
            setError(err.message || 'Could not save your profile.')
        } finally {
            setSaving(false)
        }
    }

    async function handleSignOut() {
        await signOut()
        navigate('/home')
    }

    return (
        <>
            <Header />
            <main className="main-content">
                <section className="login-page">
                    <div className="login-card">
                        <h1>Your profile</h1>
                        <p className="login-note">
                            Tell us what to call you and how to reach you. We’ll
                            prefill checkout with this — save anytime.
                        </p>

                        {loading ? (
                            <p className="login-note">Loading…</p>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <div className="form-row">
                                    <label htmlFor="name">What do you want to be called?</label>
                                    <input
                                        id="name"
                                        value={form.name}
                                        onChange={update('name')}
                                        autoComplete="name"
                                    />
                                </div>

                                <div className="form-row">
                                    <label htmlFor="instagram">Instagram</label>
                                    <input
                                        id="instagram"
                                        value={form.instagram}
                                        onChange={update('instagram')}
                                        placeholder="@yourhandle"
                                    />
                                </div>

                                <div className="form-row">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={form.email}
                                        onChange={update('email')}
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="form-row">
                                    <label htmlFor="phone">Phone number (optional)</label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={update('phone')}
                                        autoComplete="tel"
                                    />
                                </div>

                                {error && <p className="form-error" role="alert">{error}</p>}

                                <div className="actions">
                                    <button type="submit" className="shop-btn" disabled={saving}>
                                        {saving ? 'Saving…' : 'Save profile'}
                                    </button>
                                    {saved && (
                                        <span className="login-note" role="status">
                                            Saved ✓
                                        </span>
                                    )}
                                </div>
                            </form>
                        )}

                        <p className="login-note">
                            <Link to="/shopping/doraemon">← Continue shopping</Link>
                        </p>
                        <p className="login-note">
                            <button type="button" className="secondary" onClick={handleSignOut}>
                                Sign out
                            </button>
                        </p>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    )
}
