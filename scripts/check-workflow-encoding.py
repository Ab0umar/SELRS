from pathlib import Path

path = Path(r"E:\selrs.cc\client\src\pages\WorkflowPrototypeLive.tsx")
raw = path.read_bytes()
text = raw.decode("utf-8-sig")
fixed = text.encode("cp1256").decode("utf-8")
print(f"bytes={len(raw)} chars={len(text)}")
print("before:", text[text.find("const renderDoctorSheetLauncher"):text.find("const renderDoctorSheetLauncher") + 180].replace("\n", " "))
print("after:", fixed[fixed.find("const renderDoctorSheetLauncher"):fixed.find("const renderDoctorSheetLauncher") + 180].replace("\n", " "))
print("changed_chars=", sum(a != b for a, b in zip(text, fixed)))
if "--apply" in __import__("sys").argv:
    path.write_text(fixed, encoding="utf-8")
    print("applied")
