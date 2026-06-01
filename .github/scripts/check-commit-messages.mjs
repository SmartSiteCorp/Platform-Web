import { execFileSync } from "node:child_process";

const commitRange = process.env.COMMIT_RANGE;
const commitMessagePattern =
  /^(feat|fix|docs|style|refactor|test|chore|ci|build|perf)(\([a-z0-9-]+\))?: .{1,100}$/;
const ignoredMessagePattern = /^(Merge |Revert ")/;

if (!commitRange) {
  throw new Error("COMMIT_RANGE is required.");
}

const rawSubjects = execFileSync("git", ["log", "--format=%s", commitRange], {
  encoding: "utf8",
});

const invalidSubjects = rawSubjects
  .split("\n")
  .map((subject) => subject.trim())
  .filter(Boolean)
  .filter((subject) => !ignoredMessagePattern.test(subject))
  .filter((subject) => !commitMessagePattern.test(subject));

if (invalidSubjects.length > 0) {
  console.error("Invalid commit messages:");

  for (const subject of invalidSubjects) {
    console.error(`- ${subject}`);
  }

  console.error("Expected format: type(scope): short message");
  console.error("Allowed types: feat, fix, docs, style, refactor, test, chore, ci, build, perf");

  process.exit(1);
}
