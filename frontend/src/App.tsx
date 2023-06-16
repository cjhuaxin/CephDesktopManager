import { Box, FormControl, Grid } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './App.css';
import ConnectionList from './components/ConnectionList';
import GlobalSnackbar from './components/GlobalSnackbar';
import NewConnection from './components/NewConnection';

const cdmTheme = createTheme({
    typography: {
        fontFamily: 'monospace',
        button: {
            textTransform: 'capitalize',
        }
    },
});

function App() {

    return (
        <ThemeProvider theme={cdmTheme}>
            <Box sx={{ flexGrow: 1 }}>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid xs={4}>
                        <FormControl fullWidth sx={{ ml: 2 }}>
                            <NewConnection />
                        </FormControl>
                        <FormControl fullWidth sx={{ ml: -2 }}>
                            <ConnectionList />
                        </FormControl>
                    </Grid>
                    <Grid xs={8}>
                        2
                    </Grid>
                </Grid>
            </Box>
            <GlobalSnackbar />
        </ThemeProvider>
    )
}

export default App
