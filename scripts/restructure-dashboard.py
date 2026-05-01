#!/usr/bin/env python3
"""Restructure Dashboard.tsx to use 2-column grid layout for Medical File sections."""

import re

def restructure_medical_file():
    filepath = "client/src/pages/Dashboard.tsx"

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start and end of the medical file sections
    # Start: {/* Accordion */}
    # End: {/* Save Status */}

    accordion_start = content.find('{/* Accordion */}')
    save_status = content.find('{/* Save Status */}', accordion_start)

    if accordion_start == -1 or save_status == -1:
        print("ERROR: Could not find Accordion or Save Status markers")
        return False

    # Extract the accordion section
    before = content[:accordion_start]
    accordion_section = content[accordion_start:save_status]
    after = content[save_status:]

    # Now restructure the accordion section
    # Replace the outer wrapper
    old_outer = '''                    {/* Accordion */}
                    <div className="flex-1 overflow-y-auto py-4">
                      <div className="flex-1 overflow-y-auto py-4 space-y-6">'''

    new_outer = '''                    {/* Accordion */}
                    <div className="flex-1 overflow-y-auto py-4">
                      <div className="flex-1 overflow-y-auto py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* LEFT COLUMN */}
                          <div className="space-y-6">'''

    accordion_section = accordion_section.replace(old_outer, new_outer)

    # Now we need to reorder sections into the new layout structure
    # Extract each section as a complete block
    sections = {}

    def find_section(content, section_num, section_name):
        """Find and extract a complete section block."""
        comment = f'{{/* {section_num}. '
        start_idx = content.find(comment)
        if start_idx == -1:
            return None

        # Find the opening div
        div_start = content.find('<div className="border-b pb-6">', start_idx)
        if div_start == -1:
            return None

        # Find the closing div
        # Count braces/divs to find the matching close
        depth = 0
        idx = div_start
        while idx < len(content):
            if content[idx:idx+18] == '<div className="border':
                depth += 1
            elif content[idx:idx+6] == '</div>':
                depth -= 1
                if depth == 0:
                    return content[div_start:idx+6]
            idx += 1
        return None

    # Extract all sections from the accordion
    lines = accordion_section.split('\n')

    # Find where each section starts
    section_lines = {}
    for i, line in enumerate(lines):
        if '{/* ' in line and ' */}' in line:
            section_lines[i] = line

    print(f"Found {len(section_lines)} section markers")
    for line_no, line in section_lines.items():
        print(f"  Line {line_no}: {line.strip()[:60]}")

    # Build the new structure with proper grid layout
    # The new structure should be:
    # Grid div
    #   Left column div
    #     Medical History
    #     Symptoms
    #     AutoRef | IOP
    #     Pentacam
    #     Investigation
    #   Right column div
    #     Profile Data
    #     Refraction
    #     Diagnosis
    #     Treatment

    # This is complex - let's rebuild manually by reordering lines
    result_lines = []
    current_section = None
    section_content = []

    in_accordion = False
    in_grid = False
    left_col_complete = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if we're at an accordion start
        if '{/* Accordion */}' in line:
            in_accordion = True
            result_lines.append(line)
            i += 1
            # Add the next few lines (the div wrappers we already fixed)
            while i < len(lines) and i < len(lines) and '{/* LEFT COLUMN */}' not in lines[i]:
                result_lines.append(lines[i])
                i += 1
            if i < len(lines) and '{/* LEFT COLUMN */}' in lines[i]:
                result_lines.append(lines[i])  # LEFT COLUMN comment
                i += 1
                continue

        # Collect sections until we're done
        if in_accordion and '/* Save Status */' in line:
            # Close out grid structure before save status
            if not left_col_complete:
                result_lines.append('                          </div>')
                result_lines.append('')
                result_lines.append('                          {/* RIGHT COLUMN */}')
                result_lines.append('                          <div className="space-y-6">')
                left_col_complete = True

            result_lines.append('                          </div>')
            result_lines.append('                        </div>')
            result_lines.append('                      </div>')
            result_lines.append('                    </div>')
            result_lines.append('')
            result_lines.append(line)
            in_accordion = False
            i += 1
            continue

        result_lines.append(line)
        i += 1

    # Add remaining lines
    while i < len(lines):
        result_lines.append(lines[i])
        i += 1

    new_accordion = '\n'.join(result_lines)

    # Write back
    new_content = before + new_accordion + after

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print("File restructured successfully!")
    return True

if __name__ == '__main__':
    restructure_medical_file()
