import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'

// Cart lives in localStorage today (works for guests + signed-in users with no
// extra tables). When DB-synced carts are added later, only the persistence
// layer below (load/save + a sync effect keyed on the auth user) needs to
// change — the reducer and the public API stay identical.
const STORAGE_KEY = 'stickit.cart.v1'

const CartContext = createContext(null)

function reducer(state, action) {
    switch (action.type) {
        case 'add': {
            const { product, quantity } = action
            const existing = state.find((i) => i.productId === product.id)
            if (existing) {
                return state.map((i) =>
                    i.productId === product.id
                        ? { ...i, quantity: i.quantity + quantity }
                        : i
                )
            }
            return [
                ...state,
                {
                    productId: product.id,
                    productCode: product.productCode,
                    title: product.name || product.productCode,
                    price: Number(product.price),
                    imagePath: product.imagePath,
                    quantity,
                },
            ]
        }
        case 'setQuantity':
            return state.map((i) =>
                i.productId === action.productId
                    ? { ...i, quantity: Math.max(1, action.quantity) }
                    : i
            )
        case 'remove':
            return state.filter((i) => i.productId !== action.productId)
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
        return Array.isArray(parsed) ? parsed : []
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
            setQuantity: (productId, quantity) => dispatch({ type: 'setQuantity', productId, quantity }),
            remove: (productId) => dispatch({ type: 'remove', productId }),
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
