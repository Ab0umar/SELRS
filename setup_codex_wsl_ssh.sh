#!/usr/bin/env bash
set -euo pipefail

CODEX_KEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINGb256PlXEzML7KHvgnB+jZaQMUVcSsStbWOkCj1eTM codex_srv100'

sudo dpkg --configure -a
sudo apt-get -f install -y
sudo apt-get install -y openssh-server
sudo ssh-keygen -A

install -d -m 700 "$HOME/.ssh"
touch "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"
if ! grep -Fqx "$CODEX_KEY" "$HOME/.ssh/authorized_keys"; then
    printf '%s\n' "$CODEX_KEY" >> "$HOME/.ssh/authorized_keys"
fi

sudo tee /etc/ssh/sshd_config.d/99-codex-wsl.conf >/dev/null <<'EOF'
Port 2259
ListenAddress 0.0.0.0
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers selrs
AuthorizedKeysFile .ssh/authorized_keys
EOF

sudo /usr/sbin/sshd -t
sudo systemctl enable ssh
sudo systemctl restart ssh

printf '\n=== WSL SSH READY ===\n'
printf 'WSL_IP=%s\n' "$(hostname -I | awk '{print $1}')"
printf 'LISTENERS:\n'
ss -ltnp | grep -E ':(22|2259)\b' || true
printf 'CODEX_KEY_PRESENT='; grep -Fxc "$CODEX_KEY" "$HOME/.ssh/authorized_keys"
printf '\n'
