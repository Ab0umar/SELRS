#define AppName "SELRS"
#define AppVersion "1.0.143"
#define AppPublisher "SELRS"
#define AppExeName "SELRS.exe"
#define BuildDir "publish-win7"
#define OutputDir "installer"
#define OutputBaseFilenameSuffix "-Desktop-Win7"

[Setup]
AppId={{5E7B4EE7-2A95-45C2-8EB6-A79ED52E1C44}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\SELRS
DefaultGroupName=SELRS
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename=SELRS-Setup-Win7-{#AppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x86 x64
PrivilegesRequired=admin
SetupIconFile=SelrsDesktop\assets\app.ico
UninstallDisplayIcon={app}\SELRS.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"
Name: "autostart"; Description: "Start SELRS with Windows"; GroupDescription: "Startup options:"

[Files]
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.WebView2\*"
Source: "SELRS.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\SELRS"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\{#AppExeName}"
Name: "{autodesktop}\SELRS"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{userstartup}\SELRS"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\{#AppExeName}"; Tasks: autostart

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch SELRS"; Flags: nowait postinstall skipifsilent
