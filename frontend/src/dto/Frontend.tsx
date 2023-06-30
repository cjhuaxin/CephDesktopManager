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
    prefix: string;
    searchKeyword: string;
    updateBreadcrumbs: boolean;
}

export type ListObjectsItem = {
    id: string;
    key: string;
    size: number;
    lastModified: string;
}