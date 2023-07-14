import { Box, CssBaseline, FormControl, Grid, PaletteMode, useMediaQuery } from '@mui/material';
import { grey } from '@mui/material/colors';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import React from 'react';
import './App.css';
import ConnectionList from './components/ConnectionList';
import GlobalConfirm from './components/GlobalConfirm';
import GlobalLoading from './components/GlobalLoading';
import GlobalSnackbar from './components/GlobalSnackbar';
import NewConnection from './components/NewConnection';
import ObjectListTable from './components/ObjectListTable';
import UpgradeDialog from './components/UpgradeDialog';

function App() {
    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });

    const getDesignTokens = (mode: PaletteMode) => ({
        palette: {
            mode,
            ...(mode === 'light'
                ? {
                    // palette values for light mode
                    // primary: amber,
                    // divider: amber[200],
                    // text: {
                    //     primary: grey[900],
                    //     secondary: grey[800],
                    // },
                }
                : {
                    // palette values for dark mode
                    // primary: deepOrange,
                    // divider: deepOrange[700],
                    background: {
                        default: grey[900],
                        paper: grey[900],
                    },
                    // text: {
                    //     primary: '#fff',
                    //     secondary: grey[500],
                    // },
                }),
        }
    });

    console.log("prefersDarkMode", prefersDarkMode)

    // Update the theme only if the mode changes
    const cdmTheme = React.useMemo(() => createTheme({
        typography: {
            fontFamily: [
                'monospace',
                '-apple-system',
                'BlinkMacSystemFont',
                '"Segoe UI"',
                'Roboto',
                '"Helvetica Neue"',
                'Arial',
                'sans-serif',
                '"Apple Color Emoji"',
                '"Segoe UI Emoji"',
                '"Segoe UI Symbol"',
            ].join(','),
            button: {
                textTransform: 'capitalize',
            }
        },
        ...
        getDesignTokens(prefersDarkMode ? "dark" : "light")
    }), [prefersDarkMode]);

    return (
        <ThemeProvider theme={cdmTheme}>
            <CssBaseline />
            <Box sx={{ flexGrow: 1 }}>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid xs={4}>
                        <FormControl fullWidth sx={{ ml: 4 }}>
                            <NewConnection />
                        </FormControl>
                        <FormControl fullWidth>
                            <ConnectionList />
                        </FormControl>
                    </Grid>
                    <Grid xs={8}>
                        <ObjectListTable />
                    </Grid>
                </Grid>
            </Box>
            <GlobalSnackbar />
            <GlobalLoading />
            <GlobalConfirm />
            <UpgradeDialog />
        </ThemeProvider>
    )
}

export default App
