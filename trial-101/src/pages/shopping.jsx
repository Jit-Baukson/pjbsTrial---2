
import { useParams } from 'react-router-dom'
import ShopCategory from '../components/shopcategory.jsx'
import ProductsDisplay from '../components/shopproducts.jsx'
import Footer from '../components/footer.jsx'

function Shopping() {
   
    const { category } = useParams()

    console.log(category)

    return(
        <main className="main-content" id="main-content">
            <section className="shop-page">
                <ShopCategory/>
                <ProductsDisplay category={category}/>
            </section>
            <Footer/>
        </main>
    );
}

export default Shopping