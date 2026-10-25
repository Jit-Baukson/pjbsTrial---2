import { Component } from 'react'

// Last-resort UI for unexpected render errors. React boundaries do not catch
// async/event errors, but this prevents a blank white page on render crashes.
export default class ErrorBoundary extends Component {
    state = { hasError: false }

    static getDerivedStateFromError() {
        return { hasError: true }
    }

    componentDidCatch(error, info) {
        console.error('Unhandled application error', error, info)
    }

    render() {
        if (!this.state.hasError) return this.props.children

        return (
            <div className="login-page">
                <section className="login-card" role="alert">
                    <h1>Something went wrong.</h1>
                    <p className="login-note">
                        Please reload the page. If it keeps happening, contact Stickit.co with
                        the time it occurred.
                    </p>
                    <div className="actions">
                        <button
                            type="button"
                            className="shop-btn"
                            onClick={() => window.location.reload()}
                        >
                            Reload page
                        </button>
                        <a className="secondary" href="/home">
                            Back to home
                        </a>
                    </div>
                </section>
            </div>
        )
    }
}
