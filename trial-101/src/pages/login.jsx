
import { useState } from 'react';
import Logo from '../assets/icons/stickit-mascot.svg';

function Login() {
    const [isSignUp, setIsSignUp] = useState(false);

    return (
        <section className="login-card">
            <div className="login-card__header">
                <h1>
                    {isSignUp ? 'Create your account' : 'Welcome back'}
                </h1>

                <p className="login-note">
                    {isSignUp
                        ? 'Join Stickit.co and start shopping today!'
                        : 'Sign in to continue to Stickit.co'}
                </p>

                <img src={Logo} alt="Stickit mascot" />
            </div>

            {/* Google sign-in / sign-up button */}
            <div className="oauth">
                <div
                    id="g_id_onload"
                    data-client_id="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
                    data-callback="handleCredentialResponse"
                    data-auto_prompt="false"
                />

                <div className="g_id_signin" data-type="standard" />
            </div>

            <form
                action="#"
                method="post"
                aria-label={isSignUp ? 'Sign up form' : 'Login form'}
            >

                {/* Full name - Sign Up only */}
                {isSignUp && (
                    <div className="form-row">
                        <label htmlFor="fullname">Full Name</label>
                        <input
                            id="fullname"
                            name="fullname"
                            type="text"
                            required
                            autoComplete="name"
                        />
                    </div>
                )}

                <div className="form-row">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="form-row">
                    <label htmlFor="password">
                        {isSignUp ? 'Create Password' : 'Password'}
                    </label>

                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={isSignUp ? 8 : undefined}
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    />
                </div>

                {/* Confirm password - Sign Up only */}
                {isSignUp && (
                    <div className="form-row">
                        <label htmlFor="confirm-password">
                            Confirm Password
                        </label>

                        <input
                            id="confirm-password"
                            name="confirm-password"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                        />
                    </div>
                )}

                <div className="actions">
                    <button type="submit" className={`shop-btn ${isSignUp ? "signup-btn" : "login-btn"}`}>
                        {isSignUp ? 'Create Account' : 'Sign in'}
                    </button>

                    {!isSignUp && (
                        <button type="button" className="secondary">
                            Forgot?
                        </button>
                    )}
                </div>
            </form>

            <p className="login-note">
                {isSignUp
                    ? 'Already have an account? '
                    : "Don't have an account? "}

                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        setIsSignUp(!isSignUp);
                    }}
                >
                    {isSignUp ? 'Sign in' : 'Create one'}
                </a>
            </p>

        </section>
    );
}

export default Login;