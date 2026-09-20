import { env } from "./env.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    app.log.info(`Situs publik : http://localhost:${env.PORT}/`);
    app.log.info(`API health   : http://localhost:${env.PORT}/api/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
