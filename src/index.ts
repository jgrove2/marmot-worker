import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { jwt } from "hono/jwt";
import swaggerApp from "./middleware/swagger.middleware";
import corsConfig from "./config/cors.config";
import csrfConfig from "./config/csrf.config";
import groupRoutes from "./routes/group.routes";
import payeeRoutes from "./routes/payee.routes";
import accountRoutes from "./routes/account.routes";

const app = new Hono()
  .basePath("/marmot")
  .use("*", logger())
  .use("*", cors(corsConfig))
  .use("*", csrf(csrfConfig))
  .use("*", secureHeaders())
  .route("/group", groupRoutes)
  .route("/payee", payeeRoutes)
  .route("/account", accountRoutes);

export default app;
