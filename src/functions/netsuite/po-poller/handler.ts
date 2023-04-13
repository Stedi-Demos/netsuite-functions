import * as dotenv from "dotenv";
dotenv.config({ override: true });
import { fetchWithRetry } from "../../../shared/fetch-with-retry.js";
import { GetValueCommand, SetValueCommand } from "@stedi/sdk-client-stash";
import { netSuiteConfig } from "../../../shared/netsuite/config.js";
import { NetSuitePurchaseOrderSummary } from "./types.js";
import { requiredEnvVar } from "../../../shared/environment.js";
import { stashClient } from "../../../shared/clients/stash.js";

const stash = stashClient();
const { client: nsClient, baseURL: nsBaseURL } = netSuiteConfig();

export const RECORD_LIMIT = 10;
const stashItemKey = (item: { po_id: string }) =>
  `purchase-order/${item.po_id}/poller`;

const keyspaceName = requiredEnvVar("NS_PO_STASH_KEYSPACE");
const entityIdsIgnoreList = [2, 15];

export const handler = async (event: any) => {
  const skipped: unknown[] = [];
  const tracked: unknown[] = [];
  const ignored: unknown[] = [];

  const { value: lastModifiedFrom } = await stash.send(
    new GetValueCommand({
      key: "po-poller-last-run",
      keyspaceName,
    })
  );

  // prepare URL
  const url = `${nsBaseURL}/query/v1/suiteql?limit=${RECORD_LIMIT}`;

  // prepare headers (oauth yay!)
  const { authHeader } = nsClient.generateOAuth("POST", url);

  // prepare SuiteQL query
  const q =
    `SELECT ` +
    `  TO_CHAR(Transaction.LastModifiedDate, 'YYYY-MM-DD HH24:MI:SS') po_last_modified_date, ` +
    `  SESSIONTIMEZONE session_tz, ` +
    `  Transaction.ID po_id, ` +
    `  Transaction.TranID po_tran_id, ` +
    `  Transaction.Status po_status, ` +
    `  TransactionLine.createdFrom po_created_from_id, ` +
    `  BUILTIN.DF(TransactionLine.createdFrom) po_created_from_name, ` +
    `  Transaction.Entity po_entity_id, ` +
    `  BUILTIN.DF(Transaction.Entity) po_entity_name ` +
    `FROM Transaction  ` +
    `  INNER JOIN TransactionLine ON Transaction.ID = TransactionLine.Transaction ` +
    `WHERE ` +
    ` Transaction.Type = 'PurchOrd' ` +
    ` AND TransactionLine.mainline = 'T' ` +
    ` AND Transaction.LastModifiedDate >= TO_DATE('${lastModifiedFrom}', 'YYYY-MM-DD HH24:MI:SS') ` +
    ` AND Transaction.Status = 'B'` +
    `ORDER BY 1 ASC`;

  const queryRequest = await fetchWithRetry(url, {
    method: "POST",
    body: JSON.stringify({ q }),
    headers: {
      Authorization: authHeader,
      Prefer: "transient",
    },
    retries: 10,
    retryOn: [401, 419, 429, 500, 502, 503, 504],
  });

  const { items } = (await queryRequest.json()) as {
    items: NetSuitePurchaseOrderSummary[];
  };

  if (items === undefined || items.length === 0) {
    const result = {
      message: "No items returned by query",
      skipped,
      tracked,
      ignored,
    };

    return result;
  }

  let maxLastModifiedDate = lastModifiedFrom.toString();

  // for each PO summary
  for (const item of items) {
    maxLastModifiedDate = item.po_last_modified_date;

    const itemLog = {
      productionPOInternalId: item.po_id,
      entityId: item.po_entity_id,
      lastModifiedAt: item.po_last_modified_date,
    };

    // check if we've seen this PO before
    const existingSummary = await stash.send(
      new GetValueCommand({
        key: stashItemKey(item),
        keyspaceName,
      })
    );

    // skip if we have seen before
    if (existingSummary.value !== undefined) {
      skipped.push(itemLog);
      await updateHighWaterMark(item, "skipped");
      continue;
    }

    // ignore if in ignore list
    const ignoredVendor = entityIdsIgnoreList.includes(
      parseInt(item.po_entity_id)
    );
    if (ignoredVendor) {
      ignored.push(itemLog);
      await updateHighWaterMark(item, "ignored");
      continue;
    }

    tracked.push(itemLog);
    await updateHighWaterMark(item, "tracked");

    // Do something with the PO if its "tracked" - we've not seen it before
  }

  const result = {
    skipped,
    tracked,
    ignored,
    lastModifiedFrom: {
      start: lastModifiedFrom,
      final: maxLastModifiedDate,
    },
  };
  return result;
};

const updateHighWaterMark = async (
  item: NetSuitePurchaseOrderSummary,
  action: "skipped" | "tracked" | "ignored"
) => {
  // only persist the summary record if we're not skipping,
  // as skipped will already be persisted from previous run
  if (action !== "skipped")
    await stash.send(
      new SetValueCommand({
        key: stashItemKey(item),
        keyspaceName,
        value: {
          ...item,
          action,
        },
      })
    );

  await stash.send(
    new SetValueCommand({
      key: `po-poller-last-run`,
      keyspaceName,
      value: item.po_last_modified_date,
    })
  );
};
