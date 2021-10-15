import {getOctokit,context} from '@actions/github';
import {readFileSync} from 'fs';
import { Options } from './options';
import { SCALibrary, SCAVulnerability, SrcClrJson } from './srcclr';
import { LABELS,Label } from './githubLabels';

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
        labels: exampleIssue.labels
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
    const versionsFound = lib.versions.map(version => version.version);
    var title = "CVE: "+myCVE+" found in "+lib.name+" - Version: "+versionsFound+" ["+vuln.language+"]";
    var labels: Array<Label> = [LABELS.veracode,sevLabel,{name:myCVE,color:LABELS.veracode.color,description:"CVE "+myCVE}];
    var description = "Veracode Software Composition Analysis"+
        "  \n===============================\n"+
        "  \nLibrary: "+lib.name+
        "  \nDescription: "+lib.description+
        "  \nLanguage: "+vuln.language+
        "  \nVulnerability: "+vuln.title+
        "  \nVulnerability description: "+vuln.overview+
        "  \nCVE: "+vuln.cve+
        "  \nCVSS score: "+vuln.cvssScore+
        "  \nVulnerability present in version/s: "+vulnLibDetails.versionRange+
        "  \nFound library version/s: "+versionsFound+
        "  \nVulnerability fixed in version: "+vulnLibDetails.updateToVersion+
        "  \nLibrary latest version: "+lib.latestRelease+
        "  \nFix: "+vulnLibDetails.fixText+
        "  \nLinks:"+
        "  \n- "+lib.versions[0]._links.html+
        "  \n- "+vuln._links.html+
        "  \n- Patch: "+vulnLibDetails.patch;

    return {
        title,description,labels
    };
}

const getSeverityName = (cvss: number):Label => {
    var weight = Math.floor(cvss);
    let label = LABELS.severities.Unknown;
    if (weight == 0)
        label = LABELS.severities.Informational;
    else if (weight >= 0.1 && weight < 1.9)
        label =  LABELS.severities['Very Low'];
    else if (weight >= 2.0 && weight < 3.9)
        label = LABELS.severities.Low;
    else if (weight >= 4.0 && weight < 5.9)
        label = LABELS.severities.Medium;
    else if (weight >= 6.0 && weight < 7.9)
        label = LABELS.severities.High;
    else if (weight >= 8.0)
        label = LABELS.severities['Very High'];

    return label;
}
