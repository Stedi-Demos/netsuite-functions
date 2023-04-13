import { GetValueCommand, SetValueCommand } from "@stedi/sdk-client-stash";
import test from "ava";
import nock from "nock";
import { requiredEnvVar } from "../../../../shared/environment.js";
import { mockStashClient } from "../../../../shared/test_helpers.js";
import { handler, RECORD_LIMIT } from "../handler.js";

const stashClient = mockStashClient();

test.before(() => {
  nock.disableNetConnect();
});

test.beforeEach(() => {
  stashClient
    // get last modified date
    .on(GetValueCommand, {
      key: "po-poller-last-run",
      keyspaceName: requiredEnvVar("NS_PO_STASH_KEYSPACE"),
    })
    .resolves({ value: "2022-08-01 04:00:00" })
    // check if frist record has already been polled
    .on(GetValueCommand, {
      keyspaceName: requiredEnvVar("NS_PO_STASH_KEYSPACE"),
      key: "purchase-order/555719256/poller",
    })
    // not seen before
    .resolves({ value: { polled: "before" } })
    // check if second record has already been polled
    .on(GetValueCommand, {
      keyspaceName: requiredEnvVar("NS_PO_STASH_KEYSPACE"),
      key: "purchase-order/555719257/poller",
    })
    // not seen before
    .resolves({})
    // allow persisting new poller record
    .on(SetValueCommand, {
      keyspaceName: requiredEnvVar("NS_PO_STASH_KEYSPACE"),
    });
});

const mockNSPOPollerResult = (po_entity_id: string) => {
  return nock("https://555000111.suitetalk.api.netsuite.com")
    .post(`/services/rest/query/v1/suiteql?limit=${RECORD_LIMIT}`)
    .reply(200, {
      items: [
        {
          po_id: "555719256",
          po_last_modified_date: "2022-08-01 04:00:00",
          po_entity_id: "200",
        },
        {
          po_id: "555719257",
          po_last_modified_date: "2022-08-01 07:17:43",
          po_entity_id,
        },
      ],
    });
};

test.afterEach.always(() => {
  stashClient.resetHistory();
});

test.after.always(() => nock.cleanAll());

test.serial(
  "queries po summary from NetSuite returning last po modified date",
  async (t) => {
    const nsQuery = mockNSPOPollerResult("123");

    const result = await handler({});

    nsQuery.isDone();
    t.plan(2);
    if ("lastModifiedFrom" in result) {
      t.deepEqual(result.lastModifiedFrom.start, "2022-08-01 04:00:00");
      t.deepEqual(result.lastModifiedFrom.final, "2022-08-01 07:17:43");
    }
  }
);

test.serial("'tracked' entities update both Stash keyspaces", async (t) => {
  // entity not on ignoredVendorList
  mockNSPOPollerResult("888888888");

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
    tracked: [
      {
        entityId: "888888888",
        lastModifiedAt: "2022-08-01 07:17:43",
        productionPOInternalId: "555719257",
      },
    ],
    lastModifiedFrom: {
      start: "2022-08-01 04:00:00",
      final: "2022-08-01 07:17:43",
    },
  });

  // writes poller history
  t.assert(
    stashClient.commandCalls(SetValueCommand, {
      key: "purchase-order/555719257/poller",
      keyspaceName: requiredEnvVar("NS_PO_STASH_KEYSPACE"),
    }).length === 1
  );
});

test.serial(
  "'ignored' entities only update poller history Stash",
  async (t) => {
    mockNSPOPollerResult("2");

    const result = await handler({});
    t.deepEqual(result, {
      ignored: [
        {
          entityId: "2",
          lastModifiedAt: "2022-08-01 07:17:43",
          productionPOInternalId: "555719257",
        },
      ],
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
        final: "2022-08-01 07:17:43",
      },
    });

    // writes poller history
    t.assert(
      stashClient.commandCalls(SetValueCommand, {
        key: "purchase-order/555719257/poller",
        keyspaceName: requiredEnvVar("NS_PO_STASH_KEYSPACE"),
      }).length === 1
    );
  }
);
