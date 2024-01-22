import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
    Typography
} from "@mui/material";
import axios from 'axios';
import prettyBytes from 'pretty-bytes';
import React from "react";
import { DownloadUpgradeFile } from "../../wailsjs/go/backend/App";
import { EventsOff, EventsOn } from "../../wailsjs/runtime/runtime";
import { ALERT_TYPE_ERROR, CHECK_UPGRADE, TOPIC_ALERT, TOPIC_LOADING, UPGRADE_PROGRESS } from "../constants/Pubsub";
import { UpgradeDetail, UpgradeProgress } from "../dto/BackendRes";
import { ReleaseDetail } from "../dto/Frontend";
import { LoadingButton } from "@mui/lab";

export default function UpgradeDialog() {
    const [open, setOpen] = React.useState(false);
    const [percentage, setPercentage] = React.useState(0);
    const [rate, setRate] = React.useState("");
    const [upgradeLoading, setUpgradeLoading] = React.useState(false);

    const currentVersion = React.useRef("");
    const latestVersion = React.useRef("");
    const hasNewVersion = React.useRef(false);
    const downloadUrl = React.useRef("");
    const displayProgress = React.useRef("none");

    const handleClose = () => {
        setOpen(false);
        //clear upgrade progress
        setPercentage(0);
        setRate("");
        setUpgradeLoading(false);
        currentVersion.current = "";
        latestVersion.current = "";
        hasNewVersion.current = false;
        downloadUrl.current = "";
        displayProgress.current = "";
        EventsOff(UPGRADE_PROGRESS);
    };

    const handleUpgrade = () => {
        setUpgradeLoading(true);
        DownloadUpgradeFile({
            downloadUrl: downloadUrl.current,
        }).then(res => {
            if (res.err_msg != "") {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                });
                setUpgradeLoading(false);
            }
        });
    }

    const handleDialogKeyPress = (event: any) => {
        if (event.key.toLowerCase() == 'escape') {
            setOpen(false);
        }
    }

    React.useEffect(() => {
        EventsOn(CHECK_UPGRADE, (result: UpgradeDetail) => {
            currentVersion.current = result.currentVersion;
            latestVersion.current = result.currentVersion;
            PubSub.publish(TOPIC_LOADING, true);
            axios.get("https://api.github.com/repos/cjhuaxin/CephDesktopManager/releases/latest", {
                timeout: 5000,
            }).then(function (response) {
                let body: ReleaseDetail = response.data;
                let currentVersionArray = currentVersion.current.split(".");
                let latestVersionArray = body.tag_name.substring(1).split(".");
                for (let i = 0; i < currentVersionArray.length; i++) {
                    // From left to right, compare the version number sizes in order.
                    if (Number(currentVersionArray[i]) < Number(latestVersionArray[i])) {
                        hasNewVersion.current = true;
                        break;
                    }
                }

                if (hasNewVersion.current) {
                    latestVersion.current = body.tag_name;
                    body.assets.forEach(asset => {
                        // for mac universal
                        if (asset.name.includes("dmg")) {
                            if (result.os == "darwin") {
                                downloadUrl.current = asset.browser_download_url
                            }
                        }
                        // for windows amd64
                        if (asset.name.includes("exe") && asset.name.includes("amd")) {
                            if (result.os == "windows" && result.arch == "amd") {
                                downloadUrl.current = asset.browser_download_url
                            }
                        }
                        // for windows arm64
                        if (asset.name.includes("exe") && asset.name.includes("arm")) {
                            if (result.os == "windows" && result.arch == "amd") {
                                downloadUrl.current = asset.browser_download_url
                            }
                        }
                    })
                }
                PubSub.publish(TOPIC_LOADING, false);
                setOpen(true)
            }).catch(function (error) {
                PubSub.publish(TOPIC_LOADING, false);
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_ERROR,
                    message: error.message
                });
            });
        });

        EventsOn(UPGRADE_PROGRESS, (result: UpgradeProgress) => {
            setPercentage(Math.floor(result.percentage));
            setRate(prettyBytes(result.rate));
            displayProgress.current = "flex";
        });
    });

    return (
        <div>
            <Dialog 
            open={open}
            onKeyUp={handleDialogKeyPress}
            >
                <DialogTitle>Check for updates</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {!hasNewVersion.current &&
                            <div>
                                <Alert
                                    variant="outlined"
                                    severity="success"
                                    sx={{
                                        border: "none"
                                    }}
                                >
                                    You're up to date
                                </Alert>
                                latest version v{latestVersion.current}
                                <DialogActions sx={{
                                    mt: 2,
                                    justifyContent: "center"
                                }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleClose}
                                    >Close
                                    </Button>
                                </DialogActions>
                            </div>
                        }
                        {hasNewVersion.current &&
                            <div>
                                The latest available version <span
                                    style={{ "color": "lightGreen" }}>
                                    {latestVersion.current}
                                </span>
                                <br />
                                <span>
                                    You are currently on version v{currentVersion.current}
                                </span>
                                <Box
                                    sx={{
                                        display: displayProgress.current,
                                        alignItems: "center"
                                    }}>
                                    <Box sx={{ width: "100%", mr: 1 }}>
                                        <LinearProgress
                                            color="primary"
                                            variant="determinate"
                                            value={percentage}
                                        />
                                    </Box>
                                    <Box sx={{ minWidth: 35 }}>
                                        <Typography variant="body2" color="text.secondary">{percentage}%</Typography>
                                    </Box>
                                </Box>
                                <Typography
                                    hidden={displayProgress.current == "none"}
                                    variant="body2"
                                    color="text.secondary"
                                >{rate}/s
                                </Typography>

                                <DialogActions sx={{
                                    mt: 2,
                                }}>
                                    <LoadingButton
                                        loading={upgradeLoading}
                                        variant="contained"
                                        onClick={handleUpgrade}
                                    >Upgrade
                                    </LoadingButton>
                                    <Button
                                        onClick={handleClose}
                                    >Cancel
                                    </Button>
                                </DialogActions>
                            </div>
                        }
                    </DialogContentText>
                </DialogContent>
            </Dialog>
        </div >
    );
}

