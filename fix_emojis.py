#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the file
with open('README.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix corrupted emojis
replacements = {
    'ðŸ"': '📋',
    "ðŸ'¤": '👤',
    'ðŸ"Š': '📊',
    'ðŸ"': '🔔',
    'ðŸ"ˆ': '📈',
    'ðŸ› ï¸': '🔓',
    'ðŸ"¦': '📦',
    'ðŸ"š': '📝',
    'ðŸ"§': '⚙️',
    'ðŸ"': '📄',
    'ðŸ"—': '🔗',
    'âï¸': '❤️',
}

# Apply replacements
for old, new in replacements.items():
    content = content.replace(old, new)

# Write back
with open('README.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed emojis in README.md")
