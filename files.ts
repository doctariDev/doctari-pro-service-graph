const fs = require("fs");
const path = require("path");

export function findServices(directory: string): string[] {
  const includeAPIs = false;
  const includeFacades = true;
  return fs.readdirSync(directory).flatMap((file: string) => {
    const absolutePath = directory + file;
    if (fs.lstatSync(absolutePath).isDirectory()) {
      return findServices(absolutePath + "/");
    }
    return !/\.test\./.test(file) &&
      !/\.mock\./.test(file) &&
      (/.*Service.*\.ts$/.test(file) ||
        (includeFacades && /.*Facade.*\.ts$/.test(file)) ||
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
  const allMatches: string[] = content
    .split("\n")
    .filter((line: string) => line.indexOf("import") > -1)
    .map((line: string) => {
      const match = line.match(regex);
      if (!match || match.length === 0) {
        return [];
      }
      return match;
    })
    .flat();
  return [...new Set(allMatches)]
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
