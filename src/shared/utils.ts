import fs from "node:fs";

export const functionNameFromPath = (fnPath: string): string => {
  // get filename exclusing extension
  // path-a/path-b/path-never-ends/nice-function/handler.ts
  // => nice-function
  return fnPath.split("/").slice(-3, -1).join("-");
};

export const getFunctionPaths = (pathMatch?: string) => {
  let paths = [];
  const namespaces = fs.readdirSync("./src/functions");

  for (const namespace of namespaces) {
    if (fs.lstatSync(`./src/functions/${namespace}`).isFile()) continue;
    const functions = fs.readdirSync(`./src/functions/${namespace}`);

    for (const functionName of functions) {
      if (fs.lstatSync(`./src/functions/${namespace}/${functionName}`).isFile())
        continue;
      paths.push(`./src/functions/${namespace}/${functionName}/handler.ts`);
    }
  }

  if (pathMatch) paths = paths.filter((path) => path.includes(`/${pathMatch}`));

  if (paths.length === 0) {
    console.error("No functions found.");
    process.exit(1);
  }

  return paths;
};
