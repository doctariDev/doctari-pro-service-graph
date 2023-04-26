import { findServices, getReferences, getServiceNameFromFile } from "./files";
import { createGraph } from "./graph";
import { Renderer } from "./renderer";

const fs = require("fs");
const path = require("path");

export function analyze(serviceDirectories: string[], renderGraph: Renderer) {
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
      console.error(`Duplicate service name ${serviceName} found: ${serviceFile}`);
      serviceName = `${path
        .dirname(serviceFile)
        .split("/")
        .pop()}-${serviceName}`;
        console.log(serviceFiles);
        process.exit(1);
    }
    serviceName = serviceName.replace(/-/g, "_");
    serviceMap[serviceName] = [
      getReferences(serviceName, serviceFile, /([a-zA-Z]+Repository)/g),
      getReferences(serviceName, serviceFile, /([a-zA-Z]+Service)/g),
      getReferences(serviceName, serviceFile, /([a-zA-Z]+Facade)/g),
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

  const graph = createGraph(serviceMap, repositoryMap);

  renderGraph(graph);
}
