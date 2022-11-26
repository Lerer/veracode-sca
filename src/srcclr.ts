#!/usr/bin/env node
import { execSync, spawn } from "child_process";

import * as core from '@actions/core'
import { Options } from "./options";
import { SCA_OUTPUT_FILE,run, runText } from "./index";
import * as github from '@actions/github'
import { env } from "process";

const cleanCollectors = (inputArr:Array<string>) => {
    let allowed:Array<string> = [];
    for (var input of inputArr) {
        if (input && collectors.indexOf(input.trim().toLowerCase())>-1) {
            allowed.push(input.trim().toLowerCase());
        }
    }
    return allowed;
}

export async function runAction (options: Options)  {
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
        extraCommands = `${extraCommands}${options.recursive?'--recursive ':''}${options.quick? '--quick ':''}${options.allowDirty? '--allow-dirty ':''}${options.updateAdvisor? '--update-advisor ':''}${options.debug? '--debug ':''}${skipCollectorsAttr}`;
        const command = `curl -sSL https://download.sourceclear.com/ci.sh | sh -s -- scan ${extraCommands} ${commandOutput}`;
        core.info(command);


        if (options.createIssues) {
            core.info('Starting the scan')
          const execution = spawn('sh',['-c',command],{
            stdio:"pipe",
            shell:false
          });
          
          execution.on('error', (data) => {
              core.error(data);
          })
                
          let output: string = '';
          execution.stdout!.on('data', (data) => {
              output = `${output}${data}`;
          });
            
          execution.stderr!.on('data', (data) => {
              core.error(`stderr: ${data}`);
          });

          execution.on('close', (code) => {
            if (core.isDebug()){
                core.info(output);
            }
            core.info(`Scan finished with exit code:  ${code}`);
            // if scan was set to fail the pipeline should fail and show a summary of the scan results
            if ( code != null && code > 0 ){
                let summary_info = "Veraocde SCA Scan failed with exit code "+code+". Please review created issues."
                core.setFailed(summary_info)
            }
            run(options,core.info);
            core.info('Finish command');
         });

        
        } else {

            const execution = spawn('sh',['-c',command],{
                stdio:"pipe",
                shell:false
              });

            execution.on('error', (data) => {
                core.error(data);
            })
                    
            let output: string = '';
            execution.stdout!.on('data', (data) => {
                output = `${output}${data}`;
            });
                
            execution.stderr!.on('data', (data) => {
                core.error(`stderr: ${data}`);
            });
    
            execution.on('close', async (code) => {
                core.info(output);
                core.info(`Scan finished with exit code:  ${code}`);

                //Pull request decoration
                core.info('check if we run on a pull request')
                let pullRequest = process.env.GITHUB_REF
                let isPR:any = pullRequest?.indexOf("pull")

                if ( isPR >= 1 ){
                    core.info("This run is part of a PR, should add some PR comment")
            
                    const context = github.context
                    core.info('Context: '+context)
                    const repository:any = process.env.GITHUB_REPOSITORY
                    core.info('repository: '+repository)
                    const token = core.getInput("github_token:")
                    core.info('token: '+token)
                    const repo = repository.split("/");
                    core.info('repo: '+repo)
                    const commentID:any = context.payload.pull_request?.number
                    core.info('commentID: '+commentID)


                    let commentBody = '<br>![](https://www.veracode.com/themes/veracode_new/library/img/veracode-black-hires.svg)<br>'
                    commentBody += "Veraocde SCA Scan failed with exit code "+code+"\n"
                    commentBody += '===\n<details><summary>Veracode SCA Scan details</summary><p>\n---'
                    commentBody += output
                    commentBody += '---\n</p></details>\n==='
                    //core.info('Comment Body '+commentBody)

                

                    try {
                        const octokit = github.getOctokit(token);
            
                        const { data: comment } = await octokit.rest.issues.createComment({
                            owner: repo[0],
                            repo: repo[1],
                            issue_number: commentID,
                            body: commentBody,
                        });
                        core.info('Adding scan results as comment to PR #'+commentID)
                    } catch (error:any) {
                        core.info(error);
                    }

                }





                // if scan was set to fail the pipeline should fail and show a summary of the scan results
                if ( code != null && code > 0 ){
                    let summary_info = "Veraocde SCA Scan failed with exit code "+code+"\n"+output
                    core.setFailed(summary_info)
                }
                //run(options,core.info);
                core.info('Finish command');
            });
        }
        
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

