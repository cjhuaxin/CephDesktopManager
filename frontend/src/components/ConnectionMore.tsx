import DeleteIcon from '@mui/icons-material/Delete';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, ListItemIcon, Menu, MenuItem, TextField, Typography } from "@mui/material";
import React from "react";
import { AddCustomBucket } from '../../wailsjs/go/service/Bucket';
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_CONFIRM, TOPIC_REFRESH_CONNECTION_LIST } from '../constants/Pubsub';
import AddCustomBucketIcon from './icons/AddCustomBucketIcon';
import { DeleteConnection } from '../../wailsjs/go/service/Connection';

export default function ConnectionMore({ connectionId, connectionName, hidden }: any) {

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [openCustomBucketDialog, setOpenCustomBucketDialog] = React.useState(false);
    const [customBucketName, setCustomBucketName] = React.useState("");
    const [customBucketNameErrText, setCustomBucketNameErrText] = React.useState("");

    const openMenu = Boolean(anchorEl);

    const initCustomBucketInput = () => {
        setCustomBucketName("");
        setCustomBucketNameErrText("");
    }

    const handleCloseCustomBucketDialog = (event: any) => {
        event.stopPropagation();
        setOpenCustomBucketDialog(false);
        initCustomBucketInput();
    };

    const handleSave = (event: any) => {
        event.stopPropagation();
        if (!customBucketName) {
            setCustomBucketNameErrText("bucket name is required");
            return;
        }
        if (connectionId == "") {
            PubSub.publish(TOPIC_ALERT, {
                alertType: ALERT_TYPE_ERROR,
                message: "connection is empty"
            });
        }
        AddCustomBucket({
            connectionId: connectionId,
            bucket: customBucketName.trim(),
        }).then((res) => {
            if (res.err_msg == "") {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_SUCCESS,
                    message: "Add Custom Bucket success"
                });
                setOpenCustomBucketDialog(false);
                initCustomBucketInput();
            } else {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                });
            }
        });
    };

    const handleCloseMenu = (event: any) => {
        event.stopPropagation();
        setAnchorEl(null);
    }

    const handleClickMoreBtn = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    }

    const handleDialagClick = (event: any) => {
        event.stopPropagation();
    }

    const handleClickAddCustomBucketBtn = (event: any) => {
        event.stopPropagation();
        setAnchorEl(null);
        setOpenCustomBucketDialog(true);
    }

    const handleClickDeleteConnBtn = (event: any) => {
        event.stopPropagation();
        setAnchorEl(null);
        PubSub.publish(TOPIC_CONFIRM, {
            title: "Confirm",
            content: "Confirm To Delete [" + connectionName + "] Connection ?",
            confirmCallback: () => {
                DeleteConnection({
                    connectionId: connectionId
                }).then(res => {
                    if (res.err_msg == "") {
                        PubSub.publish(TOPIC_ALERT, {
                            alertType: ALERT_TYPE_SUCCESS,
                            message: "Delete Connection [" + connectionName + "] Success"
                        });
                        PubSub.publish(TOPIC_REFRESH_CONNECTION_LIST);
                    } else {
                        PubSub.publish(TOPIC_ALERT, {
                            alertType: ALERT_TYPE_ERROR,
                            message: res.err_msg
                        });
                    }
                });
            }
        });
    }

    return (
        <div hidden={hidden}>
            <IconButton
                id="connection-more-button"
                size="small"
                onClick={handleClickMoreBtn}
            >
                <MoreHorizIcon fontSize="inherit" />
            </IconButton>

            <Menu
                id="connection-more-menu"
                aria-labelledby="connection-more-button"
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleCloseMenu}
                onClick={handleCloseMenu}
                transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            >
                <MenuItem onClick={handleClickAddCustomBucketBtn}>
                    <ListItemIcon>
                        <AddCustomBucketIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="caption" display="block">Add Custom Bucket</Typography>
                </MenuItem>
                <MenuItem onClick={handleClickDeleteConnBtn}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="caption" display="block">Delete Connection</Typography>
                </MenuItem>
            </Menu>

            <Dialog
                open={openCustomBucketDialog}
                onClick={handleDialagClick}
            >
                <DialogTitle>Add Cusomt Bucket</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Manually add a bucket with access rights.<br />
                        Due to the s3 policy, for some buckets, you can access the objects inside the bucket, but can not displayed in the bucket list.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="bucketName"
                        label="Bucket"
                        fullWidth
                        required
                        variant="standard"
                        value={customBucketName}
                        error={!!customBucketNameErrText}
                        helperText={customBucketNameErrText}
                        onChange={e => setCustomBucketName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCustomBucketDialog}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};