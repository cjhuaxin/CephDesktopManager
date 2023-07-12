export interface ConnectionItem {
    id: string;
    name: string;
}

export interface ObjectItem {
    id: string;
    key: string;
    realKey: string;
    lastModified: string;
    size: number;
    commonPrefix: boolean;
}

export interface ConnectionDetail {
    id: string;
    name: string
    endpoint: string
    accessKey: string
    secretKey: string
    region: string
    pathStyle: number
}

export interface BucketDetail {
    bucket: string;
    custom: boolean;
}

export interface UpgradeDetail {
    currentVersion: string;
    os: string;
    arch: string;
}

export interface UpgradeProgress {
    percentage: number;
    rate: number;
}