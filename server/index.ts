import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "net";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Update request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const method = req.method;
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
      interface LogData {
        method: string;
        path: string;
        status: number;
        duration: string;
        timestamp: string;
        ip: string | undefined;
        userAgent: string | undefined;
        response?: string;
      }

      const logData: LogData = {
        method,
        path,
        status: res.statusCode,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      };

      if (capturedJsonResponse && res.statusCode >= 400) {
        logData.response = JSON.stringify(capturedJsonResponse).slice(0, 200);
      }

      log(`${method} ${path} ${res.statusCode} in ${duration}ms :: ${JSON.stringify(logData)}`);
    }
  });

  next();
});

// Update the error handler middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const errorDetails = {
    message: err.message || "Internal Server Error",
    status: err.status || err.statusCode || 500,
    timestamp: new Date().toISOString(),
    path: _req.path,
    method: _req.method,
    query: _req.query,
    body: _req.method !== 'GET' ? _req.body : undefined,
  };

  // Log detailed error information
  console.error("Server error:", {
    ...errorDetails,
    stack: err.stack,
    headers: _req.headers,
    ip: _req.ip,
  });

  // Send sanitized error response to client
  res.status(errorDetails.status).json({
    error: errorDetails.message,
    status: errorDetails.status,
    timestamp: errorDetails.timestamp,
    path: errorDetails.path
  });
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

const findAvailablePort = async (startPort: number, maxAttempts: number = 10): Promise<number> => {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No available ports found between ${startPort} and ${startPort + maxAttempts - 1}`);
};

(async () => {
  try {
    log("Starting server setup...");
    const server = registerRoutes(app);

    if (app.get("env") === "development") {
      log("Setting up Vite in development mode...");
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      log("Setting up static file serving...");
      serveStatic(app);
    }

    const BASE_PORT = parseInt(process.env.PORT || "5000", 10);
    log(`Finding available port starting from ${BASE_PORT}...`);

    const port = await findAvailablePort(BASE_PORT);
    log(`Starting server on port ${port}...`);

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

        server.listen(port, "0.0.0.0", () => {
          clearTimeout(serverStartTimeout);
          const address = server.address();
          const boundPort = typeof address === 'object' ? address?.port : port;
          log(`Server bound successfully to port ${boundPort}`);
          console.log(`Server is listening on port ${boundPort}`);

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