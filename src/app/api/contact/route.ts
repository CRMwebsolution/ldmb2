import { NextRequest, NextResponse } from "next/server";

const WEBHOOK = process.env.LDMB_CONTACT_WEBHOOK_URL ||
  "https://n8n.southernautomate.com/webhook/2e3de640-d6dc-4fca-a404-0b71b9403227";

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 12000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 413 });
    }
    const body = await request.json();
    if (body.website) return NextResponse.json({ ok: true }); // Honeypot for bots.
    const fields = ["name", "email", "phone", "subject", "message"] as const;
    if (fields.some((field) => typeof body[field] !== "string" || body[field].length > 4000)) {
      return NextResponse.json({ error: "Please check your message fields." }, { status: 400 });
    }
    if (!body.name.trim() || !body.message.trim() || !body.email.trim()) {
      return NextResponse.json({ error: "Name, email, and message are required." }, { status: 400 });
    }
    const response = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(fields.map((field) => [field, body[field].trim()])),
        source: "Little Doo Mud Bog Contact Form",
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Contact service returned ${response.status}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact delivery failed", error);
    return NextResponse.json({ error: "Message could not be sent. Please call us instead." }, { status: 502 });
  }
}
