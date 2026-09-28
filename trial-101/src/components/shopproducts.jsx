import { supabase } from '../lib/supabaseClient.js'
import { useState, useEffect } from 'react'

function ProductsDisplay({ selectedCategory }) {
    const [isClosing, setIsClosing] = useState(false)
    const [individualProducts, setIndividualProducts] = useState([])
    const [groupProducts, setGroupProducts] = useState([])

    const [failedImages, setFailedImages] = useState([])
    const [selectedProduct, setSelectedProduct] = useState(null)

    useEffect(() => {
        async function grabData() {
            setFailedImages([])

            const { data: iProducts, error: iProductsError } =
                await supabase
                    .from('products')
                    .select('*')
                    .eq('category', selectedCategory)
                    .eq('packed', 'individual')

            const { data: gProducts, error: gProductsError } =
                await supabase
                    .from('products')
                    .select('*')
                    .eq('category', selectedCategory)
                    .eq('packed', 'group')

            if (iProductsError) {
                console.warn(iProductsError)
            }

            if (gProductsError) {
                console.warn(gProductsError)
            }

            setIndividualProducts(iProducts || [])
            setGroupProducts(gProducts || [])
        }

        grabData()
    }, [selectedCategory])

    // Close the preview when switching categories
    useEffect(() => {
        setSelectedProduct(null)
    }, [selectedCategory])

    // Hide products whose images failed to load
    function handleImageError(productCode) {
        setFailedImages(fail =>
            fail.includes(productCode)
                ? fail
                : [...fail, productCode]
        )
    }

    // Format product prices
    function formatPrice(price) {
        return price > 1000
            ? `${price / 1000}K`
            : price
    }
    function closeModal() {
        setIsClosing(true)

        setTimeout(() => {
            setSelectedProduct(null)
            setIsClosing(false)
        }, 250)
    }

    // Placeholder for future cart integration
    function handleAddToCart() {
        console.log('Add to cart:', selectedProduct)
    }

    return (
        <div className="shop-products">

            <div className="products__title">
                <h2>Products</h2>
            </div>

            <div className="products__layout">

                {/* GROUP PRODUCTS */}
                {groupProducts
                    .filter(product =>
                        !failedImages.includes(product.productCode)
                    )
                    .map(product => (
                        <div
                            className="mystery-pack"
                            key={`group-${product.productCode}`}
                            onClick={() => setSelectedProduct(product)}
                        >
                            <div className="img-background">
                                <img
                                    src={`/outputFiles/${product.imagePath}`}
                                    alt={product.productCode}
                                    onError={() =>
                                        handleImageError(product.productCode)
                                    }
                                />

                                <p className="product__price">
                                    {formatPrice(product.price)}
                                </p>
                            </div>

                            <p className="product__title">
                                {product.productCode}
                            </p>
                        </div>
                    ))}

                {/* INDIVIDUAL PRODUCTS */}
                {individualProducts
                    .filter(product =>
                        !failedImages.includes(product.productCode)
                    )
                    .map(product => (
                        <div
                            className="individual-pack"
                            key={`individual-${product.productCode}`}
                            onClick={() => setSelectedProduct(product)}
                        >
                            <div className="img-background">
                                <img
                                    className="individual__img"
                                    src={`/outputFiles/${product.imagePath}`}
                                    alt={product.productCode}
                                    loading="lazy"
                                    onError={() =>
                                        handleImageError(product.productCode)
                                    }
                                />

                                <p className="product__price">
                                    {formatPrice(product.price)}
                                </p>
                            </div>

                            <p className="product__title">
                                {product.productCode}
                            </p>
                        </div>
                    ))}

                {/* EMPTY PRODUCTS MESSAGE */}
                {individualProducts.length + groupProducts.length === 0 && (
                    <h4>There's no products to be displayed</h4>
                )}

            </div>

            {/* PRODUCT PREVIEW MODAL */}
            {selectedProduct && (
                <div
                    className={`product-modal-overlay ${isClosing ? 'closing' : ''}`}
                    onClick={closeModal}
                >
                    <div
                        className="product-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="modal-close"
                            onClick={closeModal}
                            aria-label="Close product preview"
                        >
                            &times;
                        </button>

                        <img
                            className="modal-product-img"
                            src={`/outputFiles/${selectedProduct.imagePath}`}
                            alt={selectedProduct.productCode}
                        />

                        <h2 className="modal-product-title">
                            {selectedProduct.productCode}
                        </h2>

                        <p className="modal-product-price">
                            Rp {Number(selectedProduct.price).toLocaleString('id-ID')}
                        </p>

                        <button
                            className="add-to-cart-btn"
                            onClick={handleAddToCart}
                        >
                            Add to Cart
                        </button>
                    </div>
                </div>
            )}

        </div>
    )
}

export default ProductsDisplay