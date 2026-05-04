# SRV100 Claude + SpecKit + Model Routing Files

## Purpose
This package is designed so Claude becomes the starting brain of the project.

Claude will:
- Create the final plan.
- Create the SpecKit structure.
- Generate all tasks.
- Assign the right model/tool to each task.
- Write the prompt for every task.
- Review outputs.
- Prevent scope creep.

Claude will NOT:
- Do heavy implementation.
- Write large code blocks.
- Refactor the whole project.
- Spend expensive tokens on repetitive work.

## Current Project Scope
Add the Accounting module to the existing web app beside the existing Medical module.

## Core Rules
- Medical module already exists.
- Accounting module must be added separately.
- Accounting uses existing MSSQL database.
- Do not redesign databases.
- Do not include OneDrive now.
- Accounting reports are service-based.
- Service revenue reports must not depend on patient or doctor logic.
- UI must be light mode and web-style.
