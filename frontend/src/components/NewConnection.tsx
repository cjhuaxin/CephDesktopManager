
import { Visibility, VisibilityOff } from '@mui/icons-material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LinkIcon from '@mui/icons-material/Link';
import { LoadingButton } from '@mui/lab';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormHelperText, IconButton, InputAdornment, InputLabel, OutlinedInput, TextField } from '@mui/material';
import PubSub from "pubsub-js";
import * as React from 'react';
import { models } from "../../wailsjs/go/models";
import { SaveS3Connection, TestS3Connection } from "../../wailsjs/go/service/Connection";
import { ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_REFRESH_CONNECTION_LIST } from '../constants/Pubsub';
import { AlertEventBody } from "../dto/Frontend";

export default function NewConnection() {
    const openId = React.useRef<number>(1);
    // state definitions
    const [open, setOpen] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [testConnectionResult, setTestConnectionResult] = React.useState(0);


    // input box definitions
    const [connectionName, setConnectionName] = React.useState("");
    const [endpoint, setEndpoint] = React.useState("");
    const [accessKey, setAccessKey] = React.useState("");
    const [secretKey, setSecretKey] = React.useState("");
    const [region, setRegion] = React.useState("");

    // error text definitions
    const [connectionNameErrorText, setConnectionNameErrorText] = React.useState("");
    const [endpointErrorText, setEndpointErrorText] = React.useState("");
    const [accessKeyErrorText, setAccessKeyErrorText] = React.useState("");
    const [secretKeyErrorText, setSecretKeyErrorText] = React.useState("");
    const [connectionErrorText, setConnectionErrorText] = React.useState("");

    // event handlers
    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleClickNewConnection = () => {
        console.log(openId.current);
        setOpen(true);
    };

    const handleCloseDialog = () => {
        setOpen(false);
        openId.current = openId.current + 1;
    };

    const handleClickSaveConnection = () => {
        let valid = valiateInputBox();
        if (!valid) {
            return;
        }
        let req = new models.NewConnectionReq();
        req.name = connectionName;
        req.endpoint = endpoint;
        req.accesskey = accessKey;
        req.secretkey = secretKey;
        req.region = region;
        SaveS3Connection(req).then((result: models.BaseResponse) => {
            if (result.err_msg == "") {
                let alertBody: AlertEventBody = {
                    alertType: ALERT_TYPE_SUCCESS,
                    message: 'Save connection success'
                }
                //publish event to show success
                PubSub.publish(TOPIC_ALERT, alertBody);
                //publish event to refresh connection list
                PubSub.publish(TOPIC_REFRESH_CONNECTION_LIST, null);
                setOpen(false);
            } else {
                setTestConnectionResult(-1);
                setConnectionErrorText(result.err_msg);
            }
        });

    };

    const handleClickTestConnection = () => {
        let valid = valiateInputBox();
        if (!valid) {
            return;
        }

        setLoading(true);
        let req = new models.NewConnectionReq();
        req.name = connectionName;
        req.endpoint = endpoint;
        req.accesskey = accessKey;
        req.secretkey = secretKey;
        req.region = region;

        TestS3Connection(req).then((result: models.BaseResponse) => {
            setLoading(false);
            console.log(result);
            if (result.err_msg == "") {
                setTestConnectionResult(1);
            } else {
                setTestConnectionResult(-1);
                setConnectionErrorText(result.err_msg)
            }
        })
    };

    const valiateInputBox = function (): Boolean {
        let inputValid = true;
        if (!connectionName) {
            setConnectionNameErrorText("connection name is required");
            inputValid = false;
        } else {
            setConnectionNameErrorText("");
        }
        if (!endpoint) {
            setEndpointErrorText("endpoint is required");
            inputValid = false;
        } else {
            const regex = /^(http|https)?(:\/\/)?[-a-zA-Z0-9@%._\+~#=:]{2,256}$/i
            if (regex.test(endpoint)) {
                setEndpointErrorText("");
            } else {
                setEndpointErrorText("endpoint format is invalid");
            }
        }
        if (!accessKey) {
            setAccessKeyErrorText("accessKey is required");
            inputValid = false;
        } else {
            const regex = /^\w{20}$/
            if (regex.test(accessKey)) {
                setAccessKeyErrorText("");
            } else {
                setAccessKeyErrorText("accessKey format is invalid");
                inputValid = false;
            }
        }
        if (!secretKey) {
            setSecretKeyErrorText("secretKey is required");
            inputValid = false;
        } else {
            const regex = /^\w{40}$/
            if (regex.test(secretKey)) {
                setSecretKeyErrorText("");
            } else {
                setSecretKeyErrorText("secretKey format is invalid");
                inputValid = false;
            }
        }

        return inputValid;
    }

    return (
        <div>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleClickNewConnection}>
                New Connection
            </Button>
            <Dialog open={open} key={openId.current}>
                <DialogTitle>New Ceph RGW Connection</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                        <div>
                            <FormControl fullWidth sx={{ m: 1 }}>
                                <TextField
                                    required
                                    label="Name"
                                    id="connectionName"
                                    value={connectionName}
                                    error={!!connectionNameErrorText}
                                    helperText={connectionNameErrorText}
                                    onChange={e => setConnectionName(e.target.value)}
                                />
                            </FormControl>
                            <FormControl fullWidth sx={{ m: 1 }}>
                                <TextField
                                    required
                                    label="Endpoint"
                                    id="endpoint"
                                    value={endpoint}
                                    error={!!endpointErrorText}
                                    helperText={endpointErrorText}
                                    onChange={e => setEndpoint(e.target.value)}
                                />
                            </FormControl>
                            <FormControl fullWidth sx={{ m: 1 }}>
                                <TextField
                                    required
                                    label="Access Key"
                                    id="accessKey"
                                    value={accessKey}
                                    error={!!accessKeyErrorText}
                                    helperText={accessKeyErrorText}
                                    onChange={e => setAccessKey(e.target.value)}
                                />
                            </FormControl>
                            <FormControl fullWidth sx={{ m: 1 }}>
                                <InputLabel htmlFor="secretKey">Secret Key</InputLabel>
                                <OutlinedInput
                                    required
                                    id="secretKey"
                                    type={showPassword ? 'text' : 'password'}
                                    endAdornment={
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={handleClickShowPassword}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    }
                                    label="Password"
                                    value={secretKey}
                                    error={!!secretKeyErrorText}
                                    onChange={e => setSecretKey(e.target.value)}
                                />
                                <FormHelperText error={!!secretKeyErrorText}>{secretKeyErrorText}</FormHelperText>
                            </FormControl>
                            <FormControl fullWidth sx={{ m: 1 }}>
                                <TextField
                                    label="Region"
                                    id="region"
                                    placeholder="default"
                                    value={region}
                                    onChange={e => setRegion(e.target.value)}
                                />
                            </FormControl>
                            <FormControl>
                                <LoadingButton
                                    onClick={handleClickTestConnection}
                                    loading={loading}
                                    variant="text"
                                    size="small"
                                    loadingPosition="start"
                                    startIcon={<LinkIcon />}
                                >
                                    Test Connection
                                </LoadingButton>
                            </FormControl>
                            {testConnectionResult == 1 && <Alert severity="success">Test Connection Success</Alert>}
                            {testConnectionResult == -1 && <Alert severity="error">{connectionErrorText}</Alert>}
                        </div>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleClickSaveConnection}>Save</Button>
                </DialogActions>
            </Dialog>
        </div >
    );
}