import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import HistoryIcon from "@mui/icons-material/History";
import { getCurrentUserEmail, logoutUser } from "services/api";
import { useMaterialUIController } from "context";

function AccountMenu() {
  const navigate = useNavigate();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const [anchorEl, setAnchorEl] = useState(null);
  const email = getCurrentUserEmail();
  const menuText = darkMode ? "#ffffff" : "#123c43";
  const menuMutedText = darkMode ? "#d5d9e2" : "#587276";
  const menuSurface = darkMode ? "#202940" : "#ffffff";

  const handleLogout = () => {
    setAnchorEl(null);
    logoutUser();
    navigate("/authentication/sign-in");
  };

  return (
    <>
      <IconButton
        aria-label="Ouvrir le menu du compte"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{ color: darkMode ? "#f4c95d" : "#123c43" }}
      >
        <AccountCircleIcon fontSize="large" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            bgcolor: menuSurface,
            color: menuText,
            border: darkMode ? "1px solid #536078" : "1px solid #dce6e5",
            "& .MuiDivider-root": { borderColor: darkMode ? "#536078" : "#dce6e5" },
            "& .MuiMenuItem-root:hover": {
              bgcolor: darkMode ? "#34415e" : "#edf5d5",
            },
          },
        }}
      >
        <MenuItem
          disabled
          sx={{
            opacity: "1 !important",
            minWidth: 230,
            color: `${menuText} !important`,
            "&.Mui-disabled": { opacity: 1, color: menuText },
          }}
        >
          <Avatar sx={{ width: 28, height: 28, mr: 1.5, bgcolor: "#123c43" }}>
            <AccountCircleIcon sx={{ color: "#d7f06a" }} fontSize="small" />
          </Avatar>
          <Typography noWrap sx={{ color: `${menuText} !important`, fontSize: 13, maxWidth: 180 }}>
            {email || "Utilisateur connecté"}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            navigate("/history");
          }}
          sx={{ color: menuMutedText, fontSize: 13 }}
        >
          <HistoryIcon sx={{ mr: 1.5, fontSize: 19 }} />
          Historique des rapports
        </MenuItem>
        <MenuItem
          onClick={handleLogout}
          sx={{ color: darkMode ? "#ffb4a8" : "#aa4530", fontSize: 13 }}
        >
          <LogoutIcon sx={{ mr: 1.5, fontSize: 19 }} />
          Se déconnecter
        </MenuItem>
      </Menu>
    </>
  );
}

export default AccountMenu;
