import { GetValueCommand } from "@stedi/sdk-client-stash";
import test from "ava";
import nock from "nock";

import { requiredEnvVar } from "../../../../shared/environment.js";
import { mockStashClient } from "../../../../shared/test_helpers.js";
import { handler, RECORD_LIMIT } from "../handler.js";

test.before(() => {
  nock.disableNetConnect();
});

test.beforeEach(() => {
  mockStashClient()
    // get last modified date
    .on(GetValueCommand, {
      key: "po-poller-last-run",
      keyspaceName: requiredEnvVar("NS_PO_STASH_KEYSPACE"),
    })
    .resolvesOnce({ value: "2022-08-01 04:00:00" })
    // check if frist record has already been polled
    .on(GetValueCommand, {
      keyspaceName: requiredEnvVar("NS_PO_STASH_KEYSPACE"),
      key: "purchase-order/555719256/poller",
    })
    // not seen before
    .resolvesOnce({ value: { polled: "before" } });
});

test.after.always(() => nock.cleanAll());

test.serial(
  "when only 'skipped' order is returned the timestamps do not move forward",
  async (t) => {
    nock("https://555000111.suitetalk.api.netsuite.com")
      .post(`/services/rest/query/v1/suiteql?limit=${RECORD_LIMIT}`)
      .reply(200, {
        items: [
          {
            po_id: "555719256",
            po_last_modified_date: "2022-08-01 04:00:00",
            po_entity_id: "200",
          },
        ],
      });

    const result = await handler({});
    t.deepEqual(result, {
      ignored: [],
      skipped: [
        {
          entityId: "200",
          lastModifiedAt: "2022-08-01 04:00:00",
          productionPOInternalId: "555719256",
        },
      ],
      tracked: [],
      lastModifiedFrom: {
        start: "2022-08-01 04:00:00",
        final: "2022-08-01 04:00:00",
      },
    });
  }
);
