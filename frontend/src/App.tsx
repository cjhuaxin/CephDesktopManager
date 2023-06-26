import { Box, CssBaseline, FormControl, Grid } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './App.css';
import ConnectionList from './components/ConnectionList';
import GlobalLoading from './components/GlobalLoading';
import GlobalSnackbar from './components/GlobalSnackbar';
import NewConnection from './components/NewConnection';
import ObjectListTable from './components/ObjectListTable';

const cdmTheme = createTheme({
    typography: {
        fontFamily: 'monospace',
        button: {
            textTransform: 'capitalize',
        }
    },
    palette: {
        mode: 'dark',
    },
});

function App() {

    return (
        <ThemeProvider theme={cdmTheme}>
            <CssBaseline />
            <Box sx={{ flexGrow: 1}}>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid xs={3}>
                        <FormControl fullWidth sx={{ ml: 4 }}>
                            <NewConnection />
                        </FormControl>
                        <FormControl fullWidth>
                            <ConnectionList />
                        </FormControl>
                    </Grid>
                    <Grid xs={9}>
                        <ObjectListTable />
                    </Grid>
                </Grid>
            </Box>
            <GlobalSnackbar />
            <GlobalLoading />
        </ThemeProvider>
    )
}

export default App
