// Currency + number helpers, single source of truth so the grid, modal and
// receipt all show prices identically (the old formatPrice produced "1.001K").

const idr = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
})

// Full price: "Rp15.000"
export function formatIDR(value) {
    const n = Number(value)
    return idr.format(Number.isFinite(n) ? n : 0)
}

// Compact price for product cards (before the item is opened): price / 1000 + "k".
// 15000 -> "15k", 12500 -> "12.5k" (trailing .0 stripped). No currency symbol.
// Anything under 1000 has no meaningful "k" value, so show the plain number.
export function formatPriceK(value) {
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) return '0'
    if (n < 1000) return `${Math.round(n)}`
    const label = (n / 1000).toFixed(1).replace(/\.0$/, '')
    return `${label}k`
}
