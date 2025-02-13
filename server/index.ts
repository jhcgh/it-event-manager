import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server setup...");
    const server = registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      log("Setting up Vite in development mode...");
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      log("Setting up static file serving...");
      serveStatic(app);
    }

    const PORT = parseInt(process.env.PORT || "5000", 10);
    log(`Starting server on port ${PORT}...`);

    // Create a Promise to handle server startup
    const startServer = new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        log(`Error starting server: ${error.message}`);
        console.error('Failed to start server:', error);
        reject(error);
      };

      try {
        server.listen(PORT, "0.0.0.0", () => {
          const address = server.address();
          const port = typeof address === 'object' ? address?.port : PORT;
          log(`Server bound successfully to port ${port}`);
          console.log(`Server is listening on port ${port}`);

          // Signal that the server is ready
          if (process.send) {
            process.send('ready');
            log('Sent ready signal to parent process');
          }

          resolve();
        }).on('error', onError);
      } catch (error) {
        onError(error as Error);
      }
    });

    // Wait for server to start
    await startServer;
    log('Server started successfully');

    // Handle graceful shutdown
    const signals = ['SIGTERM', 'SIGINT'] as const;
    for (const signal of signals) {
      process.on(signal, () => {
        log(`Received ${signal}, shutting down...`);
        server.close(() => {
          log('Server closed');
          process.exit(0);
        });
      });
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();