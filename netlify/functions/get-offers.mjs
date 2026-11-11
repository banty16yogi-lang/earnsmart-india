export default async function handler(request) {
  if (request.method !== "GET") {
    return Response.json(
      { success: false, message: "Method not allowed" },
      { status: 405 }
    );
  }

  const apiKey = process.env.OGADS_API_KEY;

  if (!apiKey) {
    return Response.json(
      { success: false, message: "OGAds API key is missing on the server." },
      { status: 500 }
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

    return Response.json(data, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    return Response.json(
      { success: false, message: "Could not connect to OGAds." },
      { status: 502 }
    );
  }
}
