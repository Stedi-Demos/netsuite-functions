import nock from "nock";
import test from "ava";
import { handler } from "../handler.js";
import {
  mockExecutionTracking,
  mockLogging,
  mockStashClient,
} from "../../../../shared/test_helpers.js";
import { GetValueCommand, SetValueCommand } from "@stedi/sdk-client-stash";
import { on } from "events";

test.before(() => {
  nock.disableNetConnect();
  mockLogging();
});

test.beforeEach(() => {
  mockExecutionTracking();
});

test.after.always(() => nock.cleanAll());

test("sending suiteql query to NetSuite", async (t) => {
  const nsQuery = nock("https://555000111.suitetalk.api.netsuite.com")
    .post(`/services/rest/query/v1/suiteql?limit=10`)
    .reply(200, {
      items: [
        {
          links: [],
          tl_created_from: "175718279",
          tl_created_from_name: "Sales Order #555123",
          txn_entity: "1979",
          txn_entity_name: "BDQ, Inc.",
          txn_id: "555719257",
          txn_last_modified_date: "2022-08-01 07:17:43-04:00",
          txn_status: "B",
          txn_tran_id: "5550273",
        },
      ],
    });

  mockStashClient()
    .on(GetValueCommand, {
      key: "po-poller-last-run",
      keyspaceName: process.env["NS_PO_STASH_KEYSPACE"],
    })
    .resolvesOnce({ value: "2022-08-01 04:00:00-04:00" })
    .on(SetValueCommand, { keyspaceName: process.env["NS_PO_STASH_KEYSPACE"] })
    .resolves({});

  const result = await handler({});

  nsQuery.isDone();

  t.deepEqual(result, {
    found: ["5550273"],
    maxLastModfiedDate: "2022-08-01 11:17:43Z",
  });
});
