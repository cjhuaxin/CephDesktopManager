import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import * as React from 'react';
import { TOPIC_CONFIRM } from '../constants/Pubsub';
import { ConfirmEventBody } from '../dto/Frontend';

export default function GlobalConfirm() {
    const [open, setOpen] = React.useState(false);
    const data = React.useRef<ConfirmEventBody>({
        title: "",
        content: "",
        confirmCallback: () => { },
    });

    const handleDialagClick = (event: any) => {
        event.stopPropagation();
    }

    const handleClose = (event: any) => {
        event.stopPropagation();
        setOpen(false);
    };

    const handleClickConfirmBtn = (event: any) => {
        event.stopPropagation();
        // execute the callback function
        data.current.confirmCallback();
        setOpen(false);
    };

    const subscribeConfirmEvent = () => {
        PubSub.subscribe(TOPIC_CONFIRM, function (_, arg: ConfirmEventBody) {
            setOpen(true);
            data.current = arg
        })
    }

    React.useEffect(() => {
        subscribeConfirmEvent();
    }, []);

    return (
        <div>
            <Dialog
                open={open}
                onClick={handleDialagClick}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {data.current.title}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {data.current.content}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleClickConfirmBtn}>Confirm</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}