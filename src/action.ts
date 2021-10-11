#!/usr/bin/env node
// import exec method from child_process module
import { execSync } from "child_process";

import * as core from '@actions/core'

try {
    
    const stdout = execSync("ls -l", {
        env: {
            SRCCLR: "12345",
        }
    });

    core.debug(stdout.toString('utf-8'));

} catch (error:any) {
    core.setFailed(error.message);
}