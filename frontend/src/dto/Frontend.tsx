import { AlertColor } from "@mui/material";

export type AlertEventBody = {
    alertType: AlertColor;
    message: string;
}

export type ConfirmEventBody = {
    title: string;
    content: string;
    confirmCallback: () => void;
}

export type ConnectionDetailEventBody = {
    title: string;
    connectionId: string;
}


export type ListObjectsEventBody = {
    connectionId: string;
    bucket: string;
    prefix: string[];
    searchKeyword: string;
    updateBreadcrumbs: boolean;
    newFolder: boolean;
}

export type ListObjectsItem = {
    id: string;
    key: string;
    size: number;
    lastModified: string;
}

export type ReleaseDetail = {
    id: number;
    html_url: string;
    tag_name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
    published_at: string;
    assets: {
        id: number;
        name: string;
        browser_download_url: string;
    }[];
}