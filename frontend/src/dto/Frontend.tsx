import { AlertColor } from "@mui/material";

export type AlertEventBody = {
    alertType: AlertColor;
    message: string;
}

export type ListObjectsEventBody = {
    connectionId: string;
    bucket: string;
}

export type ListObjectsItem = {
    id: string;
    key: string;
    size: number;
    lastModified: string;
}