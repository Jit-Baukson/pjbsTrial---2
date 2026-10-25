import logo from '../assets/icons/stickit.co.svg'
import mascot from '../assets/icons/stickit-mascot.svg'
import { Link } from 'react-router-dom'

function Header() {
    return (
        <section className="hero" aria-labelledby="hero-heading">
            <h1 className="visually-hidden" id="hero-heading">
                Stickit.co — handmade character stickers and mystery packs
            </h1>
            <div className="hero__content">
                <div className="hero__brand">
                    <img
                        src={logo}
                        className="hero__logo"
                        alt="Stickit.co"
                        width="640"
                        height="410"
                        loading="eager"
                    />
                </div>

                <p className="hero__tagline">
                    Established by a random idea at night, we help you find the one that fills your empty space.
                </p>

                <Link className="shop-btn" to='/shopping/doraemon'>
                    Shop Now!
                </Link>
            </div>

            <div className="hero__mascot">
                <img
                    src={mascot}
                    alt="Stickit mascot"
                    width="240"
                    height="460"
                    loading="eager"
                />
            </div>
        </section>
    );
}

export default Header;

