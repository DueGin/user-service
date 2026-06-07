import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export async function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");

  if (!apiKey) {
    return { valid: false as const, error: "Missing API key" };
  }

  const app = await prisma.application.findUnique({
    where: { apiKey },
  });

  if (!app) {
    return { valid: false as const, error: "Invalid API key" };
  }

  if (app.status !== "ACTIVE") {
    return { valid: false as const, error: "Application is disabled" };
  }

  return { valid: true as const, application: app };
}
