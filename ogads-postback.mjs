
import crypto from "node:crypto";

export default async (request) => {
  const params = new URL(request.url).searchParams;

  // Verify the private postback secret
  const suppliedSecret = params.get("key") || "";
  const expectedSecret = process.env.OGADS_POSTBACK_SECRET || "";

  if (
    !expectedSecret ||
    suppliedSecret.length !== expectedSecret.length ||
    !crypto.timingSafeEqual(
      Buffer.from(suppliedSecret),
      Buffer.from(expectedSecret)
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = params.get("aff_sub4") || "";
  const offerId = params.get("offer_id") || "";
  const payoutText = params.get("payout") || "";
  const dateText = params.get("datetime") || "";
  const ip = params.get("ip") || "";
  const randomId = params.get("ran") || "";
  const affSub5 = params.get("aff_sub5") || "";

  // Validate required values
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ||
    !offerId ||
    !randomId ||
    !/^\d+(\.\d+)?$/.test(payoutText) ||
    !Number.isFinite(Number(payoutText)) ||
    Number(payoutText) < 0
  ) {
    return new Response("Invalid data", { status: 400 });
  }

  const convertedAt = new Date(dateText);

  if (!dateText || Number.isNaN(convertedAt.getTime())) {
    return new Response("Invalid date", { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return new Response("Server configuration error", { status: 500 });
  }

  // Create a repeatable conversion key to help prevent duplicate records
  const conversionKey = crypto
    .createHash("sha256")
    .update(`${userId}|${offerId}|${randomId}|${dateText}`)
    .digest("hex");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/ogads_postbacks`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "resolution=ignore-duplicates,return=minimal"
      },
      body: JSON.stringify({
        conversion_key: conversionKey,
        user_id: userId,
        offer_id: offerId,
        payout: Number(payoutText),
        ip: ip || null,
        aff_sub5: affSub5 || null,
        converted_at: convertedAt.toISOString(),
        status: "pending"
      })
    }
  );

  if (!response.ok) {
    return new Response("Database error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
};
