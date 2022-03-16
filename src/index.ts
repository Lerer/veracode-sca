//import {getOctokit,context} from '@actions/github';
import { readFileSync, existsSync} from 'fs';
import { Options } from './options';
import { LibraryIssuesCollection, ReportedLibraryIssue, SCALibrary, SCAVulnerability, SrcClrJson } from './srcclr.d';
import { Label, SEVERITY_LABELS, VERACODE_LABEL } from './labels';
import { GithubHandler } from './githubRequestHandler';
import * as core from '@actions/core'


export const SCA_OUTPUT_FILE = 'scaResults.json';

const librariesWithIssues:any = {};

let githubHandler: GithubHandler;

export async function run(options:Options, msgFunc: (msg: string) => void) {

    if (!existsSync(SCA_OUTPUT_FILE)) {
        core.setFailed('SCA Output file was not found - cannot proceed with creating issues.\nPlease check prior execution errors.');
        return;
    }

    const scaResultsTxt = readFileSync(SCA_OUTPUT_FILE);  

    const scaResJson: SrcClrJson = JSON.parse(scaResultsTxt.toString('utf-8'));

    const vulnerabilities = scaResJson.records[0].vulnerabilities;
    const libraries = scaResJson.records[0].libraries;

    vulnerabilities
        .filter((vul:any) => vul.cvssScore>=options.minCVSSForIssue)
        .forEach((vulr) => {
            //console.log('-------   in each   ------');
            const libref = vulr.libraries[0]._links.ref;
            const libId = libref.split('/')[4];
            const lib:SCALibrary = libraries[libId];
            const details = createIssueDetails(vulr,lib);
            addIssueToLibrary(libId,lib,details);
        });

    console.log(JSON.stringify(librariesWithIssues));

    githubHandler = new GithubHandler(options.github_token);

    if (Object.keys(librariesWithIssues).length>0) {
        await verifyLabels();
        await syncExistingOpenIssues();

        // check for failing the step
        const failingVul = vulnerabilities.filter(vul => vul.cvssScore>=options.failOnCVSS);
        if (failingVul.length>0) {
            core.setFailed(`Found Vulnerability with CVSS equal or greater than ${options.failOnCVSS}`);
        } else {
            msgFunc(`No 3rd party library found with Vulnerability of CVSS equal or greater than ${options.failOnCVSS}`);
        }
    }

    msgFunc(`Scan finished.\nFull Report Details:   ${scaResJson.records[0].metadata.report}`);
}

const addIssueToLibrary = (libId:string,lib:SCALibrary,details:ReportedLibraryIssue) => {
    let libWithIssues: LibraryIssuesCollection = librariesWithIssues[libId] || {lib,issues:[]};
    libWithIssues.issues.push(details);
    librariesWithIssues[libId] = libWithIssues;
}

const syncExistingOpenIssues = async () => {
    const existingOpenIssues = await githubHandler.listExistingOpenIssues();
    console.log(JSON.stringify(existingOpenIssues));
    for (var library of Object.values(librariesWithIssues)) {
        (library as LibraryIssuesCollection).issues.forEach(async element => {
            const foundIssueTitle = element.title;
            console.log(`Checking for issue title [${foundIssueTitle}]`);
            const inExsiting = existingOpenIssues.filter(openIssue => {
                return openIssue.node.title === foundIssueTitle;
            })
            if (inExsiting.length===0) {
                // issue not yet reported
                // const ghResponse = await githubHandler.createIssue(element);
                console.log(`Created issue: ${element.title}`);
            } else {
                console.log(`Skipping existing Issue : ${element.title}`);
            }
        });
    }
}

const createIssueDetails = (vuln: SCAVulnerability,lib: SCALibrary): ReportedLibraryIssue => {
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
        "  \nVulnerability description | "+(vuln.overview ? vuln.overview.trim() : "")+
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

export async function runText(options:Options,output:string, msgFunc: (msg: string) => void) {
    const vulnerabilityLinePattern: RegExp = /^\d+\s+Vulnerability\s+([\d\.]+)\s+.+/; 
    const splitLines:string[] = output.split(/\r?\n/);
    let failed: boolean = false;
    for (var line of splitLines) {
        if (vulnerabilityLinePattern.test(line)) {
            const match = line.match(vulnerabilityLinePattern);
            if (match) {
                const cvss = parseFloat(match[1]);
                if (cvss>=options.failOnCVSS) {
                    failed = true;
                }
            }
        }
    }

    if (failed) {
        core.setFailed(`Found Vulnerability with CVSS equal or greater than ${options.failOnCVSS}`);
    } else {
        msgFunc(`No 3rd party library found with Vulnerability of CVSS equal or greater than ${options.failOnCVSS}`);
    }
}