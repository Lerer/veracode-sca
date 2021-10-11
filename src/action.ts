#!/usr/bin/env node
// import exec method from child_process module
import { execSync } from "child_process";

import * as core from '@actions/core'

try {
    core.info('Start command');
    const stdout = execSync("ls -l", {
        env: {
            SRCCLR: "12345",
        }
    });

    core.info(stdout.toString('utf-8'));
    core.info('Finish command');

} catch (error:any) {
    core.setFailed(error.message);
}