const fetch = require("node-fetch");

class JiraApi {
  constructor(username, token, baseUrl) {
    this.username = username;
    this.token = token;
    this.baseUrl = baseUrl;
    this.projects = {}
  }

  async getData(url = '') {
    const basicAuth = Buffer.from(`${this.username}:${this.token}`).toString('base64')
    const response = await fetch(url, {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer' // no-referrer, *client
    });
    return await response.json(); // parses JSON response into native JavaScript objects
  }

  async postData(url = '', data = {}) {
    const basicAuth = Buffer.from(`${this.username}:${this.token}`).toString('base64')
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    });
    return await response; // parses JSON response into native JavaScript objects
  }

  async putData(url = '', data = {}) {
    const basicAuth = Buffer.from(`${this.username}:${this.token}`).toString('base64')
    const response = await fetch(url, {
      method: 'PUT', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    });
    return await response; // parses JSON response into native JavaScript objects
  }

  async getProjectFromJira(projectKey) {
    const data = await this.getData(`https://${this.baseUrl}/rest/api/3/project/${projectKey}`)
    this.projects[projectKey] = data
    return data
  }

  async getProject(projectKey) {
    if (this.projects[projectKey]) {
      return this.projects[projectKey]
    } else {
      return await this.getProjectFromJira(projectKey)
    }
  }

  // createVersion('APP', version, new Date(2020, 01, 17, 15).toISOString()
  async createVersion(projectKey, version, releaseDateIsoString) {
    const project = await this.getProject(projectKey)
    try {
      const data = await this.postData(`https://${this.baseUrl}/rest/api/3/version`,
      {
        archived: false,
        releaseDate: releaseDateIsoString, // "2020-02-18T00:00:00.000Z",
        name: version,
        projectId: project.id,
        released: false
      })
      console.log(`Created Version: ${version} in ${projectKey}`)
      console.log(`https://${this.baseUrl}/projects/${projectKey}?selectedItem=com.atlassian.jira.jira-projects-plugin%3Arelease-page`)

      return data.json()
    } catch (e) {
      console.log(e)
    }
  }

  async addIssueToVersion(issueKey, version) {
    try {
      const response = await this.putData(`https://${this.baseUrl}/rest/api/3/issue/${issueKey}`,
      {
        update: {
          fixVersions: [{
            add: {name: version}
        }]}
      })
      console.log(`Added Issue: ${issueKey} to ${version}`)
      return response
    } catch (e) {
      console.log(e)
    }
  }

  static getProjectKeyFromIssueKey(issueKey) {
    return issueKey.split('-')[0]
  }

  static getJiraIssuesFromText(text) {
    // const jira_matcher = /\d+-[A-Z]+(?!-?[a-zA-Z]{1,10})/g
    const jiraMatcher = /((?!([A-Z0-9a-z]{1,10})-?$)[A-Z]{1}[A-Z0-9]+-\d+)/g;
    var m = text.match(jiraMatcher);
    return [...new Set(m)] // return only unique jira issues
  }
}

module.exports = JiraApi
