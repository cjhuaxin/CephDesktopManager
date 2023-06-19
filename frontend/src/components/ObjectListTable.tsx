import { Box, Breadcrumbs, Link, Pagination, PaginationItem, PaginationRenderItemParams, Typography } from '@mui/material';
import { LinkProps } from '@mui/material/Link';
import { styled } from '@mui/material/styles';
import { DataGrid, GridColDef, GridValueFormatterParams } from '@mui/x-data-grid';
import moment from 'moment';
import prettyBytes from 'pretty-bytes';
import * as React from 'react';
import { models } from '../../wailsjs/go/models';
import { ListObjects } from "../../wailsjs/go/service/Object";
import { ALERT_TYPE_ERROR, TOPIC_ALERT, TOPIC_LIST_OBJECTS } from '../constants/Pubsub';
import { AlertEventBody, ListObjectsEventBody, ListObjectsItem } from '../dto/Frontend';

export default function ObjectListTable() {
    interface LinkRouterProps extends LinkProps {
        path: string;
    }

    interface ItemLinkProps {
        folder: string;
        children: string;
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

    const PAGE_SIZE = 10;
    const DELIMITER = "/";

    const [display, setDisplay] = React.useState("none");
    const [loading, setLoading] = React.useState(true);
    const [rowData, setRowData] = React.useState(Array<ListObjectsItem>);
    const [breadcrumbs, setBreadcrumbs] = React.useState(Array<LinkRouterProps>);


    const connectionId = React.useRef("");
    const bucket = React.useRef("");
    const prefix = React.useRef("");
    const pageInfo = React.useRef<PageInfo>({
        continueToken: "",
        currentPageNum: 1,
        continueTokenMap: new Map<number, string>([[1, ""]]),
        disableFirst: true,
        disablePrevious: true,
        disableNext: true,
    });

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
                        <FolderLink folder={params.value}>
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
    ];

    const subscribeListObjectEvent = () => {
        PubSub.subscribe(TOPIC_LIST_OBJECTS, function (_, data: ListObjectsEventBody) {
            setDisplay("")
            connectionId.current = data.connectionId;
            bucket.current = data.bucket;
            listRootObjects();
        })
    }

    const listRootObjects = () => {
        setLoading(true);
        let req = new models.ListObjectsReq({
            connectionId: connectionId.current,
            bucket: bucket.current,
            continueToken: "",
            prefix: "",
            delimiter: DELIMITER,
            pageSize: PAGE_SIZE,
        })

        ListObjects(req).then((res: models.BaseResponse) => {
            setLoading(false);
            if (res.err_msg != "") {
                let alertBody: AlertEventBody = {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                }
                PubSub.publish(TOPIC_ALERT, alertBody);
            } else {
                if (res.data) {
                    //clear the prefix
                    prefix.current = "";
                    let current = pageInfo.current;
                    current.disableFirst = true;
                    current.disablePrevious = true;
                    setRowData(res.data.objects);
                    setBreadcrumbs([]);
                    // set page info
                    if (res.data.nextContinuationToken != "") {
                        current.continueToken = res.data.nextContinuationToken;
                        current.continueTokenMap.set(current.currentPageNum + 1, res.data.nextContinuationToken);
                        current.disableNext = false;
                    }
                }
            }
        });
    }

    const handleClickBreadcrumb = (event: any) => {
        let path = event.currentTarget.getAttribute("path");
        if (path) {
            //the path under bucket
            let props: ItemLinkProps = {
                folder: path,
                children: ''
            }
            handleFolderClick(props);
        } else {
            //click bucket to root path
            listRootObjects();
        }
    };

    const handleFolderClick = (props: ItemLinkProps) => {
        setLoading(true);
        prefix.current = "";
        //assemble the query prefix
        let stopIndex = breadcrumbs.findIndex(b => b.path === props.folder);
        if (stopIndex == -1) {
            stopIndex = breadcrumbs.length;
        }
        breadcrumbs.forEach((breadcrumb, i) => {
            if (i <= stopIndex) {
                prefix.current += breadcrumb.path;
            }
        });
        if (prefix.current != "") {
            prefix.current = prefix.current + "/"
        }
        // Click on the breadcrumbs that don't exist, just append it to the prefix
        if (stopIndex == breadcrumbs.length) {
            prefix.current += props.folder;
        }
        let req = new models.ListObjectsReq({
            connectionId: connectionId.current,
            bucket: bucket.current,
            continueToken: "",
            delimiter: DELIMITER,
            prefix: prefix.current,
            pageSize: PAGE_SIZE,
        })
        ListObjects(req).then(res => {
            setLoading(false);
            if (res.err_msg != "") {
                let alertBody: AlertEventBody = {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                }
                PubSub.publish(TOPIC_ALERT, alertBody);
            } else {
                if (res.data) {
                    setRowData(res.data.objects);
                    let currentPath = props.folder.slice(0, -1)
                    let newBreadCrumb: LinkRouterProps = {
                        path: currentPath,
                    }

                    // Click on the breadcrumbs that don't exist, just add it to breadcrumbs list
                    if (stopIndex == breadcrumbs.length) {
                        setBreadcrumbs(prev => [...prev, newBreadCrumb]);
                    } else {
                        // Click on the breadcrumbs that exists, cutoff the sub path
                        setBreadcrumbs(prev => prev.slice(0, stopIndex + 1));
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
            }
        });
    };

    const handleFirstClick = () => {
        setLoading(true);
        let req = new models.ListObjectsReq({
            connectionId: connectionId.current,
            bucket: bucket.current,
            continueToken: "",
            delimiter: DELIMITER,
            prefix: prefix.current,
            pageSize: PAGE_SIZE,
        })
        ListObjects(req).then(res => {
            setLoading(false);
            if (res.err_msg != "") {
                let alertBody: AlertEventBody = {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                }
                PubSub.publish(TOPIC_ALERT, alertBody);
            } else {
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
            }
        });
    };

    const handlePreviousClick = () => {
        let current = pageInfo.current;
        setLoading(true);
        let continueToken = current.continueTokenMap.get(current.currentPageNum - 1);
        let req = new models.ListObjectsReq({
            connectionId: connectionId.current,
            bucket: bucket.current,
            continueToken: continueToken,
            delimiter: DELIMITER,
            prefix: prefix.current,
            pageSize: PAGE_SIZE,
        })

        ListObjects(req).then(res => {
            setLoading(false);
            if (res.err_msg != "") {
                let alertBody: AlertEventBody = {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                }
                PubSub.publish(TOPIC_ALERT, alertBody);
            } else {
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
            }
        });
    };

    const handleNextClick = () => {
        setLoading(true);
        let req = new models.ListObjectsReq({
            connectionId: connectionId.current,
            bucket: bucket.current,
            continueToken: pageInfo.current.continueToken,
            delimiter: DELIMITER,
            prefix: prefix.current,
            pageSize: PAGE_SIZE,
        })
        ListObjects(req).then(res => {
            setLoading(false);
            if (res.err_msg != "") {
                let alertBody: AlertEventBody = {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg
                }
                PubSub.publish(TOPIC_ALERT, alertBody);
            } else {
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
            }
        });
    };

    React.useEffect(() => {
        subscribeListObjectEvent();
    }, []);

    return (
        <Box sx={{ display: display }}>
            <Breadcrumbs aria-label="breadcrumb" style={{ marginBottom: 10 }}>
                <LinkRouter
                    underline="hover"
                    color="inherit"
                    path=""
                    sx={{ cursor: "pointer" }}
                    onClick={handleClickBreadcrumb}
                >
                    {bucket.current}
                </LinkRouter>
                {breadcrumbs.map((value, index) => {
                    const last = index === breadcrumbs.length - 1;
                    return last ? (
                        <Typography color="text.primary" key={value.path}>
                            {value.path}
                        </Typography>
                    ) : (
                        <LinkRouter
                            underline="hover"
                            color="inherit"
                            path={value.path}
                            sx={{ cursor: "pointer" }}
                            onClick={handleClickBreadcrumb}
                        >
                            {value.path}
                        </LinkRouter>
                    );
                })}
            </Breadcrumbs>
            <div style={{ height: '87vh', width: '100%' }}>
                <DataGrid
                    pageSizeOptions={[PAGE_SIZE]}
                    paginationMode="server"
                    rowHeight={35}
                    loading={loading}
                    columns={columns}
                    rows={rowData}
                    hideFooter={true}
                />
            </div>

            <Pagination
                color="primary"
                showFirstButton
                sx={{
                    marginTop: 1,
                    marginBottom: 1,
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
        </Box >
    );
}