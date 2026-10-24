import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

// Cart lives in localStorage today (works for guests + signed-in users with no
// extra tables). When DB-synced carts are added later, only the persistence
// layer below (load/save + a sync effect keyed on the auth user) needs to
// change — the reducer and the public API stay identical.
const STORAGE_KEY = 'stickit.cart.v1'

const CartContext = createContext(null)

// Unique id per cart LINE (not per product). Individual stickers are unique,
// one-unit items, so the same product added twice must occupy two separate
// lines — a stable per-line key lets React tell them apart.
function genLineId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
    return `line-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function reducer(state, action) {
    switch (action.type) {
        case 'add': {
            const { product, quantity } = action
            const packed = product.packed

            // Group / mystery packs bundle by product code and take a quantity.
            if (packed === 'group') {
                const existing = state.find((i) => i.productCode === product.productCode)
                if (existing) {
                    return state.map((i) =>
                        i.productCode === product.productCode
                            ? { ...i, quantity: i.quantity + quantity }
                            : i
                    )
                }
            }

            // Everything else (individual stickers) is a unique single-unit line.
            return [
                ...state,
                {
                    lineId: genLineId(),
                    productCode: product.productCode,
                    title: product.name || product.productCode,
                    price: Number(product.price),
                    imagePath: product.imagePath,
                    packed: packed === 'group' ? 'group' : 'individual',
                    quantity: packed === 'group' ? quantity : 1,
                },
            ]
        }
        case 'setQuantity':
            return state.map((i) =>
                i.lineId === action.lineId
                    ? { ...i, quantity: Math.max(1, action.quantity) }
                    : i
            )
        case 'remove':
            return state.filter((i) => i.lineId !== action.lineId)
        case 'clear':
            return []
        default:
            return state
    }
}

function loadInitial() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        if (!Array.isArray(parsed)) return []
        // Backfill older saved carts that predate lineId / packed fields.
        return parsed.map((i, idx) => ({
            packed: 'individual',
            quantity: 1,
            ...i,
            lineId: i.lineId || `${i.productCode || 'line'}-${idx}`,
        }))
    } catch {
        return []
    }
}

export function CartProvider({ children }) {
    const [items, dispatch] = useReducer(reducer, undefined, loadInitial)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        } catch {
            /* storage full / unavailable — cart stays in memory for the session */
        }
    }, [items])

    const value = useMemo(() => {
        const count = items.reduce((n, i) => n + i.quantity, 0)
        const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0)
        return {
            items,
            count,
            subtotal,
            add: (product, quantity = 1) => dispatch({ type: 'add', product, quantity }),
            setQuantity: (lineId, quantity) => dispatch({ type: 'setQuantity', lineId, quantity }),
            remove: (lineId) => dispatch({ type: 'remove', lineId }),
            clear: () => dispatch({ type: 'clear' }),
        }
    }, [items])

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
    const ctx = useContext(CartContext)
    if (!ctx) throw new Error('useCart must be used within <CartProvider>')
    return ctx
}
