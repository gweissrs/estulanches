import cors from "cors";
import express from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { router } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1); // atrás de proxy/load balancer, usa o IP real do cliente

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "https:"],
        },
      },
    }),
  );

  // CORS: somente as origens listadas em CORS_ORIGINS podem chamar a API pelo navegador.
  app.use(
    "/api",
    cors({
      origin(origin, callback) {
        // Requisições sem Origin (curl, healthcheck, mesma origem) são permitidas.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: "100kb" }));

  app.use("/api", router);
  app.use("/api", notFoundHandler);

  // Em produção o mesmo container serve o build do frontend (React/Vite).
  if (env.publicDir && fs.existsSync(env.publicDir)) {
    const publicDir = path.resolve(env.publicDir);
    app.use(express.static(publicDir, { maxAge: "1h", index: false }));
    // Fallback da SPA: rotas do React Router devolvem o index.html
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(publicDir, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
