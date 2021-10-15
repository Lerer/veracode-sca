import {getOctokit,context} from '@actions/github';
import { VERACODE_LABEL,SEVERITY_LABELS } from './labels';

export class GithubHandler {

    private client;

    constructor(private token:string) {
        this.client = getOctokit(token); 
    }

    public async getVeracodeLabel ()  {
        console.log('getVeracodeLabel - START');
        let veracodeLabel:any = {};
        try {
            
            veracodeLabel = await this.client.rest
                .issues.getLabel({
                    owner:context.repo.owner,
                    repo:context.repo.repo,
                    name:VERACODE_LABEL.name
            });
            console.log('Veracode Labels already exist');
        } catch (e:any) {
            if (e.status===404) {
                console.log('Veracode Labels does not exist');
            } else {
                console.log('=======================   ERROR   ===============================');
                console.log(e);
            }
        }
        console.log('getVeracodeLabel - END');
        return veracodeLabel;
    }

    public async createVeracodeLabels() {
        console.log('createVeracodeLabels - END');
        try {
            // Creating the severity labels
            for (var label of Object.values(SEVERITY_LABELS)) {
                //let label = SEVERITY_LABELS[lebelKey];
                await this.client.rest.issues.createLabel({
                    owner:context.repo.owner,
                    repo:context.repo.repo,
                    name: label.name,
                    color: label.color,
                    description: label.description
                });
            }
            // Creating the base label
            await this.client.rest.issues.createLabel({
                owner:context.repo.owner,
                repo:context.repo.repo,
                name: VERACODE_LABEL.name,
                color: VERACODE_LABEL.color,
                description: VERACODE_LABEL.description
            });
    
        } catch (e) {
            console.log('=======================   ERROR   ===============================');
            console.log(e);
        }
        console.log('createVeracodeLabels - END');
    }
}

