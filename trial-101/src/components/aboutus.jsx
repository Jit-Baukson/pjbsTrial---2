import cat from '../assets/icons/cat-looking-down.svg'

function AboutUs() {
    return(
        <section className="about" id="about" aria-labelledby="about-heading">
            <div className="about__intro">
                <h2 className="about__heading" id="about__heading">About Us</h2>
            </div>
            <article className="about-card" id="about-card">
                <div className="about-card__cat">
                <img src={cat} alt="cat looking down at the text below" width="30" height="30" loading="lazy"/>
                </div>
                <div className="about-card__body">
                <p>
                    <span className="about-card__brand"><strong><em>Stickit</em></strong><strong>.co </strong></span>
                    is the company I founded on
                    <strong className="about-card__gold"> July 2026 </strong>
                    during the semester break. We help you find the best way to fill your empty space. I created this business and web as a learning platform, to learn on the go and maybe make some
                    <strong className="about-card__gold"> good memories </strong>
                    along the way
                </p>
                </div>
            </article>
        </section>
    );
}

export default AboutUs