export interface Label {
    name:string,
    color:string,
    description:string
}

export const LABELS = {
    'severities':{
        "Very High": {
            'name': 'Severity: Very High',
            'color': 'A90533',
            'description': 'Very High severity',
        },
        High: {
            'name': 'Severity: High',
            'color': 'DD3B35',
            'description': 'High severity'
        },
        Medium: {
            'name': 'Severity: Medium',
            'color': 'FF7D00',
            'description': 'Medium severity'
        },
        Low: {
            'name': 'Severity: Low',
            'color': 'FFBE00',
            'description': 'Low severity'
        },
        "Very Low":{
            'name': 'Severity: Very Low',
            'color': '33ADD2',
            'description': 'Very Low severity',
        },
        Informational: {
            'name': 'Severity: Informational',
            'color': '0270D3',
            'description': 'Informational severity',
        },
        Unknown: {
            'name': 'Severity: Unknown',
            'color': '0270D3',
            'description': 'Unknown severity',
        }
    },
    'veracode' : {
        'name': 'Veracode Dependency Scanning',
        'color': '0AA2DC',
        'description': 'A Veracode identified vulnerability'
    }
};