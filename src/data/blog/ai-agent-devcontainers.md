---
title: Sandboxing AI Coding Agents with Devcontainers
author: Claudio Masolo
pubDatetime: 2026-02-11T15:09:00Z
slug: 
featured: false
draft: false
ogImage: ../../assets/images/forrest-gump-quote.png
tags:
  - MLOps
description: Sandboxing AI Coding Agents with Devcontainers
---
The rise of AI-powered coding assistants like GitHub Copilot, Cursor, and various autonomous agents built on Claude or GPT-4 has fundamentally changed how we write code. These tools can read your codebase, suggest changes, and even execute commands. This capability is powerful, but it also raises a big security concern: you're giving an AI system access to your development environment. The question isn't whether these tools are malicious; it's about implementing proper isolation as a matter of principle.

Unlike standalone command-line tools that you invoke explicitly, IDE-integrated AI agents run continuously in the background. GitHub Copilot, for instance, analyzes your code as you type, maintains context across files, and can access any file your editor can see. This creates a unique security challenge: traditional containerization approaches that isolate individual processes don't work when the agent is embedded in your code editor.

Your development environment typically contains far more than just your current project. Your home directory likely holds SSH private keys in `~/.ssh`, cloud provider credentials in `~/.aws` or `~/.gcp`, API tokens in `~/.netrc`, browser session data, email archives, and countless other projects with their own secrets. When Copilot or similar tools run in your native IDE, they can potentially access all of this data.

The risk isn't necessarily malicious behavior by the AI itself. Bugs in the agent's implementation, compromised dependencies, prompt injection attacks, or misconfigurations could lead to unintended data exfiltration. The security model we need mirrors the principle of least privilege: the agent should have access to exactly what it needs to perform its function, and nothing more.

## Devcontainers: The Solution for IDE-Based Agents

VS Code's devcontainer feature solves this issue by running your whole development setup in a Docker container. This includes the IDE and all its extensions. When you open a project with a devcontainer, VS Code starts a container. It installs your chosen extensions, like Copilot, and connects to it remotely. From your perspective, you're using VS Code normally, but everything actually runs in isolation.

This approach provides several critical security benefits. The AI agent can only see files you explicitly mount into the container. Your SSH keys, AWS credentials, and other projects remain completely invisible. If the agent has a bug or gets compromised, the blast radius is limited to the specific project directory you've granted access to. And because the configuration is stored in your repository, every team member automatically gets the same secure, isolated environment.

## Basic Devcontainer Setup

Let's start with a minimal devcontainer configuration that sandboxes GitHub Copilot. Create a `.devcontainer` directory in your project root with two files:

**`.devcontainer/devcontainer.json`**:

```json
{
  "name": "Sandboxed Python Development",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "workspaceFolder": "/workspace",
  "remoteUser": "vscode",
  "customizations": {
    "vscode": {
      "extensions": [
        "GitHub.copilot",
        "GitHub.copilot-chat"
      ]
    }
  }
}
```

**`.devcontainer/Dockerfile`**:

```docker
FROM mcr.microsoft.com/devcontainers/python:3.11-bullseye

# The base image already creates a non-root vscode user (UID 1000)
USER vscode
WORKDIR /workspace
```

This minimal configuration creates a containerized Python environment with Copilot installed. When you open this project in VS Code and click "Reopen in Container," the entire development environment runs in isolation. Copilot can only see the files in your project directory, nothing else on your system exists from its perspective.

## Security Control 1: Surgical Volume Mounting

The most critical security control is restricting filesystem access through volume mounts. By default, devcontainers only mount your project directory, but you can be even more explicit and add additional read-only resources.

Here's a configuration that demonstrates precise control:

```json
{
  "name": "Sandboxed Development Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "mounts": [
    "source=${localWorkspaceFolder},target=/workspace,type=bind",
    "source=${localWorkspaceFolder}/../shared-templates,target=/templates,type=bind,readonly"
  ],
  "workspaceFolder": "/workspace",
  "remoteUser": "vscode"
}
```

The `mounts` array explicitly defines what gets mounted and how:

- `${localWorkspaceFolder}` mounts only your current project directory (read-write by default)
- The shared templates directory is mounted read-only, preventing the agent from modifying common resources
- Everything else on your system is invisible to the container

This is radically different from mounting your entire home directory, which would expose all your personal data:

```json
// ❌ DANGEROUS - Don't do this
"mounts": [
  "source=${localEnv:HOME},target=/home/vscode,type=bind"
]
```

With the dangerous configuration, Copilot could access your `~/.ssh` keys, `~/.aws` credentials, browser data, and every other project you've ever worked on.

## Security Control 2: Enforcing Unprivileged Users

Running containers as root undermines container security. By default, the root user inside a container maps to the root user on the host system. If a container breakout vulnerability exists, a root process inside becomes a root process outside.

Devcontainers make it easy to enforce unprivileged execution:

```json
{
  "name": "Sandboxed Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "remoteUser": "vscode",
  "containerUser": "vscode",
  "workspaceFolder": "/workspace"
}
```

