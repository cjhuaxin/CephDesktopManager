import SearchIcon from '@mui/icons-material/Search';
import { IconButton, InputBase, Paper } from "@mui/material";
import React from "react";
import { TOPIC_LIST_OBJECTS, TOPIC_UPDATE_SEARCH_KEYWORD } from "../constants/Pubsub";

export default function SearchInput({ connectionId, bucket, prefix }: any) {

    const searchKeywordRef = React.useRef<HTMLInputElement>();

    const handleSearchKeywordClick = () => {
        //click bucket to root path
        PubSub.publish(TOPIC_LIST_OBJECTS, {
            connectionId: connectionId,
            bucket: bucket,
            prefix: prefix,
            updateBreadcrumbs: false,
            searchKeyword: searchKeywordRef.current!.value,
        });
    }

    const handleSearchKeywordKeyPress = (event: any) => {
        if (event.keyCode == 13) {
            handleSearchKeywordClick();
        }
    }

    const subscribeUpdateSearchKeyword = () => {
        PubSub.subscribe(TOPIC_UPDATE_SEARCH_KEYWORD, function (_, keyword: string) {
            searchKeywordRef.current!.value = keyword;
        })
    }

    React.useEffect(() => {
        subscribeUpdateSearchKeyword();
    }, []);

    return (
        <Paper
            sx={{
                p: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                width: 400,
                marginBottom: 1,
            }}
        >
            <InputBase
                inputRef={searchKeywordRef}
                sx={{ ml: 1, flex: 1 }}
                onKeyUp={handleSearchKeywordKeyPress}
                placeholder="Search Objects"
            />
            <IconButton
                type="button"
                sx={{ p: '10px' }}
                aria-label="search"
                onClick={handleSearchKeywordClick}
            >
                <SearchIcon />
            </IconButton>
        </Paper>
    );
}