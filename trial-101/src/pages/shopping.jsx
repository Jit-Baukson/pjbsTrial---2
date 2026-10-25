
import { useParams } from 'react-router-dom'
import ShopCategory from '../components/shopcategory.jsx'
import ProductsDisplay from '../components/shopproducts.jsx'
import Header from '../components/shopHeader.jsx'
import Footer from '../components/footer.jsx'

function Shopping() {
   
    const { category } = useParams()

    return(
        <>
            <Header/>
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