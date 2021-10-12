import core from '@actions/core';
import {readFileSync} from 'fs';
import { Options } from './options';
import { SCALibrary, SCAVulnerability, SrcClrJson } from './srcclr';

export const SCA_OUTPUT_FILE = 'scaResults.json';

export function run(options:Options, msgFunc: (msg: string) => void) {
    const scaResultsTxt = readFileSync(SCA_OUTPUT_FILE);  

    const scaResJson: SrcClrJson = JSON.parse(scaResultsTxt.toString('utf-8'));

    const vulnerabilities = scaResJson.records[0].vulnerabilities;
    const libraries = scaResJson.records[0].libraries;

    let outputLibraries = {};

    vulnerabilities
        .filter((vul:any) => vul.severity>=options.minCVSS)
        .forEach((vulr:any) => {
            console.log('in each');
            const libref = vulr.libraries[0]._links.ref;
            const libId = libref.split('/')[4];
            console.log(`Lib ID: ${libId}`);
            const lib = libraries[libId];
            console.log(lib);
            const details = createIssueDetails(vulr,lib);
            console.log(details);
        });

    msgFunc(JSON.stringify(vulnerabilities));
}

const createIssueDetails = (vuln: SCAVulnerability,lib: SCALibrary) => {
    return {
        vuln,
        lib
    };
}
