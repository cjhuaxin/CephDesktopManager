import { ExpandLess, ExpandMore } from '@mui/icons-material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import { ALERT_TYPE_ERROR, TOPIC_ALERT } from '../constants/Pubsub';
import { ConnectionItem } from '../dto/BackendRes';
import { AlertEventBody } from '../dto/Frontend';

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
            setExpandMap(prev => new Map([...prev, [itemId, true]]));
            //list buckets
            listBuckets(itemId);
        }
    }

    const queryConnectionList = async () => {
        const res = await GetSavedConnectionList();
        if (res.data) {
            setConnectionList(res.data);
        }
    }

    const listBuckets = async (connectionId: string) => {
        let req = new models.ListBucketsReq();
        req.connectionId = connectionId;
        console.log(req);
        const res = await ListBuckets(req);
        if (res.err_msg != "") {
            let alertBody: AlertEventBody = {
                alertType: ALERT_TYPE_ERROR,
                message: res.err_msg
            }
            PubSub.publish(TOPIC_ALERT, alertBody);
            return;
        }
        if (res.data) {
            connectionBucketsMap.set(connectionId, res.data);
        }
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
                                defaultCollapseIcon={<ExpandMoreIcon />}
                                defaultExpandIcon={<ChevronRightIcon />}
                            >
                                {
                                    connectionBucketsMap.get(item.id)?.map((item: string) => (
                                        <TreeItem nodeId="1" label="Applications">
                                            <TreeItem nodeId="2" label="Calendar" />
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
