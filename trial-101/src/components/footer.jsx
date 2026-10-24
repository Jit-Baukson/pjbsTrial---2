import instagramLogo from '../assets/icons/instagram-logo.svg'
import gmailLogo from '../assets/icons/gmail-logo.svg'
import { useRef, useState } from 'react'

const COMPANY_EMAIL = 'Stickit.co.official@gmail.com'

function Footer() {
    const [copied, setCopied] = useState(false);
    // Bumping this key remounts the toast so the fireworks replay on repeat clicks.
    const [burst, setBurst] = useState(0);
    const timer = useRef(null);

    function copyEmail() {
        navigator.clipboard.writeText(COMPANY_EMAIL)
        setCopied(true)
        setBurst((b) => b + 1)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 2000)
    }

    return(
          <footer className="site-footer" id="footer__contact">
            <div className="contact">
            <h2 className="visually-hidden" id="contact-heading">Contact</h2>
            <ul className="contact-list">
                <li className="contact-list__item reveal">
                <a className="contact-link" href="https://www.instagram.com/stickit.co_official/">
                    <img src={instagramLogo} alt="Instagram logo" width="20" height="20" loading="lazy"/>
                    <span className="contact-link__label">Stickit.co_official</span>
                </a>
                </li>
                <li className="contact-list__item reveal">
                <button className="contact-link" onClick={copyEmail}>
                    <img
                        src={gmailLogo}
                        alt="Gmail logo"
                        width="20"
                        height="20"
                        loading="lazy"
                    />
                    <span className="contact-link__label">
                        {COMPANY_EMAIL}
                    </span>
                </button>
                </li>
            </ul>
            </div>

            {copied && (
            <div className="copy-toast" key={burst} role="status" aria-live="polite">
                <span className="copy-toast__burst" aria-hidden="true">
                    <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
                </span>
                Email has been copied
            </div>
            )}

        </footer>
    );
}

export default Footer