The `remoteUser` setting controls what user VS Code connects as, while `containerUser` sets the user for all container processes. The Microsoft devcontainer base images create a `vscode` user with UID 1000, mapping to a regular user account on the host.

Your Dockerfile should reinforce this:

```docker
FROM mcr.microsoft.com/devcontainers/python:3.11-bullseye

# Install system packages as root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Switch to non-root user for everything else
USER vscode
WORKDIR /workspace

# Configure git to trust the workspace
RUN git config --global safe.directory /workspace
```

All subsequent operations: installing Python packages, running tests, and using Copilot execute as an unprivileged user. Even if a malicious package attempts to modify system files, it lacks the necessary permissions.

## Security Control 3: Dropping Linux Capabilities

Linux capabilities divide root privileges into distinct units. Most development containers don't need any elevated capabilities, yet Docker grants several by default. Devcontainers let you remove all capabilities through the `runArgs` array:

```json
{
  "name": "Hardened Development Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "runArgs": [
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges"
  ],
  "remoteUser": "vscode"
}
```

The `--cap-drop=ALL` flag removes all Linux capabilities from the container. The `--security-opt=no-new-privileges` flag prevents processes from gaining additional privileges through setuid binaries or other mechanisms. This blocks an entire class of privilege escalation attacks.

For additional hardening, make the container's root filesystem read-only:

```json
{
  "name": "Read-Only Filesystem Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "runArgs": [
    "--read-only",
    "--tmpfs=/tmp",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges"
  ],
  "mounts": [
    "source=${localWorkspaceFolder},target=/workspace,type=bind"
  ],
  "remoteUser": "vscode"
}
```

The `--read-only` flag makes the entire container filesystem immutable except for explicitly mounted volumes and tmpfs mounts. The agent can still write to `/workspace` (your project directory) and `/tmp` (in-memory temporary storage), but cannot modify system files or install additional packages at runtime.

## Security Control 4: Network Isolation

AI coding agents typically need internet access to query their APIs, but this creates a potential data exfiltration vector. Devcontainers support Docker's network isolation features.

For agents that don't need network access at all, disable networking completely:

```json
{
  "name": "Network-Isolated Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "runArgs": [
    "--network=none"
  ],
  "remoteUser": "vscode"
}
```

For agents that need to reach specific API endpoints, you have several options. The simplest is to use Docker's default bridge network but implement firewall rules on the host:

```json
{
  "name": "Restricted Network Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "runArgs": [
    "--network=restricted-dev"
  ]
}
```

Then create the network with specific configuration:

```bash
docker network create restricted-dev \
  --driver bridge \
  --subnet 172.28.0.0/16
```

You can then use iptables rules on the host to restrict what external addresses the container can reach, implementing an allowlist of approved API endpoints (like `api.github.com` for Copilot).

For more sophisticated setups, consider using an HTTP proxy container that enforces domain allowlists:

```json
{
  "name": "Proxy-Controlled Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "dockerComposeFile": "docker-compose.yml",
  "service": "devcontainer",
  "remoteUser": "vscode"
}
```

**`docker-compose.yml`**:

```yaml
services:
  devcontainer:
    build: .
    volumes:
      - ../..:/workspaces:cached
    network_mode: service:proxy

  proxy:
    image: sameersbn/squid:3.5.27-2
    volumes:
      - ./squid.conf:/etc/squid/squid.conf:ro
    ports:
      - "3128:3128"
```

The proxy can enforce strict domain allowlists, log all requests for auditing, and block access to potentially sensitive endpoints.

## Security Control 5: Secrets Management

AI agents often need API keys to function. Storing these keys in environment variables or mounting them from your home directory defeats the purpose of isolation. Devcontainers support secure secrets mounting:

```json
{
  "name": "Secrets-Aware Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "mounts": [
    "source=${localWorkspaceFolder},target=/workspace,type=bind",
    "source=${localEnv:HOME}/.secrets/anthropic-key,target=/run/secrets/anthropic-key,type=bind,readonly"
  ],
  "containerEnv": {
    "ANTHROPIC_API_KEY_FILE": "/run/secrets/anthropic-key"
  },
  "remoteUser": "vscode"
}
```

This configuration:

1. Mounts the API key file from a dedicated secrets directory in your home folder
2. Places it at `/run/secrets/anthropic-key` inside the container (a standard location for secrets)
3. Makes the mount read-only so the agent cannot modify it
4. Sets an environment variable pointing to the file location rather than containing the secret itself

Your application code reads from the file:

```python
import os

def get_api_key():
    key_file = os.environ.get('ANTHROPIC_API_KEY_FILE')
    if key_file and os.path.exists(key_file):
        with open(key_file, 'r') as f:
            return f.read().strip()
    return None
```

On the host, ensure the secrets file has restrictive permissions and is excluded from version control:

```bash
mkdir -p ~/.secrets
echo "your-api-key" > ~/.secrets/anthropic-key
chmod 400 ~/.secrets/anthropic-key
```

Add to your `.gitignore`:

```
.secrets/
**/*-key
**/*.key
```

## Security Control 6: Resource Constraints

