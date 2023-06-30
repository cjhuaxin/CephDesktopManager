import { Paper, InputBase, IconButton } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import React from "react";
import { TOPIC_LIST_OBJECTS } from "../constants/Pubsub";

export default function SearchInput({ connectionId, bucket }: any) {

    const searchKeyword = React.useRef("");

    const handleSearchKeywordClick = () => {
        //click bucket to root path
        PubSub.publish(TOPIC_LIST_OBJECTS, {
            connectionId: connectionId,
            bucket: bucket,
            updateBreadcrumbs: false,
            searchKeyword: searchKeyword.current,
        });
    }

    const handleOnChange = (event: any) => {
        searchKeyword.current = event.target.value
    }

    const handleSearchKeywordKeyPress = (event: any) => {
        if (event.keyCode == 13) {
            handleSearchKeywordClick();
        }
    }

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
                onChange={handleOnChange}
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