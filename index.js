const JiraApi = require('./jira_api')
const GithubApi = require('./github_api')
const Versioning = require('./versioning')

require("dotenv").config()

const githubToken = process.env.GITHUB_TOKEN
const githubOwner = process.env.GITHUB_OWNER
const jiraToken = process.env.JIRA_ACCESS_TOKEN
const jiraUsername = process.env.JIRA_USERNAME
const jiraBaseUrl = process.env.JIRA_BASE_URL

/**
 * Currently assumes there's a git tag already
 * Creates the JIRA release and adds the tickets to the release
 * eg v2020.02.18.1 and adds the tickets that were between the last date release
 * eg, v2020.02.13.3 -> v2020.02.18.1
 *
 * if it's a patch version, eg v2020.02.18.3 for now it includes .1 and .2
 *
 * we may need to rethink this with hotfixes since it might look junky
 * */
async function createRelease(repo, version, hour) {
  const versioning = new Versioning()
  const jiraApi = new JiraApi(jiraUsername, jiraToken, jiraBaseUrl)
  const githubApi = new GithubApi(githubToken, githubOwner, repo)
  const prevGitTagObject = await githubApi.getPreviousDateGitTagObject(version)
  // console.log(prevGitTagObject)
  const commitsForRelease = await githubApi.compareBetweenTags(prevGitTagObject.name, version)
  //console.log('commitsForRelease')
  //console.log(commitsForRelease)

  commitsForRelease.map(commit => {
    console.log(commit.commit.message)
  })

  // Create the Release Description

  // Add the JIRA tickets to the release
  const jiraIssueKeys = getJiraIssuesFromCommits(commitsForRelease)
  console.log(jiraIssueKeys)
  const projectKeys = [...new Set( jiraIssueKeys.map(issueKey => JiraApi.getProjectKeyFromIssueKey(issueKey)))]

  console.log(projectKeys)

  // Create the JIRA Release / Versions
  await Promise.all(projectKeys.map(async (projectKey) => {
    const jiraVersion = await jiraApi.createVersion(projectKey, version, versioning.getIsoStringFromVersion(version, hour))
    console.log(jiraVersion)
  }));

  // Add the Issues to the appropriate JIRA Version
  await Promise.all(jiraIssueKeys.map(async (issueKey) => {
    await jiraApi.addIssueToVersion(issueKey, version)
  }));
}

/**
 * Returns an array of JIRA issue keys from the commits
 * @param {*} commits
 *
 * Example return ['TX-115', 'TX-130', 'TX-137', 'APP-1467', 'TX-106', 'TX-119']
 */
function getJiraIssuesFromCommits(commits) {
  const issues = commits.map(commit => { return JiraApi.getJiraIssuesFromText(commit.commit.message) }).flat()
  return [... new Set(issues)]
}

createRelease('ascent-rails', 'v2020.03.24.1', 12)

// createRelease('canonical_data_service', 'v2020.02.13.1', 15)
