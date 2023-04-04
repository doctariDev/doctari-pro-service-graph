import { findServices, getReferences, getServiceNameFromFile } from "./files";
import { createDotFileContent } from "./graph";

const fs = require("fs");
const path = require("path");

export function analyze(serviceDirectories: string[]) {
  serviceDirectories = serviceDirectories.map((serviceDirectory) => {
    return serviceDirectory.endsWith("/")
      ? serviceDirectory
      : serviceDirectory + "/";
  });

  const serviceMap: { [key: string]: string[] } = {};

  const serviceFiles = serviceDirectories
    .map((serviceDirectory) => findServices(serviceDirectory))
    .flat();

  serviceFiles.forEach((serviceFile) => {
    let serviceName = getServiceNameFromFile(serviceFile);
    if (!!serviceMap[serviceName]) {
      console.error(`Duplicate service name ${serviceName} found.`);
      serviceName = `${path
        .dirname(serviceFile)
        .split("/")
        .pop()}-${serviceName}`;
    }
    serviceName = serviceName.replace(/-/g, "_");
    serviceMap[serviceName] = [
      getReferences(serviceName, serviceFile, /([a-zA-Z]+Repository)/g),
      getReferences(serviceName, serviceFile, /([a-zA-Z]+Service)/g),
    ].flatMap((x) => x);
  });
  console.log("serviceMap");
  console.log(serviceMap);

  const repositoryMap: { [key: string]: string[] } = {};
  for (const [key, value] of Object.entries(serviceMap)) {
    value
      .filter((e) => e.indexOf("Repository") > -1)
      .forEach((element) => {
        if (!repositoryMap[element]) {
          repositoryMap[element] = [];
        }
        repositoryMap[element].push(key);
      });
  }
  console.log("repositoryMap");
  console.log(repositoryMap);

  const dotFileContent = `
  digraph MyGraph {
    subgraph cluster1 {
        migrated [style=filled, fillcolor="green"] ;
        no_dependencies [style=filled, fillcolor="yellow"] ;
        candidate_to_migrate [style=filled, fillcolor="orange"] ;
        repo_multi_owners [style=filled, fillcolor="purple"] ;
        service_multi_dependencies [style=filled, fillcolor="cyan"] ;
        has_a_story [style="filled,dashed" fillcolor="white"] ;
    }
  ${createDotFileContent(serviceMap, repositoryMap)}
  }
  `;
  fs.writeFileSync("./services.dot", dotFileContent);

  const { exec } = require("child_process");

  exec("docker ps", (error: any, stdout: any, stderr: any) => {
    if (error || stderr) {
      console.error(`Docker seems to be missing or off: ${error} ${stderr}`);
      process.exit(1);
    }

    exec(
      "cat services.dot | docker run --rm -i nshine/dot > services.png",
      (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error(`Dot execution failed: ${error} ${stderr}`);
          process.exit(1);
        }
      }
    );
  });
}
