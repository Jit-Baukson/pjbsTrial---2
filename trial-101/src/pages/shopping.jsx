
import { useParams } from 'react-router-dom'
import ShopCategory from '../components/shopcategory.jsx'
import ProductsDisplay from '../components/shopproducts.jsx'
import Navbar from '../components/navbar.jsx'
import Footer from '../components/footer.jsx'

function Shopping() {
   
    const { category } = useParams()

    console.log(category)

    return(
        <>
            <Navbar/>
            <main className="main-content" id="main-content">
                <section className="shop-page">
                    <ShopCategory selectedCategory={category}/>
                    <ProductsDisplay selectedCategory={category}/>
                </section>
                
            </main>
            <Footer/>
        </>
        
    );
}

export default Shopping