import Logo from "./Logo.jsx";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <Logo />
        <p className="muted">Cantina escolar digital · Pedidos sem fila, retirada no balcão.</p>
        <p className="muted footer-copy">© {new Date().getFullYear()} EstuLanches · Projeto acadêmico SENAI</p>
      </div>
    </footer>
  );
}
