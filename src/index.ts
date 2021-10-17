//import {getOctokit,context} from '@actions/github';
import {readFileSync} from 'fs';
import { Options } from './options';
import { LibraryIssuesCollection, ReportedLibraryIssue, SCALibrary, SCAVulnerability, SrcClrJson } from './srcclr';
import { Label, SEVERITY_LABELS, VERACODE_LABEL } from './labels';
import { GithubHandler } from './githubRequestHandler';

export const SCA_OUTPUT_FILE = 'scaResults.json';

const librariesWithIssues:any = {};

let githubHandler: GithubHandler;

export async function run(options:Options, msgFunc: (msg: string) => void) {
    const scaResultsTxt = readFileSync(SCA_OUTPUT_FILE);  

    const scaResJson: SrcClrJson = JSON.parse(scaResultsTxt.toString('utf-8'));

    const vulnerabilities = scaResJson.records[0].vulnerabilities;
    const libraries = scaResJson.records[0].libraries;

    vulnerabilities
        .filter((vul:any) => vul.cvssScore>=options.minCVSS)
        .forEach((vulr) => {
            console.log('-------   in each   ------');
            const libref = vulr.libraries[0]._links.ref;
            const libId = libref.split('/')[4];
            const lib:SCALibrary = libraries[libId];
            const details = createIssueDetails(vulr,lib);
            console.log(details);
            addIssueToLibrary(libId,lib,details);
        });

    githubHandler = new GithubHandler(options.github_token);

    await verifyLabels();
    console.log(JSON.stringify(librariesWithIssues,undefined,2));
    syncExistingOpenIssues();


}

const addIssueToLibrary = (libId:string,lib:SCALibrary,details:ReportedLibraryIssue) => {
    let libWithIssues: LibraryIssuesCollection = librariesWithIssues[libId] || {lib,issues:[]};
    libWithIssues.issues.push(details);
    librariesWithIssues[libId] = libWithIssues;
}

const syncExistingOpenIssues = async () => {
    const existingOpenIssues = await githubHandler.listExistingOpenIssues();
    for (var library of Object.values(librariesWithIssues)) {
        (library as LibraryIssuesCollection).issues.forEach(async element => {
            const foundIssueTitle = element.title;
            const inExsiting = existingOpenIssues.filter(openIssue => {
                return openIssue.node.title === foundIssueTitle;
            })
            if (inExsiting.length===0) {
                // issue not yet reported
                const ghResponse = await githubHandler.createIssue(element);
                console.log(`Created issue: ${element.title}`);
            } else {
                console.log(`Skipping existing Issue : ${element.title}`);
            }
        });
    }
}

const createIssueDetails = (vuln: SCAVulnerability,lib: SCALibrary): ReportedLibraryIssue => {
    console.log(lib,vuln,vuln.libraries[0]);
    const vulnLibDetails = vuln.libraries[0].details[0];
    const sevLabel = getSeverityName(vuln.cvssScore);
    const myCVE = vuln.cve || '0000-0000';
    const versionsFound = lib.versions.map(version => version.version);
    var title = "CVE: "+myCVE+" found in "+lib.name+" - Version: "+versionsFound+" ["+vuln.language+"]";
    var labels: Array<Label> = [VERACODE_LABEL,sevLabel];
    var description = "Veracode Software Composition Analysis"+
        "  \n===============================\n"+
        "  \n Attribute | Details"+
        "  \n| --- | --- |"+
        "  \nLibrary | "+lib.name+
        "  \nDescription | "+lib.description+
        "  \nLanguage | "+vuln.language+
        "  \nVulnerability | "+vuln.title+
        "  \nVulnerability description | "+vuln.overview+
        "  \nCVE | "+vuln.cve+
        "  \nCVSS score | "+vuln.cvssScore+
        "  \nVulnerability present in version/s | "+vulnLibDetails.versionRange+
        "  \nFound library version/s | "+versionsFound+
        "  \nVulnerability fixed in version | "+vulnLibDetails.updateToVersion+
        "  \nLibrary latest version | "+lib.latestRelease+
        "  \nFix | "+vulnLibDetails.fixText+
        "  \n"+
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
    let label = SEVERITY_LABELS.Unknown;
    if (weight == 0)
        label = SEVERITY_LABELS.Informational;
    else if (weight >= 0.1 && weight < 1.9)
        label =  SEVERITY_LABELS['Very Low'];
    else if (weight >= 2.0 && weight < 3.9)
        label = SEVERITY_LABELS.Low;
    else if (weight >= 4.0 && weight < 5.9)
        label = SEVERITY_LABELS.Medium;
    else if (weight >= 6.0 && weight < 7.9)
        label = SEVERITY_LABELS.High;
    else if (weight >= 8.0)
        label = SEVERITY_LABELS['Very High'];

    return label;
}

const verifyLabels = async () => {
    const baseLabel = await githubHandler.getVeracodeLabel();
    
    if (!baseLabel || !baseLabel.data) {
        await githubHandler.createVeracodeLabels();
    }
}

