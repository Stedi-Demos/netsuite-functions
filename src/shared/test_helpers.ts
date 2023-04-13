import { BucketsClient } from "@stedi/sdk-client-buckets";
import { mockClient } from "aws-sdk-client-mock";
import { StashClient } from "@stedi/sdk-client-stash";

/**
 * Creates a mocked Stedi BucketsClient
 *
 * @returns a mocked BucketsClient
 */
export const mockBucketClient = () => {
  return mockClient(BucketsClient);
};

/**
 * Creates a mocked Stedi StashClient
 *
 * @returns a mocked StashClient
 */
export const mockStashClient = () => {
  return mockClient(StashClient);
};
