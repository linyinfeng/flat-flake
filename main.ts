#!/usr/bin/env bun
import { check } from "@/check.ts";
import { generateCompletions } from "@/completion.ts";
import { helpText, parseOptions, versionText } from "@/options.ts";
import { displayPaths } from "@/error.ts";

async function main(): Promise<number> {
  const options = parseOptions(process.argv.slice(2));

  switch (options.command.kind) {
    case "help":
      console.log(helpText());
      return 0;
    case "version":
      console.log(versionText());
      return 0;
    case "completion":
      process.stdout.write(generateCompletions(options.command.shell));
      return 0;
    case "check": {
      const result = await check(options.command.options);
      if (result.ok) return 0;
      if (result.notAllowed.length > 0) {
        console.error("These flake inputs are not flatten:")
        console.log(displayPaths(result.notAllowed));
      }
      if (result.unused.length > 0) {
        console.error("These flake inputs are unused:")
        console.log(displayPaths(result.unused));
      }
      return 1;
    }
  }
}

process.exit(await main());
