#!/bin/bash
# Ruta del proyecto
APP_DIR="/home/ubuntu/miapp"
FRONT_DIR="$APP_DIR/front"
BACK_DIR="$APP_DIR/api"

# === IP estática (ejemplo) ===
# Cambiar según tu red local
sudo nmcli con mod "Wired connection 1" ipv4.addresses 192.168.1.100/24
sudo nmcli con mod "Wired connection 1" ipv4.gateway 192.168.1.1
sudo nmcli con mod "Wired connection 1" ipv4.dns "8.8.8.8 8.8.4.4"
sudo nmcli con mod "Wired connection 1" ipv4.method manual
sudo nmcli con up "Wired connection 1"

echo "✅ IP estática configurada."

# === Levantar Frontend ===
echo "🚀 Levantando frontend..."
cd $FRONT_DIR
npm install
npm run build &
npm run start &
FRONT_PID=$!
cd ..
echo "Frontend levantado. PID=$FRONT_PID"

# === Levantar Backend ===
echo "🚀 Levantando backend..."
cd $BACK_DIR
npm install
npm run build &
npm run start &
BACK_PID=$!
cd ..
echo "Backend levantado. PID=$BACK_PID"

echo "🎉 Todo levantado. Frontend y Backend corriendo."
    