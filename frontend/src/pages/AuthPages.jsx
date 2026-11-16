import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogoMark } from "../components/Logo.jsx";
import { useAuth } from "../hooks/useAuth.jsx";
import { useToast } from "../hooks/useToast.jsx";
import { getErrorMessage, getFieldErrors } from "../services/api.js";
import "./AuthPages.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate({ name, email, password, confirm }, mode) {
  const errors = {};
  if (mode === "register" && (!name || name.trim().length < 3)) errors.name = "Informe seu nome completo.";
  if (!EMAIL_REGEX.test(email.trim())) errors.email = "Informe um e-mail válido.";
  if (mode === "register") {
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = "Mínimo de 8 caracteres, com letras e números.";
    }
    if (confirm !== password) errors.confirm = "As senhas não coincidem.";
  } else if (!password) {
    errors.password = "Informe sua senha.";
  }
  return errors;
}

function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const { login, register, isAuthenticated, user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  if (isAuthenticated) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/cardapio"} replace />;

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    const clientErrors = validate(form, mode);
    setErrors(clientErrors);
    setServerError("");
    if (Object.keys(clientErrors).length) return;

    setLoading(true);
    try {
      const loggedUser = isRegister
        ? await register({ name: form.name.trim(), email: form.email.trim(), password: form.password })
        : await login({ email: form.email.trim(), password: form.password });
      toast.success(isRegister ? "Conta criada com sucesso!" : `Bem-vindo(a), ${loggedUser.name.split(" ")[0]}!`);
      const fallback = loggedUser.role === "ADMIN" ? "/admin" : "/cardapio";
      const from = location.state?.from;
      navigate(from && !(loggedUser.role === "ADMIN" && !from.startsWith("/admin")) ? from : fallback, { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card fade-up">
        <div className="auth-head">
          <LogoMark size={44} />
          <h1>{isRegister ? "Crie sua conta" : "Entrar no EstuLanches"}</h1>
          <p className="muted">{isRegister ? "Faça pedidos e acompanhe o preparo pelo celular." : "Use o e-mail cadastrado na cantina."}</p>
        </div>

        {serverError && (
          <div className="alert alert-error" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="field">
              <label htmlFor="name">Nome completo</label>
              <input id="name" className={`input ${errors.name ? "has-error" : ""}`} value={form.name} onChange={update("name")} autoComplete="name" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className={`input ${errors.email ? "has-error" : ""}`}
              value={form.email}
              onChange={update("email")}
              autoComplete="email"
              placeholder="voce@escola.com"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="password">Senha</label>
            <div className="password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={`input ${errors.password ? "has-error" : ""}`}
                value={form.password}
                onChange={update("password")}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password ? (
              <span className="field-error">{errors.password}</span>
            ) : (
              isRegister && <span className="field-hint">Mínimo de 8 caracteres, com letras e números.</span>
            )}
          </div>

          {isRegister && (
            <div className="field">
              <label htmlFor="confirm">Confirme a senha</label>
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                className={`input ${errors.confirm ? "has-error" : ""}`}
                value={form.confirm}
                onChange={update("confirm")}
                autoComplete="new-password"
              />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? (
            <>
              Já tem conta? <Link to="/login" state={location.state}>Entrar</Link>
            </>
          ) : (
            <>
              Ainda não tem conta? <Link to="/cadastro" state={location.state}>Cadastre-se</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export const LoginPage = () => <AuthForm mode="login" />;
export const RegisterPage = () => <AuthForm mode="register" />;
