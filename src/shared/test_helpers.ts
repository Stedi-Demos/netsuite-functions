import nock from "nock";
import {
  BucketsClient,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@stedi/sdk-client-buckets";
import { mockClient } from "aws-sdk-client-mock";
import { StashClient } from "@stedi/sdk-client-stash";

const exectionsBucket = process.env.EXECUTIONS_BUCKET_NAME ?? "";

/**
 * Mocks all calls to Axiom
 *
 * @param doNotMockLogMessages - array of message strings to EXCLUDE from mock
 */
export const mockLogging = (doNotMockLogMessages = []) => {
  // mock logging calls
  nock(/https:\/\/cloud.axiom.co/)
    .post(/\/api\/v1\/datasets\/.*/, (body) => {
      const willMock = !doNotMockLogMessages.includes(body.message);
      // console.log({ willMock });
      return willMock;
    })
    .reply(200, { info: 0 })
    .persist();
};

/**
 * Creates a mocked Stedi BucketsClient
 *
 * @returns a mocked BucketsClient
 */
export const mockBucketClient = () => {
  return mockClient(BucketsClient);
};

/**
 * Adds happy path commands for function execution tracking. (PUT and DELETE)
 */
export const mockExecutionTracking = (mockedClient = mockBucketClient()) => {
  // mock bucket calls for execution tracking
  mockedClient
    .on(PutObjectCommand, { bucketName: exectionsBucket })
    .resolves({})
    .on(DeleteObjectCommand, { bucketName: exectionsBucket })
    .resolves({});
};

/**
 * Creates a mocked Stedi StashClient
 *
 * @returns a mocked StashClient
 */
export const mockStashClient = () => {
  return mockClient(StashClient);
};
