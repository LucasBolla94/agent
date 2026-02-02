#!/usr/bin/env bash
set -euo pipefail

APP_NAME="AgentTUR"
DEFAULT_BRANCH="main"
REPO_URL=""
INSTALL_DIR="/opt/agenttur"

usage() {
  cat <<EOF
${APP_NAME} installer

Usage:
  ./install_tur.sh --repo <git_url> [--dir <install_dir>] [--branch <branch>]

Example:
  ./install_tur.sh --repo https://github.com/yourorg/OpenTur.git --dir /opt/agenttur
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_URL="$2"
      shift 2
      ;;
    --dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    --branch)
      DEFAULT_BRANCH="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$REPO_URL" ]]; then
  echo "Missing --repo <git_url>"
  usage
  exit 1
fi

require_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_deps_debian() {
  sudo apt-get update -y
  sudo apt-get install -y curl ca-certificates git build-essential python3 nginx

  if ! require_cmd node; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi

  if ! require_cmd docker; then
    sudo apt-get install -y docker.io docker-compose-plugin
    sudo systemctl enable --now docker
  fi
}

install_deps_rhel() {
  sudo yum install -y curl ca-certificates git gcc-c++ make python3 nginx

  if ! require_cmd node; then
    curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
    sudo yum install -y nodejs
  fi

  if ! require_cmd docker; then
    sudo yum install -y docker docker-compose-plugin
    sudo systemctl enable --now docker
  fi
}

install_deps_arch() {
  sudo pacman -Syu --noconfirm
  sudo pacman -S --noconfirm curl ca-certificates git base-devel python nginx nodejs npm docker docker-compose
  sudo systemctl enable --now docker
}

detect_and_install() {
  if [[ -f /etc/debian_version ]]; then
    install_deps_debian
    return
  fi
  if [[ -f /etc/redhat-release ]]; then
    install_deps_rhel
    return
  fi
  if [[ -f /etc/arch-release ]]; then
    install_deps_arch
    return
  fi
  echo "Unsupported distro. Please install dependencies manually."
  exit 1
}

detect_and_install

if [[ -d "$INSTALL_DIR" ]]; then
  echo "Directory exists: $INSTALL_DIR"
else
  sudo mkdir -p "$INSTALL_DIR"
  sudo chown "$USER":"$USER" "$INSTALL_DIR"
fi

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  git clone --branch "$DEFAULT_BRANCH" "$REPO_URL" "$INSTALL_DIR"
else
  echo "Repo already cloned. Pulling latest..."
  git -C "$INSTALL_DIR" pull
fi

cd "$INSTALL_DIR"
npm install
npm run build

sudo npm install -g .

echo ""
echo "Instalação concluída."
echo "Próximo passo: execute 'turion setup' para configurar e iniciar o servidor."
