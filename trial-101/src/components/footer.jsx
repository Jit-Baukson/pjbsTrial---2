import instagramLogo from '../assets/icons/instagram-logo.svg'
import gmailLogo from '../assets/icons/gmail-logo.svg'
import { useState } from 'react'

function Footer() {
    const [copied, setCopied] = useState(false);

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
                <button
                    className="contact-link"
                    onClick={() => {
                        navigator.clipboard.writeText("Stickit.co.official@gmail.com")
                        setCopied(true)

                        setTimeout(() => {
                            setCopied(false)
                        }, 2000)
                    }}
                >
                    <img
                        src={gmailLogo}
                        alt="Gmail logo"
                        width="20"
                        height="20"
                        loading="lazy"
                    />
                    <span className="contact-link__label">
                        Stickit.co.official@gmail.com
                    </span>
                </button>
                </li>
            </ul>
            </div>
        
            {copied && (
            <div className="copy-popup">
                Email copied to clipboard!
            </div>
            )}
            
        </footer>
    );
}

export default Footer