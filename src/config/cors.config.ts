const corsConfig = {
  origin: ["http://localhost:5173", "https://marmot-worker.justin-grove42.workers.dev/"],
  allowMethods: ["POST", "GET", "DELETE"],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
  credentials: true
};

export default corsConfig;
