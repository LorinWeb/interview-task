import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import express, { type ErrorRequestHandler, type Express } from "express";
import multer from "multer";

import { getAppContext, type AppContext } from "@/server/app-context";
import { reseedDemoData } from "@/server/dev/seed-data";
import { HttpError } from "@/server/http-error";
import {
  cancelDashboardSubmission,
  createDashboardSubmissionFromUpload,
  listDashboardSubmissions,
  retryDashboardSubmission,
} from "@/features/submissions/server/service";

interface CreateServerAppOptions {
  context?: AppContext;
  includeErrorHandler?: boolean;
}

export function createServerApp(options: CreateServerAppOptions = {}): Express {
  const app = express();
  const context = options.context ?? getAppContext();
  const includeErrorHandler = options.includeErrorHandler ?? true;
  const upload = multer({ storage: multer.memoryStorage() });

  app.use(express.json());

  if (process.env.NODE_ENV !== "production") {
    app.post("/api/dev/seed", async (_request, response, next) => {
      try {
        response.json(await reseedDemoData(context));
      } catch (error) {
        next(error);
      }
    });
  }

  app.get("/api/submissions", (_request, response, next) => {
    try {
      response.json(listDashboardSubmissions(context));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/upload", upload.single("file"), async (request, response, next) => {
    try {
      if (!request.file) {
        throw new HttpError(400, "A dataset file is required.");
      }

      const file = new File([new Uint8Array(request.file.buffer)], request.file.originalname, {
        type: request.file.mimetype || "text/csv",
      });

      response
        .status(202)
        .json(await createDashboardSubmissionFromUpload(context, file));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/submissions/:id/cancel", (request, response, next) => {
    try {
      response.json(cancelDashboardSubmission(context, request.params.id));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/submissions/:id/retry", (request, response, next) => {
    try {
      response.json(retryDashboardSubmission(context, request.params.id));
    } catch (error) {
      next(error);
    }
  });

  if (includeErrorHandler) {
    app.use(errorHandler);
  }

  return app;
}

export async function startServer() {
  const port = parsePort(process.env.PORT);
  const app = createServerApp({ includeErrorHandler: false });

  await attachFrontend(app);
  app.use(errorHandler);

  return new Promise<Express>((resolve) => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${port}`);
      resolve(app);
    });
  });
}

async function attachFrontend(app: Express) {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
    return;
  }

  const distPath = join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get(/.*/, async (_request, response, next) => {
    try {
      response.type("html").send(await readFile(join(distPath, "index.html"), "utf8"));
    } catch (error) {
      next(error);
    }
  });
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "The server could not complete the request." });
};

function parsePort(rawValue: string | undefined) {
  if (!rawValue) {
    return 3000;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("PORT must be a positive integer.");
  }

  return parsed;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  startServer().catch((error) => {
    console.error("[server] Fatal error", error);
    process.exitCode = 1;
  });
}
