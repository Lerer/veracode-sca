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
   // try {
  
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
        extraCommands = `${extraCommands}${options.recursive?'--recursive ':''}${options.quick? '--quick ':''}${options.allowDirty? '--allow-dirty ':''}${options.updateAdvisor? '--update-advisor ':''}${options.debug? '--debug ':''}${skipCollectorsAttr}`;
        const command = `curl -sSL https://download.sourceclear.com/ci.sh | sh -s -- scan ${extraCommands} ${commandOutput}`;
        core.info(command);


        if (options.createIssues) {
            core.info('Starting the scan')
          const execution = spawn('sh',['-c',command],{
            stdio:"pipe",
            shell:true
          });
            
          execution.on('error', (data) => {
            core.info('something went wrong')
              core.error(data);
          })
                
          let output: string = '';
          execution.stdout!.on('data', (data) => {
              output = `${output}${data}`;
          });
                    
          execution.stderr!.on('data', (data) => {
            core.info('something went wrong in addition')
              core.error(`stderr: ${data}`);
          });
                        
          execution.on('close', (code) => {
              //if (core.isDebug()) {
                core.info(output);
              //}
              core.info(`Scan finished with exit code:  ${code}`);
              run(options,core.info);
              core.info('Finish command');
         });
        
        } else {
                            
            const stdout = execSync(command, {
                maxBuffer: 20 * 1024 * 1024
            });
    
            const output = stdout.toString('utf-8');
            core.info('Creating issues failed')
            core.info(output);
            runText(options,output,core.info);
        }

        core.info('Finish command');
        
/*     } catch (error) {
        if (error instanceof Error) {
            core.info('Running scan failed.')
            //const output = stdout.toString();
            core.info(error.message);
            //core.setFailed(error.message);
        } else {
            core.setFailed("unknown error");
            console.log(error);
        }
    } */
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

