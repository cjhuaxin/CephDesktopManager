import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, ListItemIcon, Menu, MenuItem, Typography } from "@mui/material";
import React from "react";
import { DeleteBucket, GetBucketInfo } from '../../wailsjs/go/service/Bucket';
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_CHANGE_OBJECTS_TABLE_STATE, TOPIC_CONFIRM, TOPIC_REFRESH_BUCKET_LIST } from '../constants/Pubsub';
import { BucketInfo } from '../dto/BackendRes';
import styled from '@emotion/styled';

const valueBgcolor = "rgba(0, 0, 0, 0.06)"

const JsonContainer = styled(Box)({
    backgroundColor: '#f5f5f5',  // 设置背景色
    padding: '16px',             // 内边距
    borderRadius: '8px',          // 圆角
    whiteSpace: 'pre-wrap',       // 保留换行和空格
    overflowX: 'auto',            // 横向滚动
    maxHeight: '500px',           // 限制最大高度
});

export default function BucketMore({ connectionId, bucket, isCustom }: any) {

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [openBucketInfoDialog, setopenBucketInfoDialog] = React.useState(false);

    const openMenu = Boolean(anchorEl);

    const policy = React.useRef<BucketInfo>({
        location: "",
        policy: "",
        acls: [],
        lifecycles: [],
    });

    const handleCloseCustomBucketDialog = (event: any) => {
        event.stopPropagation();
        setopenBucketInfoDialog(false);
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

    const handleClickBucketInfoBtn = (event: any) => {
        event.stopPropagation();
        setAnchorEl(null);
        GetBucketInfo({
            connectionId: connectionId,
            bucket: bucket
        }).then(res => {
            if (res.err_msg == "") {
                policy.current = res.data;
                setopenBucketInfoDialog(true);
            } else {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                });
            }
        })
    }

    const handleClickDeleteBucketBtn = (event: any) => {
        event.stopPropagation();
        PubSub.publish(TOPIC_CONFIRM, {
            title: "Important",
            content: "Confirm To Delete [" + bucket + "] Bucket ?",
            confirmCallback: () => {
                DeleteBucket({
                    connectionId: connectionId,
                    bucket: bucket,
                    custom: isCustom,
                }).then(res => {
                    if (res.err_msg == "") {
                        //hide the object list table
                        PubSub.publish(TOPIC_CHANGE_OBJECTS_TABLE_STATE, "none");
                        PubSub.publish(TOPIC_ALERT, {
                            alertType: ALERT_TYPE_SUCCESS,
                            message: "Delete Bucket [" + bucket + "] Success"
                        });
                        PubSub.publish(TOPIC_REFRESH_BUCKET_LIST, connectionId);
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

    const handleDialogKeyPress = (event: any) => {
        if (event.key.toLowerCase() == 'escape') {
            setopenBucketInfoDialog(false);
        }
    }

    return (
        <div>
            <IconButton
                id="bucket-more-button"
                size="small"
                onClick={handleClickMoreBtn}
            >
                <MoreHorizIcon fontSize="inherit" />
            </IconButton>

            <Menu
                id="bucket-more-menu"
                aria-labelledby="bucket-more-button"
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleCloseMenu}
                onClick={handleCloseMenu}
                transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            >
                <MenuItem onClick={handleClickBucketInfoBtn}>
                    <ListItemIcon>
                        <InfoIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="caption" display="block">Bucket Info</Typography>
                </MenuItem>
                <MenuItem onClick={handleClickDeleteBucketBtn}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" />
                    </ListItemIcon>
                    <Typography variant="caption" display="block">Delete Bucket</Typography>
                </MenuItem>
            </Menu>

            <Dialog
                open={openBucketInfoDialog}
                onClick={handleDialagClick}
                onKeyUp={handleDialogKeyPress}
                scroll="paper"
                fullWidth={true}
            >
                <DialogContent dividers={true} >
                    <Typography variant="caption" display="block" gutterBottom>
                        Bucket: <Typography
                            variant="caption"
                        >
                            {bucket}
                        </Typography>
                    </Typography>
                    <Typography variant="caption" display="block" gutterBottom>
                        Location: <Typography
                            variant="caption"
                        >
                            {policy.current.location}
                        </Typography>
                    </Typography>
                    <Typography variant="caption" display="block" gutterBottom>
                        ACL:
                    </Typography>
                    <JsonContainer>
                        {JSON.stringify(policy.current.acls, null, 2)}
                    </JsonContainer>
                    <Typography variant="caption" display="block" gutterBottom>
                        Policy:
                    </Typography>
                    <JsonContainer>
                        {policy.current.policy}
                    </JsonContainer>
                    <Typography variant="caption" display="block" gutterBottom>
                        Lifecycle:
                    </Typography>
                    <JsonContainer>
                        {JSON.stringify(policy.current.lifecycles, null, 2)}
                    </JsonContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCustomBucketDialog}>Close</Button>
                </DialogActions>
            </Dialog>
        </div >
    );
};