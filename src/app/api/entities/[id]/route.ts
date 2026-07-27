// PATCH /api/entities/:id  -> update entity (name/phone/email/customFields)
// DELETE /api/entities/:id  -> delete entity (cascade)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeEntity } from "@/lib/serialize";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, any> = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.phone === "string") patch.phone = body.phone;
  if (body.email !== undefined) patch.email = body.email ?? null;
  if (body.customFields) patch.customFields = JSON.stringify(body.customFields);

  const updated = await db.entity.update({
    where: { id },
    data: patch,
    include: {
      cycles: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { sentAt: "desc" }, take: 50 },
    },
  });
  return NextResponse.json({ entity: serializeEntity(updated) });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.entity.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
