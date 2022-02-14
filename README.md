# Veracode Software Composition Analysis
Veracode Software Composition Analysis Scaning as a GitHub Action with the following actions:
- Run the Veracode SCA sca similar as the script in textual output mode
- Automatically create issues from Vulnerabilities based on given CVSS threshold 
- Fail The action step based on given CVSS threshold
- Ability to run the scan on a remote repository
- Ability to run the scan with the `--quick` flag 

## Inputs
> :exclamation: You will need to provide `SRCCLR_API_TOKEN` as environment variables. (See examples below)

### `github_token`

**Required** - The authorization token to allow the action to create issues.

You may be able to simply can use the `${{ secrets.GITHUB_TOKEN }}` as a default option - see __[more details](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)__

Otherwise, you may be able create and assign __as secret__ a [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and assign it with the required permissions (`repo` scope).

### `min-cvss-for-issue`
**Optional** - The minimum CVSS for creating an issue from a found vulnerability

Default Value: __0__

### `fail-on-cvss`
**Optional** - The maximum allowed cvss in found vulnerabilities to pass the step

Default Value: __10__
> The step will not fail unless you explicitly specify a lower CVSS value 

Value: __0__

### `create-issues`
**Optional** - whether to create issues from found vulnerabilities

This is a boolean value attirbute

Default Value: __false__


### `url`
**Optional** - specify a remote repository URL for scanning. It will not scan the current repository in which the workflow is running

### `path`
__Optional__ - a relative path for the scan to start.
This attribute is useful in scenarios where the actual code is not in the root of the repository. An example would be mono repo where the repository is home for multiple projects

Default Value: __`.`__ (repository root folder)

> :exclamation: This attribute is ignored if a __`url`__ attribute is also in use

### `quick`
__Optional__ - run the Veracode SCA scan with the `--quick` 

Default Value: __false__

### `debug`
__Optional__ - run the Veracode SCA scan with `--debug` 

Default Value: __false__

### `skip-collectors`
__Optional__ - run the Veracode SCA scan with the `--skip-collectors` attribute with comma sporated values. 
The available values can be found here: [Scan directive](https://docs.veracode.com/r/c_sc_scan_directives) (scroll down to the `skip_collectors` directive).
Default Value: __None__

### `allow-dirty`
__Optional__ - run the Veracode SCA scan with `--allow-dirty` 

Default Value: __false__

## Examples

### Scan a remote repository with textual output

```yaml
on: 
  schedule:
    - cron: 15 14 * * 6
  workflow_dispatch:

jobs:
  veracode-sca-task:
    runs-on: ubuntu-latest
    name: Scan remote repository for Issues

    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Veracode SCA
        env:
          SRCCLR_API_TOKEN: ${{ secrets.SRCCLR_API_TOKEN }}
        uses: lerer/veracode-sca@v1.0.4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          url: "https://github.com/Lerer/veracode-pipeline-scan-results-to-sarif"
          create-issues: false 
          fail-on-cvss: 1     
```

### Scan the repository   

Scan can the local repository. Fail the step and create issues if found vulnerability with CVSS greater than 1


```yaml
on: 
  push:
    paths-ignore:
      - "README.md"
  schedule:
    - cron: 15 14 * * 6

jobs:
  veracode-sca-task:
    runs-on: ubuntu-latest
    name: Scan repository for Issues

    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Run Veracode SCA
        env:
          SRCCLR_API_TOKEN: ${{ secrets.SRCCLR_API_TOKEN }}
        uses: lerer/veracode-sca@v1.0.4

        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          quick: true
          create-issues: true 
          fail-on-cvss: 1
          min-cvss-for-issue: 1
```
## User Interface

### Issues List
<p align="center">
  <img src="/media/issues-list.png" width="700px" alt="Issues List"/>
</p>

### Individual Issue
<p align="center">
  <img src="/media/issue.png" width="700px" alt="Individual issues ticket content"/>
</p>
