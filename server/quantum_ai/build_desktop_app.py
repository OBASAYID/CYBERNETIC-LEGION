#!/usr/bin/env python3
"""
Build script for CYRUS Desktop Application
Creates standalone executables using PyInstaller
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def run_command(command, cwd=None):
    """Run a shell command and return success."""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=True,
                              capture_output=True, text=True)
        print(f"✓ {command}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {command}")
        print(f"Error: {e.stderr}")
        return False

def build_desktop_app():
    """Build the desktop application for the current platform."""
    print("🚀 Building CYRUS Desktop Application...")

    # Get current directory
    project_dir = Path(__file__).parent
    server_dir = project_dir / "server"

    # Ensure server directory exists
    if not server_dir.exists():
        print("❌ Server directory not found!")
        return False

    # Install dependencies
    print("\n📦 Installing dependencies...")
    if not run_command("pip install -r requirements.txt"):
        return False

    # Install PyInstaller if not already installed
    if not run_command("pip install pyinstaller"):
        return False

    # Determine platform-specific settings
    system = platform.system().lower()
    if system == "darwin":  # macOS
        app_name = "CYRUS.app"
        icon = None  # Could add an icon later
    elif system == "windows":
        app_name = "CYRUS.exe"
        icon = None
    else:  # Linux
        app_name = "cyrus"
        icon = None

    # PyInstaller command
    pyinstaller_cmd = [
        "pyinstaller",
        "--onefile",  # Single executable
        "--windowed",  # GUI app, no console
        "--name=CYRUS",
        f"--distpath={project_dir / 'dist'}",
        f"--workpath={project_dir / 'build'}",
        # Add data files
        f"--add-data={server_dir}:server",
        # Hidden imports for common modules
        "--hidden-import=quantum_ai.quantum_ai_core",
        "--hidden-import=quantum_ai.device_controller",
        "--hidden-import=tkinter",
        "--hidden-import=threading",
        "--hidden-import=logging",
        "--hidden-import=json",
        "--hidden-import=time",
        "--hidden-import=argparse",
        # Main script
        str(project_dir / "cyrus_desktop_app.py")
    ]

    # Join command
    cmd_str = " ".join(pyinstaller_cmd)

    print(f"\n🔨 Running PyInstaller...")
    print(f"Command: {cmd_str}")

    if run_command(cmd_str):
        # Check if executable was created
        dist_dir = project_dir / "dist"
        if dist_dir.exists():
            files = list(dist_dir.glob("*"))
            if files:
                exe_path = files[0]
                print(f"\n✅ Build successful!")
                print(f"Executable created: {exe_path}")
                print(f"Size: {exe_path.stat().st_size / (1024*1024):.1f} MB")

                # Create a simple installer script
                create_installer_script(project_dir, exe_path, system)
                return True

    print("\n❌ Build failed!")
    return False

def create_installer_script(project_dir, exe_path, system):
    """Create a simple installer script."""
    if system == "darwin":
        installer_script = f"""#!/bin/bash
# CYRUS Desktop App Installer for macOS

echo "Installing CYRUS Desktop Application..."

# Copy app to Applications folder
cp -r "{exe_path}" /Applications/

echo "CYRUS installed to /Applications/"
echo "You can now run CYRUS from your Applications folder."
"""
    elif system == "windows":
        installer_script = f"""@echo off
REM CYRUS Desktop App Installer for Windows

echo Installing CYRUS Desktop Application...

REM Copy exe to Program Files
copy "{exe_path}" "C:\\Program Files\\CYRUS\\"

echo CYRUS installed to C:\\Program Files\\CYRUS\\
echo You can now run CYRUS from the Start Menu.
pause
"""
    else:  # Linux
        installer_script = f"""#!/bin/bash
# CYRUS Desktop App Installer for Linux

echo "Installing CYRUS Desktop Application..."

# Copy binary to /usr/local/bin
sudo cp "{exe_path}" /usr/local/bin/cyrus
sudo chmod +x /usr/local/bin/cyrus

echo "CYRUS installed to /usr/local/bin/"
echo "You can now run 'cyrus' from the terminal."
"""

    installer_path = project_dir / f"install_cyrus_{system}.sh"
    with open(installer_path, 'w') as f:
        f.write(installer_script)

    # Make executable on Unix systems
    if system != "windows":
        os.chmod(installer_path, 0o755)

    print(f"Installer script created: {installer_path}")

def main():
    """Main build function."""
    print("CYRUS Desktop Application Builder")
    print("=" * 40)

    success = build_desktop_app()

    if success:
        print("\n🎉 Build completed successfully!")
        print("You can find the executable in the 'dist' folder.")
        print("Run the installer script to install the application.")
    else:
        print("\n💥 Build failed. Check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()