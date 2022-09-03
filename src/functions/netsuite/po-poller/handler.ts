import * as dotenv from "dotenv";
dotenv.config({ override: true });
import { info } from "../../../shared/axiom.js";
import { formatInTimeZone, toDate } from "date-fns-tz/esm";
import { fetchWithRetry } from "../../../shared/fetch-with-retry.js";
import crypto from "crypto";
import {
  StashClient,
  GetValueCommand,
  SetValueCommand,
} from "@stedi/sdk-client-stash";
import { netSuiteConfig } from "../../../shared/netsuite/config.js";
import {
  markExecutionAsFailed,
  recordNewExecution,
} from "../../../shared/execution.js";
import { serializeError } from "serialize-error";

const stashClient = new StashClient({
  region: "us",
  apiKey: process.env["STEDI_API_KEY"],
});

const { client: nsClient, baseURL: nsBaseURL } = netSuiteConfig();

export const handler = async (event: any) => {
  let executionId: string;
  try {
    executionId = await recordNewExecution(event);
    await info("starting", { input: event, executionId });

    let { value: lastModifiedFrom } = await stashClient.send(
      new GetValueCommand({
        key: "po-poller-last-run",
        keyspaceName: process.env["NS_PO_STASH_KEYSPACE"],
      })
    );
    console.log("start", lastModifiedFrom);
    lastModifiedFrom =
      lastModifiedFrom === undefined
        ? "2022-08-01 01:00:00-04:00"
        : lastModifiedFrom;

    // prepare URL
    const recordLimit = 10;
    const url = `${nsBaseURL}/query/v1/suiteql?limit=${recordLimit}`;

    // prepare headers (oauth yay!)
    const { authHeader } = nsClient.generateOAuth("POST", url);

    // prepare SuiteQL query
    const q =
      `SELECT ` +
      `  Transaction.LastModifiedDate, ` +
      `  TO_CHAR(Transaction.LastModifiedDate, 'YYYY-MM-DD HH24:MI:SSTZH:TZM') txn_last_modified_date, ` +
      `  SESSIONTIMEZONE session_tz, ` +
      `  Transaction.ID txn_id, ` +
      `  Transaction.TranID txn_tran_id, ` +
      `  Transaction.Status txn_status, ` +
      `  TransactionLine.createdFrom tl_created_from, ` +
      `  BUILTIN.DF(TransactionLine.createdFrom) tl_created_from_name, ` +
      `  Transaction.Entity txn_entity, ` +
      `  BUILTIN.DF(Transaction.Entity) txn_entity_name ` +
      `FROM Transaction  ` +
      `  INNER JOIN TransactionLine ON Transaction.ID = TransactionLine.Transaction ` +
      `WHERE ` +
      ` Transaction.Type = 'PurchOrd' ` +
      ` AND TransactionLine.mainline = 'T' ` +
      ` AND Transaction.LastModifiedDate >= TO_TIMESTAMP_TZ('${lastModifiedFrom}', 'YYYY-MM-DD HH24:MI:SSTZH:TZM' ) ` +
      ` AND Transaction.Status = 'B' ` +
      `ORDER BY 1 ASC`;

    const queryRequest = await fetchWithRetry(url, {
      method: "POST",
      body: JSON.stringify({ q }),
      headers: {
        Authorization: authHeader,
        Prefer: "transient",
        "X-NetSuite-Idempotency-Key": crypto.randomUUID(),
      },
    });

    const { count, items, hasMore, totalResults, offset } =
      (await queryRequest.json()) as any;
    console.log({ count, hasMore, totalResults, offset });

    // console.log(JSON.stringify(items, null, 2));
    if (items.length === 0) return [];

    let maxLastModfiedDate = toDate(lastModifiedFrom.toString());

    const found = [];

    for (const item of items) {
      const setPOSummaryRequest = stashClient.send(
        new SetValueCommand({
          key: `purchase-order/${item.txn_id}`,
          keyspaceName: process.env["NS_PO_STASH_KEYSPACE"],
          value: JSON.stringify({
            item,
          }),
        })
      );

      found.push(item.txn_tran_id);

      const itemLastModfiedDate = toDate(item.txn_last_modified_date, {
        timeZone: item.session_tz,
      });

      if (itemLastModfiedDate < maxLastModfiedDate)
        throw new Error(
          "Item's lastModifiedDate should never be less than maxLastModfiedDate"
        );

      maxLastModfiedDate = itemLastModfiedDate;

      const setLastModifiedRequest = stashClient.send(
        new SetValueCommand({
          key: `po-poller-last-run`,
          keyspaceName: process.env["NS_PO_STASH_KEYSPACE"],
          value: formatInTimeZone(
            maxLastModfiedDate,
            "UTC",
            "yyyy-MM-dd HH:mm:ssXXX"
          ),
        })
      );

      const results = await Promise.allSettled([
        setPOSummaryRequest,
        setLastModifiedRequest,
      ]);

      if (results.some((result) => result.status === "rejected")) {
        console.error(results);
        throw new Error("One or more Stash#setValue requests failed");
      }
    }

    await info("complete", {
      payload: formatInTimeZone(
        maxLastModfiedDate,
        "UTC",
        "yyyy-MM-dd HH:mm:ssXXX"
      ),
      executionId,
    });

    return {
      found,
      maxLastModfiedDate: formatInTimeZone(
        maxLastModfiedDate,
        "UTC",
        "yyyy-MM-dd HH:mm:ssXXX"
      ),
    };
  } catch (error) {
    const rawError = serializeError(error);

    await Promise.allSettled([
      markExecutionAsFailed(executionId, rawError),
      info("exception", {
        executionId,
        input: JSON.stringify(event),
        // @ts-ignore
        errorMessage: error.message,
        exception: JSON.stringify(rawError),
      }),
    ]);

    return { message: "exception", error: rawError };
  }
};
