import hash from "object-hash";
import { TextEncoder } from "util";
import { ErrorObject } from "serialize-error";
import { bucketClient } from "./buckets.js";
import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@stedi/sdk-client-buckets";

const bucketName = process.env["EXECUTIONS_BUCKET_NAME"];

export const recordNewExecution = async (input: any): Promise<string> => {
  const executionId = hash({
    functionName: functionName(),
    input,
  });

  const result = await bucketClient().send(
    new PutObjectCommand({
      bucketName,
      key: `functions/${functionName()}/${executionId}/input.json`,
      body: new TextEncoder().encode(JSON.stringify(input)),
    })
  );
  if (result)
    console.log({ action: "recordNewExecution", executionId, result });

  return executionId;
};

export const markExecutionAsSuccessful = async (executionId: string) => {
  let inputResult = await bucketClient().send(
    new DeleteObjectCommand({
      bucketName,
      key: `functions/${functionName()}/${executionId}/input.json`,
    })
  );

  if (inputResult)
    console.log({
      action: "markExecutionAsSuccessful",
      executionId,
      inputResult,
    });

  // async invokes automatically retries on failure, so
  // we should attempt to cleanup any leftover failure results
  // as this might be a later retry invoke
  const failureResult = await bucketClient().send(
    new DeleteObjectCommand({
      bucketName,
      key: `functions/${functionName()}/${executionId}/failure.json`,
    })
  );

  if (failureResult)
    console.log({
      action: "markExecutionAsSuccessful",
      executionId,
      failureResult,
    });
  return { inputResult, failureResult };
};

export const markExecutionAsFailed = async (
  executionId: string,
  error: ErrorObject
) => {
  const result = await bucketClient().send(
    new PutObjectCommand({
      bucketName,
      key: `functions/${functionName()}/${executionId}/failure.json`,
      body: new TextEncoder().encode(JSON.stringify(error)),
    })
  );

  if (result)
    console.log({ action: "markExecutionAsFailed", executionId, result });
  return result;
};

const functionName = () => process.env["STEDI_FUNCTION_NAME"];
