import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Os testes usam um ambiente próprio (.env.test), com banco separado do de produção.
const testEnv = config({ path: ".env.test", quiet: true }).parsed ?? {};

export default defineConfig({
  test: {
    env: { ...testEnv, NODE_ENV: "test" },
    reporters: ["verbose"],
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/tests/integration/**/*.test.ts"],
          globalSetup: ["src/tests/integration/globalSetup.ts"],
          // Os arquivos compartilham o mesmo banco de teste: execução sequencial.
          fileParallelism: false,
          hookTimeout: 60_000,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
