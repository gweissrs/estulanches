import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import AdminLayout from "./components/AdminLayout.jsx";
import Footer from "./components/Footer.jsx";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminCategories from "./pages/admin/AdminCategories.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminOrders from "./pages/admin/AdminOrders.jsx";
import AdminProducts from "./pages/admin/AdminProducts.jsx";
import { LoginPage, RegisterPage } from "./pages/AuthPages.jsx";
import Cart from "./pages/Cart.jsx";
import Home from "./pages/Home.jsx";
import Menu from "./pages/Menu.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import NotFound from "./pages/NotFound.jsx";
import OrderDetail from "./pages/OrderDetail.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();
  // Corpo em bloco: em navegadores recentes scrollTo() retorna uma Promise,
  // e um efeito não pode retornar nada além de uma função de limpeza.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cardapio" element={<Menu />} />
          <Route path="/carrinho" element={<Cart />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          <Route element={<ProtectedRoute role="STUDENT" />}>
            <Route path="/pedidos" element={<MyOrders />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/pedidos/:id" element={<OrderDetail />} />
          </Route>

          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="pedidos" element={<AdminOrders />} />
              <Route path="produtos" element={<AdminProducts />} />
              <Route path="categorias" element={<AdminCategories />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
