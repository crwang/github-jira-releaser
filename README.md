This app creates a release / fix version in JIRA based on a date-versioned tagging in github. It parses the commits between the tag and the previous tag in github and finds jira matching issues.

Then, it adds the jira issues to the fix version in JIRA.

The release tags are in the format:

`v${datePart}.${patchVersion}`, eg

v2020.02.13.1

## Environment Values

- GITHUB_TOKEN
- GITHUB_OWNER
- JIRA_ACCESS_TOKEN
- JIRA_USERNAME
- JIRA_BASE_URL


## Running the app

```sh
node index.js -R ascent-rails -T v2020.08.20.01
```
