import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import type { GameSettings } from "./engine/types";
import { ModeSelect } from "./components/ModeSelect";
import { PassAndPlay } from "./modes/PassAndPlay";
import { VsComputer } from "./modes/VsComputer";
import { SoloChallenge } from "./modes/SoloChallenge";

const queryClient = new QueryClient();

function GameRoot() {
  const [settings, setSettings] = useState<GameSettings | null>(null);

  const handleStart = (s: GameSettings) => setSettings(s);
  const handleExit = () => setSettings(null);

  if (!settings) {
    return <ModeSelect onStart={handleStart} />;
  }

  if (settings.mode === "local") {
    return <PassAndPlay key={JSON.stringify(settings)} settings={settings} onExit={handleExit} />;
  }

  if (settings.mode === "vs-computer") {
    return <VsComputer key={JSON.stringify(settings)} settings={settings} onExit={handleExit} />;
  }

  if (settings.mode === "solo") {
    return <SoloChallenge key={JSON.stringify(settings)} settings={settings} onExit={handleExit} />;
  }

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={GameRoot} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
