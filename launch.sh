#!/bin/bash
systemctl --user start waku-companion.service

if command -v google-chrome-stable &> /dev/null; then
    google-chrome-stable --new-window --app=http://127.0.0.1:5000 &
else
    xdg-open http://127.0.0.1:5000 &
fi
