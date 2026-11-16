import { ArrowRight, Clock, MapPin, ShieldCheck, Smartphone, Timer, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { SkeletonGrid } from "../components/StateViews.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useCart } from "../hooks/useCart.jsx";
import { useFetch } from "../hooks/useFetch.js";
import { useToast } from "../hooks/useToast.jsx";
import { catalogService } from "../services/index.js";
import "./Home.css";

const STEPS = [
  { icon: Smartphone, title: "Escolha no cardápio", text: "Veja preços, fotos e o que está disponível agora." },
  { icon: Wallet, title: "Confirme o pedido", text: "O valor é calculado e conferido pelo sistema." },
  { icon: Timer, title: "Acompanhe o preparo", text: "O status muda em tempo real até ficar pronto." },
  { icon: MapPin, title: "Retire no balcão", text: "Informe o número do pedido e pronto — sem fila." },
];

export default function Home() {
  const { isAuthenticated, isAdmin } = useAuth();
  const { addItem, items } = useCart();
  const toast = useToast();
  const { data: popular, loading } = useFetch(() => catalogService.popular(), []);

  function handleAdd(product) {
    addItem(product);
    toast.success(`${product.name} adicionado ao carrinho.`);
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy fade-up">
            <span className="hero-pill">
              <span className="dot" /> Cantina aberta · pedidos online
            </span>
            <h1>
              O lanche da escola, <span>sem fila</span> e sem confusão.
            </h1>
            <p>
              O EstuLanches digitaliza a cantina: estudantes fazem o pedido pelo celular e acompanham o preparo,
              enquanto a equipe organiza tudo em um só painel.
            </p>
            <div className="hero-actions">
              <Link to="/cardapio" className="btn btn-accent btn-lg">
                Ver cardápio <ArrowRight size={18} />
              </Link>
              {isAuthenticated ? (
                <Link to={isAdmin ? "/admin" : "/pedidos"} className="btn btn-secondary btn-lg">
                  {isAdmin ? "Ir para o painel" : "Meus pedidos"}
                </Link>
              ) : (
                <Link to="/login" className="btn btn-secondary btn-lg">
                  Entrar na conta
                </Link>
              )}
            </div>
            <ul className="hero-trust">
              <li>
                <ShieldCheck size={16} /> Login seguro
              </li>
              <li>
                <Clock size={16} /> Status em tempo real
              </li>
            </ul>
          </div>

          <div className="hero-visual fade-up" aria-hidden="true">
            <div className="hero-card hero-card-main">
              <img src="/images/products/burger.svg" alt="" />
              <div>
                <strong>Feito na hora</strong>
                <span>Retire no balcão</span>
              </div>
            </div>
            <div className="hero-card hero-card-status">
              <span className="status-dot" />
              <div>
                <small>Seu pedido</small>
                <strong>Pronto para retirada</strong>
              </div>
            </div>
            <div className="hero-card hero-card-small">
              <img src="/images/products/suco.svg" alt="" />
              <img src="/images/products/coxinha.svg" alt="" />
            </div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Mais pedidos</span>
            <h2>Os favoritos da galera</h2>
          </div>
          <Link to="/cardapio" className="btn btn-ghost">
            Cardápio completo <ArrowRight size={16} />
          </Link>
        </div>
        {loading ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="product-grid">
            {(popular ?? []).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={handleAdd}
                quantityInCart={items.find((i) => i.id === product.id)?.quantity}
              />
            ))}
          </div>
        )}
      </section>

      <section className="container section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Como funciona</span>
            <h2>Do cardápio ao balcão em 4 passos</h2>
          </div>
        </div>
        <div className="steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="step card">
              <span className="step-number">{i + 1}</span>
              <span className="step-icon">
                <Icon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="info-band">
          <div>
            <h2>Funcionamento da cantina</h2>
            <p>Pedidos online durante todo o horário escolar. Retirada no balcão principal mediante o número do pedido.</p>
          </div>
          <dl className="hours">
            <div>
              <dt>Segunda a sexta</dt>
              <dd>7h00 – 21h30</dd>
            </div>
            <div>
              <dt>Sábado</dt>
              <dd>8h00 – 12h00</dd>
            </div>
            <div>
              <dt>Retirada</dt>
              <dd>Balcão principal</dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
