import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "net";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging middleware with improved error handling
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses for logging
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
        const responseStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${responseStr.length > 80 ? responseStr.slice(0, 77) + "..." : responseStr}`;
      }
      log(logLine);
    }
  });

  next();
});

// Function to check if port is available with timeout
const isPortAvailable = (port: number, timeout = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
    setTimeout(() => {
      server.close();
      resolve(false);
    }, timeout);
  });
};

(async () => {
  try {
    log("Starting server setup...");
    const server = registerRoutes(app);

    // Global error handler with improved error details
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const errorDetails = {
        message: err.message || "Internal Server Error",
        status: err.status || err.statusCode || 500,
        timestamp: new Date().toISOString(),
        path: _req.path
      };

      console.error("Server error:", {
        ...errorDetails,
        stack: err.stack
      });

      res.status(errorDetails.status).json(errorDetails);
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

    // Check port availability with improved error handling
    const isAvailable = await isPortAvailable(PORT);
    if (!isAvailable) {
      throw new Error(`Port ${PORT} is already in use or not available`);
    }

    // Create a Promise to handle server startup with proper port binding
    const startServer = new Promise<void>((resolve, reject) => {
      let serverStartTimeout: NodeJS.Timeout;

      const onError = (error: Error) => {
        clearTimeout(serverStartTimeout);
        log(`Error starting server: ${error.message}`);
        console.error('Failed to start server:', error);
        reject(error);
      };

      try {
        // Set a timeout for server startup
        serverStartTimeout = setTimeout(() => {
          onError(new Error('Server startup timed out'));
        }, 10000);

        server.listen(PORT, "0.0.0.0", () => {
          clearTimeout(serverStartTimeout);
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

    // Wait for server to start with proper port binding
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