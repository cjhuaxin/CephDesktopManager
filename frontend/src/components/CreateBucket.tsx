import StorageIcon from '@mui/icons-material/Storage';
import BucketIcon from './icons/BucketIcon';
import { IconButton, Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import * as React from 'react';
import { CreateBucket as CreateBucketApi } from "../../wailsjs/go/service/Bucket";
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_REFRESH_BUCKET_LIST } from '../constants/Pubsub';

export default function CreateBucket({ connectionId }: any) {
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
        CreateBucketApi({
            connectionId: connectionId,
            bucket: bucketName,
        }).then((res) => {
            if (res.err_msg == "") {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_SUCCESS,
                    message: "Create Bucket success"
                });
                setOpen(false);
                initInput();
                PubSub.publish(TOPIC_REFRESH_BUCKET_LIST, {
                    connectionId
                });
            } else {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                });
            }
        });
    };

    const handleClickCreateBucketBtn = (event: any) => {
        event.stopPropagation();
        setOpen(true);
    }

    const handleDialagClick = (event: any) => {
        event.stopPropagation();
    }

    return (
        <div>
            <Tooltip title="Create Bucket">
                <IconButton
                    size="small"
                    onClick={handleClickCreateBucketBtn}
                >
                    <BucketIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
            <Dialog
                open={open}
                onClick={handleDialagClick}
            >
                <DialogTitle>Create Bucket</DialogTitle>
                <DialogContent>
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