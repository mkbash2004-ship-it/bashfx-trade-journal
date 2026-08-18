import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import UploadTrades from "./pages/UploadTrades";
import WeeklyTrades from "./pages/WeeklyTrades";
import WeeklySummary from "./pages/WeeklySummary";
import Tutorial from "./pages/Tutorial";
import MonthlySummary from "./pages/MonthlySummary";
import Community from "./pages/Community";
import BackupExport from "./pages/BackupExport";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/upload"} component={UploadTrades} />
      <Route path={"/trades"} component={WeeklyTrades} />
      <Route path={"/summary"} component={WeeklySummary} />
      <Route path={"/monthly-summary"} component={MonthlySummary} />
      <Route path={"/community"} component={Community} />
      <Route path={"/backup"} component={BackupExport} />
      <Route path={"/tutorial"} component={Tutorial} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <DashboardLayout><Router /></DashboardLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
