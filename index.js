const fs = require("fs");
const path = require("path");
const pjson = require("./package.json");
const { Command } = require("commander");

const program = new Command();

program
  .name("analyze-service-repo-dependencies")
  .description(
    "Analyze service and repository dependencies. Produces a dot and a png file."
  )
  .version(pjson.version);

program
  .command("analyze")
  .description(
    "Analyze service and repository dependencies. Produces a dot and a png file."
  )
  .argument(
    "<serviceDirectory>",
    "directory containing service files: *.Service.ts"
  )
  .action(() => {
    const serviceDirectories = [...program.args];
    serviceDirectories.shift();
    console.log("serviceDirectories", serviceDirectories);
    analyze(serviceDirectories);
  });

program.parse();

function analyze(serviceDirectories) {
  serviceDirectories = serviceDirectories.map((serviceDirectory) => {
    return serviceDirectory.endsWith("/")
      ? serviceDirectory
      : serviceDirectory + "/";
  });

  function findServices(directory) {
    return fs.readdirSync(directory).flatMap((file) => {
      const absolutePath = directory + file;
      if (fs.lstatSync(absolutePath).isDirectory()) {
        return findServices(absolutePath + "/");
      }
      return !/test/.test(file) && /.*Service.*\.ts$/.test(file)
        ? [absolutePath]
        : [];
    });
  }

  function getReferences(serviceName, serviceFile, regex) {
    const content = fs.readFileSync(serviceFile, "utf8");
    const match = content.match(regex);
    if (!match || match.length === 0) {
      return [];
    }
    return [...new Set(match)].filter((e) => e !== serviceName).sort();
  }

  function getServiceNameFromFile(serviceFile) {
    const basename = path.basename(serviceFile);
    return basename.substring(0, basename.indexOf("."));
  }

  function isIgnoredElement(element) {
    const ignoredElements = [
      "wrapMigratedService",
      "AbstractRepository",
      "wrapService",
    ];
    if (ignoredElements.filter((e) => e === element).length > 0) {
      return true;
    }
    if (/migrated.*Service.*/.test(element)) {
      return true;
    }
  }

  const createDotFileContent = function (serviceMap, repositoryMap) {
    function writeFillcolor(content, serviceName, color) {
      return (
        content +
        `  ${serviceName} [ fillcolor="${color}" style=filled ]
`
      );
    }
    function hasOnlyOneRepoAsDependency(dependencies) {
      return (
        dependencies.length === 1 && dependencies[0].indexOf("Repository") > -1
      );
    }
    function isDependentRepoUsedOnlyByThisService(
      repositoryMap,
      serviceName,
      dependencies
    ) {
      const repo = dependencies[0];
      return (
        repositoryMap[repo].length === 1 &&
        repositoryMap[repo][0] === serviceName
      );
    }

    let content = "";
    // Color the service nodes and dependencies
    Object.keys(serviceMap).forEach((serviceName) => {
      if (isIgnoredElement(serviceName)) {
        return;
      }
      const dependencies = serviceMap[serviceName];

      // Already migrated
      if (
        dependencies.filter(
          (dependency) => dependency === "wrapMigratedService"
        ).length > 0
      ) {
        content = writeFillcolor(content, serviceName, "green");
        dependencies
          .filter((dependency) => !isIgnoredElement(dependency))
          .forEach((dependency) => {
            content = writeFillcolor(content, dependency, "green");
          });
      } else if (dependencies.length === 0) {
        // No dependencies
        content = writeFillcolor(content, serviceName, "yellow");
      } else if (
        hasOnlyOneRepoAsDependency(dependencies) &&
        isDependentRepoUsedOnlyByThisService(
          repositoryMap,
          serviceName,
          dependencies
        )
      ) {
        // Only one repository
        content = writeFillcolor(content, serviceName, "orange");
        dependencies
          .filter((dependency) => !isIgnoredElement(dependency))
          .forEach((dependency) => {
            content = writeFillcolor(content, dependency, "orange");
          });
      }
    });

    // Color repositories used by multiple services
    Object.keys(repositoryMap).forEach((repositoryName) => {
      if (isIgnoredElement(repositoryName)) {
        return;
      }
      const dependencies = repositoryMap[repositoryName];
      if (dependencies.length > 1) {
        content = writeFillcolor(content, repositoryName, "purple");
      }
    });

    // Draw nodes and dependencies
    Object.keys(serviceMap).forEach((serviceName) => {
      if (isIgnoredElement(serviceName)) {
        return;
      }
      const dependencies = serviceMap[serviceName];
      dependencies.forEach((dependency) => {
        if (serviceName === dependency || isIgnoredElement(dependency)) {
          return;
        }
        content += `  ${serviceName} -> ${dependency}
`;
      });
    });
    return content;
  };

  const serviceMap = {};

  const serviceFiles = serviceDirectories
    .map((serviceDirectory) => findServices(serviceDirectory))
    .flat();

  serviceFiles.forEach((serviceFile) => {
    let serviceName = getServiceNameFromFile(serviceFile);
    if (!!serviceMap[serviceName]) {
      console.error(`Duplicate service name ${serviceName} found.`);
      process.exit(1);
    }
    serviceMap[serviceName] = [
      getReferences(serviceName, serviceFile, /([a-zA-Z]+Repository)/g),
      getReferences(serviceName, serviceFile, /([a-zA-Z]+Service)/g),
    ].flatMap((x) => x);
  });
  console.log(serviceMap);

  const repositoryMap = {};
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

  const dotFileContent = `
digraph MyGraph {
  subgraph cluster1 {
      migrated [style=filled, fillcolor="green"] ;
      no_dependencies [style=filled, fillcolor="yellow"] ;
      candidate_to_migrate [style=filled, fillcolor="orange"] ;
      repo_multiple_owners [style=filled, fillcolor="purple"] ;
  }
${createDotFileContent(serviceMap, repositoryMap)}
}
`;
  fs.writeFileSync("./services.dot", dotFileContent);

  const { exec } = require("child_process");

  exec("docker ps", (error, stdout, stderr) => {
    if (error || stderr) {
      console.error(`Docker seems to be missing or off: ${error} ${stderr}`);
      process.exit(1);
    }

    exec(
      "cat services.dot | docker run --rm -i nshine/dot > services.png",
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Dot execution failed: ${error} ${stderr}`);
          process.exit(1);
        }
      }
    );
  });
}