While not strictly a security control, resource limits prevent a misbehaving agent from consuming all available system resources:

```json
{
  "name": "Resource-Limited Environment",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "runArgs": [
    "--memory=4g",
    "--memory-swap=4g",
    "--cpus=2",
    "--cap-drop=ALL"
  ],
  "remoteUser": "vscode"
}
```

These constraints limit the container to 4GB of RAM and 2 CPU cores. If Copilot has a bug that causes infinite memory allocation or a runaway loop, it cannot bring down your entire system. The container gets terminated when it hits the limit.

You can also set I/O limits to prevent disk-based denial of service:

```json
{
  "runArgs": [
    "--memory=4g",
    "--cpus=2",
    "--device-read-bps=/dev/sda:10mb",
    "--device-write-bps=/dev/sda:10mb"
  ]
}
```

## Complete Reference Implementation

Here's a production-ready devcontainer configuration that combines all security controls:

**`.devcontainer/devcontainer.json`**:

```json
{
  "name": "Sandboxed AI Development Environment",
  "build": {
    "dockerfile": "Dockerfile",
    "context": ".."
  },
  "mounts": [
    "source=${localWorkspaceFolder},target=/workspace,type=bind",
    "source=${localWorkspaceFolder}/../shared-templates,target=/templates,type=bind,readonly",
    "source=${localEnv:HOME}/.secrets/github-copilot-token,target=/run/secrets/github-token,type=bind,readonly"
  ],
  "workspaceFolder": "/workspace",
  "remoteUser": "vscode",
  "containerUser": "vscode",
  "runArgs": [
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--memory=4g",
    "--memory-swap=4g",
    "--cpus=2"
  ],
  "containerEnv": {
    "GITHUB_TOKEN_FILE": "/run/secrets/github-token"
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "GitHub.copilot",
        "GitHub.copilot-chat",
        "ms-python.python",
        "ms-python.vscode-pylance"
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "bash",
        "python.defaultInterpreterPath": "/usr/local/bin/python",
        "github.copilot.enable": {
          "*": true,
          "yaml": false,
          "plaintext": false
        }
      }
    }
  },
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": false,
      "installOhMyZsh": false,
      "upgradePackages": false
    }
  },
  "postCreateCommand": "pip install --no-cache-dir -r requirements.txt",
  "shutdownAction": "stopContainer"
}
```

**`.devcontainer/Dockerfile`**:

```docker
FROM mcr.microsoft.com/devcontainers/python:3.11-bullseye

# Install only necessary system packages as root
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create necessary directories with proper permissions
RUN mkdir -p /workspace /templates /run/secrets && \
    chown -R vscode:vscode /workspace /templates && \
    chmod 755 /workspace /templates

# Switch to non-root user
USER vscode

# Set working directory
WORKDIR /workspace

# Pre-configure git for security
RUN git config --global safe.directory /workspace && \
    git config --global user.name "Developer" && \
    git config --global user.email "dev@example.com"
```

This configuration creates a fully isolated development environment where:

- **Filesystem access** is strictly limited to the project directory and read-only templates
- **All processes** run as an unprivileged user (UID 1000)
- **Linux capabilities** are completely dropped
- **Privilege escalation** is blocked by `no-new-privileges`
- **Resource consumption** is capped at 4GB RAM and 2 CPU cores
- **Secrets** are mounted read-only from a dedicated location
- **Extensions** including Copilot run entirely within the sandbox

## Workflow: Using Your Sandboxed Environment

Using a devcontainer-based setup is straightforward:

1. **Initial setup**: Create the `.devcontainer` directory in your project root, add the configuration files shown above, and commit them to version control.
2. **Opening the environment**: Open the project in VS Code. You'll see a notification: "Folder contains a Dev Container configuration file." Click "Reopen in Container."
3. **First-time build**: VS Code builds the Docker image, starts the container, installs extensions, and runs the `postCreateCommand`. This takes a few minutes the first time but is cached for subsequent launches.
4. **Development**: Once connected, everything looks and feels like normal VS Code. The terminal, file explorer, and all extensions (including Copilot) work normally. The only difference is everything runs in isolation.
5. **File access**: When you open files, edit code, or run scripts, you're working inside the container. Copilot can see and analyze your project files but has no access to anything outside the mounted directory.
6. **Exiting**: Close VS Code or click "Reopen Locally" to exit the container environment. Your changes persist in your local project directory.

## Conclusion
AI coding assistants represent a fundamental shift in how we develop software. As these tools become more powerful and prevalent, implementing proper isolation becomes not just a best practice but a necessity. Devcontainers provide an elegant solution that balances security, usability, and team consistency.
The techniques described here represent current best practices, but the security landscape evolves constantly. Stay informed about container security advisories, regularly update your base images, and periodically audit your devcontainer configurations to ensure they still meet your security requirements.
Defense in depth isn't a one-time configuration—it's an ongoing commitment to protecting your development environment from both known and unknown threats. By treating AI agents with the same security rigor we apply to production systems, we can harness their power while maintaining the integrity and confidentiality of our development workflows.