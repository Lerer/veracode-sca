#!/usr/bin/env node
// import exec method from child_process module
import { execSync } from "child_process";

import * as core from '@actions/core'
import { Options } from "./options";
import { SCA_OUTPUT_FILE,run, runText } from "./index";

try {
    const o: Options = {
        quick: core.getBooleanInput('quick') || false,
        updateAdvisor: core.getBooleanInput('update_advisor') || false,
        minCVSS: parseFloat(core.getInput('min-cvss-for-issue')) || 0,
        url: core.getInput('url',{trimWhitespace:true}),
        github_token: core.getInput('github_token',{required:true}),
        createIssues: core.getBooleanInput('create-issues') || false,
        failOnCVSS: parseFloat(core.getInput('fail-on-cvss')) || 10
    }
    core.info('Start command');
    let extraCommands: string = '';
    if (o.url.length>0) {
        extraCommands = `--url ${o.url} `;
    } 

    const commandOutput = o.createIssues ? `--json=${SCA_OUTPUT_FILE}` : ''; 
    extraCommands = `${extraCommands}${o.quick? '--quick':''} ${o.updateAdvisor? '--update-advisor':''}`;
    const command = `curl -sSL https://download.sourceclear.com/ci.sh | sh -s -- scan ${extraCommands} ${commandOutput}`;
    core.info(command);
    const stdout = execSync(command, {
        env: {
            SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
        },

    });
    
    if (o.createIssues) {
        run(o,core.info);
    } else {
        const output = stdout.toString('utf-8');
        core.info(output);
        runText(o,output,core.info);
    }
    
    core.info('Finish command');
} catch (error:any) {
    core.setFailed(error.message);
}