import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/styles/original-style.css'
import './assets/styles/index.css'
import './assets/styles/orders.css'
import './assets/styles/admin.css'
import './assets/styles/auth.css'
import './assets/styles/profile.css'
import './assets/styles/edit-profile.css'
import './assets/styles/cart.css'
import './assets/styles/products.css'
import './assets/styles/product-detail.css'
import './assets/styles/checkout.css'
import './assets/styles/order-detail.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
