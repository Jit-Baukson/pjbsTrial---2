import { supabase } from '../lib/supabaseClient.js'
import { useState, useEffect} from 'react'

function ProductsDisplay({ category }) {

    const [products, setProducts] = useState([])
    
    console.log(category)

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

    console.log(`C: ${category}`)
    return(
        <div className="shop-products">
            <div className="products__title">
                <h2>Products</h2>
            </div>

            <div className="products__layout">
                <div className="mystery-pack">
                    <div className="img-background">
                        <img
                            src="../assets/images/groups/catCluster.png"
                            alt="cool groups of cat stickers"
                        />
                        <p className="product__price">10K</p>
                    </div>
                    <p className="product__title">products name-4pcs</p>
                </div>

                <div className="individual-pack">
                    <div className="img-background">
                        <img
                            src="../assets/images/groups/catCluster.png"
                            alt="cool groups of cat stickers"
                        />
                        <p className="product__price">4K</p>
                    </div>
                    <p className="product__title">products name-4pcs</p>
                </div>
            </div>
        </div>
    );
}

export default ProductsDisplay