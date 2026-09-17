import instagramLogo from '../assets/icons/instagram-logo.svg'
import gmailLogo from '../assets/icons/gmail-logo.svg'

function Footer() {
    return(
          <footer className="site-footer" id="footer__contact">
            <div className="contact">
            <h2 className="visually-hidden" id="contact-heading">Contact</h2>
            <ul clclassNameass="contact-list">
                <li className="contact-list__item reveal">
                <a className="contact-link" href="https://www.instagram.com/stickit.co_official/">
                    <img src={instagramLogo} alt="Instagram logo" width="20" height="20" loading="lazy"/>
                    <span class="contact-link__label">Stickit.co_official</span>
                </a>
                </li>
                <li className="contact-list__item reveal">
                <a className="contact-link" href="mailto:Stickit.co.official@gmail.com">
                    <img src={gmailLogo} alt="Gmail logo" width="20" height="20" loading="lazy"/>
                    <span class="contact-link__label">Stickit.co.official@gmail.com</span>
                </a>
                </li>
            </ul>
            </div>
        </footer>
    );
}

export default Footer