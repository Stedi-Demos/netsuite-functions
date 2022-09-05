# NetSuite Polling Demo

This repo contains a single reference function that demonstrates polling NetSuite Purchase Orders summaries using Stedi Functions and persiting them in Stash.

[Axiom.co](https://axiom.co) is also used as a logging and metrics provider for the workload.

## Managing environments within Stedi

Stedi recommends utilizing at least two Stedi accounts to partition development & testing activities from your production workloads. The remainder of this guide will presume you are using an account designated for staging/development workloads.

## Setup

1. Create a `.env` using the the `.env.sample` as a template.

```bash
cp .env.sample .env
```

2. Generate a [Stedi API Key](https://www.stedi.com/app/settings/api-keys), and record the key in your `.env` file using the `STEDI_API_KEY` variable name.

3. Ensure the `STEDI_ENV=staging` line remains as shown within the `.env` file.

4. Sign up for an [Axiom.co](https://axiom.co), the free tier should be sufficient for several small production workloads. Create a single dataset called `staging-netsuite`, and generate an API key with write permissions to the newly created dataset. Store the key using the `AXIOM_API_KEY` variable in your `.env` file.

5. Using the Stedi Dashboard create a new [Stash Keyspace](https://www.stedi.com/app/stash) to store the received NetSuite data, set the name field to `netsuite-data` (or similar), then record this keyspace name in our `.env` file using the `NS_PO_STASH_KEYSPACE` variable.

6. Using the Stedi Dashboard create a new [Bucket](https://www.stedi.com/app/buckets) to store your function execution payloads. Set the bucket name in the `EXECUTIONS_BUCKET_NAME` variable in our `.env` file.

7. You will require a set of OAUTH tokens to access your NetSuite REST API, these credentials should be stored in our `.env` file using the following names:

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

#### Deploying all functions within a single directory (namespaced)

```bash
npm run deploy netsuite
```

#### Deploying a single function using the start of its name

```bash
npm run deploy po-poller
```

## Unit tests

Unit tests are powered by [Ava](https://github.com/avajs/ava) and can be run using: `npm run test`
