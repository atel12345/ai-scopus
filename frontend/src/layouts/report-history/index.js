import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import HistoryIcon from "@mui/icons-material/History";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AccountMenu from "components/AccountMenu";
import {
  downloadBlob,
  downloadHistoryReport,
  getReportHistory,
  isAuthenticated,
} from "services/api";
import { useMaterialUIController } from "context";

function ReportHistory() {
  const navigate = useNavigate();
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/authentication/sign-in");
      return;
    }

    getReportHistory()
      .then(setReports)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  const downloadReport = async (report) => {
    try {
      const { blob, filename } = await downloadHistoryReport(report.id);
      downloadBlob(blob, filename || report.filename);
    } catch (err) {
      setError(err.message);
    }
  };

  const colors = {
    background: darkMode ? "#1a2035" : "#f4f7f8",
    surface: darkMode ? "#202940" : "#ffffff",
    primary: darkMode ? "#ffffff" : "#123c43",
    secondary: darkMode ? "#d5d9e2" : "#587276",
    muted: darkMode ? "#b9c0cf" : "#647b7e",
    border: darkMode ? "#536078" : "#dce6e5",
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        px: { xs: 2, md: 5 },
        py: { xs: 3, md: 5 },
        bgcolor: colors.background,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={{ xs: 5, md: 8 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton
            onClick={() => navigate("/generate")}
            aria-label="Retour à la génération"
            sx={{ color: colors.primary }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box
            sx={{
              width: 42,
              height: 42,
              display: "grid",
              placeItems: "center",
              bgcolor: "#123c43",
              color: "#d7f06a",
              borderRadius: 2,
            }}
          >
            <HistoryIcon />
          </Box>
          <Box>
            <Typography
              sx={{ color: colors.primary, fontSize: 14, fontWeight: 800, letterSpacing: 1.5 }}
            >
              HISTORIQUE
            </Typography>
            <Typography sx={{ color: colors.secondary, fontSize: 12, letterSpacing: 2 }}>
              RAPPORTS SCOPUS
            </Typography>
          </Box>
        </Stack>
        <AccountMenu />
      </Stack>

      <Box sx={{ maxWidth: 1060, mx: "auto" }}>
        <Typography
          sx={{ color: "#e36e43", fontSize: 12, fontWeight: 800, letterSpacing: 2, mb: 2 }}
        >
          VOS ANALYSES
        </Typography>
        <Typography
          component="h1"
          sx={{
            color: colors.primary,
            fontSize: { xs: 38, md: 56 },
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: -2,
            mb: 2,
          }}
        >
          Rapports générés.
        </Typography>
        <Typography sx={{ color: colors.secondary, fontSize: 17, lineHeight: 1.6, mb: 5 }}>
          Retrouvez les rapports Excel produits pour chaque profil chercheur.
        </Typography>

        {error && (
          <Paper
            elevation={0}
            sx={{ p: 2, mb: 3, bgcolor: darkMode ? "#542f35" : "#fff0ed", color: "#ffb4a8" }}
          >
            {error}
          </Paper>
        )}
        {loading && (
          <Typography sx={{ color: colors.secondary }}>
            Chargement de votre historique...
          </Typography>
        )}
        {!loading && !reports.length && (
          <Paper
            elevation={0}
            sx={{
              p: 5,
              textAlign: "center",
              bgcolor: colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Typography sx={{ color: colors.primary, fontWeight: 700 }}>
              Aucun rapport pour le moment.
            </Typography>
            <Typography sx={{ color: colors.muted, mt: 1 }}>
              Lancez une analyse pour la retrouver ici.
            </Typography>
          </Paper>
        )}
        <Stack spacing={2}>
          {reports.map((report) => (
            <Paper
              key={report.id}
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3 },
                bgcolor: colors.surface,
                border: `1px solid ${colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                gap: 2,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 2,
                    bgcolor: darkMode ? "#34415e" : "#edf5d5",
                    color: darkMode ? "#d7f06a" : "#5d731c",
                  }}
                >
                  <HistoryIcon />
                </Box>
                <Box>
                  <Typography sx={{ color: colors.primary, fontWeight: 800 }}>
                    {report.author_name}
                  </Typography>
                  <Typography sx={{ color: colors.muted, fontSize: 13, mt: 0.5 }}>
                    {report.filename}
                  </Typography>
                  <Typography sx={{ color: colors.secondary, fontSize: 12, mt: 0.5 }}>
                    {report.publication_count} publications ·{" "}
                    {new Date(report.created_at).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
              <Box
                component="button"
                onClick={() => downloadReport(report)}
                sx={{
                  border: 0,
                  borderRadius: 1.5,
                  px: 2,
                  py: 1.25,
                  bgcolor: "#e36e43",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontWeight: 700,
                }}
              >
                <DownloadIcon sx={{ fontSize: 18 }} /> Télécharger
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

export default ReportHistory;
