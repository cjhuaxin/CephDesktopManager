import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Box, Button } from "@mui/material";
import React from "react";
import { PrepareForUploading } from "../../wailsjs/go/service/Object";
import { ALERT_TYPE_ERROR, ALERT_TYPE_SUCCESS, TOPIC_ALERT, TOPIC_LIST_OBJECTS, TOPIC_LOADING } from "../constants/Pubsub";
import { ConnectionDetail } from "../dto/BackendRes";

export default function UploadObject({ bucket, connectionId, prefix }: any) {
    const uploadInputRef = React.useRef<HTMLInputElement>(null);

    const handleUploadClick = () => {
        uploadInputRef.current && uploadInputRef.current.click()
    }

    const handleCapture = (event: any) => {
        // show loading
        PubSub.publish(TOPIC_LOADING, true);
        //can still access file object from uploadOject under the following code
        const uploadOject = event.currentTarget.files[0];
        //reset file input
        event.currentTarget.value = null;
        // get connection details from backend
        PrepareForUploading({
            connectionId: connectionId.current,
        }).then((res) => {
            if (res.err_msg == "") {
                let data: ConnectionDetail = res.data;
                const client = new S3Client({
                    endpoint: data.endpoint,
                    forcePathStyle: data.pathStyle == 1,
                    credentials: {
                        accessKeyId: data.accessKey,
                        secretAccessKey: data.secretKey
                    },
                    region: data.region,
                    // requestHandler: new FetchHttpHandler({
                    //     requestTimeout: 3000,
                    // }),
                });
                let command = new PutObjectCommand({
                    Bucket: bucket.current,
                    Key: prefix.current + uploadOject.name,
                    Body: uploadOject,
                });
                client.send(command).then(s3Res => {
                    PubSub.publish(TOPIC_LIST_OBJECTS, {
                        connectionId: connectionId.current,
                        bucket: bucket.current,
                        prefix: prefix.current,
                        append: false,
                    });
                    PubSub.publish(TOPIC_ALERT, {
                        alertType: ALERT_TYPE_SUCCESS,
                        message: "Upload succeeded",
                    });
                }).catch((err) => {
                    PubSub.publish(TOPIC_ALERT, {
                        alertType: ALERT_TYPE_ERROR,
                        message: err.message,
                    });
                }).finally(() => {
                    // hide loading
                    PubSub.publish(TOPIC_LOADING, false);
                });
            } else {
                // hide loading
                PubSub.publish(TOPIC_LOADING, false);
                PubSub.publish(TOPIC_ALERT, {
                    alertType: ALERT_TYPE_ERROR,
                    message: res.err_msg,
                });
            }
        });
    };

    return (
        <Box>
            <Button
                sx={{ float: "right", mt: -0.5, mr: 1 }}
                variant="contained"
                size="small"
                onClick={handleUploadClick}
            >Upload
            </Button>
            <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleCapture}
            />
        </Box>
    );
}
