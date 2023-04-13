# NetSuite Functions Demo

This repo contains a several reference functions that demonstrates how to interact with the NetSuite REST API

- [po-poller/handler.ts](src/functions/netsuite/po-poller/handler.ts) - polling NetSuite Purchase Orders summaries using Stedi Functions and persiting them in Stash.
- [create-so/handler.ts](src/functions/netsuite/create-so/handler.ts) - creating a NetSuite Sales Order

## Managing environments within Stedi

Stedi recommends utilizing at least two Stedi accounts to partition development & testing activities from your production workloads. The remainder of this guide will presume you are using an account designated for staging/development workloads.

## Setup

1. Create a `.env` using the the `.env.sample` as a template.

```bash
cp .env.sample .env
```

2. Generate a [Stedi API Key](https://www.stedi.com/app/settings/api-keys), and record the key in your `.env` file using the `STEDI_API_KEY` variable name.

3. Ensure the `STEDI_ENV=staging` line remains as shown within the `.env` file.

4. Using the Stedi Dashboard create a new [Stash Keyspace](https://www.stedi.com/app/stash) to store the received NetSuite data, set the name field to `netsuite-data` (or similar), then record this keyspace name in our `.env` file using the `NS_PO_STASH_KEYSPACE` variable.

5. Using the Stedi Dashboard create a new [Bucket](https://www.stedi.com/app/buckets) to store your function code. Set the bucket name in the `EXECUTIONS_BUCKET_NAME` variable in our `.env` file.

6. You will require a set of OAUTH tokens to access your NetSuite REST API, these credentials should be stored in our `.env` file using the following names:

   | .env Var Name          | Description                            |
   | ---------------------- | -------------------------------------- |
   | NS_CONSUMER_KEY        | NetSuite Consumer Key                  |
   | NS_CONSUMER_KEY_SECRET | NetSuite Consumer Key Secret           |
   | NS_TOKEN               | NetSuite Token                         |
   | NS_TOKEN_SECRET        | NetSuite Token Secret                  |
   | NS_REALM               | NetSuite instance ID, eg 555000111-sb1 |

## Deploying

This repo includes script to help compile and deploy TypeScript functions, it supports several ways to deploy.

#### Deploying all functions

```bash
npm run deploy
```

## Unit tests

Unit tests are powered by [Ava](https://github.com/avajs/ava) and can be run using: `npm run test`
