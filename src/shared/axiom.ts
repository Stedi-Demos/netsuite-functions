import { Response } from "node-fetch";
import { fetchWithRetry } from "./fetch-with-retry.js";

export const info = (message: string, obj: any) =>
  logToAxiom("netsuite", {
    function: process.env["STEDI_FUNCTION_NAME"],
    message,
    ...obj,
  });

export const logToAxiom = async (
  dataset: "netsuite",
  body: Record<string, unknown>
): Promise<any> => {
  let response: Response;
  try {
    const headers = {
      Authorization: `Bearer ${process.env.AXIOM_API_KEY}`,
      "Content-Type": "application/x-ndjson",
    };

    const url = `https://cloud.axiom.co/api/v1/datasets/${process.env["STEDI_ENV"]}-${dataset}/ingest`;

    response = await fetchWithRetry(url, {
      body: JSON.stringify(body),
      headers,
      method: "POST",
    });

    if (response.ok) return await response.json();
    else {
      const errorDetails = (await response.json()) as {
        message: string;
        code: string;
      };
      console.warn(`Axiom logging error`, errorDetails);
    }
  } catch (error) {
    console.error(`Unexpected Axiom logging error`, error);
    console.error(response);
  }
};
