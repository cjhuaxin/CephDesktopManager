import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { LoadingButton } from "@mui/lab";
import { Box, Button, ButtonGroup, ClickAwayListener, Dialog, DialogActions, DialogContent, DialogTitle, Grow, LinearProgress, MenuItem, MenuList, Paper, Popper, TextField, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridValueFormatterParams, useGridApiRef } from "@mui/x-data-grid";
import axios from 'axios';
import prettyBytes from 'pretty-bytes';
import React from "react";
import sparkMD5 from 'spark-md5';
import { models } from '../../wailsjs/go/models';
import { AbortMultipartUpload, CompleteMultipartUpload, CreateFolder, CreateMultipartUpload } from "../../wailsjs/go/service/Object";
import { EventsOff, EventsOn } from '../../wailsjs/runtime/runtime';
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_LIST_OBJECTS, UPLOAD_PROGRESS } from "../constants/Pubsub";
import { UploadDetail } from '../dto/BackendRes';

const columns: GridColDef[] = [
    {
        field: 'name',
        headerName: 'File',
        flex: 0.4,
        minWidth: 150,
        sortable: false
    },
    {
        field: 'size',
        headerName: 'Size',
        flex: 0.1,
        minWidth: 50,
        sortable: false
    },
    {
        field: 'progress',
        headerName: 'Progress',
        flex: 0.1,
        minWidth: 50,
        sortable: false,
        valueFormatter: (params: GridValueFormatterParams<number>) => {
            return (params.value * 100).toFixed(2) + "%";
        },
    },
];

type FileRow = {
    id: string,
    name: string,
    size: string,
    progress: number
}

