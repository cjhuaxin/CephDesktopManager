import { Button } from "@mui/material";
import ConnectionDetailDialog from "./ConnectionDetailDialog";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { TOPIC_CONNECTION_DETAIL } from "../constants/Pubsub";

export default function NewConnection() {
    const handleClickNewConnection = () => {
        PubSub.publish(TOPIC_CONNECTION_DETAIL, {
            title: "New S3 Protocol Connection",
        });
    };


    return (
        <div>
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleClickNewConnection}>
                New Connection
            </Button>
            <ConnectionDetailDialog />
        </div>
    );
}