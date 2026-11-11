
import crypto from "node:crypto";

export default async function handler(request) {
  if (request.method !== "GET") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }

  const apiKey = process.env.OGADS_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!apiKey || !supabaseUrl || !publishableKey) {
    return Response.json(
      { success: false, message: "Server configuration is incomplete." },
      { status: 500 }
    );
  }

  // Verify the signed-in Supabase user
  const authorization = request.headers.get("authorization") || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

  if (!tokenMatch) {
    return Response.json(
      { success: false, message: "Please log in first." },
      { status: 401 }
    );
  }

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${tokenMatch[1]}`
    }
  });

  if (!userResponse.ok) {
    return Response.json(
      { success: false, message: "Your login session is invalid." },
      { status: 401 }
    );
  }

  const user = await userResponse.json();

  if (!user.id) {
    return Response.json(
      { success: false, message: "User verification failed." },
      { status: 401 }
    );
  }

  const ip = request.headers.get("x-nf-client-connection-ip");
  const userAgent = request.headers.get("user-agent");
  const lang = request.headers.get("accept-language") || "en";

  if (!ip || !userAgent) {
    return Response.json(
      { success: false, message: "Visitor information is missing." },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    ip,
    user_agent: userAgent,
    lang,
    site: "https://majestic-brioche-05aba4.netlify.app/"
  });

  try {
    const response = await fetch(
      `https://trkoffer.net/api/v2?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          message: "OGAds could not return offers.",
          status: response.status
        },
        { status: 502 }
      );
    }

    const offers = Array.isArray(data.offers) ? data.offers : [];

    const trackedOffers = offers.map((offer) => {
      try {
        const url = new URL(offer.link);

        if (
          url.protocol !== "https:" ||
          !["jump.offerclk.net"].includes(url.hostname)
        ) {
          return { ...offer, link: "" };
        }

        url.searchParams.set("aff_sub4", user.id);
        url.searchParams.set("aff_sub5", crypto.randomUUID());

        return { ...offer, link: url.toString() };
      } catch {
        return { ...offer, link: "" };
      }
    });

    return Response.json(
      { ...data, offers: trackedOffers },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json(
      { success: false, message: "Could not connect to OGAds." },
      { status: 502 }
    );
  }
}
