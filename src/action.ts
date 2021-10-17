#!/usr/bin/env node
// import exec method from child_process module
import { execSync } from "child_process";

import * as core from '@actions/core'
import { Options } from "./options";
import { SCA_OUTPUT_FILE,run } from "./index";

try {
    const o: Options = {
        quick: core.getBooleanInput('quick') || false,
        updateAdvisor: core.getBooleanInput('update_advisor') || false,
        minCVSS: parseFloat(core.getInput('min-cvss-for-issue')) || 0,
        url: core.getInput('url',{trimWhitespace:true}),
        github_token: core.getInput('github_token',{required:true})
    }
    core.info('Start command');
    let extraCommands: string = '';
    if (o.url.length>0) {
        extraCommands = `--url ${o.url} `;
    } 
    extraCommands = `${extraCommands}${o.quick? '--quick':''} ${o.updateAdvisor? '--update-advisor':''}`;
    const command = `curl -sSL https://download.sourceclear.com/ci.sh | sh -s -- scan ${extraCommands} --json=${SCA_OUTPUT_FILE}`;
    core.info(command);
    const stdout = execSync(command, {
        env: {
            SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
        },

    });
    core.info(stdout.toString('utf-8'));
    core.info('Finish command');

    run(o,core.info);

} catch (error:any) {
    core.setFailed(error.message);
}