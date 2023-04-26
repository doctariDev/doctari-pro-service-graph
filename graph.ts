import { isCoveredByStory, isIgnoredElement } from "./util";

function isRepository(element: string): boolean {
  return element.indexOf("Repository") > -1;
}

function getOnlyOneRepoAsDependency(
  dependencies: string[]
): string | undefined {
  const relevantDependencies = dependencies.filter(
    (dependency) => !isIgnoredElement(dependency)
  );
  return relevantDependencies.length === 1 &&
    isRepository(relevantDependencies[0])
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
    dependencies &&
    dependencies.filter(
      (dependency) =>
        dependency === "wrapMigratedService" ||
        dependency === "wrapFullyMigratedService" ||
        dependency === "wrapCloudAgnosticService"
    ).length > 0
  );
}

function isFullyMigrated(dependencies: string[]) {
  return (
    dependencies.filter(
      (dependency) => dependency === "wrapFullyMigratedService"
    ).length > 0
  );
}

export enum NodeColor {
  DEFAULT_COLOR = "white",
  MIGRATED_COLOR = "#00FF00",
  FULLY_MIGRATED_COLOR = "#008800",
  FULLY_MIGRATED_CANDIDATE_COLOR = "#008888",
  NO_DEPENDENCIES_COLOR = "yellow",
  CANDIDATE_COLOR = "orange",
  REPO_MULTIPLE_OWNERS = "purple",
  SERV_MULTIPLE_DEPENDENCIES = "cyan",
  ERROR = "red",
}

export type Element = {
  name: string;
  color: NodeColor;
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
    console.log(`Adding ${name} with color ${color}`)
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
      const dependencies = serviceMap[serviceName] ?? [];
      console.log(serviceName, dependencies);

      // Already migrated
      if (isMigrated(dependencies)) {
        const fullyMigrated = isFullyMigrated(dependencies);
        const color = fullyMigrated
          ? NodeColor.FULLY_MIGRATED_COLOR
          : NodeColor.MIGRATED_COLOR;
        addElement(serviceName, color);
        dependencies
          .filter((dependency) => !isIgnoredElement(dependency))
          .forEach((dependency) => {
            // Mark repos of migrated services as migrated
            if (isRepository(dependency)) {
              addElement(dependency, NodeColor.MIGRATED_COLOR);
            } else {
              // A migrated service may not depend on a non-migrated service
              if (!isMigrated(serviceMap[dependency])) {
                addElement(dependency, NodeColor.ERROR);
              }
            }
          });
      } else if (
        isMigrated(dependencies) &&
        !isFullyMigrated(dependencies) &&
        dependencies.filter(
          (dependency) =>
            !isIgnoredElement(dependency) &&
            isFullyMigrated(serviceMap[dependency])
        )
      ) {
        addElement(serviceName, NodeColor.FULLY_MIGRATED_CANDIDATE_COLOR);
      } else if (dependencies.length === 0) {
        // No dependencies
        addElement(serviceName, NodeColor.NO_DEPENDENCIES_COLOR);
      } else if (
        getOnlyOneRepoAsDependency(dependencies) &&
        isDependentRepoUsedOnlyByThisService(
          repositoryMap,
          serviceName,
          dependencies
        )
      ) {
        // Only one repository
        addElement(serviceName, NodeColor.CANDIDATE_COLOR);
        dependencies
          .filter((dependency) => !isIgnoredElement(dependency))
          .forEach((dependency) => {
            addElement(dependency, NodeColor.CANDIDATE_COLOR);
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
      addElement(repositoryName, NodeColor.REPO_MULTIPLE_OWNERS);
    } else if (dependingOnRepository.length <= 1) {
      dependingOnRepository.forEach((serviceName) => {
        if (Object.keys(elements).indexOf(serviceName) === -1) {
          addElement(serviceName, NodeColor.SERV_MULTIPLE_DEPENDENCIES);
        }
      });
    }
    addElement(repositoryName, NodeColor.DEFAULT_COLOR);
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
