#!/bin/sh
set -eu

SECRET="${TURN_SECRET:?TURN_SECRET is required}"
EXTERNAL_IP="${TURN_EXTERNAL_IP:-${CYRUS_SFU_ANNOUNCED_IP:-}}"
REALM="${TURN_REALM:-cyrus}"

cat > /tmp/turnserver.conf <<EOF
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=${SECRET}
realm=${REALM}
no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1
min-port=49152
max-port=65535
no-loopback-peers
no-multicast-peers
EOF

if [ -n "$EXTERNAL_IP" ]; then
  echo "external-ip=${EXTERNAL_IP}" >> /tmp/turnserver.conf
fi

echo "[coturn] starting with external-ip=${EXTERNAL_IP:-auto} realm=${REALM}"
exec turnserver -c /tmp/turnserver.conf --log-file=stdout
