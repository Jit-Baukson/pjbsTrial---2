import { useState } from 'react'

// Drop-in <img> that, instead of silently disappearing (the old behaviour hid
// failed products entirely), degrades to a neutral on-brand placeholder so the
// customer still sees the product and its code.
export default function ProductImage({ src, alt, className = '', ...rest }) {
    const [failed, setFailed] = useState(false)

    if (failed || !src) {
        return (
            <div
                className={`img-fallback ${className}`}
                role="img"
                aria-label={alt ? `${alt} (image unavailable)` : 'Image unavailable'}
            >
                <span className="img-fallback__label">{alt}</span>
            </div>
        )
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            decoding="async"
            onError={() => setFailed(true)}
            {...rest}
        />
    )
}
