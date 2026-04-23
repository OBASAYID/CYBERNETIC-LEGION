#!/usr/bin/env python3
"""
CYRUS AI System - Cloud Deployment Script
Deploy to Vercel, Railway, or other platforms
"""

import os
import sys
import json
import subprocess
import requests
import time
from pathlib import Path
from datetime import datetime

class CYRUSDeployer:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.local_url = "http://localhost:3000"
        self.ngrok_api_urls = [
            "http://127.0.0.1:4040/api/tunnels",
            "http://localhost:4040/api/tunnels",
        ]

    def check_local_server(self):
        """Check if local server is running"""
        try:
            response = requests.get(f"{self.local_url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False

    def _start_local_server(self):
        """Start the local Flask server from the project root"""
        subprocess.Popen(
            [sys.executable, str(self.project_root / "simple_flask_server.py")],
            cwd=self.project_root,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    def _get_ngrok_public_url(self, retries=10, delay_seconds=1):
        """Fetch the public ngrok URL from the local inspect API"""
        for _ in range(retries):
            for api_url in self.ngrok_api_urls:
                try:
                    response = requests.get(api_url, timeout=5)
                    response.raise_for_status()
                    tunnels = response.json().get("tunnels", [])
                    if not tunnels:
                        continue

                    https_tunnel = next(
                        (tunnel for tunnel in tunnels if tunnel.get("public_url", "").startswith("https://")),
                        None,
                    )
                    selected_tunnel = https_tunnel or tunnels[0]
                    public_url = selected_tunnel.get("public_url")
                    if public_url:
                        return public_url
                except (requests.RequestException, ValueError, TypeError):
                    continue

            time.sleep(delay_seconds)

        return None

    def create_vercel_config(self):
        """Create Vercel configuration"""
        vercel_config = {
            "version": 2,
            "builds": [
                {
                    "src": "simple_flask_server.py",
                    "use": "@vercel/python"
                }
            ],
            "routes": [
                {
                    "src": "/(.*)",
                    "dest": "simple_flask_server.py"
                }
            ],
            "env": {
                "PYTHONPATH": "."
            }
        }

        with open(self.project_root / "vercel.json", "w") as f:
            json.dump(vercel_config, f, indent=2)

        print("✅ Created vercel.json configuration")

    def create_railway_config(self):
        """Create Railway configuration"""
        railway_config = """[build]
builder = "python"
buildCommand = "pip install -r requirements.txt"

[deploy]
startCommand = "python simple_flask_server.py"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[build.env]
PYTHON_VERSION = "3.12"
"""

        with open(self.project_root / "railway.toml", "w") as f:
            f.write(railway_config)

        print("✅ Created railway.toml configuration")

    def create_requirements_txt(self):
        """Create requirements.txt for Python deployment"""
        requirements = """Flask==3.0.0
flask-cors==4.0.0
requests==2.31.0
gunicorn==21.2.0
"""

        with open(self.project_root / "requirements.txt", "w") as f:
            f.write(requirements)

        print("✅ Created requirements.txt")

    def deploy_to_vercel(self):
        """Deploy to Vercel"""
        print("🚀 Deploying to Vercel...")

        try:
            # Install Vercel CLI if not available
            subprocess.run(["npm", "install", "-g", "vercel"], check=True, capture_output=True)

            # Create Vercel config
            self.create_vercel_config()

            # Deploy
            result = subprocess.run(["vercel", "--prod"], capture_output=True, text=True)

            if result.returncode == 0:
                # Extract URL from output
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'https://' in line and 'vercel.app' in line:
                        url = line.strip()
                        print(f"✅ Deployed to Vercel: {url}")
                        return url

            print("❌ Vercel deployment failed")
            print("Output:", result.stdout)
            print("Error:", result.stderr)

        except Exception as e:
            print(f"❌ Vercel deployment error: {e}")

        return None

    def deploy_to_railway(self):
        """Deploy to Railway"""
        print("🚀 Deploying to Railway...")

        try:
            # Create Railway config
            self.create_railway_config()
            self.create_requirements_txt()

            # Check Railway login
            result = subprocess.run(["railway", "status"], capture_output=True, text=True)
            if "Unauthorized" in result.stderr:
                print("❌ Not logged into Railway. Please run: railway login")
                return None

            # Initialize project
            subprocess.run(["railway", "init", "cyrus-cybernetic", "--yes"], check=True)

            # Deploy
            result = subprocess.run(["railway", "up"], capture_output=True, text=True)

            if result.returncode == 0:
                print("✅ Deployed to Railway")
                # Get the URL (this might require additional commands)
                return "Check Railway dashboard for deployment URL"
            else:
                print("❌ Railway deployment failed")
                print("Error:", result.stderr)

        except Exception as e:
            print(f"❌ Railway deployment error: {e}")

        return None

    def create_docker_setup(self):
        """Create Docker setup for deployment"""
        dockerfile = '''FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["python", "simple_flask_server.py"]'''

        with open(self.project_root / "Dockerfile", "w") as f:
            f.write(dockerfile)

        dockerignore = '''__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
venv
.venv
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
node_modules
npm-debug.log
yarn-error.log
.env
.idea
.vscode
*.swp
*.swo
*~
.DS_Store
'''

        with open(self.project_root / ".dockerignore", "w") as f:
            f.write(dockerignore)

        print("✅ Created Docker configuration")

    def deploy_locally_with_ngrok(self):
        """Deploy locally and expose with ngrok"""
        print("🚀 Setting up local deployment with ngrok...")

        if not self.check_local_server():
            print("❌ Local server not running. Starting server...")
            self._start_local_server()

            for _ in range(10):
                if self.check_local_server():
                    break
                time.sleep(1)
            else:
                print("❌ Local server did not become ready on port 3000")
                return None

        # Check if ngrok is available
        try:
            result = subprocess.run(["which", "ngrok"], capture_output=True)
            if result.returncode != 0:
                print("❌ ngrok not installed. Please install ngrok first:")
                print("   brew install ngrok/ngrok/ngrok  # macOS")
                print("   # Or download from https://ngrok.com/download")
                return None

            # Start ngrok
            print("🌐 Starting ngrok tunnel...")
            ngrok_process = subprocess.Popen(
                ["ngrok", "http", "3000"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
            )

            url = self._get_ngrok_public_url(retries=15, delay_seconds=1)
            if url:
                print(f"✅ Local deployment available at: {url}")
                print("📱 This URL is temporary and will change when ngrok restarts")
                return url

            if ngrok_process.poll() is not None:
                error_output = ngrok_process.stderr.read().strip() if ngrok_process.stderr else ""
                if error_output:
                    print("❌ ngrok exited before the tunnel was ready")
                    print(f"Error: {error_output}")
                    return None

            print("❌ Could not get ngrok URL from the inspect API. Check ngrok status manually.")

        except Exception as e:
            print(f"❌ ngrok deployment error: {e}")

        return None

    def generate_deployment_summary(self, deployments):
        """Generate deployment summary"""
        summary = f"""# CYRUS AI System - Deployment Summary
Generated: {datetime.now().isoformat()}

## 🚀 Deployment Results

"""

        for platform, url in deployments.items():
            if url:
                summary += f"### {platform.upper()}\n"
                summary += f"- **URL**: {url}\n"
                summary += f"- **Status**: ✅ Deployed\n\n"
            else:
                summary += f"### {platform.upper()}\n"
                summary += f"- **Status**: ❌ Failed\n\n"

        summary += """## 📋 Access Information

- **Local Development**: http://localhost:3000
- **Health Check**: /health
- **API Status**: /api/status
- **CYRUS API**: /api/cyrus (POST)

## 🛠️ Troubleshooting

1. **Local Server**: Run `python3 simple_flask_server.py`
2. **Dependencies**: `pip install flask flask-cors`
3. **Port Issues**: Change PORT environment variable

## 📱 User Access

Share the deployment URLs with users. The system includes:
- Professional web interface
- QR code for mobile access
- API endpoints for integration
- All CYRUS capabilities accessible

"""

        with open(self.project_root / "deployment_summary.md", "w") as f:
            f.write(summary)

        print("✅ Created deployment summary")

def main():
    from datetime import datetime

    deployer = CYRUSDeployer()

    print("🚀 CYRUS AI System - Cloud Deployment")
    print("=" * 50)

    deployments = {}

    # Try different deployment methods
    print("\n1. Setting up local server...")
    local_url = deployer.deploy_locally_with_ngrok()
    if local_url:
        deployments['ngrok'] = local_url

    print("\n2. Preparing for Vercel deployment...")
    deployer.create_vercel_config()
    # deployments['vercel'] = deployer.deploy_to_vercel()

    print("\n3. Preparing for Railway deployment...")
    deployer.create_railway_config()
    deployer.create_requirements_txt()
    # deployments['railway'] = deployer.deploy_to_railway()

    print("\n4. Creating Docker setup...")
    deployer.create_docker_setup()

    print("\n5. Generating deployment summary...")
    deployer.generate_deployment_summary(deployments)

    print("\n" + "=" * 50)
    print("🎉 CYRUS DEPLOYMENT SETUP COMPLETE!")
    print("=" * 50)

    if deployments:
        print("\n✅ Active Deployments:")
        for platform, url in deployments.items():
            print(f"   {platform.upper()}: {url}")
    else:
        print("\n⚠️  No active deployments. Run deployments manually:")
        print("   - ngrok: ./simple_flask_server.py + ngrok http 3000")
        print("   - Vercel: vercel --prod")
        print("   - Railway: railway up")

    print("\n📄 Check deployment_summary.md for details")
    print("=" * 50)

if __name__ == "__main__":
    main()