import { isCoveredByStory, isIgnoredElement } from "./util";

function getOnlyOneRepoAsDependency(
  dependencies: string[]
): string | undefined {
  const relevantDependencies = dependencies.filter(
    (dependency) => !isIgnoredElement(dependency)
  );
  return relevantDependencies.length === 1 &&
    relevantDependencies[0].indexOf("Repository") > -1
    ? relevantDependencies[0]
    : undefined;
}
function isDependentRepoUsedOnlyByThisService(
  repositoryMap: { [key: string]: string[] },
  serviceName: string,
  dependencies: string[]
) {
  const repo = getOnlyOneRepoAsDependency(dependencies);
  const relevantDependencies = repo
    ? repositoryMap[repo]?.filter((dependency) => !isIgnoredElement(dependency))
    : [];
  return (
    relevantDependencies.length === 1 && relevantDependencies[0] === serviceName
  );
}

function isMigrated(dependencies: string[]) {
  return (
    dependencies.filter(
      (dependency) =>
        dependency === "wrapMigratedService" ||
        dependency === "wrapFullyMigratedService" ||
        dependency === "wrapCloudAgnosticService"
    ).length > 0
  );
}

export type Element = {
  name: string;
  color: "white" | "green" | "yellow" | "orange" | "purple" | "cyan";
  type: "service" | "repository";
  isCoveredByStory: boolean;
};

export type Graph = {
  nodes: { [name: string]: Element };
  edges: { from: string; to: string }[];
};

export function createGraph(
  serviceMap: { [key: string]: string[] },
  repositoryMap: { [key: string]: string[] }
): Graph {
  const elements: Graph["nodes"] = {};
  const addElement = function (name: string, color: Element["color"]) {
    if (elements[name]) {
      return;
    }
    elements[name] = {
      name,
      color,
      isCoveredByStory: isCoveredByStory(name),
      type: name.indexOf("Repository") > -1 ? "repository" : "service",
    };
  };

  // Color the service nodes and dependencies
  Object.keys(serviceMap)
    .filter((dependency) => !isIgnoredElement(dependency))
    .forEach((serviceName) => {
      const dependencies = serviceMap[serviceName];
      console.log(serviceName, dependencies);

      // Already migrated
      if (isMigrated(dependencies)) {
        addElement(serviceName, "green");
        dependencies
          .filter((dependency) => !isIgnoredElement(dependency))
          .forEach((dependency) => {
            addElement(dependency, "green");
          });
      } else if (dependencies.length === 0) {
        // No dependencies
        addElement(serviceName, "yellow");
      } else if (
        getOnlyOneRepoAsDependency(dependencies) &&
        isDependentRepoUsedOnlyByThisService(
          repositoryMap,
          serviceName,
          dependencies
        )
      ) {
        // Only one repository
        addElement(serviceName, "orange");
        dependencies
          .filter((dependency) => !isIgnoredElement(dependency))
          .forEach((dependency) => {
            addElement(dependency, "orange");
          });
      }
    });

  Object.keys(repositoryMap).forEach((repositoryName) => {
    if (isIgnoredElement(repositoryName)) {
      return;
    }
    const dependencies = repositoryMap[repositoryName];
    // Color repositories used by multiple services
    const dependingOnRepository = dependencies.filter(
      (d) => !isIgnoredElement(d)
    );
    if (dependingOnRepository.length > 1) {
      addElement(repositoryName, "purple");
    } else if (dependingOnRepository.length <= 1) {
      dependingOnRepository.forEach((serviceName) => {
        if (Object.keys(elements).indexOf(serviceName) === -1) {
          addElement(serviceName, "cyan");
        }
      });
    }
    addElement(repositoryName, "white");
  });

  const edges: Graph["edges"] = [];

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
      edges.push({ from: serviceName, to: dependency });
    });
  });

  return {
    nodes: elements,
    edges,
  };
}
