import { renderDotFile, renderGraphviz } from "./renderer/graphviz";
import { renderJson } from "./renderer/json";
import { Command, InvalidArgumentError } from "commander";
import { analyze } from "./main";

const pjson = require("./package.json");

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
  .requiredOption(
    "-o, --output-format <format>",
    "output format: graphviz, dot, json",
    "graphviz"
  )
  .argument(
    "<serviceDirectories...>",
    "directory containing service files: *.Service.ts"
  )
  .action((serviceDirectories: string[], options: Record<string, any>) => {
    console.log("serviceDirectories", serviceDirectories);
    console.log("options", options);

    const renderer = (() => {
      switch (options.outputFormat) {
        case "graphviz":
          return renderGraphviz;
        case "dot":
          return renderDotFile;
        case "json":
          return renderJson;
        default:
          throw new InvalidArgumentError(
            `Unknown format: ${options.outputFormat}`
          );
      }
    })();
    analyze(serviceDirectories, renderer);
  });

program.parse();
