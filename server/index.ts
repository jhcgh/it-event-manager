import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import { setupAuth } from "./auth";

const app = express();

// Force JSON content type for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

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

// Setup auth first
//Then register routes
// Error handler middleware - must be after routes
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const errorDetails = {
    message: err.message || "Internal Server Error",
    status: err.status || err.statusCode || 500,
    timestamp: new Date().toISOString(),
    path: _req.path,
    method: _req.method
  };

  // Log detailed error information
  console.error("Server error:", {
    ...errorDetails,
    stack: err.stack,
    headers: _req.headers,
    ip: _req.ip,
  });

  // Always send JSON response for errors
  res.status(errorDetails.status)
     .json({
       error: errorDetails.message,
       status: errorDetails.status,
       timestamp: errorDetails.timestamp,
       path: errorDetails.path
     });
});

// Setup Vite or static serving after error handler
(async () => {
  try {
    log("Starting server setup...");
    const server = createServer(app);
    await setupAuth(app);
    registerRoutes(app);

    if (app.get("env") === "development") {
      log("Setting up Vite in development mode...");
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      log("Setting up static file serving...");
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || "5000", 10);

    // Wait for port to be available
    await new Promise<void>((resolve, reject) => {
      server.listen(port, "0.0.0.0", () => {
        log(`Server is listening on port ${port}`);
        if (process.send) {
          process.send('ready');
        }
        resolve();
      }).on('error', reject);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();