const fetch = require("node-fetch");
const Versioning = require('./versioning')

const API_HOST = 'api.github.com'
const GRAPHQL_URL = 'api.github.com/graphql'

class GithubApi {
  constructor(token, owner, repo) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  async postData(url = '', data = {}) {
    // Default options are marked with *
    const response = await fetch(url, {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.token}`
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *client
      body: JSON.stringify(data) // body data type must match "Content-Type" header
    });
    return await response.json(); // parses JSON response into native JavaScript objects
  }

  async getData(url = '') {
    // Default options are marked with *
    const response = await fetch(url, {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.token}`
        // 'Content-Type': 'application/x-www-form-urlencoded',
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer' // no-referrer, *client
    });
    return await response.json(); // parses JSON response into native JavaScript objects
  }

  async compareBetweenTags(tag1, tag2) {
    const data = await this.getData(`https://${API_HOST}/repos/${this.owner}/${this.repo}/compare/${tag1}...${tag2}`)
    return data.commits
  }

  async getRecentTags() {
    const data = await this.postData(`https://${GRAPHQL_URL}`,
      {
        query: `
          {
            repository(owner: "${this.owner}", name: "${this.repo}") {
              refs(refPrefix: "refs/tags/", first: 100, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
                nodes {
                  name
                  target {
                    ... on Commit {
                      oid
                      committedDate
                    }
                  }
                }
              }
            }
          }`
        }
      )
    return data
  }

  /**
   * Returns the previous dated git tag object
   * eg, if given v2020.02.18.3, would return v2020.02.13.2 or if
   * firstPatch is true, then, v2020.02.13.1
   * @param {*} currDateTag
   * @param {*} firstPatch
   */
  async getPreviousDateGitTagObject(currDateTag, firstPatch = false) {
    const data = await this.getRecentTags(this.repo)
    const versioning = new Versioning()
    const prevTag = data.data.repository.refs.nodes.find(ref => {
      if (firstPatch) {
        return (versioning.isFirstPatch(ref.name) && versioning.versionMoreRecentThan(currDateTag, ref.name))
      } else {
        return versioning.versionMoreRecentThan(currDateTag, ref.name)
      }
    })
    return prevTag
  }
}


module.exports = GithubApi
