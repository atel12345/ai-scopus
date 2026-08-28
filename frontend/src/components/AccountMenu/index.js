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
import { getCurrentUserEmail, logoutUser } from "services/api";

function AccountMenu() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const email = getCurrentUserEmail();

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
        sx={{ color: "#123c43" }}
      >
        <AccountCircleIcon fontSize="large" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem disabled sx={{ opacity: 1, minWidth: 230 }}>
          <Avatar sx={{ width: 28, height: 28, mr: 1.5, bgcolor: "#123c43" }}>
            <AccountCircleIcon fontSize="small" />
          </Avatar>
          <Typography noWrap sx={{ color: "#123c43", fontSize: 13, maxWidth: 180 }}>
            {email || "Utilisateur connecte"}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "#aa4530", fontSize: 13 }}>
          <LogoutIcon sx={{ mr: 1.5, fontSize: 19 }} />
          Se deconnecter
        </MenuItem>
      </Menu>
    </>
  );
}

export default AccountMenu;
