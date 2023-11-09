import { Box, Button, ButtonGroup, ClickAwayListener, Grow, MenuItem, MenuList, Paper, Popper } from "@mui/material";
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DownloadIcon from '@mui/icons-material/Download';
import React from "react";
import { models } from "../../wailsjs/go/models";
import { DownloadObjects } from "../../wailsjs/go/service/Object";
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT } from "../constants/Pubsub";
import { AlertEventBody } from "../dto/Frontend";


export default function ObjectBatch({ rowsSelected, connectionId, bucket }: any) {

    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);

    const handleClickDownload = () => {
        console.log(`rowsSelected`, rowsSelected);
        let req: models.DownloadObjectsReq = {
            connectionId: connectionId,
            bucket: bucket,
            keys: rowsSelected
        };
        DownloadObjects(req).then(res => {
            if (res.err_msg != "") {
                let alertBody: AlertEventBody = {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                }
                PubSub.publish(TOPIC_ALERT, alertBody);
            } else {
                let alertBody: AlertEventBody = {
                    alertType: ALERT_TYPE_SUCCESS,
                    message: "Batch Download Success"
                }
                PubSub.publish(TOPIC_ALERT, alertBody);
            }
        });
    };

    const handleMenuItemClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
        setOpen(false);
    };

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen);
    };

    const handleClose = (event: Event) => {
        if (
            anchorRef.current &&
            anchorRef.current.contains(event.target as HTMLElement)
        ) {
            return;
        }

        setOpen(false);
    };

    return (
        <Box>
            <ButtonGroup variant="contained" ref={anchorRef} aria-label="split button" sx={{
                mb: 1,
                mt: 1
            }}>
                <Button
                    disabled={rowsSelected.length == 0}
                    onClick={handleClickDownload}
                    size="small"
                >Download
                    <DownloadIcon fontSize="small" />
                </Button>
                <Button
                    disabled={rowsSelected.length == 0}
                    size="small"
                    aria-controls={open ? 'split-button-menu' : undefined}
                    aria-expanded={open ? 'true' : undefined}
                    aria-haspopup="menu"
                    onClick={handleToggle}
                >
                    <ArrowDropDownIcon fontSize="small" />
                </Button>
            </ButtonGroup>
            <Popper
                sx={{
                    zIndex: 1,
                }}
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                placement='bottom-start'
            >
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin:
                                placement === 'bottom' ? '' : 'left bottom',
                        }}
                    >
                        <Paper sx={
                            {
                                boxShadow: "4px 4px 4px rgba(0, 0, 0, 0.25)",
                                maxHeight: 35
                            }
                        }>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MenuList
                                    id="split-button-menu"
                                >
                                    <MenuItem
                                        sx={{
                                            fontSize: 'small',
                                            mt: -0.75
                                        }}
                                        key="delete"
                                        disabled
                                        onClick={(event) => handleMenuItemClick(event)}
                                    >
                                        Delete
                                    </MenuItem>
                                </MenuList>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </Box >
    );
}
