import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatIDR, formatIDRCompact } from '../lib/format.js'
import ProductImage from './productImage.jsx'
import QuantityStepper from './quantityStepper.jsx'
import { useCart } from '../context/cart.jsx'

function ProductsDisplay({ selectedCategory }) {
    const { add } = useCart()

    const [individualProducts, setIndividualProducts] = useState([])
    const [groupProducts, setGroupProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(false)

    const [selectedProduct, setSelectedProduct] = useState(null)
    const [isClosing, setIsClosing] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [added, setAdded] = useState(false)
    const closeRef = useRef(null)

    useEffect(() => {
        async function grabData() {
            setLoading(true)
            setLoadError(false)

            const [{ data: iProducts, error: iErr }, { data: gProducts, error: gErr }] =
                await Promise.all([
                    supabase
                        .from('products')
                        .select('*')
                        .eq('category', selectedCategory)
                        .eq('packed', 'individual'),
                    supabase
                        .from('products')
                        .select('*')
                        .eq('category', selectedCategory)
                        .eq('packed', 'group'),
                ])

            if (iErr || gErr) {
                console.warn(iErr || gErr)
                setLoadError(true)
            }

            setIndividualProducts(iProducts || [])
            setGroupProducts(gProducts || [])
            setLoading(false)
        }

        if (selectedCategory) grabData()
        else {
            setIndividualProducts([])
            setGroupProducts([])
            setLoading(false)
        }
    }, [selectedCategory])

    // Reset + close the preview when switching categories
    useEffect(() => {
        setSelectedProduct(null)
        setQuantity(1)
    }, [selectedCategory])

    function openModal(product) {
        setSelectedProduct(product)
        setQuantity(1)
        setAdded(false)
    }

    function closeModal() {
        setIsClosing(true)
        setTimeout(() => {
            setSelectedProduct(null)
            setIsClosing(false)
        }, 250)
    }

    // Escape closes the modal; lock background scroll while it's open.
    useEffect(() => {
        if (!selectedProduct) return
        const onKey = (e) => e.key === 'Escape' && closeModal()
        document.addEventListener('keydown', onKey)
        document.body.style.overflow = 'hidden'
        closeRef.current?.focus()
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
        }
    }, [selectedProduct])

    function handleAddToCart() {
        add(selectedProduct, quantity)
        setAdded(true)
        setTimeout(() => setAdded(false), 1600)
    }

    const renderCard = (product, variant) => (
        <div
            className={variant}
            key={`${variant}-${product.id ?? product.productCode}`}
            role="button"
            tabIndex={0}
            aria-label={`View ${product.productCode}`}
            onClick={() => openModal(product)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openModal(product)
                }
            }}
        >
            <div className="img-background">
                <ProductImage
                    className={variant === 'individual-pack' ? 'individual__img' : undefined}
                    src={`/outputFiles/${product.imagePath}`}
                    alt={product.productCode}
                    loading="lazy"
                />
                <p className="product__price">{formatIDRCompact(product.price)}</p>
            </div>
            <p className="product__title">{product.productCode}</p>
        </div>
    )

    const total = individualProducts.length + groupProducts.length

    return (
        <div className="shop-products">
            <div className="products__title">
                <h2>Products</h2>
            </div>

            <div className="products__layout">
                {loading &&
                    Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={`sk-${i}`}
                            className={i % 3 === 0 ? 'mystery-pack skeleton' : 'individual-pack skeleton'}
                            aria-hidden="true"
                        />
                    ))}

                {!loading &&
                    groupProducts.map((product) => renderCard(product, 'mystery-pack'))}

                {!loading &&
                    individualProducts.map((product) => renderCard(product, 'individual-pack'))}

                {!loading && total === 0 && (
                    <p className="products__empty">
                        {loadError
                            ? 'We could not load products right now. Please try again shortly.'
                            : selectedCategory
                              ? 'No products in this category yet — check back soon!'
                              : 'Pick a category to browse stickers.'}
                    </p>
                )}
            </div>

            {/* PRODUCT PREVIEW MODAL */}
            {selectedProduct && (
                <div
                    className={`product-modal-overlay ${isClosing ? 'closing' : ''}`}
                    onClick={closeModal}
                    role="dialog"
                    aria-modal="true"
                    aria-label={selectedProduct.productCode}
                >
                    <div className="product-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            ref={closeRef}
                            className="modal-close"
                            onClick={closeModal}
                            aria-label="Close product preview"
                        >
                            &times;
                        </button>

                        <ProductImage
                            className="modal-product-img"
                            src={`/outputFiles/${selectedProduct.imagePath}`}
                            alt={selectedProduct.productCode}
                        />

                        <h2 className="modal-product-title">{selectedProduct.productCode}</h2>

                        <p className="modal-product-price">{formatIDR(selectedProduct.price)}</p>

                        <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={99} />

                        <button className="add-to-cart-btn" onClick={handleAddToCart}>
                            {added ? 'Added ✓' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProductsDisplay
