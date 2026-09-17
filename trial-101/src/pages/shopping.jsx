import React, {useState, useEffect} from 'react'
import { supabase } from '../lib/supabaseClient.js'
import ShopCategory from '../components/shopcategory.jsx'
import ProductsDisplay from '../components/shopproducts.jsx'

function Shopping() {
    const [products, setProducts] = useState([])
    const [doraemonProducts, setDoraemonProducts] = useState([])
    const [catProducts, setCatProducts] = useState([])

    useEffect(() => {
        grabData()
    }, [])

    async function grabData() {
        const [data,error] = await supabase
            .from('[products')
            .select('*')
            setProducts(data)
            console.log(data)

        if(error) {
            console.warn(error);
        }
    }
    return(
        <main className="main-content" id="main-content">
            <section className="shop-page">
                <ShopCategory/>
                <ProductsDisplay/>
            </section>
        </main>
    );
}

export default Shopping