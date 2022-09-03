import { NetsuiteRestApiClient } from "./rest_client.js";

const nsHostname = process.env["NS_REALM"].toLowerCase().replace("_", "-");

export const netSuiteConfig = () => {
  const client = new NetsuiteRestApiClient({
    consumerKey: process.env["NS_CONSUMER_KEY"],
    consumerSecretKey: process.env["NS_CONSUMER_KEY_SECRET"],
    token: process.env["NS_TOKEN"],
    tokenSecret: process.env["NS_TOKEN_SECRET"],
    realm: process.env["NS_REALM"],
  });

  const baseURL = `https://${nsHostname}.suitetalk.api.netsuite.com/services/rest`;

  return { baseURL, client };
};
