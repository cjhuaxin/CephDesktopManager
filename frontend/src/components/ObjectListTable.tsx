import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PreviewIcon from '@mui/icons-material/Preview';

import { AlertColor, Box, Breadcrumbs, Grid, Link, Pagination, PaginationItem, Typography } from '@mui/material';
import { LinkProps } from '@mui/material/Link';
import { styled } from '@mui/material/styles';
import { DataGrid, GridActionsCellItem, GridCallbackDetails, GridColDef, GridRowParams, GridRowSelectionModel, GridValueFormatterParams, MuiEvent, useGridApiRef } from '@mui/x-data-grid';
import moment from 'moment';
import prettyBytes from 'pretty-bytes';
import * as React from 'react';
import { models } from '../../wailsjs/go/models';
import { DeleteObjects, DownloadObjects, ListObjects } from "../../wailsjs/go/service/Object";
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_CHANGE_OBJECTS_TABLE_STATE, TOPIC_CONFIRM, TOPIC_LIST_OBJECTS, TOPIC_UPDATE_SEARCH_KEYWORD } from '../constants/Pubsub';
import { ObjectItem } from '../dto/BackendRes';
import { AlertEventBody, ListObjectsEventBody, ListObjectsItem } from '../dto/Frontend';
import SearchInput from './SearchInput';
import UploadObject from './UploadObject';
import ObjectBatch from './ObjectBatch';

const alertMsg = (alertType: AlertColor, msg: string) => {
    let alertBody: AlertEventBody = {
        alertType: alertType,
        message: msg
    }
    PubSub.publish(TOPIC_ALERT, alertBody);
}

