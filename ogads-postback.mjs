
import crypto from "node:crypto";

export default async (request) => {
  const params = new URL(request.url).searchParams;

  // Authenticate the OGAds callback
  const supplied = Buffer.from(params.get("key") || "");
  const expected = Buffer.from(process.env.OGADS_POSTBACK_SECRET || "");

  if (
    expected.length === 0 ||
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = params.get("aff_sub4") || "";
  const offerId = params.get("offer_id") || "";
  const payoutText = params.get("payout") || "";
  const dateText = params.get("datetime") || "";
  const clickId = params.get("aff_sub5") || "";

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    !uuidPattern.test(userId) ||
    !uuidPattern.test(clickId) ||
    !offerId ||
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

  const databaseUrl =
    `${supabaseUrl}/rest/v1/ogads_postbacks?on_conflict=conversion_key`;

  const response = await fetch(databaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Prefer": "resolution=ignore-duplicates,return=minimal"
    },
    body: JSON.stringify({
      conversion_key: clickId,
      user_id: userId,
      offer_id: offerId,
      payout: Number(payoutText),
      converted_at: convertedAt.toISOString(),
      status: "pending"
    })
  });

  if (!response.ok) {
    return new Response("Database error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
};
