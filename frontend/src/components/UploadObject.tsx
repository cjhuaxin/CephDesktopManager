import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { LoadingButton } from "@mui/lab";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridValueFormatterParams, useGridApiRef } from "@mui/x-data-grid";
import prettyBytes from 'pretty-bytes';
import React from "react";
import sparkMD5 from 'spark-md5';
import { PrepareForUploading } from "../../wailsjs/go/service/Object";
import { ALERT_TYPE_ERROR, TOPIC_ALERT, TOPIC_LIST_OBJECTS, TOPIC_LOADING } from "../constants/Pubsub";
import { ConnectionDetail } from "../dto/BackendRes";

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

    const uploadInputRef = React.useRef<HTMLInputElement>(null);
    const preparedUploadFileMap = React.useRef(new Map<string, File>());
    const totalFileSize = React.useRef(0);
    const apiRef = useGridApiRef();


    const handleOpenUploadDialogClick = () => {
        setOpenUploadDialog(true);
    }

    const handleUpload = async (event: any) => {
        if (preparedUploadFileMap.current.size == 0) {
            return
        }
        setUplaoding(true);
        setWholeProgress(0.1);
        // get connection details from backend
        let prepareRes = await PrepareForUploading({
            connectionId: connectionId,
        });
        if (prepareRes.err_msg == "") {
            let data: ConnectionDetail = prepareRes.data;
            const s3Client = new S3Client({
                endpoint: data.endpoint,
                forcePathStyle: data.pathStyle == 1,
                credentials: {
                    accessKeyId: data.accessKey,
                    secretAccessKey: data.secretKey
                },
                region: data.region,
                // requestHandler: new FetchHttpHandler({
                //     requestTimeout: 3000,
                // }),
            });
            let index = 1;
            for (const [key, value] of preparedUploadFileMap.current) {
                await doUpload(s3Client, key, value);
                apiRef.current.scrollToIndexes({
                    rowIndex: index++,
                    colIndex: 0
                })
            }
        } else {
            // hide loading
            PubSub.publish(TOPIC_LOADING, false);
            PubSub.publish(TOPIC_ALERT, {
                alertType: ALERT_TYPE_ERROR,
                message: prepareRes.err_msg,
            });
        }

        PubSub.publish(TOPIC_LIST_OBJECTS, {
            connectionId: connectionId,
            bucket: bucket,
            prefix: prefix,
            updateBreadcrumbs: false,
            searchKeyword: searchKeyword,
        });

        handleClickClose();
    }

    const doUpload = async (s3Client: S3Client, id: string, file: File) => {
        let uploadId;
        let key = prefix + file.name;
        try {
            const multipartUpload = await s3Client.send(
                new CreateMultipartUploadCommand({
                    Bucket: bucket,
                    Key: key,
                })
            );

            uploadId = multipartUpload.UploadId;

            const uploadPromises = [];
            // Multipart uploads require a minimum size of 5 MB per part.
            const partCount = Math.ceil(file.size / (1024 * 1024 * 5));
            //each part size,5M
            let chunk = 5 * 1024 * 1024
            let start = 0;
            // Upload each part.
            for (let i = 0; i < partCount; i++) {
                let end = start + chunk;
                if (file.size < end) {
                    end = file.size
                }
                let chunkSize = end - start
                let progress = (chunkSize / totalFileSize.current) * 100
                setWholeProgressBuffer(prefix => prefix + progress)
                uploadPromises.push(
                    s3Client
                        .send(
                            new UploadPartCommand({
                                Bucket: bucket,
                                Key: key,
                                UploadId: uploadId,
                                Body: file.slice(start, end),
                                PartNumber: i + 1,
                            })
                        )
                        .then((d) => {
                            // update row progress
                            setRows((prevRows) => {
                                return prevRows.map((row, index) =>
                                    row.id === id ? { ...row, progress: row.progress + (chunkSize / file.size) } : row,
                                );
                            });
                            setWholeProgress(prefix => prefix + progress)
                            return d;
                        })
                );
                start = end;
            }

            const uploadResults = await Promise.all(uploadPromises);
            await s3Client.send(
                new CompleteMultipartUploadCommand({
                    Bucket: bucket,
                    Key: key,
                    UploadId: uploadId,
                    MultipartUpload: {
                        Parts: uploadResults.map(({ ETag }, i) => ({
                            ETag,
                            PartNumber: i + 1,
                        })),
                    },
                })
            );
        } catch (err: any) {
            PubSub.publish(TOPIC_ALERT, {
                alertType: ALERT_TYPE_ERROR,
                message: err.message,
            });
            if (uploadId) {
                const abortCommand = new AbortMultipartUploadCommand({
                    Bucket: bucket,
                    Key: key,
                    UploadId: uploadId,
                });

                await s3Client.send(abortCommand);
            }
        }
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

        preparedUploadFileMap.current.clear();
    }

    return (
        <Box>
            <Button
                sx={{
                    float: "right",
                    mt: -0.5,
                    mr: 1
                }}
                variant="contained"
                size="small"
                onClick={handleOpenUploadDialogClick}
            >Upload
            </Button>
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
        </Box >
    );
}
