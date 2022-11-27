//import {getOctokit,context} from '@actions/github';
import { readFileSync, existsSync} from 'fs';
import { Options } from './options';
import { LibraryIssuesCollection, ReportedLibraryIssue, SCALibrary, SCAVulnerability, SrcClrJson } from './srcclr.d';
import { Label, SEVERITY_LABELS, VERACODE_LABEL } from './labels';
import { GithubHandler } from './githubRequestHandler';
import * as core from '@actions/core'
import { exit } from 'process';


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
        //.filter((vul:any) => vul.cvssScore>=options.minCVSSForIssue)
        .forEach((vulr) => {
            //console.log('-------   in each   ------');
            const libref = vulr.libraries[0]._links.ref;
            //core.info('libref: '+libref)
            const libId = libref.split('/')[4];
            //core.info('libId: '+libId)
            const lib:SCALibrary = libraries[libId];
            //core.info('lib: '+JSON.stringify(lib))
            const details = createIssueDetails(vulr,lib);
            addIssueToLibrary(libId,lib,details);
        });

    githubHandler = new GithubHandler(options.github_token);

    if (Object.keys(librariesWithIssues).length>0) {
        await verifyLabels();
        await syncExistingOpenIssues();

        // check for failing the step
        /*
        const failingVul = vulnerabilities.filter(vul => vul.cvssScore>=options.failOnCVSS);
        if (failingVul.length>0) {
            core.setFailed(`Found Vulnerability with CVSS equal or greater than ${options.failOnCVSS}`);
        } else {
            msgFunc(`No 3rd party library found with Vulnerability of CVSS equal or greater than ${options.failOnCVSS}`);
        }
        */
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

    //core.info(JSON.stringify(librariesWithIssues))

    const lenghtOfLibs = Object.keys(librariesWithIssues).length
    core.info('Libraries with issues found: '+lenghtOfLibs)

    let createIssue
    let openIssueTitle
    let openIssueNumber

    for (let i = 1; i <= lenghtOfLibs; i++){
        core.info('Library '+i+' - '+librariesWithIssues[i]['lib']['name'])

        var issueLength = Object.keys(librariesWithIssues[i]['issues']).length
        core.info(issueLength+' Issues found on Library')

        for ( let j=0; j< issueLength; j++ ){
            if (librariesWithIssues[i] === undefined ){
                continue
            }
                else{
                var libraryTitle = librariesWithIssues[i]['issues'][j]['title']
                core.info('Isuse Title '+j+': '+libraryTitle)
                var openIssueLenght = existingOpenIssues.length
                core.info("Open issues found: "+openIssueLenght)
                for (let k = 0; k < openIssueLenght; k++){
                    openIssueTitle = existingOpenIssues[k]['node']['title']
                    openIssueNumber = existingOpenIssues[k]['node']['number']
                    //core.info('Open Isssue: '+openIssueTitle+' --- '+openIssueNumber)

                    if ( libraryTitle == openIssueTitle ){
                        core.info('Issue \n'+libraryTitle+'\n'+openIssueTitle+'\nalready exists - skipping')
                        createIssue = false
                        break
                    }
                }
                if ( createIssue == false ){
                    core.info('Issue already exists - skipping  --- '+libraryTitle+' ---- '+openIssueTitle)
                }
                else {
                    core.info('Issue needs to be created. --- '+libraryTitle)
                }
            }
        }
    }



/*
    for (var library of Object.values(librariesWithIssues)) {
        (library as LibraryIssuesCollection).issues.forEach(async element => {
            const foundIssueTitle = element.title;
            core.info(`Checking for issue title [${foundIssueTitle}]`);
             const inExsiting = existingOpenIssues.filter(openIssue => {
                return openIssue.node.title === foundIssueTitle
            })


            var openIssues = JSON.parse(existingOpenIssues);

            if (existingOpenIssues == foundIssueTitle ){
                console.log(`Skipping existing Issue : ${element.title}`);
                //existing issue number
                core.info("Issue number: "+existingOpenIssues.)

            }
            else {
                // issue not yet reported
                const ghResponse = await githubHandler.createIssue(element);
                console.log(`Created issue: ${element.title}`);
                core.info("Issue generation response: "+JSON.stringify(ghResponse))

            }



            if (inExsiting.length===0) {
                
            } else {
                
            }

            //Pull request decoration
            core.info('check if we run on a pull request')
            let pullRequest = process.env.GITHUB_REF
            let isPR:any = pullRequest?.indexOf("pull")
            
            if ( isPR >= 1 ){
                core.info('We run on a PR, link issue to PR')
                core.info(JSON.stringify(element))
                //core.info(JSON.stringify(existingOpenIssues))
            
            }


        });
    }
    */
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
