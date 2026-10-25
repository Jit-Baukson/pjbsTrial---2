import { Link } from 'react-router-dom'
import Navbar from '../components/navbar.jsx'
import Footer from '../components/footer.jsx'

export default function NotFound() {
    return (
        <>
            <Navbar />
            <main className="main-content">
                <section className="notfound">
                    <p className="notfound__code">404</p>
                    <h1 className="notfound__title">This sticker peeled off.</h1>
                    <p className="notfound__text">
                        The page you’re looking for doesn’t exist or has moved.
                    </p>
                    <Link className="shop-btn" to="/home">
                        Back to home
                    </Link>
                </section>
            </main>
            <Footer />
        </>
    )
}
