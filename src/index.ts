import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { jwt } from "hono/jwt";
import swaggerApp from "./middleware/swagger.middleware";
import corsConfig from "./config/cors.config";
import csrfConfig from "./config/csrf.config";
import testRoutes from "./routes/test.routes";

const app = new Hono()
  .basePath("/marmot")
  .use("*", logger())
  .use("*", cors(corsConfig))
  .use("/backend/*", csrf(csrfConfig))
  .use("*", secureHeaders())
  .route("/ui", swaggerApp)
  .route("/", testRoutes);

export default app;
