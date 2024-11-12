const corsConfig = {
  origin: ["http://localhost:5173", "https://marmot-worker.justin-grove42.workers.dev/"],
  allowMethods: ["POST", "GET", "DELETE"],
};

export default corsConfig;
