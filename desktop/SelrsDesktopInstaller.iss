#define AppName "SELRS"
#define AppVersion "1.0.108"
#define AppPublisher "SELRS"
#define AppExeName "SELRS.exe"
#define BuildDir "E:\SELRS.cc\desktop\publish"
#define OutputDir "C:\Users\SELRS\OneDrive\Documents\SELRS.cc"
#define OutputBaseFilenameSuffix "-Desktop"

[Setup]
AppId={{5E7B4EE7-2A95-45C2-8EB6-A79ED52E1C44}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\SELRS
DefaultGroupName=SELRS
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename=SELRS-Desktop-Setup-{#AppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
SetupIconFile=E:\SELRS.cc\desktop\SelrsDesktop\assets\app.ico
UninstallDisplayIcon={app}\SELRS.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"
Name: "autostart"; Description: "Start SELRS with Windows"; GroupDescription: "Startup options:"

[Files]
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.WebView2\*"
Source: "E:\SELRS.cc\desktop\SELRS.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\SELRS"; Filename: "{app}\SELRS.bat"; IconFilename: "{app}\{#AppExeName}"
Name: "{autodesktop}\SELRS"; Filename: "{app}\SELRS.bat"; IconFilename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{userstartup}\SELRS"; Filename: "{app}\SELRS.bat"; IconFilename: "{app}\{#AppExeName}"; Tasks: autostart

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch SELRS"; Flags: nowait postinstall skipifsilent
