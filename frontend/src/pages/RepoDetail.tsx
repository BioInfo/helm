import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRepo } from "@/api/repos";
import { SessionList } from "@/components/session/SessionList";
import { FileBrowserSheet } from "@/components/file-browser/FileBrowserSheet";
import { RepoDetailHeader } from "@/components/layout/RepoDetailHeader";
import { SwitchConfigDialog } from "@/components/repo/SwitchConfigDialog";
import { RepoMcpDialog } from "@/components/repo/RepoMcpDialog";
import { useCreateSession } from "@/hooks/useOpenCode";
import { API_BASE_URL, OPENCODE_API_ENDPOINT } from "@/config";
import { useServerUrlForDirectory } from "@/stores/serverStore";
import { useSwipeBack } from "@/hooks/useMobile";

import { Loader2, Terminal } from "lucide-react";

export function RepoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const repoId = parseInt(id || "0");
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  const [switchConfigOpen, setSwitchConfigOpen] = useState(false);
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  
  const handleSwipeBack = useCallback(() => {
    navigate("/");
  }, [navigate]);
  
  const { bind: bindSwipe, swipeStyles } = useSwipeBack(handleSwipeBack, {
    enabled: !fileBrowserOpen && !switchConfigOpen,
  });
  
  useEffect(() => {
    return bindSwipe(pageRef.current);
  }, [bindSwipe]);

  const { data: repo, isLoading: repoLoading } = useQuery({
    queryKey: ["repo", repoId],
    queryFn: () => getRepo(repoId),
    enabled: !!repoId,
  });

  const { data: settings } = useQuery({
    queryKey: ["opencode-config"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/settings/opencode-configs/default`);
      if (!response.ok) throw new Error("Failed to fetch config");
      return response.json();
    },
  });

  const repoDirectory = repo?.fullPath;
  const discoveredServerUrl = useServerUrlForDirectory(repoDirectory);
  
  const opcodeUrl = useMemo(() => {
    if (discoveredServerUrl) return discoveredServerUrl;
    if (repo && !repo.isLocal) return OPENCODE_API_ENDPOINT;
    return null;
  }, [discoveredServerUrl, repo]);

  const createSessionMutation = useCreateSession(opcodeUrl, repoDirectory);

  const handleCreateSession = async (options?: {
    agentSlug?: string;
    promptSlug?: string;
  }) => {
    const session = await createSessionMutation.mutateAsync({
      agent: options?.agentSlug,
    });
    navigate(`/repos/${repoId}/sessions/${session.id}`);
  };

  const handleSelectSession = (sessionId: string) => {
    navigate(`/repos/${repoId}/sessions/${sessionId}`);
  };

  if (repoLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">
          Repository not found
        </p>
      </div>
    );
  }
  
  if (repo.cloneStatus !== 'ready') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {repo.cloneStatus === 'cloning' ? 'Cloning repository...' : 'Repository not ready'}
          </p>
        </div>
      </div>
    );
  }

  const repoName = repo.repoUrl
    ? repo.repoUrl.split("/").pop()?.replace(".git", "") || "Repository"
    : repo.localPath || "Local Repository";
  const branchToDisplay = repo.currentBranch || repo.branch;
  const displayName = branchToDisplay ? `${repoName} (${branchToDisplay})` : repoName;
  const currentBranch = repo.currentBranch || repo.branch || "main";

  return (
    <div 
      ref={pageRef}
      className="h-dvh max-h-dvh overflow-hidden bg-gradient-to-br from-background via-background to-background flex flex-col"
      style={swipeStyles}
    >
<RepoDetailHeader
        repoName={repoName}
        repoId={repoId}
        currentBranch={currentBranch}
        isWorktree={repo.isWorktree || false}
        repoUrl={repo.repoUrl}
        onMcpClick={() => setMcpDialogOpen(true)}
        onFilesClick={() => setFileBrowserOpen(true)}
        onNewSession={handleCreateSession}
        disabledNewSession={!opcodeUrl || createSessionMutation.isPending}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {opcodeUrl && repoDirectory ? (
          <SessionList
            opcodeUrl={opcodeUrl}
            directory={repoDirectory}
            onSelectSession={handleSelectSession}
          />
        ) : repo?.isLocal ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Terminal className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">OpenCode Not Running</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Start OpenCode in this project directory to view and create sessions:
            </p>
            <code className="px-4 py-2 bg-muted rounded-lg text-sm font-mono text-foreground">
              cd {repoDirectory} && opencode
            </code>
            <p className="text-xs text-muted-foreground/70 mt-4">
              Helm will automatically detect the running instance
            </p>
          </div>
        ) : null}
      </div>

      <FileBrowserSheet
        isOpen={fileBrowserOpen}
        onClose={() => setFileBrowserOpen(false)}
        basePath={repo.localPath}
        repoName={displayName}
      />

      <RepoMcpDialog
        open={mcpDialogOpen}
        onOpenChange={setMcpDialogOpen}
        config={settings}
        directory={repoDirectory}
      />

{repo && (
          <SwitchConfigDialog
            open={switchConfigOpen}
            onOpenChange={setSwitchConfigOpen}
            repoId={repoId}
            currentConfigName={repo.openCodeConfigName}
            onConfigSwitched={(configName) => {
              queryClient.setQueryData(["repo", repoId], {
                ...repo,
                openCodeConfigName: configName,
              });
            }}
          />
        )}
    </div>
  );
}
