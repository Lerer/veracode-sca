#!/usr/bin/env node
import { execSync, spawnSync } from "child_process";

import * as core from '@actions/core'
import { Options } from "./options";
import { SCA_OUTPUT_FILE,run, runText } from "./index";

export function runAction (options: Options)  {
    try {
  
        core.info('Start command');
        let extraCommands: string = '';
        if (options.url.length>0) {
            extraCommands = `--url ${options.url} `;
        } else {
            extraCommands = `${options.path} `;
        }

        const commandOutput = options.createIssues ? `--json=${SCA_OUTPUT_FILE}` : ''; 
        extraCommands = `${extraCommands}${options.quick? '--quick':''} ${options.updateAdvisor? '--update-advisor':''}`;
        const command = `curl -sSL https://download.sourceclear.com/ci.sh | sh -s -- scan ${extraCommands} ${commandOutput}`;
        core.info(command);
        const stdout = execSync(command, {
            env: {
                SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
            },
            maxBuffer: 100 * 1024
        });
        
        if (options.createIssues) {
            run(options,core.info);
        } else {
            const output = stdout.toString('utf-8');
            core.info(output);
            runText(options,output,core.info);
        }
        
        core.info('Finish command');
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("unknown error");
            console.log(error);
        }
    }
}

