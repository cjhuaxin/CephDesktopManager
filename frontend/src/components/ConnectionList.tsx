import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { Box, Collapse, Divider, ListItemButton, ListItemText } from '@mui/material';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import PubSub from "pubsub-js";
import * as React from 'react';
import { models } from '../../wailsjs/go/models';
import { ListBuckets } from "../../wailsjs/go/service/Bucket";
import { GetSavedConnectionList } from "../../wailsjs/go/service/Connection";
import { ALERT_TYPE_ERROR, TOPIC_ALERT, TOPIC_LIST_OBJECTS, TOPIC_LOADING, TOPIC_REFRESH_BUCKET_LIST, TOPIC_REFRESH_CONNECTION_LIST } from '../constants/Pubsub';
import { ConnectionItem } from '../dto/BackendRes';
import ConnectionMore from './ConnectionMore';
import CreateBucket from './CreateBucket';
import GlobalConfirm from './GlobalConfirm';

const ConnectionList = () => {

    // state definitions
    const [connectionList, setConnectionList] = React.useState(Array<ConnectionItem>);
    const [currentSelectedConn, setCurrentSelectedConn] = React.useState("");
    const [currentSelectedBucket, setCurrentSelectedBucket] = React.useState("");
    const [expandMap, setExpandMap] = React.useState(new Map<string, boolean>());
    const [connectionBucketsMap, setConnectionBucketsMap] = React.useState(new Map<string, string[]>());

    const handleClickItem = (event: any) => {
        let itemId = event.currentTarget.getAttribute("data-item-id")
        setCurrentSelectedConn(itemId)
        //change the expand state
        if (expandMap.get(itemId)) {
            setExpandMap(prev => new Map([...prev, [itemId, false]]));
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
        const res = await ListBuckets(req);
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
        setCurrentSelectedBucket(bucket);
        PubSub.publish(TOPIC_LIST_OBJECTS, {
            connectionId: connectionId,
            bucket: bucket
        });
    }

    const subscribeRefreshConnectionsEvent = () => {
        PubSub.subscribe(TOPIC_REFRESH_CONNECTION_LIST, function () {
            queryConnectionList();
        })
    }

    const subscribeRefreshBucketsEvent = () => {
        PubSub.subscribe(TOPIC_REFRESH_BUCKET_LIST, function (_, connectionId: string) {
            listBuckets(connectionId);
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
                                <CreateBucket connectionId={item.id} hidden={!expandMap.get(item.id)} />
                                <ConnectionMore connectionId={item.id} connectionName={item.name} hidden={!expandMap.get(item.id)} />
                                {expandMap.get(item.id) ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>
                            <Collapse in={expandMap.get(item.id)} timeout="auto" unmountOnExit>
                                <List
                                    component="div"
                                >
                                    {
                                        connectionBucketsMap.get(item.id)?.map((bucket: string) => (
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
                                                    selected={bucket === currentSelectedBucket}
                                                    onClick={() => handleBucketClick(item.id, bucket)}
                                                >
                                                    <ListItemText primary={bucket} />
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
