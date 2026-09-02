import { db } from "@/db";
import * as s from "@/db/schema";
import { eq } from "drizzle-orm";
import { ok, fail, handleApi } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { z } from "zod";

const schema = z.object({ amount: z.number().positive(), method: z.enum(["cash", "bank_transfer", "card", "online"]), reference: z.string().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const session = await requireSession();
    assertPermission(session.role, "fees", "approve");
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data", 422);

    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.id, id)).limit(1);
    if (!invoice) return fail("Invoice not found", 404);

    const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
    const [payment] = await db
      .insert(s.payments)
      .values({ invoiceId: id, amount: parsed.data.amount, method: parsed.data.method, reference: parsed.data.reference ?? null, receivedBy: session.userId, receiptNumber })
      .returning();

    const paidTotal = (await db.select().from(s.payments).where(eq(s.payments.invoiceId, id))).reduce((sum, p) => sum + p.amount, 0);
    const status = paidTotal >= invoice.totalAmount ? "paid" : paidTotal > 0 ? "partial" : "unpaid";
    await db.update(s.invoices).set({ status }).where(eq(s.invoices.id, id));

    await logAudit({ userId: session.userId, action: "record_payment", entity: "invoice", entityId: id, details: parsed.data });

    // Notify the paying student's linked parent account, if one exists.
    const [student] = await db.select().from(s.students).where(eq(s.students.id, invoice.studentId)).limit(1);
    if (student?.userId) {
      await notifyUser(student.userId, "Payment received", `A payment of ${parsed.data.amount} was recorded against invoice ${invoice.invoiceNumber}.`, "fees");
    }
    const parentLinks = await db
      .select({ userId: s.parents.userId })
      .from(s.studentParents)
      .innerJoin(s.parents, eq(s.studentParents.parentId, s.parents.id))
      .where(eq(s.studentParents.studentId, invoice.studentId));
    for (const link of parentLinks) {
      if (link.userId) await notifyUser(link.userId, "Fee payment recorded", `PKR ${parsed.data.amount.toLocaleString()} received for invoice ${invoice.invoiceNumber}.`, "fees");
    }

    return ok({
      status, paidTotal,
      receipt: {
        receiptNumber, amount: parsed.data.amount, method: parsed.data.method, paidAt: payment.paidAt,
        invoiceNumber: invoice.invoiceNumber, studentFirstName: student?.firstName, studentLastName: student?.lastName,
        admissionNumber: student?.admissionNumber, rollNumber: student?.rollNumber, reference: parsed.data.reference ?? null,
      },
    });
  });
}
