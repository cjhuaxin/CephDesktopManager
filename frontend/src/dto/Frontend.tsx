import { AlertColor } from "@mui/material";

export type AlertEventBody = {
    alertType: AlertColor;
    message: string;
}