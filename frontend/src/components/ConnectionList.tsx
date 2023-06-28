import { ExpandLess, ExpandMore } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, Collapse, Divider, IconButton, ListItemButton, ListItemText, Typography } from '@mui/material';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import PubSub from "pubsub-js";
import * as React from 'react';
import { models } from '../../wailsjs/go/models';
import { DeleteBucket, ListBuckets } from "../../wailsjs/go/service/Bucket";
import { DeleteConnection, GetSavedConnectionList } from "../../wailsjs/go/service/Connection";
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_CONFIRM, TOPIC_CHANGE_OBJECTS_TABLE_STATE, TOPIC_LIST_OBJECTS, TOPIC_LOADING, TOPIC_REFRESH_BUCKET_LIST, TOPIC_REFRESH_CONNECTION_LIST } from '../constants/Pubsub';
import { BucketDetail, ConnectionItem } from '../dto/BackendRes';
import ConnectionMore from './ConnectionMore';
import CreateBucket from './CreateBucket';

const originBucketStyle = {
    color: "green"
}

const customBucketStyle = {
    color: "blue"
}

const ConnectionList = () => {

    // state definitions
    const [connectionList, setConnectionList] = React.useState(Array<ConnectionItem>);
    const [currentSelectedConn, setCurrentSelectedConn] = React.useState("");
    const [currentSelectedBucket, setCurrentSelectedBucket] = React.useState("");
    const [expandMap, setExpandMap] = React.useState(new Map<string, boolean>());
    const [connectionBucketsMap, setConnectionBucketsMap] = React.useState(new Map<string, BucketDetail[]>());

    const handleClickItem = (event: any) => {
        let itemId = event.currentTarget.getAttribute("data-item-id")
        setCurrentSelectedConn(itemId)
        //change the expand state
        if (expandMap.get(itemId)) {
            setExpandMap(prev => new Map([...prev, [itemId, false]]));
            //hide the object list table
            PubSub.publish(TOPIC_CHANGE_OBJECTS_TABLE_STATE, "none");
            // clear bucket select state
            setCurrentSelectedBucket("");
        } else {
            //list buckets
            listBuckets(itemId);
        }
    }

    const queryConnectionList = async () => {
        // show loading
        PubSub.publish(TOPIC_LOADING, true);
        const res = await GetSavedConnectionList();
        // hide loading
        PubSub.publish(TOPIC_LOADING, false);
        if (res.data) {
            setConnectionList(res.data);
        }
    }

    const listBuckets = async (connectionId: string) => {
        let req = new models.ListBucketsReq();
        req.connectionId = connectionId;
        // show loading
        PubSub.publish(TOPIC_LOADING, true);
        const res = await ListBuckets({
            connectionId: connectionId,
        });
        // hide loading
        PubSub.publish(TOPIC_LOADING, false);
        if (res.err_msg != "") {
            PubSub.publish(TOPIC_ALERT, {
                alertType: ALERT_TYPE_ERROR,
                message: res.err_msg
            });
            return;
        }
        if (res.data) {
            setExpandMap(prev => new Map([...prev, [connectionId, true]]));
            setConnectionBucketsMap(prev => new Map([...prev, [connectionId, res.data]]));
        }
    }

    const handleBucketClick = (connectionId: string, bucket: string) => {
        setCurrentSelectedConn(connectionId);
        setCurrentSelectedBucket(connectionId + "_" + bucket);
        PubSub.publish(TOPIC_LIST_OBJECTS, {
            connectionId: connectionId,
            bucket: bucket
        });
    }

    const handleClickDeleteBucketBtn = (event: any) => {
        event.stopPropagation();
        let connectionId = event.currentTarget.getAttribute("data-connectionn-id")
        let bucket = event.currentTarget.getAttribute("data-bucket")
        let custom = event.currentTarget.getAttribute("data-custom")
        PubSub.publish(TOPIC_CONFIRM, {
            title: "Important",
            content: "Confirm To Delete [" + bucket + "] Bucket ?",
            confirmCallback: () => {
                DeleteBucket({
                    connectionId: connectionId,
                    bucket: bucket,
                    custom: JSON.parse(custom)
                }).then(res => {
                    if (res.err_msg == "") {
                        //hide the object list table
                        PubSub.publish(TOPIC_CHANGE_OBJECTS_TABLE_STATE, "none");
                        PubSub.publish(TOPIC_ALERT, {
                            alertType: ALERT_TYPE_SUCCESS,
                            message: "Delete Bucket [" + bucket + "] Success"
                        });
                        listBuckets(connectionId);
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

    const subscribeRefreshConnectionsEvent = () => {
        PubSub.subscribe(TOPIC_REFRESH_CONNECTION_LIST, function () {
            queryConnectionList();
        })
    }

    const subscribeRefreshBucketsEvent = () => {
        PubSub.subscribe(TOPIC_REFRESH_BUCKET_LIST, function (_, data: any) {
            listBuckets(data.connectionId);
        })
    }

    React.useEffect(() => {
        queryConnectionList();
        subscribeRefreshConnectionsEvent();
        subscribeRefreshBucketsEvent();
    }, []);

    return (
        <Box>
            <List component="nav">
                {
                    connectionList.map((item: ConnectionItem) => (
                        <ListItem
                            key={item.id}
                            style={{ display: 'block' }}
                        >
                            <Divider />
                            <ListItemButton
                                selected={item.id === currentSelectedConn}
                                data-item-id={item.id}
                                onClick={handleClickItem}>
                                <ListItemText primary={item.name} />
                                <CreateBucket connectionId={item.id} />
                                <ConnectionMore connectionId={item.id} connectionName={item.name} />
                                {expandMap.get(item.id) ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                            <Collapse in={expandMap.get(item.id)} timeout="auto" unmountOnExit>
                                <List
                                    component="div"
                                >
                                    {
                                        connectionBucketsMap.get(item.id)?.map((bucket: BucketDetail) => (
                                            <ListItem
                                                key={item.id}
                                                style={{ display: 'block' }}
                                                sx={{
                                                    maxHeight: 40,
                                                }}
                                            >
                                                <ListItemButton
                                                    sx={{
                                                        pl: 2,
                                                        maxHeight: 40,
                                                    }}
                                                    selected={(item.id + "_" + bucket.bucket) === currentSelectedBucket}
                                                    onClick={() => handleBucketClick(item.id, bucket.bucket)}
                                                >
                                                    <ListItemText
                                                        primaryTypographyProps={{ style: bucket.custom ? customBucketStyle : originBucketStyle }}
                                                        primary={bucket.bucket}
                                                    />
                                                    <IconButton
                                                        size="small"
                                                        data-connectionn-id={item.id}
                                                        data-bucket={bucket.bucket}
                                                        data-custom={bucket.custom}
                                                        onClick={handleClickDeleteBucketBtn}
                                                    >
                                                        <DeleteIcon fontSize="inherit" />
                                                    </IconButton>
                                                </ListItemButton>
                                            </ListItem>
                                        ))
                                    }
                                </List>
                            </Collapse>
                        </ListItem>
                    ))
                }
            </List>
        </Box>
    );
};

export default ConnectionList
