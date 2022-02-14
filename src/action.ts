#!/usr/bin/env node

import * as core from '@actions/core'
import { Options } from "./options";
import {runAction} from './srcclr';

const options: Options = {
    quick: core.getBooleanInput('quick'),
    updateAdvisor: core.getBooleanInput('update_advisor'),
    minCVSSForIssue: parseFloat(core.getInput('min-cvss-for-issue')) || 0,
    url: core.getInput('url',{trimWhitespace:true}),
    github_token: core.getInput('github_token',{required:true}),
    createIssues: core.getBooleanInput('create-issues'),
    allowDirty: core.getBooleanInput('allow-dirty'),
    failOnCVSS: parseFloat(core.getInput('fail-on-cvss')) || 10,
    path: core.getInput('path',{trimWhitespace: true}) || '.',
    debug: core.getBooleanInput('debug'),
    "skip-collectors": core.getInput('skip-collectors').split(',')
}

runAction(options);