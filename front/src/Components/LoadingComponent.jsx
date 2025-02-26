import React from "react";
import { Backdrop, CircularProgress, Typography } from "@mui/material";

const LoadingComponent = ({ open, message = "Cargando..." }) => {
    return (
        <Backdrop open={open} sx={{ zIndex: 1301, color: "#fff", flexDirection: "column" }}>
            <CircularProgress color="inherit" />
            <Typography variant="h6" sx={{ mt: 2 }}>{message}</Typography>
        </Backdrop>
    );
};

export default LoadingComponent;
