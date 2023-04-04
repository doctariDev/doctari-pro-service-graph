const fs = require("fs");
const path = require("path");

export function findServices(directory: string): string[] {
  const includeAPIs = false;
  return fs.readdirSync(directory).flatMap((file: string) => {
    const absolutePath = directory + file;
    if (fs.lstatSync(absolutePath).isDirectory()) {
      return findServices(absolutePath + "/");
    }
    return !/test/.test(file) &&
      (/.*Service.*\.ts$/.test(file) ||
        (includeAPIs && /.*\/api\/.*\/.*\.ts$/.test(absolutePath)))
      ? [absolutePath]
      : [];
  });
}

export function getReferences(
  serviceName: string,
  serviceFile: string,
  regex: RegExp
): string[] {
  const content: string = fs.readFileSync(serviceFile, "utf8");
  const match = content.match(regex);
  if (!match || match.length === 0) {
    return [];
  }
  return [...new Set(match)]
    .map(uppercaseFirstCharForRepoAndService)
    .filter((e) => e !== serviceName)
    .filter((e) => e !== `Migrated${serviceName}`)
    .sort();
}

function uppercaseFirstCharForRepoAndService(string: string): string {
  if (string.indexOf("wrap") > -1) {
    return string;
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function getServiceNameFromFile(serviceFile: string): string {
  const basename = path.basename(serviceFile);
  return basename.substring(0, basename.indexOf("."));
}
