import { fetchWithRetry } from "../fetch-with-retry.js";
import { NetsuiteRestApiClient } from "./rest_client.js";

export const lookupPOInternalId = async (
  nsBaseURL: string,
  nsClient: NetsuiteRestApiClient,
  tranId: string
): Promise<string> => {
  const url = `${nsBaseURL}/record/v1/purchaseOrder?limit=2&q=tranId is ${tranId}`;
  const { authHeader } = nsClient.generateOAuth("GET", url);

  const response = await fetchWithRetry(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
    },
  });

  if (response.ok) {
    const results = (await response.json()) as any;

    if (results.items === undefined || results.items.length !== 1) {
      console.error("lookupPOInternalId", response.status, results);
      throw new Error("PO internal id not found using tranId.");
    }

    return results.items[0].id;
  } else {
    console.error(url, response.status, response.statusText);
    throw new Error("Unexpected response attempting to lookup PO internalId");
  }
};
