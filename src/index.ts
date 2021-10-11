import core from '@actions/core';
import {readFileSync} from 'fs';
import { Options } from './options';

export const SCA_OUTPUT_FILE = 'scaResults.json';

export function run(options:Options, msgFunc: (msg: string) => void) {
    const scaResultsTxt = readFileSync(SCA_OUTPUT_FILE);  

    const scaResJson = JSON.parse(scaResultsTxt.toString('utf-8'));

    const vulnerabilities = scaResJson.records[0].vulnerabilities;

    vulnerabilities.filter((vul:any) => vul.severity>options.minCVSS);

    msgFunc(JSON.stringify(vulnerabilities));
}
