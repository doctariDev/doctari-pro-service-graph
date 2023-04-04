const pjson = require("./package.json");
const { Command } = require("commander");
const { analyze } = require("./main");

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
