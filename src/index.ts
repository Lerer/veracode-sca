import {getOctokit,context} from '@actions/github';
import {readFileSync} from 'fs';
import { Options } from './options';
import { SCALibrary, SCAVulnerability, SrcClrJson } from './srcclr';

export const SCA_OUTPUT_FILE = 'scaResults.json';

const librariesWithIssues:any = {};

export async function run(options:Options, msgFunc: (msg: string) => void) {
    const scaResultsTxt = readFileSync(SCA_OUTPUT_FILE);  

    const scaResJson: SrcClrJson = JSON.parse(scaResultsTxt.toString('utf-8'));

    const vulnerabilities = scaResJson.records[0].vulnerabilities;
    const libraries = scaResJson.records[0].libraries;

    vulnerabilities
        .filter((vul:any) => vul.cvssScore>=options.minCVSS)
        .forEach((vulr) => {
            console.log('in each');
            const libref = vulr.libraries[0]._links.ref;
            const libId = libref.split('/')[4];
            //console.log(`Lib ID: ${libId}`);
            const lib:SCALibrary = libraries[libId];
            //console.log(lib);
            const details = createIssueDetails(vulr,lib);
            console.log(details);
            addIssueToLibrary(libId,lib,details);
        });

    console.log('====================');
    console.log(librariesWithIssues);

    const client = getOctokit(options.github_token);
    const exampleIssue = librariesWithIssues[0].issues[0];
    const ghResponse = await client.rest.issues.create({
        owner:context.repo.owner,
        repo:context.repo.repo,
        title:exampleIssue.title,
        body:exampleIssue.description,
        labels: exampleIssue.labels.split(',')
    })

    console.log(ghResponse);
}

const addIssueToLibrary = (libId:string,lib:SCALibrary,details:any) => {
    let libWithIssues = librariesWithIssues[libId] || {lib,issues:[]};
    libWithIssues.issues.push(details);
    librariesWithIssues[libId] = libWithIssues;
}

const createIssueDetails = (vuln: SCAVulnerability,lib: SCALibrary) => {
    console.log(lib,vuln,vuln.libraries[0]);
    const vulnLibDetails = vuln.libraries[0].details[0];
    const sevLabel = getSeverityName(vuln.cvssScore);
    const myCVE = vuln.cve || '0000-0000';
    var title = "CVE: "+myCVE+" found in "+lib.name+" - Version: "+vuln.libraries[0].details[0].versionRange+" ["+vuln.language+"]";
    var labels = "Dependency Scanning,"+myCVE+","+sevLabel;
    var description = "Veracode Software Composition Analysis  \n===============================\n  \nLanguage: "+
        vuln.language+"  \nLibrary: "+lib.name+"  \nCVE: "+vuln.cve+"  \nPresent in version/s: "+vulnLibDetails.versionRange+
        "  \nVulnerability fix version: "+vulnLibDetails.updateToVersion+
        "  \nLibrary latest version: "+lib.latestRelease+
        "  \nDescription: "+lib.description+"  \n"+vuln.overview+"  \nFix: "+vulnLibDetails.fixText+
        "  \nLinks:  \n"+lib.versions[0]._links.html+"  \n"+vuln._links.html+"  \n"+vulnLibDetails.patch;

    return {
        title,description,labels
    };
}

const getSeverityName = (cvss: number):string => {
    var weight = Math.floor(cvss);
    let severityLabel = 'Unknown';
    if (weight == 0)
        severityLabel = 'Informational'
    else if (weight >= 0.1 && weight < 1.9)
        severityLabel = 'Very Low'
    else if (weight >= 2.0 && weight < 3.9)
        severityLabel = 'Low'
    else if (weight >= 4.0 && weight < 5.9)
        severityLabel = 'Medium'
    else if (weight >= 6.0 && weight < 7.9)
        severityLabel = 'High'
    else if (weight >= 8.0)
        severityLabel = 'Very High'

    return severityLabel;
}