import { Backdrop, CircularProgress } from "@mui/material";
import React from "react";
import { TOPIC_LOADING } from "../constants/Pubsub";

export default function GlobalLoading() {
    const [show, setShow] = React.useState(false);

    const subscribeLoadingEvent = () => {
        PubSub.subscribe(TOPIC_LOADING, function (_, data: boolean) {
            setShow(data);
        })
    }

    React.useEffect(() => {
        subscribeLoadingEvent();
    }, []);

    return (
        <Backdrop
            open={show}
        >
            <CircularProgress color="inherit" />
        </Backdrop>
    );
}
