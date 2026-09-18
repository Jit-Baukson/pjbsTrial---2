import Navbar from '../components/navbar.jsx'
import Header from '../components/header.jsx'
import Category from '../components/category.jsx'
import AboutUs from '../components/aboutus.jsx'
import Footer from '../components/footer.jsx'
function Stickit() {
    return(
        <>
            <Navbar/>
            <section className="main-content">
                <Header/>
                <Category/>
                <AboutUs/>
            </section>
            
            <Footer/>
        </>
    );

}

export default Stickit