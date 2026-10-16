import { Link } from 'react-router-dom'
import Logo from '../assets/icons/stickit-mascot.svg'

// Accounts are intentionally deferred (guest checkout is the current flow).
// Rather than a form that silently does nothing, this page now communicates
// that clearly and keeps customers moving toward the shop. When Supabase Auth
// is enabled, this is the natural home for the sign-in form.
function Login() {
    return (
        <section className="login-card">
            <div className="login-card__header">
                <h1>Guest checkout</h1>

                <p className="login-note">
                    You don’t need an account to shop at Stickit.co — just add
                    stickers to your cart and check out as a guest.
                </p>

                <img src={Logo} alt="Stickit mascot" />
            </div>

            <p className="login-note">
                Saving carts &amp; order history with a personal account is
                coming soon.
            </p>

            <div className="actions">
                <Link className="shop-btn login-btn" to="/shopping/doraemon">
                    Continue shopping
                </Link>
            </div>
        </section>
    )
}

export default Login
