/* ------------------------------------------------------------------ */
/*  pages/api/flows/run.ts                                            */
/* ------------------------------------------------------------------ */
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import axios from "axios";

import { authOptions } from "../auth/[...nextauth]";
import { env } from "../../../lib/env";
import logger from "../../../lib/logger";
import prisma from "../../../lib/prisma"; // <- your Prisma client
import { convertFlowToDag } from "@/helpers/convertFlowtoDag";

/* ---------- expected body shape ---------------------------------- */
interface RunBody {
  graphName: string;
  parameters?: Record<string, any>;
  execParams?: Record<string, any>;
}

/* ------------------------------------------------------------------ */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  logger.info("Flow-run request");

  /* ---------- auth ------------------------------------------------ */
  const session = await getServerSession(req, res, authOptions);
  if (!session && env.NODE_ENV === "production") {
    logger.warn("Unauthorised");
    return res.status(401).json({ error: "unauthorised" });
  }

  const jwt = await getToken({ req, secret: env.NEXTAUTH_SECRET });
  if (!jwt) return res.status(403).json({ error: "forbidden" });

  /* ---------- only POST ------------------------------------------ */
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const { graphName, parameters = {}, execParams = {} } = req.body as RunBody;
  if (!graphName) return res.status(400).json({ error: "`graphName` missing" });
  console.log("graphName", graphName);

  try {
    /* ---------- 1. fetch flow by name ---------------------------- */
    const flow = await prisma.flow.findUnique({
      where: { name: graphName },
      select: { id: true, state: true }, // `state` holds nodes/edges JSON
    });
    if (!flow) return res.status(404).json({ error: "flow not found" });

    const { nodes = [], edges = [] } = JSON.parse(flow.state ?? "{}");

    /* ---------- 2. convert RF ‹nodes/edges› → DAG --------------- */
    const dag = convertFlowToDag(graphName, nodes, edges);
    const body = { flow: dag, params: {}, exec_params: execParams };
    console.log(JSON.stringify(body), "body");
    /* ---------- 3. call ETL-service synchronously ---------------- */
    const { data } = await axios.post(
      `${env.ETL_SERVICE_URL}/v1/flows/run`,
      body,
      {
        headers: {
          // Authorization: `Bearer ${jwt.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    /* ---------- 4. persist execution result ---------------------- */
    await prisma.executionResult.create({
      data: {
        iri: dag.id,
        userId: session?.user?.id ?? "anonymous",
        executionParameters: parameters,
        resultGraphURI: data?.resultGraphURI ?? "",
      },
    });

    /* ---------- 5. pipe sync response back to caller ------------- */
    return res.status(200).json(data);
  } catch (err: any) {
    logger.error("run-flow failed", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
