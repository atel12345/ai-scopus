/**
=========================================================
* Agent IA Scopus - Page de generation de rapport bibliometrique
=========================================================
*/

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// @mui material components
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DownloadIcon from "@mui/icons-material/Download";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LinkIcon from "@mui/icons-material/Link";
import LightModeIcon from "@mui/icons-material/LightMode";
import IconButton from "@mui/material/IconButton";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import ScienceIcon from "@mui/icons-material/Science";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import MDProgress from "components/MDProgress";
import AccountMenu from "components/AccountMenu";
import { setDarkMode, useMaterialUIController } from "context";

// Material Dashboard 2 React components
// API service
import {
  downloadBlob,
  downloadJobResult,
  getJobStatus,
  isAuthenticated,
  startGenerateReport,
} from "services/api";

function GenerateReport() {
  const navigate = useNavigate();
  const [controller, dispatch] = useMaterialUIController();
  const { darkMode } = controller;
  const [scopusLink, setScopusLink] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    status: "idle",
    step: "",
    current: 0,
    total: 5,
    message: "Prêt à lancer",
    sub_progress: 0,
  });
  const pollingRef = useRef(null);
  const pollingBusyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      window.clearTimeout(pollingRef.current);
    };
  }, []);

  if (!isAuthenticated()) {
    navigate("/authentication/sign-in");
  }

  const toggleTheme = () => setDarkMode(dispatch, !darkMode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!scopusLink || !authorName) {
      setError("Veuillez remplir le lien Scopus et le nom de l'auteur.");
      return;
    }

    window.clearTimeout(pollingRef.current);
    setLoading(true);
    setProgress((currentProgress) => ({
      ...currentProgress,
      status: "running",
      step: "identification",
      current: 0,
      message: "Démarrage du pipeline",
      sub_progress: 0,
    }));
    try {
      const { job_id: jobId } = await startGenerateReport(scopusLink, authorName);
      const pollJob = async () => {
        if (pollingBusyRef.current) return;
        pollingBusyRef.current = true;
        try {
          const status = await getJobStatus(jobId);
          if (!mountedRef.current) return;
          setProgress(status);

          if (status.status === "done") {
            window.clearTimeout(pollingRef.current);
            const { blob, filename } = await downloadJobResult(jobId, status.filename);
            if (!mountedRef.current) return;
            downloadBlob(blob, filename);
            setSuccess("Rapport généré et téléchargé avec succès !");
            setLoading(false);
          } else if (status.status === "error") {
            window.clearTimeout(pollingRef.current);
            setError(status.error || "Erreur lors de la génération du rapport");
            setLoading(false);
          }
          if (status.status === "running" && mountedRef.current) {
            pollingRef.current = window.setTimeout(pollJob, 1000);
          }
          return status;
        } catch (err) {
          if (mountedRef.current) {
            window.clearTimeout(pollingRef.current);
            setError(err.message);
            setLoading(false);
          }
        } finally {
          pollingBusyRef.current = false;
        }
      };

      await pollJob();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const progressPercent =
    progress.status === "done"
      ? 100
      : Math.min(
          99,
          Math.round(((progress.current + (progress.sub_progress || 0)) / progress.total) * 100)
        );
  const stepIndexes = {
    identification: 1,
    fetching_publications: 2,
    processing_authors: 3,
    scimago_enrichment: 3,
    generating_excel: 4,
  };
  const currentStep = progress.status === "done" ? 4 : stepIndexes[progress.step] || 0;
  const pageBackground = darkMode ? "#1a2035" : "#f4f7f8";
  const surface = darkMode ? "#202940" : "#ffffff";
  const primaryText = darkMode ? "#ffffff" : "#123c43";
  const secondaryText = darkMode ? "#d5d9e2" : "#587276";
  const mutedText = darkMode ? "#b9c0cf" : "#647b7e";
  const borderColor = darkMode ? "#536078" : "#aebfc0";
  const pipelineBackground = darkMode ? "#263b3d" : "#123c43";

  return (
    <DashboardLayout>
      <Box
        sx={{
          minHeight: "100vh",
          px: { xs: 2, md: 5 },
          py: { xs: 3, md: 5 },
          background: pageBackground,
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={{ xs: 5, md: 8 }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                bgcolor: darkMode ? "#263b3d" : "#123c43",
                color: "#d7f06a",
                borderRadius: 2,
              }}
            >
              <ScienceIcon />
            </Box>
            <Box>
              <Typography
                sx={{ color: primaryText, fontSize: 14, fontWeight: 800, letterSpacing: 1.5 }}
              >
                AGENT IA
              </Typography>
              <Typography sx={{ color: secondaryText, fontSize: 12, letterSpacing: 2 }}>
                SCOPUS / WORKSPACE
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={toggleTheme}
              aria-label={darkMode ? "Passer au theme clair" : "Passer au theme sombre"}
              title={darkMode ? "Passer au theme clair" : "Passer au theme sombre"}
              sx={{
                color: darkMode ? "#f4c95d" : "#123c43",
                border: `1px solid ${borderColor}`,
                bgcolor: darkMode ? "#263b3d" : "#ffffff",
              }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <AccountMenu />
          </Stack>
        </Stack>
        <Box sx={{ maxWidth: 1240, mx: "auto" }}>
          <Box sx={{ maxWidth: 740, mb: 6 }}>
            <Typography
              sx={{ color: "#e36e43", fontSize: 12, fontWeight: 800, letterSpacing: 2, mb: 2 }}
            >
              NOUVELLE ANALYSE / 01
            </Typography>
            <Typography
              component="h1"
              sx={{
                color: primaryText,
                fontSize: { xs: 38, md: 60 },
                lineHeight: 0.98,
                fontWeight: 800,
                letterSpacing: -2,
                mb: 2,
              }}
            >
              Du profil chercheur
              <br />
              au rapport lisible.
            </Typography>
            <Typography sx={{ color: secondaryText, fontSize: 17, lineHeight: 1.6, maxWidth: 560 }}>
              Centralisez les publications, identifiez les auteurs et exportez une base
              bibliométrique prête à exploiter.
            </Typography>
          </Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.35fr) minmax(280px, .65fr)" },
              gap: 3,
            }}
          >
            <Paper
              component="form"
              onSubmit={handleSubmit}
              elevation={0}
              sx={{
                p: { xs: 3, md: 5 },
                border: `1px solid ${borderColor}`,
                borderRadius: 3,
                bgcolor: surface,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={5}>
                <Box>
                  <Typography sx={{ color: primaryText, fontSize: 22, fontWeight: 800 }}>
                    Source des données
                  </Typography>
                  <Typography sx={{ color: mutedText, fontSize: 13, mt: 0.75 }}>
                    Deux informations suffisent pour lancer le pipeline.
                  </Typography>
                </Box>
                <Chip
                  label="ÉTAPE 01"
                  size="small"
                  sx={{
                    bgcolor: "#edf5d5",
                    color: "#5d731c",
                    fontWeight: 800,
                    fontSize: 10,
                    letterSpacing: 1,
                  }}
                />
              </Stack>
              <Stack
                spacing={3}
                sx={{
                  "& .MuiInputLabel-root": { color: mutedText },
                  "& .MuiInputLabel-root.Mui-focused": { color: primaryText },
                  "& .MuiInputBase-input": {
                    color: primaryText,
                    WebkitTextFillColor: primaryText,
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: darkMode ? "#9eabc1" : "#647b7e",
                    opacity: 1,
                  },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: darkMode ? "#2b3550" : "#ffffff",
                  },
                  "& .MuiInputBase-input:-webkit-autofill": {
                    WebkitBoxShadow: `0 0 0 100px ${darkMode ? "#2b3550" : "#ffffff"} inset`,
                    WebkitTextFillColor: primaryText,
                  },
                  "& .MuiOutlinedInput-notchedOutline": { borderColor },
                  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: secondaryText,
                  },
                  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: primaryText,
                  },
                }}
              >
                <TextField
                  label="Profil Scopus ou Author ID"
                  value={scopusLink}
                  onChange={(e) => setScopusLink(e.target.value)}
                  fullWidth
                  InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1.5, color: "#e36e43" }} /> }}
                />
                <TextField
                  label="Nom de l'auteur"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: <PersonSearchIcon sx={{ mr: 1.5, color: "#e36e43" }} />,
                  }}
                />
              </Stack>
              {(error || success) && (
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: error
                      ? darkMode
                        ? "#542f35"
                        : "#fff0ed"
                      : darkMode
                      ? "#294b3c"
                      : "#edf7e9",
                    color: error ? "#ffb4a8" : "#b9efc5",
                    fontSize: 13,
                  }}
                >
                  {error || success}
                </Box>
              )}
              <Box
                component="button"
                type="submit"
                disabled={loading}
                sx={{
                  mt: 5,
                  width: "100%",
                  p: 2,
                  border: 0,
                  borderRadius: 1.5,
                  bgcolor: loading ? (darkMode ? "#536078" : "#b4c1c2") : "#e36e43",
                  color: "white",
                  cursor: loading ? "wait" : "pointer",
                  fontSize: 14,
                  fontWeight: 800,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                {loading ? "Analyse en cours..." : "Lancer l'analyse"}{" "}
                {!loading && <ArrowForwardIcon sx={{ fontSize: 19 }} />}
              </Box>
              {loading && (
                <Box sx={{ mt: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography sx={{ color: primaryText, fontSize: 13, fontWeight: 700 }}>
                      {progress.message}
                    </Typography>
                    <Typography sx={{ color: secondaryText, fontSize: 12, fontWeight: 700 }}>
                      {progressPercent}%
                    </Typography>
                  </Stack>
                  <MDProgress value={progressPercent} color="success" />
                </Box>
              )}
            </Paper>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                bgcolor: pipelineBackground,
                color: "#ffffff",
              }}
            >
              <Typography
                sx={{
                  color: "#d7f06a",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  mb: 2,
                }}
              >
                PIPELINE IA
              </Typography>
              <Typography
                sx={{ color: "#ffffff", fontSize: 25, lineHeight: 1.15, fontWeight: 800, mb: 4 }}
              >
                Votre rapport prend forme en quatre mouvements.
              </Typography>
              <Stack spacing={2.5}>
                {[
                  "Identification de l'auteur",
                  "Récupération des publications",
                  "Classement par quartile",
                  "Export Excel structuré",
                ].map((step, index) => (
                  <Stack direction="row" spacing={1.5} alignItems="center" key={step}>
                    <Box
                      sx={{
                        minWidth: 28,
                        height: 28,
                        border: `1px solid ${
                          currentStep > index
                            ? "#d7f06a"
                            : currentStep === index + 1
                            ? "#d7f06a"
                            : "#8faeb0"
                        }`,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        color: currentStep >= index + 1 ? "#d7f06a" : "#c7d7d8",
                        fontSize: 12,
                        fontWeight: 800,
                        boxShadow:
                          currentStep === index + 1 ? "0 0 0 5px rgba(215,240,106,.16)" : "none",
                        transition: "all 220ms ease",
                      }}
                    >
                      {currentStep > index ? (
                        <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                      ) : (
                        `0${index + 1}`
                      )}
                    </Box>
                    <Typography
                      sx={{
                        color:
                          currentStep > index || currentStep === index + 1 ? "#ffffff" : "#c7d7d8",
                        fontSize: 14,
                        fontWeight: currentStep === index + 1 ? 700 : 400,
                        transition: "all 220ms ease",
                      }}
                    >
                      {step}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Divider sx={{ borderColor: "rgba(255,255,255,.16)", my: 4 }} />
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircleOutlineIcon sx={{ color: "#d7f06a" }} />
                <Typography sx={{ color: "#d9e6e3", fontSize: 13 }}>
                  Format .xlsx compatible Excel
                </Typography>
              </Stack>
            </Paper>
          </Box>
          <Box
            sx={{
              mt: 3,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: mutedText,
              fontSize: 12,
            }}
          >
            <DownloadIcon sx={{ fontSize: 17 }} /> Le fichier est téléchargé automatiquement après
            traitement.
          </Box>
        </Box>
      </Box>
    </DashboardLayout>
  );
}

export default GenerateReport;
