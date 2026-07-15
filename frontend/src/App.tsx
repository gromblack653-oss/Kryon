import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CatalogPage } from './pages/CatalogPage';
import { ProductPage } from './pages/ProductPage';
import { ComparePage } from './pages/ComparePage';
import { BuilderPage } from './pages/BuilderPage';
import { WishlistPage } from './pages/WishlistPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="builder" element={<BuilderPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route
          path="wishlist"
          element={
            <ProtectedRoute role="customer">
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cart"
          element={
            <ProtectedRoute role="customer">
              <CartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="checkout"
          element={
            <ProtectedRoute role="customer">
              <CheckoutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payment/:externalId"
          element={
            <ProtectedRoute role="customer">
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
