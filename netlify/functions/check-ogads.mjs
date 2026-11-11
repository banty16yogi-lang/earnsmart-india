
export default async function handler(request) {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405
    });
  }

  const apiKey = process.env.OGADS_API_KEY;

  if (!apiKey) {
    return Response.json({
      success: false,
      message: "OGADS_API_KEY is not available to this function."
    }, { status: 500 });
  }

  return Response.json({
    success: true,
    message: "OGAds API key is securely available on the server."
  });
}
