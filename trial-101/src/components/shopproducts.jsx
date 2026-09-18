import { supabase } from '../lib/supabaseClient.js'
import { useState, useEffect} from 'react'

function ProductsDisplay({ selectedCategory }) {

    const [individualProducts, setIndividualProducts] = useState([])
    const [groupProducts, setGroupProducts] = useState([])

    const [failedImages, setFailedImages] = useState([])
    console.log(import.meta.env.VITE_SUPABASE_URL)
    
    console.log(selectedCategory)
    console.log("shopProducts are actually running")

    useEffect(() => {
        grabData()
        setFailedImages([])
    }, [selectedCategory])

    async function grabData() {
        const { data: iProducts, error: iProductsError }= await supabase
            .from('products')
            .select('*')
            .eq('category', selectedCategory)
            .eq('packed', 'individual')

        const { data: gProducts, error: iGroductsError } = await supabase
            .from('products')
            .select('*')
            .eq('category', selectedCategory)
            .eq('packed', 'group')

        
        setIndividualProducts(iProducts)
        setGroupProducts(gProducts)

        if(iProductsError) {
            console.warn(iProductsError);
        }
        if(iGroductsError) {
            console.warn(iGroductsError);
        }
    }

//    console.log(products[0].selectedCategory)
console.log(individualProducts)
    return(
        <div className="shop-products">
            <div className="products__title">
                <h2>Products</h2>
            </div>

            <div className="products__layout">
                {groupProducts.filter(product => !failedImages.includes(product.productCode)).map((product, i) => (
                    <div className="mystery-pack">
                        <div className="img-background">
                            <img
                                src={`/outputFiles/${product.imagePath}`}
                                alt="cool groups of cat stickers"
                                onError={(e) => {
                                    return setFailedImages(fail => [...fail, product.productCode])
                                }}
                            />
                            <p className="product__price">{product.price > 1000 ? (product.price / 1000) + 'K' : product.price}</p>
                        </div>
                        <p className="product__title">{product.productCode}</p>
                    </div>
                ))}
                
                {individualProducts.filter(product => !failedImages.includes(product.productCode)).map((product, i) => (
                    <div className="individual-pack" key={`individual-${product.category}-${i}`}>
                        <div className="img-background">
                            <img
                                className="individual__img"
                                src={`/outputFiles/${product.imagePath}`}
                                alt="cool groups of cat stickers"
                                loading='lazy'
                                onError={(e) => {
                                    return setFailedImages(fail => [...fail,  product.productCode])
                                }}
                            />
                            <p className="product__price">{product.price > 1000 ? (product.price / 1000) + 'K' : product.price}</p>
                        </div>
                        <p className="product__title">{product.productCode}</p>
                    </div>
                ))}

                {individualProducts.length + groupProducts.length > 0 &&
                failedImages.length === individualProducts.length + groupProducts.length && (
                    <h4>There's no Products to be displayed</h4>
                )}

            </div>
        </div>
    );
}

export default ProductsDisplay