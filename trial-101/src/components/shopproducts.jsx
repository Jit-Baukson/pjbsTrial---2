import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatIDR, formatPriceK } from '../lib/format.js'
import ProductImage from './productImage.jsx'
import QuantityStepper from './quantityStepper.jsx'
import { useCart } from '../context/cart.jsx'

function ProductsDisplay({ selectedCategory }) {
    const { add, items } = useCart()

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
                        .select('productCode, category, packed, price, imagePath')
                        .eq('category', selectedCategory)
                        .eq('packed', 'individual')
                        .eq('availability', true),
                    supabase
                        .from('products')
                        .select('productCode, category, packed, price, imagePath')
                        .eq('category', selectedCategory)
                        .eq('packed', 'group')
                        .eq('availability', true),
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

    // Individual stickers are unique one-unit items, so once one is in the cart
    // it can't be added again. Group/mystery packs are re-addable (quantity).
    // Key on productCode (always present + unique), NOT id, which may be
    // undefined on the local drifted schema and would match every card.
    const individualInCart = useMemo(
        () =>
            new Set(
                items
                    .filter((i) => i.packed !== 'group')
                    .map((i) => i.productCode)
            ),
        [items]
    )

    function handleAddToCart() {
        add(selectedProduct, quantity)
        // Only group packs need the transient "Added ✓" flash that resets itself;
        // for individuals the cart state keeps the button disabled permanently.
        if (selectedProduct.packed === 'group') {
            setAdded(true)
            setTimeout(() => setAdded(false), 1600)
        }
    }

    const renderCard = (product, variant) => {
        const alreadyAdded =
            variant === 'individual-pack' && individualInCart.has(product.productCode)
        return (
            <div
                className={`${variant}${alreadyAdded ? ' is-in-cart' : ''}`}
                key={`${variant}-${product.id ?? product.productCode}`}
                role="button"
                tabIndex={0}
                aria-label={
                    alreadyAdded
                        ? `${product.productCode} — already in cart`
                        : `View ${product.productCode}`
                }
                aria-disabled={alreadyAdded || undefined}
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
                    <p className="product__price">{formatPriceK(product.price)}</p>

                    {alreadyAdded && (
                        <span className="card-added__overlay" aria-hidden="true">
                            <span className="card-added__badge">In cart</span>
                        </span>
                    )}
                </div>
                <p className="product__title">{product.productCode}</p>
            </div>
        )
    }

    const total = individualProducts.length + groupProducts.length

    const selectedAlreadyInCart =
        !!selectedProduct &&
        selectedProduct.packed !== 'group' &&
        individualInCart.has(selectedProduct.productCode)

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
                            ? 'nah nothin I can show here now, come again'
                            : selectedCategory
                              ? 'nothin here — check back soon!'
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

                        {/* Only mystery/group packs take a quantity; individual
                            stickers are a single unit. */}
                        {selectedProduct.packed === 'group' && (
                            <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={99} />
                        )}

                        <button
                            className="add-to-cart-btn"
                            onClick={handleAddToCart}
                            disabled={selectedAlreadyInCart}
                        >
                            {selectedAlreadyInCart
                                ? 'In cart ✓'
                                : added
                                  ? 'Added ✓'
                                  : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProductsDisplay
