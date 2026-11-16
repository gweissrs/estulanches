import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/StateViews.jsx";

export default function NotFound() {
  return (
    <div className="page container">
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        action={
          <Link to="/" className="btn btn-primary">
            Voltar ao início
          </Link>
        }
      />
    </div>
  );
}
