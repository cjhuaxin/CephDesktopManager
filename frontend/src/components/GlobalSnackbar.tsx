import { Snackbar, Alert, Box, SnackbarOrigin, AlertColor } from "@mui/material";
import { SxProps } from '@mui/system';
import React from "react";
import PubSub from "pubsub-js"
import { TOPIC_ALERT, ALERT_TYPE_INFO, ALERT_TYPE_SUCCESS, ALERT_TYPE_WARNING, ALERT_TYPE_ERROR } from "../constants/Pubsub";
import { AlertEventBody } from "../dto/Frontend";


const anchorOrigin: SnackbarOrigin = {
    vertical: 'top',
    horizontal: 'right',
}

const sx: SxProps = {
    width: '100%'
}

export default function GlobalSnackbar() {
    const [message, setMessage] = React.useState("")
    const [severity, setSeverity] = React.useState<AlertColor>()

    const handleClose = () => {
        setSeverity(undefined);
    };

    const subscribeShowAlertEvent = () => {
        PubSub.subscribe(TOPIC_ALERT, function (_, data: AlertEventBody) {
            setSeverity(data.alertType);
            setMessage(data.message);
        })
    }

    React.useEffect(() => {
        subscribeShowAlertEvent();
    }, []);

    return (
        <Box>
            <Snackbar
                open={severity != undefined}
                autoHideDuration={5000}
                anchorOrigin={anchorOrigin}
                onClose={handleClose}
            >
                <Alert severity={severity} sx={sx}>
                    {message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

