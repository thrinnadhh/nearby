#!/usr/bin/env python3
"""
NotebookLM Authentication Helper
Authenticates with NotebookLM and manages notebooks
"""

import sys
from pathlib import Path

# Try importing notebooklm
try:
    from notebooklm import NotebookLMClient
    print("✅ notebooklm-py is installed")
except ImportError as e:
    print(f"❌ Error: notebooklm-py not found: {e}")
    print("Install it with: pip install 'notebooklm-py[browser]'")
    sys.exit(1)

def main():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║          NotebookLM Authentication & Setup                   ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    
    try:
        # Initialize with browser-based authentication
        print("1️⃣  Initializing NotebookLM with browser authentication...")
        print("   (A browser window will open for you to log in)")
        nlm = NotebookLMClient()
        
        print("✅ Successfully authenticated with NotebookLM!")
        print("\n📌 Available notebooks:")
        notebooks = nlm.list_notebooks()
        for nb in notebooks[:5]:
            print(f"   - {nb.name} ({nb.id})")
        if len(notebooks) > 5:
            print(f"   ... and {len(notebooks) - 5} more")
        
        print("\n📌 Next steps:")
        print("   - Create a notebook: nlm.create_notebook('name')")
        print("   - Add sources: nlm.add_source(notebook_id, url_or_file)")
        print("   - Chat: nlm.ask(notebook_id, 'your question')")
        
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        print("\n💡 Troubleshooting:")
        print("   - Make sure your browser is open")
        print("   - Check your Google/Microsoft account")
        print("   - Try running again with: python notebooklm_auth.py")
        sys.exit(1)

if __name__ == "__main__":
    main()
