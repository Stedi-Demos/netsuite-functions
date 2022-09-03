import { fetchWithRetry } from "../fetch-with-retry.js";
import { NetsuiteRestApiClient } from "./rest_client.js";

export type NSPurchaseOrderItem = {
  line: number;
  custcol_thi_installer_net_trans_id?: string; // InstallerNet optional custom col
  itemType: { id: string };
  item: { id: string };
  quantity: number;
  rate: number;
  quantityBilled: number;
};

export type NSPurchaseOrder = {
  item: {
    items: NSPurchaseOrderItem[];
  };
};

export const getPOFromNetSuite = async (
  nsBaseURL: string,
  nsClient: NetsuiteRestApiClient,
  internalId: string
): Promise<NSPurchaseOrder> => {
  const url = `${nsBaseURL}/record/v1/purchaseOrder/${internalId}?expandSubResources=true`;
  const { authHeader } = nsClient.generateOAuth("GET", url);

  const response = await fetchWithRetry(url, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Prefer: "transient",
    },
  });

  if (response.ok) {
    return (await response.json()) as NSPurchaseOrder;
  } else {
    console.error(url, response.status, response.statusText);

    throw new Error("Unexpected response attempting to get PO");
  }
};
