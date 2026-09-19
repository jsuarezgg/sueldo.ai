import { compareRequest } from "../server/compare.js";

export default async function handler(request, response) {
  const result = await compareRequest(request.url, request.method);
  for (const [key, value] of result.headers) response.setHeader(key, value);
  response.status(result.status).send(await result.text());
}
