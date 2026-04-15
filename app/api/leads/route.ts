import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

type ValidatedLead = {
  name: string;
  phone: string;
  source: string;
};

function validateCreateLeadBody(body: unknown): ValidatedLead | { error: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object" };
  }

  const record = body as Record<string, unknown>;
  const required = ["name", "phone", "source"] as const;

  for (const key of required) {
    const value = record[key];
    if (value === undefined || value === null) {
      return { error: `Missing required field: ${key}` };
    }
    if (typeof value !== "string" || value.trim() === "") {
      return { error: `Invalid or empty required field: ${key}` };
    }
  }

  return {
    name: (record.name as string).trim(),
    phone: (record.phone as string).trim(),
    source: (record.source as string).trim(),
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateCreateLeadBody(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        name: validated.name,
        phone: validated.phone,
        source: validated.source,
        status: "NEW",
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (e) {
    console.error("POST /api/leads:", e);

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "A record with this unique value already exists." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 },
    );
  }
}
