
import { Visibility, VisibilityOff } from '@mui/icons-material';
import LinkIcon from '@mui/icons-material/Link';
import { LoadingButton } from '@mui/lab';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormGroup, FormHelperText, IconButton, InputAdornment, InputLabel, OutlinedInput, Switch, TextField, Tooltip } from '@mui/material';
import PubSub from "pubsub-js";
import * as React from 'react';
import { models } from "../../wailsjs/go/models";
import { GetConnectionDetail, SaveS3Connection, TestS3Connection } from "../../wailsjs/go/service/Connection";
import { ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_CONNECTION_DETAIL, TOPIC_REFRESH_BUCKET_LIST, TOPIC_REFRESH_CONNECTION_LIST } from '../constants/Pubsub';
import { ConnectionDetail } from '../dto/BackendRes';
import { ConnectionDetailEventBody } from '../dto/Frontend';

const fieldSx = { m: 1 };
const pathStyleTitle = `For most of all privately deployed Object Storage Service(ceph/minio) Enable the client to use path-style addressing(https://192.168.1.10/BUCKET/KEY).
                       For Cloud Object Storage service,set false will use virtual hosted bucket addressing when possible(https://BUCKET.s3.amazonaws.com/KEY).`

export default function ConnectionDetailDialog() {
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
    const [pathStyle, setPathStyle] = React.useState(true);

    // error text definitions
    const [connectionNameErrorText, setConnectionNameErrorText] = React.useState("");
    const [endpointErrorText, setEndpointErrorText] = React.useState("");
    const [accessKeyErrorText, setAccessKeyErrorText] = React.useState("");
    const [secretKeyErrorText, setSecretKeyErrorText] = React.useState("");
    const [connectionErrorText, setConnectionErrorText] = React.useState("");

    const eventData = React.useRef<ConnectionDetailEventBody>({
        title: "",
        connectionId: ""
    })

    // event handlers
    const handleClickShowPassword = () => setShowPassword((show) => !show);

    const handleCloseDialog = () => {
        setOpen(false);
        openId.current = openId.current + 1;
    };

    const initInput = () => {
        setConnectionName("");
        setEndpoint("");
        setAccessKey("");
        setSecretKey("");
        setRegion("");
        setPathStyle(true);

        setConnectionNameErrorText("")
        setEndpointErrorText("")
        setAccessKeyErrorText("")
        setSecretKeyErrorText("")
        setConnectionErrorText("")
    }

    const handlePathStyleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPathStyle(event.target.checked);
    };


    const handleClickSaveConnection = () => {
        let valid = valiateInputBox();
        if (!valid) {
            return;
        }
        let req = new models.NewConnectionReq();
        req.id = eventData.current.connectionId;
        req.name = connectionName.trim();
        req.endpoint = endpoint.trim();
        req.accessKey = accessKey.trim();
        req.secretKey = secretKey.trim();
        req.region = region.trim();
        req.pathStyle = pathStyle ? 1 : 0;
        SaveS3Connection(req).then((result: models.BaseResponse) => {
            if (result.err_msg == "") {
                //publish event to show success
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_SUCCESS,
                    message: 'Save connection success'
                });
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
        req.accessKey = accessKey;
        req.secretKey = secretKey;
        req.region = region;
        req.pathStyle = pathStyle ? 1 : 0;

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
            const regex = /^.{20}$/
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
            const regex = /^.{40}$/
            if (regex.test(secretKey)) {
                setSecretKeyErrorText("");
            } else {
                setSecretKeyErrorText("secretKey format is invalid");
                inputValid = false;
            }
        }

        return inputValid;
    }

    const handleDialogKeyPress = (event: any) => {
        if (event.key.toLowerCase() == 'escape') {
            setOpen(false);
        }
    }

    const subscribeConnectionDetailEvent = () => {
        PubSub.subscribe(TOPIC_CONNECTION_DETAIL, function (_, d: ConnectionDetailEventBody) {
            eventData.current = d;
            setTestConnectionResult(0);
            if (d.connectionId && d.connectionId != "") {
                GetConnectionDetail({
                    connectionId: d.connectionId,
                }).then((res: models.BaseResponse) => {
                    if (res.err_msg == "") {
                        let details: ConnectionDetail = res.data;
                        console.log(details);
                        setConnectionName(details.name);
                        setAccessKey(details.accessKey);
                        setSecretKey(details.secretKey);
                        setEndpoint(details.endpoint);
                        setRegion(details.region);
                        setPathStyle(details.pathStyle == 1);
                    }
                    setOpen(true);
                });
            } else {
                initInput();
                setOpen(true);
            }
        })
    }

    React.useEffect(() => {
        subscribeConnectionDetailEvent();
    }, []);

    return (
        <Dialog
            open={open}
            key={openId.current}
            onKeyUp={handleDialogKeyPress}
        >
            <DialogTitle>{eventData.current.title}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                    <div>
                        <FormControl fullWidth sx={fieldSx}>
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
                        <FormControl fullWidth sx={fieldSx}>
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
                        <FormControl fullWidth sx={fieldSx}>
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
                        <FormControl fullWidth sx={fieldSx}>
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
                        <FormControl fullWidth sx={fieldSx}>
                            <TextField
                                label="Region"
                                id="region"
                                placeholder="default"
                                value={region}
                                onChange={e => setRegion(e.target.value)}
                            />
                        </FormControl>
                        <FormControl fullWidth>
                            <FormGroup aria-label="position" row>
                                <Tooltip title={pathStyleTitle}>
                                    <FormControlLabel
                                        control={<Switch checked={pathStyle} value={pathStyle} onChange={handlePathStyleChange} size="small" />}
                                        label="Path Style"
                                        labelPlacement="start"
                                    />
                                </Tooltip>
                            </FormGroup>
                        </FormControl>
                        <FormControl sx={fieldSx}>
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
                <Button variant="contained" onClick={handleClickSaveConnection}>Save</Button>
                <Button onClick={handleCloseDialog}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}