/**
=========================================================
 * Agent IA Scopus
=========================================================

* Copyright 2023 Creative Tim (https://www.creative-tim.com)

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState, useEffect, useMemo } from "react";

// react-router components
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// Application themes
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

// Dark mode themes
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";

// RTL support
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Application routes
import routes from "routes";

// Application context
import { useMaterialUIController } from "context";

import { isAuthenticated } from "services/api";

export default function App() {
  const [controller] = useMaterialUIController();
  const { direction, darkMode } = controller;
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();

  // Cache for the rtl
  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });

    setRtlCache(cacheRtl);
  }, []);

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }

      if (route.route) {
        return <Route exact path={route.route} element={route.component} key={route.key} />;
      }

      return null;
    });

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={darkMode ? themeDarkRTL : themeRTL}>
        <CssBaseline />
        <Routes>
          {getRoutes(routes)}
          <Route
            path="/"
            element={<Navigate to={isAuthenticated() ? "/generate" : "/authentication/sign-in"} />}
          />
          <Route path="*" element={<Navigate to="/generate" />} />
        </Routes>
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      <Routes>
        {getRoutes(routes)}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated() ? "/generate" : "/authentication/sign-in"} />}
        />
        <Route path="*" element={<Navigate to="/generate" />} />
      </Routes>
    </ThemeProvider>
  );
}
