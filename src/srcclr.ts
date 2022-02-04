#!/usr/bin/env node
import { execSync, spawn, spawnSync } from "child_process";

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
        extraCommands = `${extraCommands}${options.quick? '--quick ':''}${options.updateAdvisor? '--update-advisor ':''}${options.debug? '--debug ':''}`;
        const command = `curl -sSL https://download.sourceclear.com/ci.sh | sh -s -- scan ${extraCommands} ${commandOutput}`;
        core.info(command);

        // const stdout = execSync(command, {
        //     env: {
        //         SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
        //     },
        //     maxBuffer: 2 * 1024 * 1024
        // });

        const execution = spawn(command,[],{
            env: {
                SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
            }
        });

        execution.on('error', (data) => {
            core.error(data);
        })

        let output: string = '';
        execution.stdout.on('data', (data) => {
            core.info(data.toString());
            output = `${output}${data}`;
        });
          
        execution.stderr.on('data', (data) => {
            core.error(`stderr: ${data}`);
        });


        
        execution.on('close', (code) => {
            core.info(`Scan finished with exit code:  ${code}`);
            if (options.createIssues) {
                run(options,core.info);
            } else {
                runText(options,output,core.info);
            }
            core.info('Finish command');
        });
        
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("unknown error");
            console.log(error);
        }
    }
}

