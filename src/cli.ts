import { Command } from "commander";
import { install, remove, update, list, init } from "./commands.js";

const program = new Command();

program
  .name("spm")
  .description("Skill Package Manager for Git-based agent skills")
  .version("0.1.0")
  .option("--dry-run", "Show actions without modifying files");

program
  .command("init")
  .description("Initialize skills.json in the current project")
  .action(async () => {
    try {
      await init();
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command("install [source]")
  .alias("i")
  .description("Install skills from skills.json or a specific source")
  .action(async (source: string | undefined, cmd: Command) => {
    try {
      const opts = cmd.parent?.opts() ?? {};
      await install(source, { dryRun: !!opts.dryRun });
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command("remove <name>")
  .alias("rm")
  .description("Remove an installed skill")
  .action(async (name: string, cmd: Command) => {
    try {
      const opts = cmd.parent?.opts() ?? {};
      await remove(name, { dryRun: !!opts.dryRun });
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command("update <name>")
  .alias("up")
  .description("Update an installed skill to the latest commit")
  .action(async (name: string, cmd: Command) => {
    try {
      const opts = cmd.parent?.opts() ?? {};
      await update(name, { dryRun: !!opts.dryRun });
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exitCode = 1;
    }
  });

program
  .command("list")
  .alias("ls")
  .description("List all installed skills")
  .action(async () => {
    try {
      await list();
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exitCode = 1;
    }
  });

program.showHelpAfterError(false);
program.exitOverride();

const argv = process.argv.slice(2);
const maybeCmd = argv[0];
const knownCommands = new Set([
  "init",
  "install", "i",
  "remove", "rm",
  "update", "up",
  "list", "ls",
  "help",
]);

if (!maybeCmd || knownCommands.has(maybeCmd)) {
  try {
    program.parse(process.argv);
  } catch (err: any) {
    if (err?.code === "commander.unknownCommand") {
      // For unknown commands, show top-level help and exit with 0
      program.outputHelp();
      process.exitCode = 0;
    } else {
      console.error(err.message ?? String(err));
      process.exitCode = 1;
    }
  }
} else {
  // Unknown subcommand: show help instead of error
  program.outputHelp();
  process.exitCode = 0;
}
