#!/bin/bash
apt-get update
apt-get install -y nginx

cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        proxy_pass https://femar-mvp-core-745000275454.us-central1.run.app;
        proxy_set_header Host femar-mvp-core-745000275454.us-central1.run.app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_ssl_server_name on;
        proxy_ssl_protocols TLSv1.2 TLSv1.3;
        
        # Adjust buffer sizes for potentially large biometric payloads
        client_max_body_size 10M;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
EOF

systemctl restart nginx
