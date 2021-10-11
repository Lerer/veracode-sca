#!/usr/bin/env node
// import exec method from child_process module
import { execSync } from "child_process";

import * as core from '@actions/core'

try {
    core.info('Start command');
    const stdout = execSync("curl -sSL https://download.sourceclear.com/install | sh -s scan . --update-advisor --json scaResults.json", {
        env: {
            SRCCLR_API_TOKEN: process.env.SRCCLR_API_TOKEN,
        }
    });

    core.info(stdout.toString('utf-8'));
    core.info('Finish command');

} catch (error:any) {
    core.setFailed(error.message);
}