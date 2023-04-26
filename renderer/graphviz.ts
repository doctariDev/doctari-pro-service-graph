import { Graph, NodeColor } from "../graph";
import { assertNever } from "../util";
import fs from "fs";
import { exec } from "child_process";

function createDotFileContent(graph: Graph) {
  const { nodes, edges } = graph;

  let content = "";
  // Color nodes
  Object.keys(nodes).forEach((elementName) => {
    const element = nodes[elementName];
    const shape = (() => {
      switch (element.type) {
        case "service":
          return "ellipse";
        case "repository":
          return "box";
        default:
          assertNever(element.type);
      }
    })();
    const lineStyle = element.isCoveredByStory ? ",dashed" : ",solid";
    content += `  ${element.name} [ fillcolor="${element.color}" style="filled${lineStyle}" shape=${shape} ]
`;
  });

  // Draw nodes and dependencies
  edges.forEach(({ from: serviceName, to: dependency }) => {
    content += `  ${serviceName} -> ${dependency}
  `;
  });

  return `
  digraph MyGraph {
    subgraph cluster1 {
        migrated [style=filled, fillcolor="${NodeColor.MIGRATED_COLOR}"] ;
        no_dependencies [style=filled, fillcolor="${NodeColor.NO_DEPENDENCIES_COLOR}"] ;
        candidate_to_migrate [style=filled, fillcolor="${NodeColor.CANDIDATE_COLOR}"] ;
        repo_multi_owners [style=filled, fillcolor="${NodeColor.REPO_MULTIPLE_OWNERS}"] ;
        service_multi_dependencies [style=filled, fillcolor="${NodeColor.SERV_MULTIPLE_DEPENDENCIES}"] ;
        fully_migrated [style="filled" fillcolor="${NodeColor.FULLY_MIGRATED_COLOR}"] ;
        fully_migrated_candidate [style="filled" fillcolor="${NodeColor.FULLY_MIGRATED_CANDIDATE_COLOR}"] ;
        looks_fishy [style="filled" fillcolor="${NodeColor.ERROR}"] ;
        has_a_story [style="filled,dashed" fillcolor="white"] ;
    }
    ${content}
  }
  `;
}

export function renderDotFile(graph: Graph) {
  const dotFileContent = createDotFileContent(graph);
  fs.writeFileSync("./services.dot", dotFileContent);
}

export function renderGraphviz(graph: Graph) {
  renderDotFile(graph);

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
