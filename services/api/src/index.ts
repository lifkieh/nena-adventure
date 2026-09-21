import { env } from "./env.js";
import { buildApp } from "./app.js";
import { startExpiryJob } from "./usecases/booking/expiry-job.js";

async function main(): Promise<void> {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    startExpiryJob(); // job kedaluwarsa tiap menit
    app.log.info(`Situs publik : http://localhost:${env.PORT}/`);
    app.log.info(`Panel admin  : http://localhost:${env.PORT}/panel/`);
    app.log.info(`API health   : http://localhost:${env.PORT}/api/health`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
