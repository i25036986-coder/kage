import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAppState } from "@/lib/app-state";
import {
  ArrowLeft,
  Image,
  Lock,
  AlertTriangle,
  PanelLeft,
  Keyboard,
  Paintbrush,
  Film,
  Palette,
  Layers,
  Upload,
  Loader2,
} from "lucide-react";
import type { AppSettings, BackgroundMode, PanelBackground } from "@shared/schema";

const backgroundColors = [
  "#1a1a2e", // dark blue
  "#16213e", // navy
  "#1f1f1f", // charcoal
  "#0f0f0f", // black
  "#2d1b4e", // dark purple
  "#1b3a4b", // dark teal
  "#2b1a1a", // dark red
  "#1a2b1a", // dark green
];

const defaultPanelBg: PanelBackground = {
  mode: "default",
  color: "#1a1a2e",
  image: null,
  video: null,
  opacity: 100,
};

type PanelKey = "mainPanelBackground" | "sidebarBackground" | "detailsPanelBackground";

const panelOptions: { key: PanelKey; label: string }[] = [
  { key: "mainPanelBackground", label: "Main Content Area" },
  { key: "sidebarBackground", label: "Sidebar" },
  { key: "detailsPanelBackground", label: "Details Panel" },
];

export default function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isSidebarAutoHide, setSidebarAutoHide } = useAppState();
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedPanel, setSelectedPanel] = useState<PanelKey>("mainPanelBackground");
  const [panelImageUrl, setPanelImageUrl] = useState("");
  const [panelVideoUrl, setPanelVideoUrl] = useState("");
  const [localOpacity, setLocalOpacity] = useState<number | null>(null);
  const [localPanelOpacity, setLocalPanelOpacity] = useState<number | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const globalImageInputRef = useRef<HTMLInputElement>(null);
  const globalVideoInputRef = useRef<HTMLInputElement>(null);
  const panelImageInputRef = useRef<HTMLInputElement>(null);
  const panelVideoInputRef = useRef<HTMLInputElement>(null);
  
  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      return response.json() as Promise<{ url: string; type: "image" | "video" }>;
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (
    file: File,
    target: "globalImage" | "globalVideo" | "panelImage" | "panelVideo"
  ) => {
    const result = await uploadMutation.mutateAsync(file);
    if (target === "globalImage") {
      handleUpdate({ backgroundImage: result.url });
    } else if (target === "globalVideo") {
      handleUpdate({ backgroundVideo: result.url });
    } else if (target === "panelImage") {
      handlePanelBgUpdate({ image: result.url });
    } else if (target === "panelVideo") {
      handlePanelBgUpdate({ video: result.url });
    }
  };

  const debouncedUpdate = useCallback((updates: Partial<AppSettings>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateSettingsMutation.mutate(updates);
    }, 500);
  }, []);

  const settingsImageUrl = settings?.backgroundImage || "";
  const settingsVideoUrl = settings?.backgroundVideo || "";

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AppSettings>) => {
      const response = await apiRequest("PATCH", "/api/settings", updates);
      return response.json();
    },
    onSuccess: (_, updates) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      if (updates.backgroundImage !== undefined) {
        setImageUrl("");
      }
      if (updates.backgroundVideo !== undefined) {
        setVideoUrl("");
      }
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save settings",
        description: "There was an error saving your settings",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = (updates: Partial<AppSettings>) => {
    updateSettingsMutation.mutate(updates);
  };

  const getCurrentPanelBg = (): PanelBackground => {
    if (!settings) return defaultPanelBg;
    return settings[selectedPanel] || defaultPanelBg;
  };

  const handlePanelBgUpdate = (updates: Partial<PanelBackground>) => {
    const current = getCurrentPanelBg();
    const newBg = { ...current, ...updates };
    handleUpdate({ [selectedPanel]: newBg } as Partial<AppSettings>);
    if (updates.image !== undefined) setPanelImageUrl("");
    if (updates.video !== undefined) setPanelVideoUrl("");
  };

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
        <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Thumbnails
              </CardTitle>
              <CardDescription>
                Configure how thumbnails are stored and displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="save-thumbnails">Save thumbnails locally</Label>
                  <p className="text-sm text-muted-foreground">
                    Download and store thumbnails on your device
                  </p>
                </div>
                <Switch
                  id="save-thumbnails"
                  checked={settings.saveThumbnailsLocally}
                  onCheckedChange={(checked) => handleUpdate({ saveThumbnailsLocally: checked })}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-save-thumbnails"
                />
              </div>

              {settings.saveThumbnailsLocally && (
                <RadioGroup
                  value={settings.thumbnailSaveMode}
                  onValueChange={(value: "only_if_fails" | "always_prefer_local") =>
                    handleUpdate({ thumbnailSaveMode: value })
                  }
                  className="pl-4 border-l-2 border-muted space-y-3"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="only_if_fails" id="only-fails" data-testid="radio-only-fails" />
                    <Label htmlFor="only-fails" className="font-normal cursor-pointer">
                      Only if remote fails
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="always_prefer_local" id="always-local" data-testid="radio-always-local" />
                    <Label htmlFor="always-local" className="font-normal cursor-pointer">
                      Always prefer local
                    </Label>
                  </div>
                </RadioGroup>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Vault Security
              </CardTitle>
              <CardDescription>
                Control access and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="vault-enabled">Enable Vault</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security with vault locking
                  </p>
                </div>
                <Switch
                  id="vault-enabled"
                  checked={settings.vaultEnabled}
                  onCheckedChange={(checked) => handleUpdate({ vaultEnabled: checked })}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-vault-enabled"
                />
              </div>

              {settings.vaultEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label>Unlock Duration</Label>
                    <RadioGroup
                      value={settings.vaultUnlockDuration.toString()}
                      onValueChange={(value) => handleUpdate({ vaultUnlockDuration: parseInt(value) })}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="30" id="30min" data-testid="radio-30min" />
                        <Label htmlFor="30min" className="font-normal cursor-pointer">
                          30 minutes (default)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="60" id="60min" data-testid="radio-60min" />
                        <Label htmlFor="60min" className="font-normal cursor-pointer">
                          60 minutes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="-1" id="manual" data-testid="radio-manual" />
                        <Label htmlFor="manual" className="font-normal cursor-pointer">
                          Until manually locked
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Panic Mode
              </CardTitle>
              <CardDescription>
                Emergency security features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="panic-enabled">Enable Panic Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Instantly blur all content and lock vault when activated
                  </p>
                </div>
                <Switch
                  id="panic-enabled"
                  checked={settings.panicModeEnabled}
                  onCheckedChange={(checked) => handleUpdate({ panicModeEnabled: checked })}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="switch-panic-enabled"
                />
              </div>

              {settings.panicModeEnabled && (
                <div className="p-3 rounded-md bg-destructive/10 text-sm text-muted-foreground">
                  When panic mode is activated:
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>All thumbnails are instantly blurred</li>
                    <li>File details are hidden</li>
                    <li>Media playback stops immediately</li>
                    <li>Vault is locked (if enabled)</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PanelLeft className="h-5 w-5" />
                Sidebar Behavior
              </CardTitle>
              <CardDescription>
                Configure how the sidebar displays
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-hide">Auto-hide sidebar</Label>
                  <p className="text-sm text-muted-foreground">
                    Sidebar hides automatically when mouse moves away
                  </p>
                </div>
                <Switch
                  id="auto-hide"
                  checked={isSidebarAutoHide}
                  onCheckedChange={(checked) => setSidebarAutoHide(checked)}
                  data-testid="switch-auto-hide"
                />
              </div>

              {isSidebarAutoHide && (
                <div className="p-3 rounded-md bg-muted text-sm text-muted-foreground">
                  Move your mouse to the left edge of the screen to show the sidebar
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5" />
                Global Background
              </CardTitle>
              <CardDescription>
                Set the app-wide background that appears behind all panels. This is visible when panel backgrounds are set to "Default".
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Background Mode</Label>
                <RadioGroup
                  value={settings.backgroundMode}
                  onValueChange={(value: BackgroundMode) => handleUpdate({ backgroundMode: value })}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="default" id="bg-default" data-testid="radio-bg-default" />
                    <Label htmlFor="bg-default" className="font-normal cursor-pointer flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Default
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="color" id="bg-color" data-testid="radio-bg-color" />
                    <Label htmlFor="bg-color" className="font-normal cursor-pointer flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Solid Color
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="image" id="bg-image" data-testid="radio-bg-image" />
                    <Label htmlFor="bg-image" className="font-normal cursor-pointer flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Image
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="video" id="bg-video" data-testid="radio-bg-video" />
                    <Label htmlFor="bg-video" className="font-normal cursor-pointer flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Video
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {settings.backgroundMode === "color" && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Background Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {backgroundColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-10 w-10 rounded-md transition-all ${
                          settings.backgroundColor === color ? "ring-2 ring-offset-2 ring-primary" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleUpdate({ backgroundColor: color })}
                        data-testid={`button-bg-color-${color}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Label>Custom:</Label>
                    <Input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) => debouncedUpdate({ backgroundColor: e.target.value })}
                      className="w-16 h-9 p-1 cursor-pointer"
                      data-testid="input-bg-color-custom"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{settings.backgroundColor}</span>
                  </div>
                </div>
              )}

              {settings.backgroundMode === "image" && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Image URL or Upload</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter image URL..."
                      value={imageUrl || settingsImageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      data-testid="input-bg-image"
                    />
                    <Button
                      onClick={() => handleUpdate({ backgroundImage: imageUrl || settingsImageUrl })}
                      disabled={(!imageUrl && !settingsImageUrl) || updateSettingsMutation.isPending}
                      data-testid="button-apply-bg-image"
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => globalImageInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-bg-image"
                    >
                      {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input
                      ref={globalImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "globalImage");
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {(imageUrl || settingsImageUrl) && (
                    <div className="relative h-24 rounded-md overflow-hidden">
                      <img
                        src={imageUrl || settingsImageUrl}
                        alt="Background preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {settings.backgroundMode === "video" && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Video URL or Upload</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter video URL..."
                      value={videoUrl || settingsVideoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      data-testid="input-bg-video"
                    />
                    <Button
                      onClick={() => handleUpdate({ backgroundVideo: videoUrl || settingsVideoUrl })}
                      disabled={(!videoUrl && !settingsVideoUrl) || updateSettingsMutation.isPending}
                      data-testid="button-apply-bg-video"
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => globalVideoInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-bg-video"
                    >
                      {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input
                      ref={globalVideoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "globalVideo");
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Video will loop silently in the background. For best performance, use short clips (max 100MB).
                  </p>
                </div>
              )}

              {settings.backgroundMode !== "default" && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Background Opacity</Label>
                  <div className="flex gap-4 items-center">
                    <Slider
                      value={[localOpacity ?? settings.backgroundOpacity]}
                      onValueChange={(value) => setLocalOpacity(value[0])}
                      onValueCommit={(value) => {
                        handleUpdate({ backgroundOpacity: value[0] });
                        setLocalOpacity(null);
                      }}
                      min={10}
                      max={100}
                      step={5}
                      className="flex-1"
                      data-testid="slider-bg-opacity"
                    />
                    <span className="text-sm text-muted-foreground w-12">{localOpacity ?? settings.backgroundOpacity}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Panel Backgrounds
              </CardTitle>
              <CardDescription>
                Customize individual panel backgrounds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Select Panel</Label>
                <Select value={selectedPanel} onValueChange={(value) => setSelectedPanel(value as PanelKey)}>
                  <SelectTrigger data-testid="select-panel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {panelOptions.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Background Mode</Label>
                <RadioGroup
                  value={getCurrentPanelBg().mode}
                  onValueChange={(value: BackgroundMode) => handlePanelBgUpdate({ mode: value })}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="default" id="panel-bg-default" data-testid="radio-panel-bg-default" />
                    <Label htmlFor="panel-bg-default" className="font-normal cursor-pointer">Default</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="color" id="panel-bg-color" data-testid="radio-panel-bg-color" />
                    <Label htmlFor="panel-bg-color" className="font-normal cursor-pointer">Solid Color</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="image" id="panel-bg-image" data-testid="radio-panel-bg-image" />
                    <Label htmlFor="panel-bg-image" className="font-normal cursor-pointer">Image</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="video" id="panel-bg-video" data-testid="radio-panel-bg-video" />
                    <Label htmlFor="panel-bg-video" className="font-normal cursor-pointer">Video</Label>
                  </div>
                </RadioGroup>
              </div>

              {getCurrentPanelBg().mode === "color" && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Background Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {backgroundColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-10 w-10 rounded-md transition-all ${
                          getCurrentPanelBg().color === color ? "ring-2 ring-offset-2 ring-primary" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handlePanelBgUpdate({ color })}
                        data-testid={`button-panel-bg-color-${color}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Label>Custom:</Label>
                    <Input
                      type="color"
                      value={getCurrentPanelBg().color}
                      onChange={(e) => {
                        const current = getCurrentPanelBg();
                        const newBg = { ...current, color: e.target.value };
                        debouncedUpdate({ [selectedPanel]: newBg } as Partial<AppSettings>);
                      }}
                      className="w-16 h-9 p-1 cursor-pointer"
                      data-testid="input-panel-bg-color-custom"
                    />
                  </div>
                </div>
              )}

              {getCurrentPanelBg().mode === "image" && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Image URL or Upload</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter image URL..."
                      value={panelImageUrl || getCurrentPanelBg().image || ""}
                      onChange={(e) => setPanelImageUrl(e.target.value)}
                      data-testid="input-panel-bg-image"
                    />
                    <Button
                      onClick={() => handlePanelBgUpdate({ image: panelImageUrl || getCurrentPanelBg().image })}
                      disabled={!panelImageUrl && !getCurrentPanelBg().image}
                      data-testid="button-apply-panel-bg-image"
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => panelImageInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-panel-bg-image"
                    >
                      {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input
                      ref={panelImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "panelImage");
                        e.target.value = "";
                      }}
                    />
                  </div>
                  {(panelImageUrl || getCurrentPanelBg().image) && (
                    <div className="relative h-24 rounded-md overflow-hidden">
                      <img
                        src={panelImageUrl || getCurrentPanelBg().image || ""}
                        alt="Panel background preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}

              {getCurrentPanelBg().mode === "video" && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Video URL or Upload</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter video URL..."
                      value={panelVideoUrl || getCurrentPanelBg().video || ""}
                      onChange={(e) => setPanelVideoUrl(e.target.value)}
                      data-testid="input-panel-bg-video"
                    />
                    <Button
                      onClick={() => handlePanelBgUpdate({ video: panelVideoUrl || getCurrentPanelBg().video })}
                      disabled={!panelVideoUrl && !getCurrentPanelBg().video}
                      data-testid="button-apply-panel-bg-video"
                    >
                      Apply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => panelVideoInputRef.current?.click()}
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-panel-bg-video"
                    >
                      {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input
                      ref={panelVideoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, "panelVideo");
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Video will loop silently. Max file size: 100MB.
                  </p>
                </div>
              )}

              {getCurrentPanelBg().mode !== "default" && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Panel Opacity</Label>
                  <div className="flex gap-4 items-center">
                    <Slider
                      value={[localPanelOpacity ?? getCurrentPanelBg().opacity]}
                      onValueChange={(value) => setLocalPanelOpacity(value[0])}
                      onValueCommit={(value) => {
                        handlePanelBgUpdate({ opacity: value[0] });
                        setLocalPanelOpacity(null);
                      }}
                      min={10}
                      max={100}
                      step={5}
                      className="flex-1"
                      data-testid="slider-panel-bg-opacity"
                    />
                    <span className="text-sm text-muted-foreground w-12">{localPanelOpacity ?? getCurrentPanelBg().opacity}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Quick access controls for the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Panic Mode Toggle</span>
                  <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">Tab</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vault Toggle</span>
                  <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">Ctrl + Shift + S</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Close Video Player</span>
                  <kbd className="px-2 py-1 rounded bg-muted text-xs font-mono">Escape</kbd>
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">Video Player Shortcuts</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Play/Pause</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted font-mono">Space / K</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Seek -5s</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted font-mono">J / Left</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Seek +5s</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted font-mono">L / Right</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Volume</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted font-mono">Up / Down</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Mute</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted font-mono">M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Fullscreen</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted font-mono">F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Jump to %</span>
                    <kbd className="px-2 py-0.5 rounded bg-muted font-mono">0-9</kbd>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
