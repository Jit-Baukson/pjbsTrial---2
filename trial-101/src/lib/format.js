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

// Compact price for tight card badges: 15000 -> "15rb", 1500 -> "1.5rb", 900 -> "900"
// Avoids the previous bug where 1001 rendered as "1.001K" with no rounding.
export function formatIDRCompact(value) {
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) return idr.format(0)
    if (n >= 1000) {
        const thousands = n / 1000
        // at most 1 decimal, then strip trailing ".0"
        const label = thousands.toFixed(1).replace(/\.0$/, '')
        return `Rp${label}rb`
    }
    return `Rp${n}`
}
