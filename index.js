#!/usr/bin/env node

const JiraApi = require("./jira_api");
const GithubApi = require("./github_api");
const Versioning = require("./versioning");

require("dotenv").config();

const githubToken = process.env.GITHUB_TOKEN;
const githubOwner = process.env.GITHUB_OWNER;
const jiraToken = process.env.JIRA_ACCESS_TOKEN;
const jiraUsername = process.env.JIRA_USERNAME;
const jiraBaseUrl = process.env.JIRA_BASE_URL;

const program = require("commander");
const { version } = require("./package.json");

program
  .version(version)
  .usage("[options] <file ...>")
  .option("-R, --repo [value]", "The repo")
  .option("-T, --tag [value]", "vyyyy.MM.dd.xx")
  .option("-P, --previous [value]", "The previous commit")
  .option("-C, --current [value]", "The current commit")
  .option("--type [value]", "The action type")
  .option("-E, --environment [value]", "The environment")
  .parse(process.argv);

/**
 * Works one of two ways
 * 1. If the repo and tag are specified, it will create a release for that tag and add the issues to the release.
 * 2. If the action and environment are specified, it will label the issues with the action value and environment value.
 *
 * node index --repo=<repo> --tag=<tag>
 *
 * or
 *
 * node index --previous=<previous> --current=<current> --action=<action> --environment=<environment>
 *
 */

async function main() {
  if (program.repo && program.tag) {
    await createRelease(program.repo, program.tag, 12);
  } else if (
    program.repo &&
    program.previous &&
    program.current &&
    program.type &&
    program.environment
  ) {
    await labelIssuesForDeploy(
      program.repo,
      program.previous,
      program.current,
      program.type,
      program.environment
    );
  } else {
    exitProgram(
      "You must specify a repo and tag OR a repo, previous commit, current commit, action type, and environment"
    );
  }
}

/**
 * Labels the issue for the deploy action.
 *
 * This function searches through the git differences between previous and current commit,
 * extracts the JIRA issue keys from the commit messages, and then labels the issue with the action and environment.
 * @param {*} repo
 * @param {*} previous
 * @param {*} current
 * @param {*} action
 * @param {*} environment
 */
async function labelIssuesForDeploy(
  repo,
  previous,
  current,
  action,
  environment
) {
  const jiraApi = new JiraApi(jiraUsername, jiraToken, jiraBaseUrl);
  const githubApi = new GithubApi(githubToken, githubOwner, repo);

  const commitsForRelease = await githubApi.compareBetweenCommits(
    previous,
    current
  );

  if (commitsForRelease) {
    commitsForRelease.map((commit) => {
      console.log(commit.commit.message);
    });

    // Add the JIRA tickets to the release
    const jiraIssueKeys = getJiraIssuesFromCommits(commitsForRelease);
    console.log(jiraIssueKeys);

    // Add the Label to the appropriate JIRA Issues
    await Promise.all(
      jiraIssueKeys.map(async (issueKey) => {
        await jiraApi.tagIssueWithEnvironmentAction(
          issueKey,
          action,
          environment
        );
      })
    );
  } else {
    console.log("no commits found");
  }
}

/**
 * Currently assumes there's a git tag already
 * Creates the JIRA release and adds the tickets to the release
 * eg v2020.02.18.1 and adds the tickets that were between the last date release
 * eg, v2020.02.13.3 -> v2020.02.18.1
 *
 * if it's a patch version, eg v2020.02.18.3 for now it includes .1 and .2
 *
 * we may need to rethink this with hotfixes since it might look junky
 *
 * @param {*} repo
 * @param {*} version
 * @param {*} hour
 */
async function createRelease(repo, version, hour) {
  const versioning = new Versioning();
  const jiraApi = new JiraApi(jiraUsername, jiraToken, jiraBaseUrl);
  const githubApi = new GithubApi(githubToken, githubOwner, repo);
  const prevGitTagObject = await githubApi.getPreviousDateGitTagObject(version);
  // console.log(prevGitTagObject)
  const commitsForRelease = await githubApi.compareBetweenTags(
    prevGitTagObject.name,
    version
  );
  //console.log('commitsForRelease')
  //console.log(commitsForRelease)

  if (commitsForRelease) {
    commitsForRelease.map((commit) => {
      console.log(commit.commit.message);
    });

    // Create the Release Description

    // Add the JIRA tickets to the release
    const jiraIssueKeys = getJiraIssuesFromCommits(commitsForRelease);
    console.log(jiraIssueKeys);
    const projectKeys = [
      ...new Set(
        jiraIssueKeys.map((issueKey) =>
          JiraApi.getProjectKeyFromIssueKey(issueKey)
        )
      ),
    ];

    console.log(projectKeys);

    // Create the JIRA Release / Versions
    await Promise.all(
      projectKeys.map(async (projectKey) => {
        const jiraVersion = await jiraApi.createVersion(
          projectKey,
          version,
          versioning.getIsoStringFromVersion(version, hour)
        );
        console.log(jiraVersion);
      })
    );

    // Add the Issues to the appropriate JIRA Version
    await Promise.all(
      jiraIssueKeys.map(async (issueKey) => {
        await jiraApi.addIssueToVersion(issueKey, version);
      })
    );
  } else {
    console.log("no commits found");
  }
}

/**
 * Returns an array of JIRA issue keys from the commits
 * @param {*} commits
 *
 * Example return ['TX-115', 'TX-130', 'TX-137', 'APP-1467', 'TX-106', 'TX-119']
 */
function getJiraIssuesFromCommits(commits) {
  const issues = commits
    .map((commit) => {
      return JiraApi.getJiraIssuesFromText(commit.commit.message);
    })
    .flat();
  return [...new Set(issues)];
}

function exitProgram(text) {
  console.log(text);
  program.outputHelp();
  process.exit(1);
}

if (!githubToken) {
  exitProgram("missing github token");
}
if (!githubOwner) {
  exitProgram("missing github owner");
}
if (!jiraToken) {
  exitProgram("missing jira token");
}
if (!jiraUsername) {
  exitProgram("missing jira username");
}
if (!jiraBaseUrl) {
  exitProgram("missing jira base url");
}

main();
