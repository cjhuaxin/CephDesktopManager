import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
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

    const ItemLink = styled('a')({
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        color: 'inherit',
    });

    interface ItemLinkProps {
        folder: string;
        children: string;
    }

    const [display, setDisplay] = React.useState("none");
    const [loading, setLoading] = React.useState(true);
    const [rowData, setRowData] = React.useState(Array<ListObjectsItem>);
    const [breadcrumbs, setBreadcrumbs] = React.useState(Array<LinkRouterProps>);

    const connectionId = React.useRef("");
    const bucket = React.useRef("");
    const continueToken = React.useRef("");
    const delimiter = "/";

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

    const listRootObjects = async () => {
        let req = new models.ListObjectsReq({
            connectionId: connectionId.current,
            bucket: bucket.current,
            continueToken: continueToken.current,
            delimiter: delimiter,
        })
        const res = await ListObjects(req);
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
                setBreadcrumbs([]);
            }
        }
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
        //assemble the query prefix
        let prefix = "";
        let stopIndex = breadcrumbs.findIndex(b => b.path === props.folder);
        if (stopIndex == -1) {
            stopIndex = breadcrumbs.length;
        }
        breadcrumbs.forEach((breadcrumb, i) => {
            if (i <= stopIndex) {
                prefix += breadcrumb.path;
            }
        });
        if (prefix != "") {
            prefix = prefix + "/"
        }
        // Click on the breadcrumbs that don't exist, just append it to the prefix
        if (stopIndex == breadcrumbs.length) {
            prefix += props.folder;
        }

        let req = new models.ListObjectsReq({
            connectionId: connectionId.current,
            bucket: bucket.current,
            continueToken: continueToken.current,
            delimiter: delimiter,
            prefix: prefix,
        })
        console.log(req);
        setLoading(true);
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

            <DataGrid
                loading={loading}
                rowHeight={35}
                columns={columns}
                rows={rowData}
            />
        </Box >
    );
}