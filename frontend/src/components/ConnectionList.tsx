import { ExpandLess, ExpandMore } from '@mui/icons-material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TreeItem from '@mui/lab/TreeItem';
import TreeView from '@mui/lab/TreeView';
import { Collapse, ListItemButton, ListItemText } from '@mui/material';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import PubSub from "pubsub-js";
import * as React from 'react';
import { models } from '../../wailsjs/go/models';
import { ListBuckets } from "../../wailsjs/go/service/Bucket";
import { GetSavedConnectionList } from "../../wailsjs/go/service/Connection";
import { ALERT_TYPE_ERROR, TOPIC_ALERT, TOPIC_LIST_OBJECTS, TOPIC_LOADING } from '../constants/Pubsub';
import { ConnectionItem } from '../dto/BackendRes';
import { AlertEventBody, ListObjectsEventBody } from '../dto/Frontend';

const ConnectionList = () => {

    // state definitions
    const [connectionList, setConnectionList] = React.useState(Array<ConnectionItem>);
    const [currentSelected, setCurrentSelected] = React.useState("");
    const [expandMap, setExpandMap] = React.useState(new Map<string, boolean>());
    const [connectionBucketsMap, setConnectionBucketsMap] = React.useState(new Map<string, string[]>());

    const handleClickItem = (event: any) => {
        let itemId = event.currentTarget.getAttribute("data-item-id")
        setCurrentSelected(itemId)
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
            let alertBody: AlertEventBody = {
                alertType: ALERT_TYPE_ERROR,
                message: res.err_msg
            }
            PubSub.publish(TOPIC_ALERT, alertBody);
            return;
        }
        if (res.data) {
            setExpandMap(prev => new Map([...prev, [connectionId, true]]));
            setConnectionBucketsMap(prev => new Map([...prev, [connectionId, res.data]]));
        }
    }

    const handleBucketClick = (connectionId: string, bucket: string) => {
        let alertBody: ListObjectsEventBody = {
            connectionId: connectionId,
            bucket: bucket
        }
        PubSub.publish(TOPIC_LIST_OBJECTS, alertBody);
    }

    const subscribeRefreshListEvent = () => {
        PubSub.subscribe(TOPIC_ALERT, function () {
            queryConnectionList();
        })
    }

    React.useEffect(() => {
        queryConnectionList();
        subscribeRefreshListEvent();
    }, []);

    return (
        <List component="nav">
            {
                connectionList.map((item: ConnectionItem) => (
                    <ListItem
                        key={item.id}
                        style={{ display: 'block' }}
                    >
                        <ListItemButton
                            selected={item.id === currentSelected}
                            data-item-id={item.id}
                            onClick={handleClickItem}>
                            <ListItemText primary={item.name} />
                            {expandMap.get(item.id) ? <ExpandLess /> : <ExpandMore />}
                        </ListItemButton>
                        <Collapse in={expandMap.get(item.id)} timeout="auto" unmountOnExit>
                            <TreeView
                                defaultExpandIcon={<ChevronRightIcon />}
                            >
                                {
                                    connectionBucketsMap.get(item.id)?.map((bucket: string) => (
                                        <TreeItem
                                            nodeId={item.id + "_" + bucket}
                                            label={bucket}
                                            onClick={() => handleBucketClick(item.id, bucket)}
                                        >
                                        </TreeItem>
                                    ))
                                }
                            </TreeView>
                        </Collapse>
                    </ListItem>
                ))
            }
        </List>
    );
};

export default ConnectionList
