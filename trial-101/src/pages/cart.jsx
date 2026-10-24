import { Link } from 'react-router-dom'
import Header from '../components/shopHeader.jsx'
import Footer from '../components/footer.jsx'
import ProductImage from '../components/productImage.jsx'
import QuantityStepper from '../components/quantityStepper.jsx'
import { useCart } from '../context/cart.jsx'
import { formatIDR } from '../lib/format.js'
import { SHIPPING_COST } from '../lib/checkout.js'

export default function Cart() {
    const { items, count, subtotal, setQuantity, remove } = useCart()
    const total = subtotal + (count > 0 ? SHIPPING_COST : 0)

    return (
        <>
            <Header />
            <main className="main-content">
                <section className="cart-page">
                    <h1 className="products__header">Your Cart</h1>

                    {count === 0 ? (
                        <div className="cart-empty">
                            <p>Your cart is feeling empty.</p>
                            <Link className="shop-btn" to="/shopping/doraemon">
                                Browse stickers
                            </Link>
                        </div>
                    ) : (
                        <div className="cart-layout">
                            <div className="product-items__container">
                                {items.map((it) => (
                                    <div className="product__item" key={it.lineId}>
                                        <ProductImage
                                            src={`/outputFiles/${it.imagePath}`}
                                            alt={it.productCode}
                                        />
                                        <div className="product__meta">
                                            <p className="product__title">{it.title}</p>
                                            <p className="product__total">
                                                {formatIDR(it.price)} each
                                            </p>
                                            {/* Only group / mystery packs take a quantity;
                                                individual stickers are unique single units. */}
                                            {it.packed === 'group' ? (
                                                <QuantityStepper
                                                    value={it.quantity}
                                                    onChange={(q) => setQuantity(it.lineId, q)}
                                                />
                                            ) : (
                                                <p className="product__unit">1 sticker · unique</p>
                                            )}
                                            <button
                                                type="button"
                                                className="cart-remove"
                                                onClick={() => remove(it.lineId)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <p className="product__lineTotal">
                                            {formatIDR(it.price * it.quantity)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <aside className="cart-summary">
                                <h2 className="summary__title">Order Summary</h2>
                                <div className="summary-row">
                                    <span>Subtotal</span>
                                    <span>{formatIDR(subtotal)}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Shipping</span>
                                    <span>{formatIDR(SHIPPING_COST)}</span>
                                </div>
                                <div className="total__rule" />
                                <div className="summary-row summary-row__total">
                                    <span>Total</span>
                                    <span>{formatIDR(total)}</span>
                                </div>
                                <Link className="checkout-btn" to="/checkout">
                                    Checkout
                                </Link>
                            </aside>
                        </div>
                    )}
                </section>
            </main>
            <Footer />
        </>
    )
}
