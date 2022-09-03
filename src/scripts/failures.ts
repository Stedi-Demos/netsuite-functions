import * as dotenv from "dotenv";
dotenv.config({ override: true });

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsCommand,
  ListObjectsCommandInput,
} from "@stedi/sdk-client-buckets";
import readline from "readline";

import consumers from "stream/consumers";
import { invokeFunction } from "../shared/functions.js";
import { bucketClient } from "../shared/buckets.js";

const retryAllFlag = "--retry-all";
const deleteAllFlag = "--delete-all";

(async () => {
  let retryAll = false;
  let deleteAll = false;
  const bucketName = process.env["EXECUTIONS_BUCKET_NAME"];

  const executionsProcessed = new Set<string>();

  const args = process.argv.slice(2);
  if (args.includes(retryAllFlag)) {
    args.splice(args.indexOf(retryAllFlag), 1);
    retryAll = true;
  }

  if (args.includes(deleteAllFlag)) {
    args.splice(args.indexOf(deleteAllFlag), 1);
    deleteAll = true;
  }

  if (args.length > 1) {
    console.log("Too many arguments.");
    process.exit(1);
  }

  const listParams: ListObjectsCommandInput = { bucketName, pageSize: 10 };

  if (args.length === 1) {
    listParams.prefix = `functions/${args[0]}`;
  }

  let next: boolean = true;
  let nextPageToken: string | undefined;
  while (next) {
    listParams.pageToken = nextPageToken;

    const result = await bucketClient().send(
      new ListObjectsCommand(listParams)
    );
    nextPageToken = result.nextPageToken;

    if (!Array.isArray(result.items)) {
      console.log(`No files found in bucket: '${bucketName}'`);
      next = false;
    } else {
      for (const item of result.items) {
        const secondsAgo =
          (new Date().getTime() - new Date(item.updatedAt).getTime()) / 1000;

        // newer than 15 minutes
        if (secondsAgo < 60 * 15) {
          console.log(
            `Skipping file ${item.key} because it is too fresh [${secondsAgo}].`
          );
          continue;
        }

        const path = item.key.split("/");
        const fileName = path.pop();

        let failure: string;
        let input: string;

        if (fileName === "input.json")
          input = await getBodyAsString(bucketName, item.key);

        if (fileName === "failure.json")
          failure = await getBodyAsString(bucketName, item.key);

        const basePath = path.join("/");
        const executionId = path.pop();
        const functionName = path.pop();

        if (executionsProcessed.has(executionId)) continue;

        if (failure === undefined)
          failure = await getBodyAsString(
            bucketName,
            `${basePath}/${functionName}/${executionId}/failure.json`
          );

        if (input === undefined)
          input = await getBodyAsString(bucketName, `${basePath}/input.json`);

        console.log({
          input,
          failure,
          path: item.key,
          ts: item.updatedAt,
          ago: secondsAgo,
        });

        let nextAction: string = "S";
        if (retryAll) {
          // if there's no input we skip, otherwise we can retry
          nextAction = input === undefined ? "S" : "R";
        } else if (deleteAll) {
          nextAction = "D";
        } else {
          console.log("\nWhat do you want to do with this execution?");
          if (functionName && executionId && input) {
            nextAction = await prompt(
              "(D)elete, (R)etry, (S)kip, (Q)uit - [S]: "
            );
          } else {
            nextAction = await prompt("(D)elete, (S)kip, (Q)uit - [S]: ");
          }
        }

        switch (nextAction.toUpperCase()) {
          case "D":
            console.log("Deleting...");
            await deleteExecutionFiles(bucketName, basePath);

            executionsProcessed.add(executionId);
            break;
          case "R":
            console.log("Retrying...");
            await deleteExecutionFiles(bucketName, basePath);
            const result = await invokeFunction(
              functionName,
              JSON.parse(input)
            );
            console.log(result);

            executionsProcessed.add(executionId);
            break;
          case "Q":
            console.log("Exiting...");
            process.exit(1);
          default:
            console.log("Skipping...");
            executionsProcessed.add(executionId);
        }

        console.log("\n=========================================\n");
      }
    }

    if (nextPageToken === undefined) next = false;
  }
  process.exit(0);
})();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const prompt = (query): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

const getBodyAsString = async (
  bucketName: string,
  key: string
): Promise<string> => {
  try {
    const doc = await bucketClient().send(
      new GetObjectCommand({ bucketName, key })
    );

    return (await consumers.text(doc.body as any)).toString();
  } catch (error) {
    return undefined;
  }
};

const deleteExecutionFiles = async (bucketName: string, basePath) => {
  await Promise.allSettled([
    bucketClient().send(
      new DeleteObjectCommand({
        bucketName,
        key: `${basePath}/input.json`,
      })
    ),
    bucketClient().send(
      new DeleteObjectCommand({
        bucketName,
        key: `${basePath}/failure.json`,
      })
    ),
  ]);
};