export default function UploadObject({ bucket, connectionId, prefix, searchKeyword }: any) {
    const [rows, setRows] = React.useState<FileRow[]>([]);
    const [wholeProgress, setWholeProgress] = React.useState(0);
    const [wholeProgressBuffer, setWholeProgressBuffer] = React.useState(0);
    const [uplaoding, setUplaoding] = React.useState(false);
    const [openUploadDialog, setOpenUploadDialog] = React.useState(false);
    const [openMenu, setOpenMenu] = React.useState(false);
    const [openCreateFolderDialog, setOpenCreateFolderDialog] = React.useState(false);
    const [newFolder, setNewFolder] = React.useState("");
    const [newFolderErrText, setNewFolderErrText] = React.useState("");

    const uploadInputRef = React.useRef<HTMLInputElement>(null);
    const anchorRef = React.useRef<HTMLDivElement>(null);
    const preparedUploadFileMap = React.useRef(new Map<string, File>());
    const totalFileSize = React.useRef(0);
    const currentFileSize = React.useRef(0);
    const apiRef = useGridApiRef();


    const handleOpenUploadDialogClick = () => {
        setOpenUploadDialog(true);
    }

    const handleToggleMenu = () => {
        setOpenMenu((prevOpen) => !prevOpen);
    };

    const handleCloseMenu = (event: Event) => {
        if (
            anchorRef.current &&
            anchorRef.current.contains(event.target as HTMLElement)
        ) {
            return;
        }

        setOpenMenu(false);
    };

    const handleCreateFolderClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
        setOpenMenu(false);
        setOpenCreateFolderDialog(true);
    };

    const handleUpload = async (event: any) => {
        if (preparedUploadFileMap.current.size == 0) {
            return
        }
        setUplaoding(true);
        setWholeProgress(0.1);
        let index = 1;
        let uploadId;
        // upload progress
        EventsOn(UPLOAD_PROGRESS, (result: UploadDetail) => {
            let currentProgress = result.partSize / currentFileSize.current
            let totalProgress = result.partSize / totalFileSize.current * 100
            // update row progress
            setRows((prevRows) => {
                return prevRows.map((row, index) =>
                    row.id === result.fileNameKey ? { ...row, progress: row.progress + currentProgress } : row,
                );
            });
            setWholeProgress(prefix => prefix + totalProgress);
        });
        for (const [key, value] of preparedUploadFileMap.current) {
            const objKey = prefix + value.name;
            currentFileSize.current = value.size;
            try {
                // Multipart uploads require a minimum size of 5 MB per part.
                const numberOfParts = Math.ceil(value.size / (1024 * 1024 * 5));
                let createRes = await CreateMultipartUpload({
                    connectionId: connectionId,
                    bucket: bucket,
                    key: objKey,
                })

                if (createRes.err_msg != "") {
                    PubSub.publish(TOPIC_ALERT, {
                        alertType: ALERT_TYPE_ERROR,
                        message: createRes.err_msg,
                    });
                    handleClickClose();
                    return
                }
                uploadId = createRes.data.uploadId;

                //each part size,5M
                let chunk = 5 * 1024 * 1024
                let start = 0;
                // Upload each part.
                let eTags = new Array<models.Multipart>();
                for (let i = 1; i <= numberOfParts; i++) {
                    let end = start + chunk;
                    if (value.size < end) {
                        end = value.size
                    }
                    let chunkSize = end - start
                    let progress = (chunkSize / totalFileSize.current) * 100
                    setWholeProgressBuffer(prefix => prefix + progress)
                    var data = new FormData();
                    data.append('connectionId', connectionId);
                    data.append('uploadId', uploadId);
                    data.append('bucket', bucket);
                    data.append('key', objKey);
                    data.append('partNumber', i + "");
                    data.append('fileName', value.name);
                    data.append('chunk', value.slice(start, end));
                    await axios.put("http://localhost:56789/custom/upload", data)
                        .then((res) => {
                            if (res.data.err_msg != "") {
                                PubSub.publish(TOPIC_ALERT, {
                                    alertType: ALERT_TYPE_ERROR,
                                    message: res.data.err_msg,
                                })
                                throw new Error(res.data.err_msg)
                            } else {
                                eTags.push({
                                    part: res.data.data.partNumber,
                                    value: res.data.data.eTag
                                })
                            }
                        }).catch(err => {
                            console.log("upload error", err);
                        })
                    start = end;
                }

                if (eTags.length == 0) {
                    PubSub.publish(TOPIC_ALERT, {
                        alertType: ALERT_TYPE_ERROR,
                        message: "etags are empty",
                    });
                    setUplaoding(false);

                    return
                }
                let req: models.CompleteMultipartUploadReq = {
                    connectionId: connectionId,
                    uploadId: uploadId,
                    bucket: bucket,
                    key: objKey,
                    etags: eTags,
                    convertValues(a, classs, asMap) {
                        return asMap ? new classs(a) : this.convertValues(a, classs);
                    }
                }
                let completeRes = await CompleteMultipartUpload(req)
                if (completeRes.err_msg != "") {
                    PubSub.publish(TOPIC_ALERT, {
                        alertType: ALERT_TYPE_ERROR,
                        message: completeRes.err_msg,
                    });
                }
            } catch (err: any) {
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_ERROR,
                    message: err.message,
                });
                if (uploadId) {
                    let abortRes = await AbortMultipartUpload({
                        connectionId: connectionId,
                        uploadId: uploadId,
                        bucket: bucket,
                        key: objKey,
                    })
                }
                setUplaoding(false)
                return
            }

            apiRef.current.scrollToIndexes({
                rowIndex: index++,
                colIndex: 0
            })
        }
        // alert success
        PubSub.publish(TOPIC_ALERT, {
            alertType: ALERT_TYPE_SUCCESS,
            message: "Upload Success",
        });
        // refresh object list
        PubSub.publish(TOPIC_LIST_OBJECTS, {
            connectionId: connectionId,
            bucket: bucket,
            prefix: [prefix],
            updateBreadcrumbs: false,
            searchKeyword: searchKeyword,
        });

        // close upload dialog
        handleClickClose();
    }

    const handleOnDrop = (event: any) => {
        // Prevent default behavior (Prevent file from being opened)
        event.preventDefault();
        event.stopPropagation();
        convertOriginFilesToDataGridRows(event.dataTransfer.files);
    }

    const handleInputChange = (event: any) => {
        convertOriginFilesToDataGridRows(uploadInputRef.current!.files!);
    }

    const convertOriginFilesToDataGridRows = (fileList: FileList) => {
        let fileRows = Array<FileRow>();
        for (let i = 0; i < fileList.length; i++) {
            let id = sparkMD5.hash(fileList[i].name);
            //check if the list contains the file
            if (preparedUploadFileMap.current.has(id)) {
                continue;
            }
            fileRows.push({
                id: id,
                name: fileList[i].name,
                size: prettyBytes(fileList[i].size),
                progress: 0
            })
            preparedUploadFileMap.current.set(id, fileList[i])
            totalFileSize.current += fileList[i].size
        }
        setRows(prev => [...prev, ...fileRows]);
    }

    const handleOnClickDrapArea = (event: any) => {
        uploadInputRef.current && uploadInputRef.current.click()
    }

    const handleOnDrapOver = (event: any) => {
        // Prevent default behavior (Prevent file from being opened)
        event.preventDefault();
        event.stopPropagation();
    }

    const handleClickClose = () => {
        setOpenUploadDialog(false);
        setUplaoding(false);
        setWholeProgress(0);
        setWholeProgressBuffer(0);
        setRows([]);

        uploadInputRef.current!.value = "";
        totalFileSize.current = 0;

        preparedUploadFileMap.current.clear();
        EventsOff(UPLOAD_PROGRESS);
    }

    const initCreateFolderInput = () => {
        setNewFolder("");
        setNewFolderErrText("");
    }
    const handleCloseCreateFolderDialog = (event: any) => {
        event.stopPropagation();
        setOpenCreateFolderDialog(false);
        initCreateFolderInput();
    };

    const handleSearchKeywordKeyPress = (event: any) => {
        if (event.key.toLowerCase() == 'enter') {
            handleCreateFolder(event);
        }
    }

    const handleUploadDialogKeyPress = (event: any) => {
        if (event.key.toLowerCase() == 'escape') {
            setOpenUploadDialog(false);
        }
    }

    const handleCreateFolderDialogKeyPress = (event: any) => {
        if (event.key.toLowerCase() == 'escape') {
            setOpenCreateFolderDialog(false);
        }
    }

    const handleCreateFolder = (event: any) => {
        event.stopPropagation();
        if (!newFolder) {
            setNewFolderErrText("new folder is required");
            return;
        }

        PubSub.publish(TOPIC_LIST_OBJECTS, {
            connectionId: connectionId,
            bucket: bucket,
            prefix: newFolder.split("/"),
            searchKeyword: "",
            updateBreadcrumbs: true,
            newFolder: true
        })
        setOpenCreateFolderDialog(false);
        initCreateFolderInput();
    };

    return (
        <Box>
            <Box sx={{
                float: "right",
                mr: 1
            }}>
                <ButtonGroup variant="contained" ref={anchorRef} aria-label="split button" sx={{
                    mb: 1,
                    mt: 1
                }}>
                    <Button
                        size="small"
                        onClick={handleOpenUploadDialogClick}
                        endIcon={<FileUploadIcon />}
                    >Upload
                    </Button>
                    <Button
                        size="small"
                        aria-controls={openMenu ? 'split-button-menu' : undefined}
                        aria-expanded={openMenu ? 'true' : undefined}
                        aria-haspopup="menu"
                        onClick={handleToggleMenu}
                    >
                        <ArrowDropDownIcon fontSize="small" />
                    </Button>
                </ButtonGroup>
                <Popper
                    sx={{
                        zIndex: 1,
                    }}
                    open={openMenu}
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
                                <ClickAwayListener onClickAway={handleCloseMenu}>
                                    <MenuList
                                        id="split-button-menu"
                                    >
                                        <MenuItem
                                            sx={{
                                                fontSize: 'small',
                                                mt: -0.75
                                            }}
                                            key="createFolder"
                                            onClick={(event) => handleCreateFolderClick(event)}
                                        >
                                            Create Folder
                                        </MenuItem>
                                    </MenuList>
                                </ClickAwayListener>
                            </Paper>
                        </Grow>
                    )}
                </Popper>
            </Box >
            <input
                ref={uploadInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleInputChange}
                multiple
            />
            <Dialog
                open={openUploadDialog}
                scroll="paper"
                fullWidth={true}
                onKeyUp={handleUploadDialogKeyPress}
            >
                <DialogTitle>
                    Upload Objects
                </DialogTitle>
                <Box
                    bgcolor={"rgba(0, 0, 0, 0.06)"}
                    onDrop={handleOnDrop}
                    onDragOver={handleOnDrapOver}
                    onClick={handleOnClickDrapArea}
                    sx={{
                        height: "30vh",
                        minHeight: "150px",
                        width: "80%",
                        alignSelf: "center",
                        alignContent: "center",
                        borderStyle: "dotted",
                        borderWidth: "medium",
                        position: "relative",
                        cursor: "pointer"
                    }}>
                    <AddCircleOutlineIcon
                        sx={{
                            fontSize: 80,
                            position: "absolute",
                            top: "15%",
                            left: "40%"
                        }} />
                    <Typography
                        variant="h6"
                        gutterBottom
                        sx={{
                            position: "absolute",
                            top: "65%",
                            left: "13%"
                        }}
                    >
                        Drag and drop or select files
                    </Typography>
                </Box>
                <DialogContent>
                    <Box sx={{ height: 150, width: '100%' }}>
                        <DataGrid
                            apiRef={apiRef}
                            rows={rows}
                            columns={columns}
                            density="compact"
                            disableColumnFilter={true}
                            disableColumnMenu={true}
                            hideFooter={true}
                        />
                    </Box>
                    <Box display={wholeProgress == 0 ? "none" : "block"} sx={{
                        width: '100%',
                        mt: 1,
                    }}>
                        <LinearProgress variant="buffer" value={wholeProgress} valueBuffer={wholeProgressBuffer} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <LoadingButton
                        variant="contained"
                        loading={uplaoding}
                        loadingIndicator="Uploading…"
                        onClick={handleUpload}
                    >Upload
                    </LoadingButton>
                    <Button
                        variant="outlined"
                        disabled={uplaoding}
                        onClick={handleClickClose}
                    >Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openCreateFolderDialog}
                onKeyUp={handleCreateFolderDialogKeyPress}
            >
                <DialogTitle>Create Folder</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="path"
                        label="Path"
                        fullWidth
                        required
                        variant="standard"
                        value={newFolder}
                        error={!!newFolderErrText}
                        helperText={newFolderErrText}
                        onChange={e => setNewFolder(e.target.value)}
                        onKeyUp={handleSearchKeywordKeyPress}
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" onClick={handleCreateFolder}>Create</Button>
                    <Button onClick={handleCloseCreateFolderDialog}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
}
