import { fetchWithRetry } from "../../../shared/fetch-with-retry.js";
import { netSuiteConfig } from "../../../shared/netsuite/config.js";
import { SalesOrderSchema } from "./sales-order-schema.js";

const { client: nsClient, baseURL: nsBaseURL } = netSuiteConfig();

export const handler = async (event: any) => {
  // parse event
  const salesOrder = SalesOrderSchema.parse(event);

  // remove negative rates, to allow recalculation
  for (const item of salesOrder.item.items) {
    if (item.rate < 0) delete item.rate;
  }

  // write modified SO to SANDBOX
  const url = `${nsBaseURL}/record/v1/salesOrder`;
  const { authHeader } = nsClient.generateOAuth("POST", url);

  const response = await fetchWithRetry(url, {
    method: "POST",
    body: JSON.stringify(salesOrder),
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  return { response, order: salesOrder };
};
