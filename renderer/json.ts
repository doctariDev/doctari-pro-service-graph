import { Graph } from "../graph";
import fs from "fs";

export function renderJson(graph: Graph): void {
  fs.writeFileSync("services.json", JSON.stringify(graph, null, 2));

  console.info("Graph rendered to services.json");
}