export default function ObjectListTable() {
    interface LinkRouterProps extends LinkProps {
        path: string;
        index: number;
    }

    interface ItemLinkProps {
        folder: string;
        children: string;
        searchKeyword: string;
        updateBreadcrumbs: boolean;
    }

    interface PageInfo {
        continueToken: string;
        currentPageNum: number;
        continueTokenMap: Map<number, string>;
        disableFirst: boolean;
        disablePrevious: boolean;
        disableNext: boolean;
    }

    const ItemLink = styled('a')({
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        color: 'inherit',
    });

    const PAGE_SIZE = 50;
    const DELIMITER = "/";

    const [display, setDisplay] = React.useState("none");
    const [loading, setLoading] = React.useState(true);
    const [rowData, setRowData] = React.useState(Array<ListObjectsItem>);
    const [breadcrumbs, setBreadcrumbs] = React.useState(Array<LinkRouterProps>);
    const [rowsSelected, setRowsSelected] = React.useState<Array<string>>([]);

    const connectionId = React.useRef("");
    const bucket = React.useRef("");
    const prefix = React.useRef("");
    const searchKeyword = React.useRef("");
    const pageInfo = React.useRef<PageInfo>({
        continueToken: "",
        currentPageNum: 1,
        continueTokenMap: new Map<number, string>([[1, ""]]),
        disableFirst: true,
        disablePrevious: true,
        disableNext: true,
    });
    const apiRef = useGridApiRef();

    const FolderLink = React.memo(function FolderLink(props: ItemLinkProps) {
        const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            handleFolderClick(props);
        };

        return (
            <ItemLink onClick={handleClick} sx={{ cursor: "pointer" }}>
                {props.children}
            </ItemLink>
        );
    });

    const LinkRouter = (props: LinkRouterProps) => {
        return (
            <Link {...props} />
        );
    }

    const columns: GridColDef[] = [
        {
            field: 'key',
            flex: 3,
            renderCell: (params) => {
                if (params.value == null) {
                    return '';
                }

                //return the link
                if (params.row.commonPrefix) {
                    return (
                        <FolderLink folder={params.value.substring(0, params.value.length - 1)} updateBreadcrumbs={true} searchKeyword={""}>
                            {params.value}
                        </FolderLink>
                    );
                }

                return params.value
            },
        },
        {
            field: 'size',
            flex: 1,
            valueGetter: (params) => {
                return params.row.commonPrefix ? null : params.value;
            },
            valueFormatter: (params: GridValueFormatterParams<number>) => {
                if (params.value == null) {
                    return '-';
                }
                return prettyBytes(params.value);
            },
        },
        {
            field: 'lastModified',
            flex: 2,
            valueFormatter: (params: GridValueFormatterParams<string>) => {
                return params.value == null ? "" : moment(params.value).format('YYYY-MM-DD HH:mm:ss');
            },
        },
        {
            field: 'actions',
            type: 'actions',
            flex: 1,
            getActions: (params) => {
                return ([
                    <GridActionsCellItem
                        icon={<FileDownloadIcon />}
                        label="Download"
                        onClick={downloadObject(params.row)}
                    />,
                    <GridActionsCellItem
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={deleteObject(params.row)}
                        showInMenu
                    />,
                    <GridActionsCellItem
                        disabled
                        icon={<PreviewIcon />}
                        label="Preview"
                        onClick={previewObject(params.row)}
                        showInMenu
                    />,
                ]);
            },
        },
    ];

    const downloadObject = React.useCallback(
        (row: ObjectItem) => () => {
            setLoading(true);
            let req: models.DownloadObjectsReq = {
                connectionId: connectionId.current,
                bucket: bucket.current,
                keys: [row.realKey]
            };
            DownloadObjects(req).then(res => {
                if (res.err_msg != "") {
                    alertMsg(ALERT_TYPE_ERROR, res.err_msg);
                } else {
                    alertMsg(ALERT_TYPE_SUCCESS, "Download object[" + row.realKey + "] success: " + res.data);
                    setLoading(false);
                }
            });
        },
        [],
    );

    const deleteObject = React.useCallback(
        (row: ObjectItem) => () => {
            PubSub.publish(TOPIC_CONFIRM, {
                title: "Important",
                content: "Confirm To Delete [" + row.key + "] ?",
                confirmCallback: () => {
                    DeleteObjects({
                        connectionId: connectionId.current,
                        bucket: bucket.current,
                        keys: [row.realKey],
                    }).then((res) => {
                        if (res.err_msg == "") {
                            alertMsg(ALERT_TYPE_SUCCESS, "Delete object[" + row.key + "] success");
                            handleFolderClick({
                                folder: prefix.current,
                                children: prefix.current,
                                updateBreadcrumbs: false,
                                searchKeyword: searchKeyword.current,
                            })
                        } else {
                            alertMsg(ALERT_TYPE_ERROR, res.err_msg);
                        }
                    });
                }
            });
        },
        [],
    );

    const previewObject = React.useCallback(
        (row: ObjectItem) => () => {
            console.log(row);
        },
        [],
    );

    const subscribeListObjectEvent = () => {
        PubSub.subscribe(TOPIC_LIST_OBJECTS, function (_, data: ListObjectsEventBody) {
            setDisplay("")
            connectionId.current = data.connectionId;
            bucket.current = data.bucket;
            if (data.prefix || data.searchKeyword) {
                //handle folder click event
                handleFolderClick({
                    folder: data.prefix,
                    children: data.prefix,
                    updateBreadcrumbs: data.updateBreadcrumbs,
                    searchKeyword: data.searchKeyword,
                })
            } else {
                listRootObjects();
            }
        })
    }

    // common list objects function
    const listObjects = (continueToken: string, prefix: string, successFn: (res: models.BaseResponse) => void, failureFn: (res: models.BaseResponse) => void) => {
        setLoading(true);
        //append search keyword to list object
        prefix += searchKeyword.current;
        ListObjects({
            connectionId: connectionId.current,
            bucket: bucket.current,
            continueToken: continueToken,
            prefix: prefix,
            delimiter: DELIMITER,
            pageSize: PAGE_SIZE,
        }).then((res: models.BaseResponse) => {
            setLoading(false);
            if (res.err_msg == "") {
                successFn(res);
            } else {
                failureFn(res);
            }
        })
    }

    // trigger when click the bucket
    const listRootObjects = () => {
        searchKeyword.current = "";
        //clear the prefix
        prefix.current = "";
        //update search keyword 
        PubSub.publish(TOPIC_UPDATE_SEARCH_KEYWORD, "");
        let current = pageInfo.current;
        current.disableFirst = true;
        current.disablePrevious = true;
        setBreadcrumbs([]);

        listObjects("", "", function (res) {
            if (res.data) {
                setRowData(res.data.objects);
                // set page info
                if (res.data.nextContinuationToken != "") {
                    current.continueToken = res.data.nextContinuationToken;
                    current.continueTokenMap.set(current.currentPageNum + 1, res.data.nextContinuationToken);
                    current.disableNext = false;
                }
            }
        }, function (res) {
            alertMsg(ALERT_TYPE_ERROR, res.err_msg);
        });
    }

    const handleClickBreadcrumb = (event: any) => {
        let path = event.currentTarget.getAttribute("path");
        if (path) {
            //the path under bucket
            let props: ItemLinkProps = {
                folder: path,
                children: path,
                updateBreadcrumbs: true,
                searchKeyword: "",
            }
            handleFolderClick(props);
        } else {
            //click bucket to root path
            PubSub.publish(TOPIC_LIST_OBJECTS, {
                connectionId: connectionId.current,
                bucket: bucket.current
            });
        }
    };

    const handleFolderClick = (props: ItemLinkProps) => {
        if (props.searchKeyword != searchKeyword.current) {
            searchKeyword.current = props.searchKeyword
            // update search keyword
            PubSub.publish(TOPIC_UPDATE_SEARCH_KEYWORD, props.searchKeyword);
        }

        prefix.current = "";
        let stopIndex = breadcrumbs.findIndex(b => b.path === props.folder);
        if (stopIndex == -1) {
            stopIndex = breadcrumbs.length;
        }
        //assemble the query prefix
        breadcrumbs.forEach((breadcrumb, i) => {
            if (i <= stopIndex) {
                prefix.current += breadcrumb.path;
                if (!prefix.current.endsWith(DELIMITER)) {
                    prefix.current += DELIMITER
                }
            }
        });

        // Click on the breadcrumbs that don't exist, just append it to the prefix
        if (stopIndex == breadcrumbs.length) {
            prefix.current += props.folder;
        }
        if (prefix.current != "" && !prefix.current.endsWith(DELIMITER)) {
            prefix.current += DELIMITER
        }

        listObjects("", prefix.current, function (res) {
            if (res.data) {
                setRowData(res.data.objects);
                let currentPath = props.folder
                let newBreadCrumb: LinkRouterProps = {
                    path: currentPath,
                    index: breadcrumbs.length + 1,
                }
                if (props.updateBreadcrumbs) {
                    // Click on the breadcrumbs that don't exist, just add it to breadcrumbs list
                    if (stopIndex == breadcrumbs.length) {
                        setBreadcrumbs(prev => [...prev, newBreadCrumb]);
                    } else {
                        // Click on the breadcrumbs that exists, cutoff the sub path
                        setBreadcrumbs(prev => prev.slice(0, stopIndex + 1));
                    }
                    // if need to update breadcrumbs,clear the search keyword
                    searchKeyword.current = "";
                }

                // set page info
                let current = pageInfo.current;
                current.disableFirst = true;
                current.disablePrevious = true;
                current.continueTokenMap = new Map([[1, ""]]);
                if (res.data.nextContinuationToken != "") {
                    current.continueToken = res.data.nextContinuationToken;
                    current.continueTokenMap.set(current.currentPageNum + 1, res.data.nextContinuationToken);
                    current.disableNext = false;
                } else {
                    current.continueToken = "";
                    current.disableNext = true;
                }
            }
        }, function (res) {
            alertMsg(ALERT_TYPE_ERROR, res.err_msg);
        });
    };

    const handleRowSelectionModelChange = (rowSelectionModel: GridRowSelectionModel) => {
        let selectedRealKey = new Array<string>();
        rowSelectionModel.forEach(id => {
            let row = apiRef.current.getRow(id)
            selectedRealKey.push(row.realKey)
        })
        setRowsSelected([...selectedRealKey])
    }


    // paginater handlers
    const handleFirstClick = () => {
        listObjects("", prefix.current, function (res) {
            if (res.data) {
                let current = pageInfo.current;
                current.disableFirst = true;
                current.disablePrevious = true;
                setRowData(res.data.objects);
                // set page info
                if (res.data.nextContinuationToken != "") {
                    current.continueToken = res.data.nextContinuationToken;
                    current.currentPageNum = 1;
                    current.disableNext = false;
                }
            }
        }, function (res) {
            alertMsg(ALERT_TYPE_ERROR, res.err_msg);
        });
    };

    const handlePreviousClick = () => {
        let current = pageInfo.current;
        let continueToken = current.continueTokenMap.get(current.currentPageNum - 1);
        listObjects(continueToken!, prefix.current, function (res) {
            if (res.data) {
                //continueToken is empty means the first page number
                if (continueToken == "") {
                    current.disableFirst = true;
                    current.disablePrevious = true;
                }
                if (res.data.nextContinuationToken != "") {
                    current.continueToken = res.data.nextContinuationToken;
                    current.disableNext = false;
                }
                setRowData(res.data.objects);
                // set page info
                current.currentPageNum -= 1;
            }
        }, function (res) {
            alertMsg(ALERT_TYPE_ERROR, res.err_msg);
        });
    };

    const handleNextClick = () => {
        listObjects(pageInfo.current.continueToken, prefix.current, function (res) {
            if (res.data) {
                let current = pageInfo.current;
                current.disableFirst = false;
                current.disablePrevious = false;

                setRowData(res.data.objects);
                let disableNext = false;
                // set page info
                if (res.data.nextContinuationToken != "") {
                    current.continueToken = res.data.nextContinuationToken;
                    current.continueTokenMap.set(current.currentPageNum + 2, res.data.nextContinuationToken);
                } else {
                    //last page disable next button
                    disableNext = true;
                }
                current.currentPageNum += 1;
                current.disableNext = disableNext;
            }
        }, function (res) {
            alertMsg(ALERT_TYPE_ERROR, res.err_msg);
        });
    };

    const subscribeChangeObjectsTableStateEvent = () => {
        PubSub.subscribe(TOPIC_CHANGE_OBJECTS_TABLE_STATE, function (_, display: string) {
            setRowData(new Array<ListObjectsItem>);
            setDisplay(display);
        })
    }

    React.useEffect(() => {
        subscribeListObjectEvent();
        subscribeChangeObjectsTableStateEvent();
    }, []);

    return (
        <Box
            sx={{
                display: display
            }}>
            <Grid container spacing={1}>
                <Grid item xs={8}>
                    <Breadcrumbs aria-label="breadcrumb">
                        <LinkRouter
                            underline="hover"
                            color="inherit"
                            path=""
                            index={0}
                            sx={{ cursor: "pointer" }}
                            onClick={handleClickBreadcrumb}
                        >
                            {bucket.current}
                        </LinkRouter>
                        {breadcrumbs.map((value, index) => {
                            const last = index === breadcrumbs.length - 1;
                            return last ? (
                                <Typography
                                    color="text.primary"
                                    key={value.path}
                                >
                                    {value.path}
                                </Typography>
                            ) : (
                                <LinkRouter
                                    underline="hover"
                                    color="inherit"
                                    path={value.path}
                                    index={index}
                                    sx={{ cursor: "pointer" }}
                                    onClick={handleClickBreadcrumb}
                                >
                                    {value.path}
                                </LinkRouter>
                            );
                        })}
                    </Breadcrumbs>
                </Grid>
                <Grid item xs={4}>
                    <UploadObject bucket={bucket.current} connectionId={connectionId.current} prefix={prefix.current} searchKeyword={searchKeyword.current} />
                </Grid>
                <Grid item xs={4}>
                    <ObjectBatch rowsSelected={rowsSelected} connectionId={connectionId.current} bucket={bucket.current} />
                </Grid>
                <Grid item xs={8}>
                    <SearchInput connectionId={connectionId.current} bucket={bucket.current} prefix={prefix.current} />
                </Grid>
            </Grid>
            <div style={{ height: '74vh', width: '100%' }}>
                <DataGrid
                    apiRef={apiRef}
                    pageSizeOptions={[PAGE_SIZE]}
                    paginationMode="server"
                    rowHeight={35}
                    loading={loading}
                    columns={columns}
                    rows={rowData}
                    hideFooter={true}
                    checkboxSelection
                    disableRowSelectionOnClick
                    onRowSelectionModelChange={handleRowSelectionModelChange}
                />
            </div>

            <Pagination
                color="primary"
                showFirstButton
                sx={{
                    marginTop: 1,
                    float: "right",
                }}
                count={0}
                renderItem={
                    (item) => {
                        if (item.type === "first") {
                            item.disabled = pageInfo.current.disableFirst;
                            item.onClick = () => { handleFirstClick() };
                        }
                        if (item.type === "previous") {
                            item.disabled = pageInfo.current.disablePrevious;
                            item.onClick = () => { handlePreviousClick() };
                        }
                        if (item.type === "next") {
                            item.disabled = pageInfo.current.disableNext;
                            item.onClick = () => { handleNextClick() };
                        }
                        return (<PaginationItem {...item} />);
                    }
                }
            />
        </Box>
    );
}