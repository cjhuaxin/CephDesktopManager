import AddReactionIcon from '@mui/icons-material/AddReaction';
import { IconButton, Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import * as React from 'react';
import { AddCustomBucket as AddCustomBucketApi } from "../../wailsjs/go/service/Bucket";
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT } from '../constants/Pubsub';

export default function AddCustomBucket({ connectionId }: any) {
    const [open, setOpen] = React.useState(false);
    const [bucketName, setBucketName] = React.useState("");
    const [bucketNameErrText, setBucketNameErrText] = React.useState("");

    const initInput = () => {
        setBucketName("");
        setBucketNameErrText("");
    }

    const handleClose = (event: any) => {
        event.stopPropagation();
        setOpen(false);
        initInput();
    };

    const handleSave = (event: any) => {
        event.stopPropagation();
        if (!bucketName) {
            setBucketNameErrText("bucket name is required");
            return;
        }
        AddCustomBucketApi({
            connectionId: connectionId,
            bucket: bucketName,
        }).then((res) => {
            if (res.err_msg == "") {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_SUCCESS,
                    message: "Add Custom Bucket success"
                });
                setOpen(false);
                initInput();
            } else {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                });
            }
        });
    };

    const handleClickAddCustomBucketBtn = (event: any) => {
        event.stopPropagation();
        setOpen(true);
    }

    const handleDialagClick = (event: any) => {
        event.stopPropagation();
    }

    return (
        <div>
            <Tooltip title="Add Custom Bucket">
                <IconButton
                    size="small"
                    onClick={handleClickAddCustomBucketBtn}
                >
                    <AddReactionIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
            <Dialog
                open={open}
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
                        value={bucketName}
                        error={!!bucketNameErrText}
                        helperText={bucketNameErrText}
                        onChange={e => setBucketName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}