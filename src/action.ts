#!/usr/bin/env node
// import exec method from child_process module
import { execSync } from "child_process";

import * as core from '@actions/core'

try {
    core.info('Start command');
    const stdout = execSync("curl -sSL https://download.sourceclear.com/ci.sh | sh -s scan . --quick --json scaResults.json", {
        env: {
            SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
        }
    });

    core.info(stdout.toString('utf-8'));
    core.info('Finish command');

    const list = execSync("ls -l");
    core.info(list.toString('utf-8'));

    const view = execSync("cat scaResults.json");
    core.info(view.toString('utf-8'));


} catch (error:any) {
    core.setFailed(error.message);
}