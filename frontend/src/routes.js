/**
=========================================================
* Agent IA Scopus - Routes de l'application
=========================================================
*/

import GenerateReport from "layouts/generate-report";
import SignIn from "layouts/authentication/sign-in";
import SignUp from "layouts/authentication/sign-up";
import ReportHistory from "layouts/report-history";

// @mui icons
import Icon from "@mui/material/Icon";

const routes = [
  {
    type: "collapse",
    name: "Historique des rapports",
    key: "history",
    icon: <Icon fontSize="small">history</Icon>,
    route: "/history",
    component: <ReportHistory />,
  },
  {
    type: "collapse",
    name: "Generer un rapport",
    key: "generate",
    icon: <Icon fontSize="small">description</Icon>,
    route: "/generate",
    component: <GenerateReport />,
  },
  {
    type: "collapse",
    name: "Sign In",
    key: "sign-in",
    icon: <Icon fontSize="small">login</Icon>,
    route: "/authentication/sign-in",
    component: <SignIn />,
  },
  {
    type: "collapse",
    name: "Sign Up",
    key: "sign-up",
    icon: <Icon fontSize="small">assignment</Icon>,
    route: "/authentication/sign-up",
    component: <SignUp />,
  },
];

export default routes;
