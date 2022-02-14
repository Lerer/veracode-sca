#!/usr/bin/env node
import { execSync, spawn } from "child_process";

import * as core from '@actions/core'
import { Options } from "./options";
import { SCA_OUTPUT_FILE,run, runText } from "./index";

const cleanCollectors = (inputArr:Array<string>) => {
    let allowed:Array<string> = [];
    for (var input of inputArr) {
        if (input && collectors.indexOf(input.trim().toLowerCase())>-1) {
            allowed.push(input.trim().toLowerCase());
        }
    }
    return allowed;
}

export function runAction (options: Options)  {
    try {
  
        core.info('Start command');
        let extraCommands: string = '';
        if (options.url.length>0) {
            extraCommands = `--url ${options.url} `;
        } else {
            extraCommands = `${options.path} `;
        }

        const skip = cleanCollectors(options["skip-collectors"]);
        let skipCollectorsAttr = '';
        if (skip.length>0) {
            skipCollectorsAttr = `--skip-collectors ${skip.toString()} `;
        }


        const commandOutput = options.createIssues ? `--json=${SCA_OUTPUT_FILE}` : ''; 
        extraCommands = `${options.recursive?'--recursive ':''}${options.quick? '--quick ':''}${options.allowDirty? '--allow-dirty ':''}${extraCommands}${options.updateAdvisor? '--update-advisor ':''}${options.debug? '--debug ':''}${skipCollectorsAttr}`;
        const command = `curl -sSL https://download.sourceclear.com/ci.sh | sh -s -- scan ${extraCommands} ${commandOutput}`;
        core.info(command);

        const execution = spawn('sh',['-c',command],{
            env: {
                SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
            },
            stdio:"inherit"
        });
        
        execution.on('error', (data) => {
            core.error(data);
        })
        
        let output: string = '';
        execution.stdout!.on('data', (data) => {
            //core.info(data.toString());
            output = `${output}${data}`;
        });
        
        execution.stderr!.on('data', (data) => {
            core.error(`stderr: ${data}`);
        });
         
        execution.on('close', (code) => {
            core.info(output);
            core.info(`Scan finished with exit code:  ${code}`);
            if (options.createIssues) {
                run(options,core.info);
            } else {
                runText(options,output,core.info);
            }
            core.info('Finish command');
        });
                            
        // const stdout = execSync(command, {
        //     env: {
        //         SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
        //     },
        //     maxBuffer: 20 * 1024 * 1024
        // });

        // if (options.createIssues) {
        //     run(options,core.info);
        // } else {
        //     const output = stdout.toString('utf-8');
        //     core.info(output);
        //     runText(options,output,core.info);
        // }

        //core.info('Finish command');
        
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed("unknown error");
            console.log(error);
        }
    }
}


const collectors = [
    "maven"	,
"gradle",
"ant",
"jar",
"sbt",	
"glide"	,
"go get",
"go mod",
"godep",
"dep",
"govendor",
"trash",
"pip"	,
"pipenv",
"bower"	,
"yarn",
"npm",
"cocoapods",	
"gem",
"composer"	,
"makefile"	,
"dll",
"msbuilddotnet",
]

