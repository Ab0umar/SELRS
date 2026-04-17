#define AppName "SELRS"
#define AppVersion "1.0.50"
#define AppPublisher "SELRS"
#define AppExeName "SELRS.exe"
#define BuildDir "E:\SELRS.cc\desktop-electron\dist\win-unpacked"
#define OutputDir "C:\Users\SELRS\OneDrive\Documents\SELRS.cc"
#define AppIcon "E:\SELRS.cc\desktop-electron\assets\app.ico"

[Setup]
AppId={{E9A3061F-A9E9-4D08-9D1D-36D6625D0C9A}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\SELRS
DefaultGroupName=SELRS
DisableProgramGroupPage=yes
OutputDir={#OutputDir}
OutputBaseFilename=SELRS-Electron-Setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
SetupIconFile={#AppIcon}
UninstallDisplayIcon={app}\{#AppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop icon"; GroupDescription: "Additional icons:"

[Files]
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\SELRS"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\SELRS"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch SELRS"; Flags: nowait postinstall skipifsilent
