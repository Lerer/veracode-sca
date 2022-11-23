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
        core.info('something went wrong 12')

        const skip = cleanCollectors(options["skip-collectors"]);
        let skipCollectorsAttr = '';
        if (skip.length>0) {
            skipCollectorsAttr = `--skip-collectors ${skip.toString()} `;
        }


        core.info('something went wrong 13')
        const commandOutput = options.createIssues ? `--json=${SCA_OUTPUT_FILE}` : ''; 
        extraCommands = `${extraCommands}${options.recursive?'--recursive ':''}${options.quick? '--quick ':''}${options.allowDirty? '--allow-dirty ':''}${options.updateAdvisor? '--update-advisor ':''}${options.debug? '--debug ':''}${skipCollectorsAttr}`;
        const command = `curl -sSL https://download.sourceclear.com/ci.sh | sh -s -- scan ${extraCommands} ${commandOutput}`;
        core.info(command);


        core.info('something went wrong 14')
        if (options.createIssues) {
            core.info('Starting the scan')
          const execution = spawn('sh',['-c',command],{
            stdio:"pipe",
            shell:true
          });
          
          core.info('something went wrong 6')
          execution.on('error', (data) => {
            core.info('something went wrong 1')
              core.error(data);
          })
                
          let output: string = '';
          core.info('something went wrong 7')
          execution.stdout!.on('data', (data) => {
            core.info('something went wrong 2')
              output = `${output}${data}`;
          });
            
          core.info('something went wrong 8')
          execution.stderr!.on('data', (data) => {
            core.info('something went wrong 3')
              core.error(`stderr: ${data}`);
          });

          core.info('something went wrong 9')
          execution.on('close', (code) => {
            core.info('something went wrong 4')
              //if (core.isDebug()) {
                core.info(output);
              //}
              core.info(`Scan finished with exit code:  ${code}`);
              run(options,core.info);
              core.info('Finish command');
         });
         core.info('something went wrong 10')
        
        } else {
            core.info('something went wrong 5')

            const execution = spawn('sh',['-c',command],{
                stdio:"pipe",
                shell:false
              });

            execution.on('error', (data) => {
                core.info('Execution on error')
                core.error(data);
            })
                    
            let output: string = '';
            execution.stdout!.on('data', (data) => {
                core.info('Execution on success')
                output = `${output}${data}`;
            });
                
            execution.stderr!.on('data', (data) => {
                core.info('Execution on stderr')
                core.error(`stderr: ${data}`);
            });
    
            execution.on('close', (code) => {
                core.info('Execution on close')
                  //if (core.isDebug()) {
                    core.info(output);
                  //}
                core.info(`Scan finished with exit code:  ${code}`);
                run(options,core.info);
                core.info('Finish command');
            });


            /* 
            const stdout = execSync(command, {
                maxBuffer: 20 * 1024 * 1024
            }); 
    
            const output = stdout.toString('utf-8');
            core.info('Creating issues failed')
            core.info(output);
            runText(options,output,core.info);
            */
        }

        core.info('Finish command');
        
    } catch (error) {
        if (error instanceof Error) {
            core.info('Running scan failed.')
            //const output = stdout.toString();
            core.info(error.message);
            //core.setFailed(error.message);
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

