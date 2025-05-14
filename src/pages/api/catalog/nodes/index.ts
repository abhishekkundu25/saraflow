// pages/api/catalog/nodes.ts
// Next.js API route that proxies to the FastAPI catalog endpoint
// and returns the full node catalog JSON.

import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

const FASTAPI_BASE = "http://localhost:8000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Fetch from the external FastAPI service
    const response = await axios.get(`${FASTAPI_BASE}/v1/catalog/nodes`);
    const catalog = response.data;

    // Optionally support ?category= query
    const { category } = req.query;
    if (category && typeof category === "string") {
      const filtered = catalog.filter(
        (entry: any) => entry.category === category
      );
      return res.status(200).json(filtered);
    }

    return res.status(200).json(catalog);
  } catch (err: any) {
    console.error("Error fetching catalog:", err.message || err);
    return res
      .status(err.response?.status || 502)
      .json({ error: "Failed to fetch node catalog" });
  }
}
