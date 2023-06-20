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