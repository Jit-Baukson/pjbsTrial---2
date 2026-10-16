// Reuses the existing .product__quantity design (css/components/quantity.css).
export default function QuantityStepper({ value, onChange, min = 1, max = 99 }) {
    const clamp = (n) => Math.max(min, Math.min(max, n))

    return (
        <div className="product__quantity">
            <button
                type="button"
                className="quantity-button"
                aria-label="Decrease quantity"
                onClick={() => onChange(clamp(value - 1))}
            >
                &minus;
            </button>

            <input
                className="quantity-input"
                type="number"
                inputMode="numeric"
                value={value}
                min={min}
                max={max}
                aria-label="Quantity"
                onChange={(e) => onChange(clamp(parseInt(e.target.value, 10) || min))}
            />

            <button
                type="button"
                className="quantity-button"
                aria-label="Increase quantity"
                onClick={() => onChange(clamp(value + 1))}
            >
                +
            </button>
        </div>
    )
}
