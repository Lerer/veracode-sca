export interface SrcClrJson {
    records: Array<SrcClrRes>
}

export interface SrcClrRes {
    libraries: any,//Array<SCALibrary>,
    vulnerabilities: Array<SCAVulnerability>
}

export interface SCALibrary {
    description: string,
    name: string,
    coordinate1: string,
    coordinate2: string,
    latestRelease: string,
    versions: Array<{
        version:string,
        sha1: string,
        _links: {html:string}
    }>
}

export interface SCAVulnerability {
    cve: string,
    title: string,
    overview: string,
    language: string,
    vulnerabilityTypes: Array<string>,
    cvssScore: number,
    libraries: Array<scaVulLib>,
    _links: {
        html: string
    },
    hasExploits: boolean
}

export interface scaVulLib {
    details: Array<scaVulLibDetails>,
    _links: {
        ref: string
    }
}

export interface scaVulLibDetails {
    updateToVersion: string,
    versionRange: string,
    fixText: string,
    patch: string
}