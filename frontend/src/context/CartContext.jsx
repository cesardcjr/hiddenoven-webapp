import { createContext, useContext, useReducer } from "react";

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case "ADD": {
      const existing = state.find((i) => i.productId === action.product.productId);
      if (existing) {
        return state.map((i) =>
          i.productId === action.product.productId ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...state, { ...action.product, qty: 1 }];
    }
    case "REMOVE":
      return state.filter((i) => i.productId !== action.productId);
    case "UPDATE_QTY":
      return state.map((i) =>
        i.productId === action.productId ? { ...i, qty: action.qty } : i
      ).filter((i) => i.qty > 0);
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, []);

  const addItem    = (product)              => dispatch({ type: "ADD", product });
  const removeItem = (productId)            => dispatch({ type: "REMOVE", productId });
  const updateQty  = (productId, qty)       => dispatch({ type: "UPDATE_QTY", productId, qty });
  const clearCart  = ()                     => dispatch({ type: "CLEAR" });

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, total, count, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
